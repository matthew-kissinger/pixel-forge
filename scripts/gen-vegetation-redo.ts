/**
 * Regenerate vegetation sprites with proper pipeline:
 * Gemini generate -> BiRefNet bg removal -> magenta chroma cleanup
 */

import sharp from 'sharp';

const SERVER = 'http://localhost:3000';
const OUT_BASE = './war-assets/vegetation';

// Style suffix - append to every sprite prompt
const STYLE_SUFFIX = '32-bit pixel art sprite, high-res pixel art style, detailed with visible pixels, bright saturated colors, black pixel outlines, clean hard edges, no anti-aliasing, no blur, game asset on solid magenta #FF00FF background, entire background is flat solid magenta #FF00FF with no gradients';

const assets = [
  {
    name: 'banana-plant',
    prompt: `Single banana plant, thick green trunk, three large broad bright green paddle leaves spreading outward, small bunch of green bananas at top, full plant from base to crown visible, isolated on flat ground, side view, ${STYLE_SUFFIX}`,
  },
  {
    name: 'rice-paddy-plants',
    prompt: `Dense cluster of young rice plants, thin bright green stalks growing upward in a tight bunch, narrow grass-like leaves, short 1m tall rice seedling cluster, full plant visible from roots to tips, isolated, side view, ${STYLE_SUFFIX}`,
  },
  {
    name: 'mangrove',
    prompt: `Full mangrove tree, tangled arching prop roots at base spreading wide, thick trunk, dense rounded dark green leaf canopy on top, entire tree visible from roots to crown, tropical coastal tree, isolated, side view, ${STYLE_SUFFIX}`,
  },
  {
    name: 'elephant-grass',
    prompt: `Tall dense cluster of elephant grass, bright green blades 2m tall growing in a thick clump, feathery silver-white seed plumes at the tips, strong visible black outlines on each blade, full grass clump from base to tips, isolated, side view, ${STYLE_SUFFIX}`,
  },
];

async function apiPost(endpoint: string, body: Record<string, unknown>) {
  const resp = await fetch(`${SERVER}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(`API ${endpoint} failed (${resp.status}): ${JSON.stringify(err)}`);
  }
  return resp.json() as Promise<Record<string, unknown>>;
}

/**
 * Remove magenta chroma key pixels after BiRefNet.
 * Magenta = high R, low G, high B.
 */
async function chromaCleanMagenta(imageBuffer: Buffer, tolerance: number = 60): Promise<Buffer> {
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const pixels = new Uint8Array(data.buffer);
  let cleaned = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];

    // Magenta: R high, G low, B high (and R ~ B)
    const isMagenta = r > 150 && b > 150 && g < 100 && Math.abs(r - b) < tolerance;

    // Also catch pinkish magenta remnants
    const isPinkish = r > 180 && b > 130 && g < 120 && (r + b) > (g * 4);

    if (isMagenta || isPinkish) {
      pixels[i + 3] = 0; // Make transparent
      cleaned++;
    }
  }

  console.log(`  Chroma cleanup: removed ${cleaned} magenta pixels`);

  return sharp(Buffer.from(pixels), { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}

async function generateSprite(name: string, prompt: string) {
  console.log(`\n=== ${name} ===`);
  console.log(`  Prompt: ${prompt.slice(0, 80)}...`);

  // Step 1: Generate with Gemini
  console.log('  Generating...');
  const genResult = await apiPost('image/generate', {
    prompt,
    aspectRatio: '1:1',
  });

  if (!genResult.image) throw new Error('No image in response');

  // Save raw
  const rawBase64 = (genResult.image as string).replace(/^data:image\/\w+;base64,/, '');
  const rawBuffer = Buffer.from(rawBase64, 'base64');
  await Bun.write(`${OUT_BASE}/${name}_raw.png`, rawBuffer);
  console.log(`  Raw: ${(rawBuffer.length / 1024).toFixed(0)}KB`);

  // Step 2: BiRefNet bg removal
  console.log('  Removing background (BiRefNet)...');
  const bgResult = await apiPost('image/remove-bg', { image: genResult.image });
  if (!bgResult.image) throw new Error('BiRefNet failed');

  const bgBase64 = (bgResult.image as string).replace(/^data:image\/\w+;base64,/, '');
  const bgBuffer = Buffer.from(bgBase64, 'base64');
  console.log(`  After BiRefNet: ${(bgBuffer.length / 1024).toFixed(0)}KB`);

  // Step 3: Magenta chroma cleanup
  console.log('  Cleaning magenta residue...');
  const cleanBuffer = await chromaCleanMagenta(bgBuffer);

  await Bun.write(`${OUT_BASE}/${name}.png`, cleanBuffer);
  console.log(`  Final: ${(cleanBuffer.length / 1024).toFixed(0)}KB`);
}

// Check server
try {
  const health = await fetch(`${SERVER}/health`);
  if (!health.ok) throw new Error('not ok');
} catch {
  console.error('Server not reachable. Start with: bun run dev:server');
  process.exit(1);
}

console.log(`Regenerating ${assets.length} vegetation sprites with chroma cleanup...\n`);

for (const asset of assets) {
  try {
    await generateSprite(asset.name, asset.prompt);
  } catch (err) {
    console.error(`  FAILED: ${err instanceof Error ? err.message : err}`);
  }
}

console.log('\n\nDone! Check http://localhost:3000/gallery');
