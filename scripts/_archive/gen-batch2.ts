// Batch 2: More Vegetation (3 sprites) + Terrain Textures (2 tileable)
// Pipeline: Gemini generate -> BiRefNet bg remove -> magenta pixel cleanup via Sharp
// Textures: Gemini generate only (no bg removal, no cleanup)

import sharp from 'sharp';

const SERVER = 'http://localhost:3000';

// Pixel art style for sprites (magenta bg)
const SPRITE_STYLE = '32-bit pixel art sprite, high-res pixel art style, detailed with visible pixels, bright saturated colors, black pixel outlines, clean hard edges, no anti-aliasing, no blur, game asset on solid magenta #FF00FF background, entire background is flat solid magenta with no gradients';

// Pixel art style for tileable textures (no bg removal)
const TEXTURE_STYLE = 'seamless tileable texture, overhead top-down view, 32-bit pixel art style, detailed with visible pixels, bright saturated colors';

interface Asset {
  name: string;
  subject: string;
  outDir: string;
  type: 'sprite' | 'texture';
}

const assets: Asset[] = [
  // 3 vegetation sprites (magenta bg, full pipeline)
  {
    name: 'dipterocarp-giant',
    subject: 'Giant dipterocarp tree, massive straight trunk with buttress roots at base, wide spreading dark green canopy high above, old-growth tropical rainforest tree, full tree from roots to crown, side view',
    outDir: './war-assets/vegetation',
    type: 'sprite',
  },
  {
    name: 'banyan-tree',
    subject: 'Large strangler fig banyan tree, aerial roots hanging from thick branches down to ground, twisted gnarled trunk, dense dark green canopy, jungle landmark tree, side view',
    outDir: './war-assets/vegetation',
    type: 'sprite',
  },
  {
    name: 'bamboo-grove',
    subject: 'Dense bamboo grove, tall green canes growing close together, characteristic nodes on stems, narrow leaves at top, thick cluster of bamboo stalks, side view',
    outDir: './war-assets/vegetation',
    type: 'sprite',
  },
  // 2 tileable textures (no bg removal)
  {
    name: 'dense-jungle-floor',
    subject: 'Dense jungle floor, fallen leaves in various stages of decay brown yellow dark green, exposed roots, small ferns, wet earth, dappled shade',
    outDir: './war-assets/textures',
    type: 'texture',
  },
  {
    name: 'muddy-trail',
    subject: 'Muddy jungle trail, wet brown earth with boot impressions, small puddles, scattered pebbles, flattened grass edges, worn dirt path',
    outDir: './war-assets/textures',
    type: 'texture',
  },
];

/**
 * Post-process: replace remaining magenta-ish pixels with transparency.
 * BiRefNet misses small interior gaps where bg shows through foliage.
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

const total = assets.length;

for (const [i, asset] of assets.entries()) {
  const isSprite = asset.type === 'sprite';
  const prompt = isSprite
    ? `${asset.subject}, ${SPRITE_STYLE}`
    : `${asset.subject}, ${TEXTURE_STYLE}`;

  console.log(`\n[${i + 1}/${total}] ${asset.name} (${asset.type})`);

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

  const rawBase64 = genData.image.replace(/^data:image\/\w+;base64,/, '');
  const rawBuf = Buffer.from(rawBase64, 'base64');

  if (isSprite) {
    // Save raw (magenta bg) for sprites
    await Bun.write(`${asset.outDir}/${asset.name}_raw.png`, rawBuf);
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
    await Bun.write(`${asset.outDir}/${asset.name}.png`, cleanBuf);
    console.log(`  Final: ${(cleanBuf.length / 1024).toFixed(0)}KB`);
  } else {
    // Textures: save directly, no bg removal
    await Bun.write(`${asset.outDir}/${asset.name}.png`, rawBuf);
    console.log(`  Saved: ${(rawBuf.length / 1024).toFixed(0)}KB (tileable texture, no bg removal)`);
  }
}

console.log('\nBatch 2 complete! Review at http://localhost:3000/gallery');
