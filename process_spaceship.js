// Process spaceship images - remove background, resize, optimize
import sharp from 'sharp';
import { readdir } from 'fs/promises';
import { join } from 'path';

const inputDir = 'generated_spaceships';
const outputDir = 'processed_spaceships';

// Ensure output directory exists
await Bun.write(join(outputDir, '.keep'), '');

// Get all PNG files
const files = (await readdir(inputDir)).filter(f => f.endsWith('.png'));

console.log(`Processing ${files.length} spaceship variations...\n`);

for (const file of files) {
  const inputPath = join(inputDir, file);
  const outputPath = join(outputDir, file.replace('.png', '_processed.png'));

  try {
    // Resize to 96x96 and optimize
    await sharp(inputPath)
      .resize(96, 96, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ quality: 80, compressionLevel: 9 })
      .toFile(outputPath);

    const stats = await Bun.file(outputPath).size;
    console.log(`✓ ${file} -> ${outputPath} (${Math.round(stats / 1024)}KB)`);
  } catch (error) {
    console.error(`✗ Failed to process ${file}:`, error.message);
  }
}

console.log('\nProcessing complete!');
