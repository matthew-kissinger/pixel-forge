import sharp from 'sharp';
import { join } from 'path';

const OUTPUT_DIR = '/home/mkagent/repos/Space-Laser/assets';
const SOURCE = join(OUTPUT_DIR, 'background_variation4.png');
const FINAL = join(OUTPUT_DIR, 'background.png');

async function finalizeBackground() {
  console.log('Processing variation 4...\n');

  // Step 1: Resize from 1024x1024 to 2048x2048
  console.log('Resizing to 2048x2048...');
  const resized = await sharp(SOURCE)
    .resize(2048, 2048, {
      kernel: 'lanczos3', // High-quality scaling
      fit: 'fill'
    })
    .toBuffer();

  console.log('✓ Resized');

  // Step 2: Optimize to get under 500KB
  console.log('Optimizing file size...');

  // Try different compression levels to get under 500KB
  let quality = 90;
  let result;
  let finalBuffer;

  while (quality >= 70) {
    result = await sharp(resized)
      .png({
        quality: quality,
        compressionLevel: 9,
        adaptiveFiltering: true,
        palette: true // Use palette for better compression
      })
      .toBuffer();

    const sizeKB = result.length / 1024;
    console.log(`  Quality ${quality}: ${sizeKB.toFixed(2)} KB`);

    if (sizeKB < 500) {
      finalBuffer = result;
      break;
    }

    quality -= 5;
  }

  if (!finalBuffer) {
    console.log('Warning: Could not get under 500KB with quality >= 70');
    finalBuffer = result;
  }

  // Step 3: Save final
  await sharp(finalBuffer).toFile(FINAL);

  const finalSize = finalBuffer.length / 1024;
  console.log(`\n✓ Final background.png saved: ${finalSize.toFixed(2)} KB`);
  console.log(`  Size: 2048x2048`);
  console.log(`  Location: ${FINAL}`);

  // Create a verification tiled preview
  const tiled = await sharp(finalBuffer)
    .resize(1024, 1024) // Scale down for preview
    .toBuffer();

  const previewPath = join('/home/mkagent/repos/pixel-forge/output', 'background_final_tiled.png');
  await sharp({
    create: {
      width: 2048,
      height: 2048,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  })
    .composite([
      { input: tiled, top: 0, left: 0 },
      { input: tiled, top: 0, left: 1024 },
      { input: tiled, top: 1024, left: 0 },
      { input: tiled, top: 1024, left: 1024 }
    ])
    .png()
    .toFile(previewPath);

  console.log(`\n✓ Verification preview: ${previewPath}`);
}

finalizeBackground().catch(console.error);
