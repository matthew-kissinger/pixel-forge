import { readFile, writeFile, stat, copyFile } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';

const OUTPUT_DIR = '/home/mkagent/repos/Space-Laser/assets';
const MAX_SIZE_KB = 500;

// Files that were successfully generated
const variations = [
  'background2_variation1.png',
  'background2_variation2.png',
  'background2_variation3.png',
  'background2_variation5.png'
];

async function getFileSize(filename) {
  const stats = await stat(join(OUTPUT_DIR, filename));
  return stats.size / 1024; // KB
}

async function optimizeImage(inputPath, outputPath) {
  try {
    console.log(`Optimizing ${inputPath}...`);

    const image = sharp(inputPath);
    const metadata = await image.metadata();

    console.log(`  Original: ${metadata.width}x${metadata.height}, ${metadata.format}`);

    // Try PNG optimization first
    let buffer = await image
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();

    let sizeKB = buffer.length / 1024;
    console.log(`  PNG optimized: ${sizeKB.toFixed(2)} KB`);

    // If still too large, try WebP with high quality
    if (sizeKB > MAX_SIZE_KB) {
      console.log('  Still too large, converting to WebP...');
      buffer = await sharp(inputPath)
        .webp({ quality: 90, effort: 6 })
        .toBuffer();

      sizeKB = buffer.length / 1024;
      console.log(`  WebP: ${sizeKB.toFixed(2)} KB`);

      // Update output path to .webp
      outputPath = outputPath.replace('.png', '.webp');
    }

    await writeFile(outputPath, buffer);
    console.log(`✓ Saved to ${outputPath} (${sizeKB.toFixed(2)} KB)`);

    return { path: outputPath, sizeKB };
  } catch (error) {
    console.error(`✗ Failed to optimize:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('Analyzing background2 variations...\n');

  // Get all file sizes
  const files = [];
  for (const filename of variations) {
    const size = await getFileSize(filename);
    files.push({ filename, sizeKB: size });
    console.log(`${filename}: ${size.toFixed(2)} KB`);
  }

  // Sort by size (smallest first)
  files.sort((a, b) => a.sizeKB - b.sizeKB);

  console.log(`\nSmallest file: ${files[0].filename} (${files[0].sizeKB.toFixed(2)} KB)`);

  // Check if smallest is under 500KB
  const selected = files[0];
  const inputPath = join(OUTPUT_DIR, selected.filename);
  const outputPath = join(OUTPUT_DIR, 'background2.png');

  if (selected.sizeKB <= MAX_SIZE_KB) {
    console.log(`\n✓ File size acceptable, copying directly...`);
    await copyFile(inputPath, outputPath);
    console.log(`✓ background2.png created (${selected.sizeKB.toFixed(2)} KB)`);
  } else {
    console.log(`\n⚠ File too large (${selected.sizeKB.toFixed(2)} KB > ${MAX_SIZE_KB} KB)`);
    console.log('Optimizing...');
    const result = await optimizeImage(inputPath, outputPath);
    console.log(`✓ background2.png created (${result.sizeKB.toFixed(2)} KB)`);
  }

  console.log('\n=== Cleanup ===');
  console.log('Variation files kept for reference. To remove:');
  console.log('rm /home/mkagent/repos/Space-Laser/assets/background2_variation*.png');
}

main().catch(console.error);
