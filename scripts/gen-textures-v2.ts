/**
 * Terrain texture generation v2 - FLUX 2 + Seamless LoRA
 *
 * These are biome ground textures for procedural terrain in Terror in the Jungle.
 * Reference: forestfloor.png = 512x512, 30 colors, true pixel art tileset aesthetic
 *
 * Key changes from v1:
 *   - FLUX generates at 256px (lower detail = more pixel-like)
 *   - Downscale to 32px (much chunkier pixels)
 *   - Quantize to 24 colors with NO dithering
 *   - Upscale to 512x512 for final output
 *   - Prompts focus on retro tileset aesthetic, not paintings
 */

import sharp from 'sharp';
import { readFileSync, unlinkSync, existsSync } from 'fs';

const OUT_DIR = './war-assets/textures';

// Read FAL key from .env.local
const envText = readFileSync('./packages/server/.env.local', 'utf8');
const FAL_KEY = envText.match(/FAL_KEY=(.+)/)?.[1]?.trim() || '';
const SEAMLESS_LORA = 'https://huggingface.co/gokaygokay/Flux-Seamless-Texture-LoRA/resolve/main/seamless_texture.safetensors';

// ==========================================
// FLUX 2 + Seamless LoRA via FAL queue
// ==========================================

async function fluxGenerate(prompt: string, size: number): Promise<Buffer | null> {
  console.log('  Queuing FLUX 2...');
  const resp = await fetch('https://queue.fal.run/fal-ai/flux-2/lora', {
    method: 'POST',
    headers: { 'Authorization': `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      loras: [{ path: SEAMLESS_LORA, scale: 1.0 }],
      image_size: { width: size, height: size },
      num_inference_steps: 28,
      guidance_scale: 3.5,
      output_format: 'png',
      num_images: 1,
    }),
  });
  const queue = await resp.json() as any;
  if (!queue.request_id) {
    console.log('  Queue failed:', JSON.stringify(queue).slice(0, 300));
    return null;
  }
  console.log(`  Queued: ${queue.request_id}`);

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const statusResp = await fetch(queue.response_url, {
      headers: { 'Authorization': `Key ${FAL_KEY}` },
    });
    if (statusResp.status === 200) {
      const result = await statusResp.json() as any;
      if (result.images?.length) {
        console.log('  FLUX complete');
        const imgResp = await fetch(result.images[0].url);
        return Buffer.from(new Uint8Array(await imgResp.arrayBuffer()));
      }
    }
    if (i % 5 === 4) console.log(`  Waiting... (${(i+1)*3}s)`);
  }
  console.log('  Timed out');
  return null;
}

// ==========================================
// Post-processing
// ==========================================

async function processTexture(raw: Buffer, targetPx: number, outputPx: number, colors: number): Promise<Buffer> {
  // 1. Nearest-neighbor downscale to tiny pixel resolution
  let buf = await sharp(raw)
    .resize(targetPx, targetPx, { kernel: sharp.kernel.nearest })
    .png()
    .toBuffer();

  // 2. Palette quantize at low res (no dithering for clean pixel edges)
  if (colors > 0) {
    buf = await sharp(buf)
      .png({ palette: true, colours: colors, dither: 0 })
      .toBuffer();
  }

  // 3. Nearest-neighbor upscale to output size
  buf = await sharp(buf)
    .resize(outputPx, outputPx, { kernel: sharp.kernel.nearest })
    .png()
    .toBuffer();

  return buf;
}

async function countColors(buf: Buffer): Promise<number> {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const colors = new Set<string>();
  for (let i = 0; i < data.length; i += info.channels) {
    colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);
  }
  return colors.size;
}

// ==========================================
// Biome terrain texture definitions
// ==========================================

interface BiomeTexture {
  name: string;
  prompt: string;
}

const biomeTextures: BiomeTexture[] = [
  {
    name: 'jungle-floor',
    prompt: [
      'smlstxtr,',
      'retro 16-bit SNES RPG terrain tileset tile,',
      'dense jungle forest floor ground, top-down overhead view,',
      'dark brown earth with scattered fallen leaves in ochre and olive,',
      'small green moss patches, tiny fern bits, thin exposed roots,',
      'limited muted earth-tone color palette, chunky visible pixel blocks,',
      'uniform density no focal point, flat game terrain texture,',
      'no perspective no shadows no depth, seamless texture',
    ].join(' '),
  },
  {
    name: 'mud-ground',
    prompt: [
      'smlstxtr,',
      'retro 16-bit SNES RPG terrain tileset tile,',
      'wet muddy ground surface, top-down overhead view,',
      'dark brown wet mud with small puddles, embedded pebbles and gravel,',
      'patches of darker wet areas, scattered debris,',
      'limited muted brown color palette, chunky visible pixel blocks,',
      'uniform density no focal point, flat game terrain texture,',
      'no perspective no shadows no depth, seamless texture',
    ].join(' '),
  },
  {
    name: 'river-bank',
    prompt: [
      'smlstxtr,',
      'retro 16-bit SNES RPG terrain tileset tile,',
      'muddy river bank ground, top-down overhead view,',
      'dark wet sand and silt with shallow water seepage,',
      'smooth river pebbles, bits of driftwood and reed stubble,',
      'limited muted grey-brown color palette, chunky visible pixel blocks,',
      'uniform density no focal point, flat game terrain texture,',
      'no perspective no shadows no depth, seamless texture',
    ].join(' '),
  },
  {
    name: 'tall-grass',
    prompt: [
      'smlstxtr,',
      'retro 16-bit SNES RPG terrain tileset tile,',
      'dense tall grass field ground, top-down overhead view,',
      'thick green grass blades covering ground, various shades of green,',
      'patches of yellow-green dry grass mixed in,',
      'limited green color palette, chunky visible pixel blocks,',
      'uniform density no focal point, flat game terrain texture,',
      'no perspective no shadows no depth, seamless texture',
    ].join(' '),
  },
];

// ==========================================
// Generate all
// ==========================================

// Settings - much more aggressive pixelation than v1
const TARGET_PX = 32;   // tiny pixel grid (was 64)
const OUTPUT_PX = 512;   // final size matching forestfloor.png
const COLORS = 24;       // limited palette (forestfloor has 30)
const FLUX_SIZE = 256;   // generate at smaller size for less detail

console.log('=== Terrain Texture Generation v2 ===');
console.log(`FLUX at ${FLUX_SIZE}px -> ${TARGET_PX}px pixelate -> ${COLORS} colors -> ${OUTPUT_PX}px output\n`);

// Clean up old v1 textures
const oldFiles = [
  'dense-jungle-floor.png', 'muddy-trail.png',
  'gemini-jungle-floor.png', 'gemini-jungle-floor_raw.png',
  'gemini-muddy-trail.png', 'gemini-muddy-trail_raw.png',
  'flux-jungle-floor.png', 'flux-jungle-floor_raw.png',
  'flux-muddy-trail.png', 'flux-muddy-trail_raw.png',
];
for (const f of oldFiles) {
  const p = `${OUT_DIR}/${f}`;
  if (existsSync(p)) { unlinkSync(p); console.log(`Cleaned: ${f}`); }
}

for (const tex of biomeTextures) {
  console.log(`\n--- ${tex.name} ---`);

  const raw = await fluxGenerate(tex.prompt, FLUX_SIZE);
  if (!raw) { console.log('  SKIPPED (generation failed)'); continue; }

  // Save raw for comparison
  await Bun.write(`${OUT_DIR}/${tex.name}_raw.png`, raw);
  const rawMeta = await sharp(raw).metadata();
  const rawColors = await countColors(raw);
  console.log(`  Raw: ${(raw.length/1024).toFixed(0)}KB, ${rawMeta.width}x${rawMeta.height}, ${rawColors} colors`);

  // Process to pixel art
  const processed = await processTexture(raw, TARGET_PX, OUTPUT_PX, COLORS);
  await Bun.write(`${OUT_DIR}/${tex.name}.png`, processed);
  const procColors = await countColors(processed);
  console.log(`  Final: ${(processed.length/1024).toFixed(0)}KB, ${OUTPUT_PX}x${OUTPUT_PX}, ${procColors} colors`);
}

console.log('\n=== Done! Review at http://localhost:3000/gallery ===');
console.log('Click 3x3/5x5/8x8 to verify seamless tiling');
