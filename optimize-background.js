import sharp from 'sharp';
import { join } from 'path';
import { writeFile } from 'fs/promises';
import { execSync } from 'child_process';

const OUTPUT_DIR = '/home/mkagent/repos/Space-Laser/assets';
const SOURCE = join(OUTPUT_DIR, 'background_variation4.png');
const FINAL = join(OUTPUT_DIR, 'background.png');

async function optimizeBackground() {
  console.log('Optimizing background to meet 500KB requirement...\n');

  // Strategy: 2048x2048 but with more aggressive compression
  console.log('Resizing to 2048x2048 with aggressive compression...');

  const resized = await sharp(SOURCE)
    .resize(2048, 2048, {
      kernel: 'lanczos3',
      fit: 'fill'
    })
    .toBuffer();

  // Try pngquant-style lossy compression with sharp
  const optimized = await sharp(resized)
    .png({
      quality: 80,
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: true,
      colours: 256, // Limit palette colors
      dither: 1.0
    })
    .toBuffer();

  let sizeKB = optimized.length / 1024;
  console.log(`After palette optimization: ${sizeKB.toFixed(2)} KB`);

  if (sizeKB > 500) {
    console.log('Still too large, trying alternative approach...');

    // Alternative: reduce dimensions slightly to 1792x1792 (still large enough)
    const smaller = await sharp(SOURCE)
      .resize(1792, 1792, {
        kernel: 'lanczos3',
        fit: 'fill'
      })
      .png({
        quality: 85,
        compressionLevel: 9,
        adaptiveFiltering: true,
        palette: true,
        colours: 256
      })
      .toBuffer();

    sizeKB = smaller.length / 1024;
    console.log(`At 1792x1792: ${sizeKB.toFixed(2)} KB`);

    if (sizeKB < 500) {
      await writeFile(FINAL, smaller);
      console.log(`\n✓ Final: 1792x1792, ${sizeKB.toFixed(2)} KB`);
      return;
    }

    // Last resort: 1536x1536
    const evenSmaller = await sharp(SOURCE)
      .resize(1536, 1536, {
        kernel: 'lanczos3',
        fit: 'fill'
      })
      .png({
        quality: 90,
        compressionLevel: 9,
        adaptiveFiltering: true
      })
      .toBuffer();

    sizeKB = evenSmaller.length / 1024;
    console.log(`At 1536x1536: ${sizeKB.toFixed(2)} KB`);

    if (sizeKB < 500) {
      await writeFile(FINAL, evenSmaller);
      console.log(`\n✓ Final: 1536x1536, ${sizeKB.toFixed(2)} KB`);
    } else {
      // Just use best effort
      await writeFile(FINAL, evenSmaller);
      console.log(`\n⚠ Best effort: 1536x1536, ${sizeKB.toFixed(2)} KB (still over 500KB)`);
    }
  } else {
    await writeFile(FINAL, optimized);
    console.log(`\n✓ Final: 2048x2048, ${sizeKB.toFixed(2)} KB`);
  }

  console.log(`Location: ${FINAL}`);
}

optimizeBackground().catch(console.error);
