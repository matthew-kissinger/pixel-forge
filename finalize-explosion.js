import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';

async function processExplosion() {
  const inputPath = '/home/mkagent/repos/Space-Laser/assets/explosion_variation3.png';
  const outputPath = '/home/mkagent/repos/Space-Laser/assets/explosion.png';

  console.log('Processing explosion sprite sheet...');

  // Read the input image
  const image = sharp(inputPath);
  const metadata = await image.metadata();
  console.log(`Input: ${metadata.width}x${metadata.height}, ${metadata.format}`);

  // Resize to 256x64 (4 frames of 64x64)
  const resized = await image
    .resize(256, 64, {
      kernel: 'nearest', // Preserve pixel art sharpness
      fit: 'fill'
    })
    .png({
      compressionLevel: 9,
      palette: true, // Use indexed color
      quality: 100,
      colors: 256 // Reduce color palette
    })
    .toBuffer();

  writeFileSync(outputPath, resized);

  const sizeKB = (resized.length / 1024).toFixed(2);
  console.log(`Output: 256x64, ${sizeKB} KB`);

  if (resized.length > 51200) { // 50KB in bytes
    console.log(`⚠ Warning: File is ${sizeKB} KB, exceeds 50KB target`);

    // Try more aggressive optimization
    console.log('Attempting more aggressive optimization...');
    const optimized = await sharp(inputPath)
      .resize(256, 64, {
        kernel: 'nearest',
        fit: 'fill'
      })
      .png({
        compressionLevel: 9,
        palette: true,
        quality: 90,
        colors: 128 // Further reduce colors
      })
      .toBuffer();

    const optimizedSizeKB = (optimized.length / 1024).toFixed(2);
    console.log(`Optimized: ${optimizedSizeKB} KB`);

    if (optimized.length <= 51200) {
      writeFileSync(outputPath, optimized);
      console.log('✓ Optimized version saved');
    } else {
      console.log('Even optimized version exceeds 50KB, saving anyway');
    }
  } else {
    console.log('✓ File size is within 50KB limit');
  }
}

processExplosion().catch(console.error);
