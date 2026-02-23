// Batch 2 redo: Bamboo Grove (smaller, fewer canes) + Banyan Tree (pixel art, not painterly)
// Pipeline: Gemini generate -> BiRefNet bg remove -> magenta pixel cleanup via Sharp

import sharp from 'sharp';

const SERVER = 'http://localhost:3000';
const OUT_DIR = './war-assets/vegetation';

const STYLE = '32-bit pixel art sprite, high-res pixel art style, detailed with visible pixels, bright saturated colors, black pixel outlines, clean hard edges, no anti-aliasing, no blur, game asset on solid magenta #FF00FF background, entire background is flat solid magenta with no gradients';

const assets = [
  {
    name: 'bamboo-grove',
    subject: 'Small cluster of 4-5 bamboo stalks, tall green canes with characteristic nodes, narrow leaves at top, simple compact shape, side view',
  },
  {
    name: 'banyan-tree',
    subject: 'Large banyan tree with aerial roots hanging from thick branches, twisted gnarled brown trunk, dense dark green leaf canopy, side view',
  },
];

async function cleanupMagenta(inputBuffer: Buffer): Promise<Buffer> {
  const image = sharp(inputBuffer).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data.buffer);
  let cleaned = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    if (r > 150 && g < 100 && b > 150 && (r - g) > 80 && (b - g) > 80) {
      pixels[i + 3] = 0;
      cleaned++;
    }
  }

  console.log(`  Cleanup: ${cleaned} magenta pixels removed`);

  return sharp(Buffer.from(pixels.buffer), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

for (const [i, asset] of assets.entries()) {
  const prompt = `${asset.subject}, ${STYLE}`;

  console.log(`\n[${i + 1}/2] ${asset.name}`);

  const genResp = await fetch(`${SERVER}/api/image/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspectRatio: '1:1' }),
  });
  const genData = (await genResp.json()) as { image?: string; error?: string };

  if (!genData.image) {
    console.log(`  FAILED: ${genData.error || 'no image'}`);
    continue;
  }

  const rawBase64 = genData.image.replace(/^data:image\/\w+;base64,/, '');
  const rawBuf = Buffer.from(rawBase64, 'base64');
  await Bun.write(`${OUT_DIR}/${asset.name}_raw.png`, rawBuf);
  console.log(`  Raw: ${(rawBuf.length / 1024).toFixed(0)}KB`);

  const bgResp = await fetch(`${SERVER}/api/image/remove-bg`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: genData.image }),
  });
  const bgData = (await bgResp.json()) as { image?: string; error?: string };

  if (!bgData.image) {
    console.log(`  BG removal failed: ${bgData.error || 'no image'}`);
    continue;
  }

  const bgBase64 = bgData.image.replace(/^data:image\/\w+;base64,/, '');
  const bgBuf = Buffer.from(bgBase64, 'base64');

  const cleanBuf = await cleanupMagenta(bgBuf);
  await Bun.write(`${OUT_DIR}/${asset.name}.png`, cleanBuf);
  console.log(`  Final: ${(cleanBuf.length / 1024).toFixed(0)}KB`);
}

console.log('\nRedo complete! Review at http://localhost:3000/gallery');
