/**
 * Bamboo floor redo
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

const prompt = [
  'smlstxtr,',
  'retro 16-bit SNES RPG terrain tileset tile,',
  'dense bamboo forest floor ground, top-down overhead view,',
  'thick layer of fallen narrow bamboo leaves covering dark brown earth,',
  'uniform dense leaf cover, dark green and brown bamboo leaves on dark soil,',
  'dark bamboo forest palette: dark brown, dark olive green, dark green, deep brown,',
  'uniform density, dark but not black, no sand, no yellow, no white,',
  'limited color palette, chunky visible pixel blocks,',
  'uniform density no focal point, flat game terrain texture,',
  'no perspective no shadows no depth, seamless texture',
].join(' ');

console.log('Regenerating bamboo-floor...\n');

const raw = await fluxGenerate(prompt, 256);
if (!raw) { console.log('FAILED'); process.exit(1); }

await Bun.write(`${OUT_DIR}/bamboo-floor_raw.png`, raw);
console.log(`  Raw: ${(raw.length/1024).toFixed(0)}KB`);

let buf = await sharp(raw).resize(32, 32, { kernel: sharp.kernel.nearest }).png().toBuffer();
buf = await sharp(buf).png({ palette: true, colours: 24, dither: 0 }).toBuffer();
buf = await sharp(buf).resize(512, 512, { kernel: sharp.kernel.nearest }).png().toBuffer();
await Bun.write(`${OUT_DIR}/bamboo-floor.png`, buf);
console.log(`  Final: ${(buf.length/1024).toFixed(0)}KB`);

console.log('\nDone! Check gallery');
