/**
 * Remaining biome terrain textures for Terror in the Jungle
 *
 * Already generated: jungle-floor, mud-ground, river-bank, tall-grass, rice-paddy
 * This batch: rocky highland, red laterite, bamboo floor, swamp, sandy beach,
 *             defoliated ground, firebase ground
 */

import sharp from 'sharp';
import { readFileSync } from 'fs';

const OUT_DIR = './war-assets/textures';
const envText = readFileSync('./packages/server/.env.local', 'utf8');
const FAL_KEY = envText.match(/FAL_KEY=(.+)/)?.[1]?.trim() || '';
const SEAMLESS_LORA = 'https://huggingface.co/gokaygokay/Flux-Seamless-Texture-LoRA/resolve/main/seamless_texture.safetensors';

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
  if (!queue.request_id) { console.log('  Failed:', JSON.stringify(queue).slice(0, 300)); return null; }
  console.log(`  Queued: ${queue.request_id}`);

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const s = await fetch(queue.response_url, { headers: { 'Authorization': `Key ${FAL_KEY}` } });
    if (s.status === 200) {
      const r = await s.json() as any;
      if (r.images?.length) {
        console.log('  Done');
        const img = await fetch(r.images[0].url);
        return Buffer.from(new Uint8Array(await img.arrayBuffer()));
      }
    }
    if (i % 5 === 4) console.log(`  Waiting... (${(i+1)*3}s)`);
  }
  return null;
}

async function processTexture(raw: Buffer): Promise<Buffer> {
  let buf = await sharp(raw).resize(32, 32, { kernel: sharp.kernel.nearest }).png().toBuffer();
  buf = await sharp(buf).png({ palette: true, colours: 24, dither: 0 }).toBuffer();
  buf = await sharp(buf).resize(512, 512, { kernel: sharp.kernel.nearest }).png().toBuffer();
  return buf;
}

interface BiomeTex { name: string; prompt: string; }

const textures: BiomeTex[] = [
  {
    name: 'rocky-highland',
    prompt: [
      'smlstxtr,',
      'retro 16-bit SNES RPG terrain tileset tile,',
      'rocky mountain terrain ground, top-down overhead view,',
      'exposed grey limestone rocks and tan sandstone fragments,',
      'sparse brown dry grass tufts growing between rocks,',
      'cracked weathered stone surface, Vietnam Central Highlands,',
      'limited grey and tan color palette, chunky visible pixel blocks,',
      'uniform density no focal point, flat game terrain texture,',
      'no perspective no shadows no depth, seamless texture',
    ].join(' '),
  },
  {
    name: 'red-laterite',
    prompt: [
      'smlstxtr,',
      'retro 16-bit SNES RPG terrain tileset tile,',
      'red laterite soil ground, top-down overhead view,',
      'dry cracked red-orange earth, Vietnam highland road surface,',
      'sparse loose gravel and small rocks on red dirt,',
      'characteristic Southeast Asian red clay soil,',
      'limited red-brown color palette, chunky visible pixel blocks,',
      'uniform density no focal point, flat game terrain texture,',
      'no perspective no shadows no depth, seamless texture',
    ].join(' '),
  },
  {
    name: 'bamboo-floor',
    prompt: [
      'smlstxtr,',
      'retro 16-bit SNES RPG terrain tileset tile,',
      'bamboo grove floor ground, top-down overhead view,',
      'carpet of narrow pale yellow fallen bamboo leaves on dark earth,',
      'thin bamboo root segments visible, dark soil patches between leaves,',
      'dappled shade from canopy above,',
      'limited pale yellow and dark brown color palette, chunky visible pixel blocks,',
      'uniform density no focal point, flat game terrain texture,',
      'no perspective no shadows no depth, seamless texture',
    ].join(' '),
  },
  {
    name: 'swamp',
    prompt: [
      'smlstxtr,',
      'retro 16-bit SNES RPG terrain tileset tile,',
      'tropical swamp marsh ground, top-down overhead view,',
      'dark stagnant water with green algae film on surface,',
      'patches of waterlogged dark mud, floating dead leaves and debris,',
      'murky green-brown wetland, Mekong Delta swamp,',
      'limited dark green and brown color palette, chunky visible pixel blocks,',
      'uniform density no focal point, flat game terrain texture,',
      'no perspective no shadows no depth, seamless texture',
    ].join(' '),
  },
  {
    name: 'sandy-beach',
    prompt: [
      'smlstxtr,',
      'retro 16-bit SNES RPG terrain tileset tile,',
      'wet tropical beach sand ground, top-down overhead view,',
      'damp tan sand with scattered small shells and pebbles,',
      'water-darkened patches where waves recede,',
      'Vietnam coastal beach surface,',
      'limited tan and beige color palette, chunky visible pixel blocks,',
      'uniform density no focal point, flat game terrain texture,',
      'no perspective no shadows no depth, seamless texture',
    ].join(' '),
  },
  {
    name: 'defoliated-ground',
    prompt: [
      'smlstxtr,',
      'retro 16-bit SNES RPG terrain tileset tile,',
      'dead barren ground after chemical defoliation, top-down overhead view,',
      'dry cracked grey-brown earth with dead grey tree stumps and branches,',
      'no living vegetation, ash-colored dead leaves scattered,',
      'bleak devastated terrain, Agent Orange aftermath,',
      'limited grey and dark brown color palette, chunky visible pixel blocks,',
      'uniform density no focal point, flat game terrain texture,',
      'no perspective no shadows no depth, seamless texture',
    ].join(' '),
  },
  {
    name: 'firebase-ground',
    prompt: [
      'smlstxtr,',
      'retro 16-bit SNES RPG terrain tileset tile,',
      'compacted military camp ground, top-down overhead view,',
      'hard packed brown dirt cleared of vegetation,',
      'tire tracks and boot prints pressed into dry earth,',
      'scattered small debris and gravel, military firebase perimeter,',
      'limited brown and tan color palette, chunky visible pixel blocks,',
      'uniform density no focal point, flat game terrain texture,',
      'no perspective no shadows no depth, seamless texture',
    ].join(' '),
  },
];

console.log(`=== Generating ${textures.length} biome textures ===\n`);

for (const tex of textures) {
  console.log(`--- ${tex.name} ---`);
  const raw = await fluxGenerate(tex.prompt, 256);
  if (!raw) { console.log('  SKIPPED\n'); continue; }

  await Bun.write(`${OUT_DIR}/${tex.name}_raw.png`, raw);
  console.log(`  Raw: ${(raw.length/1024).toFixed(0)}KB`);

  const processed = await processTexture(raw);
  await Bun.write(`${OUT_DIR}/${tex.name}.png`, processed);
  console.log(`  Final: ${(processed.length/1024).toFixed(0)}KB\n`);
}

console.log('=== Done! Review all at http://localhost:3000/gallery ===');
