import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const inputFile = 'output/shield_variation_2.png';
const outputFile = '../Space-Laser/assets/shield.png';

async function processShield() {
  console.log('Processing shield asset...');
  console.log(`Input: ${inputFile}`);

  try {
    // Read the input image
    const image = sharp(inputFile);
    const metadata = await image.metadata();

    console.log(`Original size: ${metadata.width}x${metadata.height}`);

    // Process the image:
    // 1. Extract the shield dome from the center
    // 2. Resize to 128x128
    // 3. Optimize for file size

    // Calculate square extraction area from center
    const size = Math.min(metadata.width, metadata.height);
    const extractLeft = Math.floor((metadata.width - size) / 2);
    const extractTop = Math.floor((metadata.height - size) / 2);

    const processed = await image
      // Extract a square region from the center focusing on the shield
      .extract({
        left: extractLeft,
        top: extractTop,
        width: size,
        height: size
      })
      // Resize to 128x128 with high quality
      .resize(128, 128, {
        kernel: sharp.kernel.lanczos3,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      // Optimize PNG
      .png({
        quality: 90,
        compressionLevel: 9,
        palette: true, // Use palette-based compression
        colors: 256 // Limit to 256 colors
      })
      .toBuffer();

    // Ensure output directory exists
    const outputDir = join(outputFile, '..');
    mkdirSync(outputDir, { recursive: true });

    // Write the processed image
    writeFileSync(outputFile, processed);

    const sizeKB = (processed.length / 1024).toFixed(2);
    console.log(`\n✓ Shield asset created!`);
    console.log(`  Output: ${outputFile}`);
    console.log(`  Size: 128x128`);
    console.log(`  File size: ${sizeKB} KB`);

    if (processed.length > 50 * 1024) {
      console.log(`\n⚠ Warning: File size exceeds 50 KB target`);
      console.log(`  Trying more aggressive compression...`);

      // More aggressive compression
      const compressed = await sharp(processed)
        .png({
          quality: 80,
          compressionLevel: 9,
          palette: true,
          colors: 128 // Reduce to 128 colors
        })
        .toBuffer();

      writeFileSync(outputFile, compressed);
      const compressedSizeKB = (compressed.length / 1024).toFixed(2);
      console.log(`  New size: ${compressedSizeKB} KB`);
    }

  } catch (error) {
    console.error('Error processing shield:', error);
    process.exit(1);
  }
}

processShield();
