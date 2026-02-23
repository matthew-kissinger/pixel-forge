// Batch 1 v4: Vegetation Billboards - pixel art + magenta bg + cleanup
// Pipeline: Gemini generate -> BiRefNet bg remove -> magenta pixel cleanup via Sharp

import sharp from 'sharp';

const SERVER = 'http://localhost:3000';
const OUT_DIR = './war-assets/vegetation';

// Pixel art style matching existing game assets
const STYLE = '32-bit pixel art sprite, high-res pixel art style, detailed with visible pixels, bright saturated colors, black pixel outlines, clean hard edges, no anti-aliasing, no blur, game asset on solid magenta #FF00FF background, entire background is flat solid magenta with no gradients';

const assets = [
  {
    name: 'jungle-fern',
    subject: 'Dense thick cluster of tropical jungle ferns, bright green fronds overlapping densely, compact low undergrowth bush, no gaps showing through the plant, side view',
  },
  {
    name: 'elephant-ear-plants',
    subject: 'Dense cluster of elephant ear plants with large overlapping heart-shaped dark green leaves, thick stems, compact bush shape, no gaps between leaves, side view',
  },
  {
    name: 'fan-palm-cluster',
    subject: 'Dense fan palm cluster with overlapping circular fan-shaped bright green fronds on slender stems, compact shape, side view',
  },
  {
    name: 'coconut-palm',
    subject: 'Coconut palm tree, full view from base to crown, curved brown trunk, drooping bright green fronds with coconut clusters, side view',
  },
  {
    name: 'areca-palm-cluster',
    subject: 'Cluster of 3 areca palms, slender ringed golden trunks, feathery bright green fronds at top, side view',
  },
];

/**
 * Post-process: replace remaining magenta-ish pixels with transparency.
 * BiRefNet misses small interior gaps where bg shows through foliage.
 * Detects pixels with high magenta hue (H ~280-320) and high saturation.
 */
async function cleanupMagenta(inputBuffer: Buffer): Promise<Buffer> {
  const image = sharp(inputBuffer).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data.buffer);
  let cleaned = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    // Detect magenta-ish pixels: high red, low green, high blue
    // Magenta is R>150, G<100, B>150 with R and B both significantly higher than G
    if (r > 150 && g < 100 && b > 150 && (r - g) > 80 && (b - g) > 80) {
      pixels[i + 3] = 0; // Set alpha to 0 (transparent)
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

  console.log(`\n[${i + 1}/5] ${asset.name}`);

  // 1. Generate via Gemini
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

  // Save raw (magenta bg)
  const rawBase64 = genData.image.replace(/^data:image\/\w+;base64,/, '');
  const rawBuf = Buffer.from(rawBase64, 'base64');
  await Bun.write(`${OUT_DIR}/${asset.name}_raw.png`, rawBuf);
  console.log(`  Raw: ${(rawBuf.length / 1024).toFixed(0)}KB`);

  // 2. Remove background via BiRefNet
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

  // 3. Cleanup remaining magenta pixels
  const cleanBuf = await cleanupMagenta(bgBuf);
  await Bun.write(`${OUT_DIR}/${asset.name}.png`, cleanBuf);
  console.log(`  Final: ${(cleanBuf.length / 1024).toFixed(0)}KB`);
}

console.log('\nBatch 1 v4 complete! Review at http://localhost:3000/gallery');
