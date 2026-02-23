/**
 * Clean all terrain textures - replace near-black pixels with nearest dark non-black color.
 *
 * Process:
 * 1. Read the _raw.png for each texture
 * 2. Downscale to 32px (nearest-neighbor)
 * 3. Quantize to 24 colors
 * 4. Replace any near-black pixels (brightness < threshold) with nearest non-black color
 * 5. Upscale to 512px
 * 6. Overwrite the final texture
 */

import sharp from 'sharp';
import { readdirSync } from 'fs';

const OUT_DIR = './war-assets/textures';
const BLACK_THRESHOLD = 40; // RGB values below this sum are considered "black"

// Get all texture names (from _raw.png files)
const rawFiles = readdirSync(OUT_DIR)
  .filter(f => f.endsWith('_raw.png'))
  .map(f => f.replace('_raw.png', ''));

console.log(`Found ${rawFiles.length} textures to clean:\n  ${rawFiles.join(', ')}\n`);

async function cleanTexture(name: string) {
  const rawPath = `${OUT_DIR}/${name}_raw.png`;
  const outPath = `${OUT_DIR}/${name}.png`;

  console.log(`Processing ${name}...`);

  // Step 1: Read raw and downscale to 32px
  const raw = await Bun.file(rawPath).arrayBuffer();
  let buf = await sharp(Buffer.from(raw))
    .resize(32, 32, { kernel: sharp.kernel.nearest })
    .png()
    .toBuffer();

  // Step 2: Quantize to 24 colors
  buf = await sharp(buf)
    .png({ palette: true, colours: 24, dither: 0 })
    .toBuffer();

  // Step 3: Get raw RGBA pixel data at 32x32
  const { data, info } = await sharp(buf)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data.buffer);
  const w = info.width;
  const h = info.height;

  // Build palette of non-black colors in the image
  const nonBlackColors: Array<[number, number, number]> = [];
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    if (r + g + b >= BLACK_THRESHOLD) {
      // Check if this color is already in our list
      const exists = nonBlackColors.some(c => c[0] === r && c[1] === g && c[2] === b);
      if (!exists) nonBlackColors.push([r, g, b]);
    }
  }

  if (nonBlackColors.length === 0) {
    console.log(`  WARNING: No non-black colors found! Skipping.`);
    return;
  }

  // Step 4: Replace black pixels with nearest non-black neighbor
  let replaced = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    if (r + g + b < BLACK_THRESHOLD) {
      // Find nearest non-black color by Euclidean distance
      let bestDist = Infinity;
      let bestColor: [number, number, number] = nonBlackColors[0];

      // First try to find the nearest non-black neighbor pixel
      const px = (i / 4) % w;
      const py = Math.floor((i / 4) / w);
      const neighbors: Array<[number, number, number]> = [];

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = (px + dx + w) % w; // wrap for seamless
          const ny = (py + dy + h) % h;
          const ni = (ny * w + nx) * 4;
          const nr = pixels[ni], ng = pixels[ni + 1], nb = pixels[ni + 2];
          if (nr + ng + nb >= BLACK_THRESHOLD) {
            neighbors.push([nr, ng, nb]);
          }
        }
      }

      if (neighbors.length > 0) {
        // Average of non-black neighbors
        let sumR = 0, sumG = 0, sumB = 0;
        for (const [nr, ng, nb] of neighbors) {
          sumR += nr; sumG += ng; sumB += nb;
        }
        bestColor = [
          Math.round(sumR / neighbors.length),
          Math.round(sumG / neighbors.length),
          Math.round(sumB / neighbors.length),
        ];
      } else {
        // Fallback: find darkest non-black color in palette
        let darkestBrightness = Infinity;
        for (const [cr, cg, cb] of nonBlackColors) {
          const brightness = cr + cg + cb;
          if (brightness < darkestBrightness) {
            darkestBrightness = brightness;
            bestColor = [cr, cg, cb];
          }
        }
      }

      pixels[i] = bestColor[0];
      pixels[i + 1] = bestColor[1];
      pixels[i + 2] = bestColor[2];
      replaced++;
    }
  }

  console.log(`  Replaced ${replaced} black pixels (of ${w * h} total, ${(replaced / (w * h) * 100).toFixed(1)}%)`);
  console.log(`  Palette: ${nonBlackColors.length} non-black colors`);

  // Step 5: Reconstruct image and upscale to 512
  buf = await sharp(Buffer.from(pixels), { raw: { width: w, height: h, channels: 4 } })
    .png({ palette: true, colours: 24, dither: 0 })
    .toBuffer();

  buf = await sharp(buf)
    .resize(512, 512, { kernel: sharp.kernel.nearest })
    .png()
    .toBuffer();

  await Bun.write(outPath, buf);
  console.log(`  Output: ${(buf.length / 1024).toFixed(0)}KB\n`);
}

// Process all textures
for (const name of rawFiles) {
  await cleanTexture(name);
}

console.log('Done! Check http://localhost:3000/gallery');
