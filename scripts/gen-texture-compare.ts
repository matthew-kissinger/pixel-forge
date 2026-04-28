/**
 * Texture comparison: Gemini Nano Banana vs fal-ai/flux-lora + Seamless LoRA
 *
 * Reference: forestfloor.png = 512x512, 30 colors, pixel art, tileable
 * Goal: match that aesthetic for jungle floor + muddy trail
 *
 * Both approaches get post-processed:
 *   1. Nearest-neighbor downscale to target px (64px)
 *   2. Upscale back to 512x512
 *   3. Palette quantization to ~24-32 colors
 */

import sharp from 'sharp';

const SERVER = 'http://localhost:3000';
const OUT_DIR = './war-assets/textures';
const FAL_KEY = process.env.FAL_KEY || (() => {
  // Read from .env.local
  const envFile = Bun.file('./packages/server/.env.local');
  const text = require('fs').readFileSync('./packages/server/.env.local', 'utf8');
  const match = text.match(/FAL_KEY=(.+)/);
  return match?.[1]?.trim() || '';
})();

const SEAMLESS_LORA = 'https://huggingface.co/gokaygokay/Flux-Seamless-Texture-LoRA/resolve/main/seamless_texture.safetensors';

// ==========================================
// Helpers
// ==========================================

async function pixelateAndQuantize(buf: Buffer, targetPx: number, outputPx: number, colors: number): Promise<Buffer> {
  // Step 1: nearest-neighbor downscale to target pixel resolution
  let result = await sharp(buf)
    .resize(targetPx, targetPx, { kernel: sharp.kernel.nearest })
    .png()
    .toBuffer();

  // Step 2: palette quantize at low resolution for cleanest results
  if (colors > 0) {
    result = await sharp(result)
      .png({ palette: true, colours: colors, dither: 0 })
      .toBuffer();
  }

  // Step 3: nearest-neighbor upscale to output size
  result = await sharp(result)
    .resize(outputPx, outputPx, { kernel: sharp.kernel.nearest })
    .png()
    .toBuffer();

  return result;
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
// Gemini Nano Banana
// ==========================================

async function geminiGenerate(prompt: string): Promise<Buffer | null> {
  console.log('  Calling Gemini Nano Banana...');
  try {
    const resp = await fetch(`${SERVER}/api/image/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, aspectRatio: '1:1' }),
    });
    const data = await resp.json() as { image?: string; error?: string };
    if (!data.image) {
      console.log('  Gemini failed:', data.error);
      return null;
    }
    console.log('  Gemini complete');
    const b64 = data.image.replace(/^data:image\/\w+;base64,/, '');
    return Buffer.from(b64, 'base64');
  } catch (e) {
    console.log('  Gemini error:', e);
    return null;
  }
}

// ==========================================
// fal-ai/flux-lora + Seamless Texture LoRA (via FAL queue API)
// ==========================================

async function fluxGenerate(prompt: string, size: number): Promise<Buffer | null> {
  console.log('  Queuing fal-ai/flux-lora + Seamless LoRA...');
  try {
    // Submit to queue
    const resp = await fetch('https://queue.fal.run/fal-ai/flux-lora', {
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
      console.log('  Queue failed:', JSON.stringify(queue).slice(0, 200));
      return null;
    }
    console.log(`  Queued: ${queue.request_id}`);

    // Poll for result
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const statusResp = await fetch(queue.response_url, {
        headers: { 'Authorization': `Key ${FAL_KEY}` },
      });
      if (statusResp.status === 200) {
        const result = await statusResp.json() as any;
        if (result.images?.length) {
          console.log('  fal-ai/flux-lora complete');
          const imgResp = await fetch(result.images[0].url);
          return Buffer.from(new Uint8Array(await imgResp.arrayBuffer()));
        }
      }
      if (i % 5 === 4) console.log(`  Waiting... (${(i+1)*3}s)`);
    }
    console.log('  Timed out after 180s');
    return null;
  } catch (e) {
    console.log('  FLUX error:', e);
    return null;
  }
}

// ==========================================
// Textures to generate
// ==========================================

interface TextureDef {
  name: string;
  geminiPrompt: string;
  fluxPrompt: string;
}

const textures: TextureDef[] = [
  {
    name: 'jungle-floor',
    geminiPrompt: [
      'Top-down overhead view of dense jungle forest floor terrain,',
      'scattered fallen leaves in brown ochre and dark green on dark wet earth,',
      'small green moss patches, tiny fern fronds, thin roots, scattered twigs,',
      'evenly distributed natural ground cover filling the entire frame edge to edge,',
      'seamless tileable game texture that repeats without visible seams,',
      'pixel art style with visible square pixels, hard edges, no anti-aliasing,',
      'limited palette of approximately 24-32 earth tone colors,',
      'SNES RPG terrain tileset aesthetic, no focal point, no framing, no vignette,',
      'the pattern should look continuous if placed next to copies of itself',
    ].join(' '),
    fluxPrompt: [
      'smlstxtr,',
      'top-down overhead view retro pixel art game terrain tile,',
      'dense jungle forest floor, fallen brown and dark green leaves scattered on dark wet earth,',
      'green moss patches, tiny ferns, thin roots, small twigs,',
      'evenly distributed natural organic ground cover,',
      'SNES RPG tileset style, limited color palette, hard pixel edges,',
      'no focal point, no framing, uniform density across entire image,',
      'seamless texture',
    ].join(' '),
  },
  {
    name: 'muddy-trail',
    geminiPrompt: [
      'Top-down overhead view of muddy jungle trail terrain,',
      'dark brown compacted wet earth with shallow rain puddles reflecting,',
      'small pebbles and loose gravel scattered across surface,',
      'boot impressions pressed into soft mud, tire track marks,',
      'edges of trail have flattened grass and crushed leaves,',
      'evenly distributed pattern filling entire frame edge to edge,',
      'seamless tileable game texture that repeats without visible seams,',
      'pixel art style with visible square pixels, hard edges, no anti-aliasing,',
      'limited palette of approximately 24-32 brown and grey colors,',
      'SNES RPG terrain tileset aesthetic, no focal point, no framing, no vignette,',
      'the pattern should look continuous if placed next to copies of itself',
    ].join(' '),
    fluxPrompt: [
      'smlstxtr,',
      'top-down overhead view retro pixel art game terrain tile,',
      'wet muddy jungle trail, dark brown compacted earth,',
      'shallow rain puddles, small pebbles and gravel,',
      'boot imprints in soft mud, flattened grass at edges,',
      'SNES RPG tileset style, limited color palette, hard pixel edges,',
      'no focal point, no framing, uniform density across entire image,',
      'seamless texture',
    ].join(' '),
  },
];

// ==========================================
// Main
// ==========================================

const POST_PROCESS = { targetPx: 64, outputPx: 512, colors: 32 };

console.log('=== Texture Generation Comparison ===');
console.log(`Post-process: ${POST_PROCESS.targetPx}px -> ${POST_PROCESS.outputPx}px, ${POST_PROCESS.colors} colors\n`);

// Delete old bad textures
const { unlinkSync, existsSync } = require('fs');
for (const old of ['dense-jungle-floor.png', 'muddy-trail.png']) {
  const p = `${OUT_DIR}/${old}`;
  if (existsSync(p)) { unlinkSync(p); console.log(`Deleted old: ${old}`); }
}

for (const tex of textures) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`TEXTURE: ${tex.name}`);
  console.log(`${'='.repeat(50)}`);

  // --- Gemini ---
  console.log('\n[Gemini Nano Banana]');
  const gemRaw = await geminiGenerate(tex.geminiPrompt);
  if (gemRaw) {
    await Bun.write(`${OUT_DIR}/gemini-${tex.name}_raw.png`, gemRaw);
    const rawColors = await countColors(gemRaw);
    const rawMeta = await sharp(gemRaw).metadata();
    console.log(`  Raw: ${(gemRaw.length/1024).toFixed(0)}KB, ${rawMeta.width}x${rawMeta.height}, ${rawColors} colors`);

    const processed = await pixelateAndQuantize(gemRaw, POST_PROCESS.targetPx, POST_PROCESS.outputPx, POST_PROCESS.colors);
    await Bun.write(`${OUT_DIR}/gemini-${tex.name}.png`, processed);
    const procColors = await countColors(processed);
    console.log(`  Processed: ${(processed.length/1024).toFixed(0)}KB, ${procColors} colors`);
  }

  // --- FAL texture default ---
  console.log('\n[fal-ai/flux-lora + Seamless LoRA]');
  const fluxRaw = await fluxGenerate(tex.fluxPrompt, 512);
  if (fluxRaw) {
    await Bun.write(`${OUT_DIR}/flux-${tex.name}_raw.png`, fluxRaw);
    const rawColors = await countColors(fluxRaw);
    const rawMeta = await sharp(fluxRaw).metadata();
    console.log(`  Raw: ${(fluxRaw.length/1024).toFixed(0)}KB, ${rawMeta.width}x${rawMeta.height}, ${rawColors} colors`);

    const processed = await pixelateAndQuantize(fluxRaw, POST_PROCESS.targetPx, POST_PROCESS.outputPx, POST_PROCESS.colors);
    await Bun.write(`${OUT_DIR}/flux-${tex.name}.png`, processed);
    const procColors = await countColors(processed);
    console.log(`  Processed: ${(processed.length/1024).toFixed(0)}KB, ${procColors} colors`);
  }
}

console.log('\n=== Done! ===');
console.log('Review all textures at: http://localhost:3000/gallery');
console.log('Use the 3x3/5x5/8x8 tile buttons to check seamless tiling');
