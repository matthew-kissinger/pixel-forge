// Generate tileable pixel art textures via FLUX + Seamless Texture LoRA
// Uses the new /api/image/generate-texture endpoint
// Overwrites any existing textures in war-assets/textures/

const SERVER = 'http://localhost:3000';
const OUT_DIR = './war-assets/textures';

const textures = [
  {
    name: 'dense-jungle-floor',
    description: 'dense jungle forest floor, fallen leaves in brown yellow and dark green, exposed tree roots, small ferns, wet dark earth, scattered twigs',
  },
  {
    name: 'muddy-trail',
    description: 'wet muddy jungle trail, dark brown earth with boot impressions, shallow puddles, scattered pebbles, flattened grass edges, worn dirt path',
  },
];

for (const [i, tex] of textures.entries()) {
  console.log(`\n[${i + 1}/${textures.length}] ${tex.name}`);

  const resp = await fetch(`${SERVER}/api/image/generate-texture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: tex.description,
      size: 512,
      pixelate: true,
      pixelateTarget: 128,
      paletteColors: 0,
    }),
  });

  const data = (await resp.json()) as { image?: string; size?: number; dimensions?: { width: number; height: number }; error?: string };

  if (!data.image) {
    console.log(`  FAILED: ${data.error || 'no image'}`);
    continue;
  }

  const base64 = data.image.replace(/^data:image\/\w+;base64,/, '');
  const buf = Buffer.from(base64, 'base64');
  await Bun.write(`${OUT_DIR}/${tex.name}.png`, buf);
  console.log(`  Saved: ${(buf.length / 1024).toFixed(0)}KB (${data.dimensions?.width}x${data.dimensions?.height})`);
}

console.log('\nTextures complete! Review at http://localhost:3000/gallery');
