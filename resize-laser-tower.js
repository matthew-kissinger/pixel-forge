#!/usr/bin/env node

/**
 * Resize and optimize laser tower sprite to 64x64px
 */

import sharp from 'sharp';
import fs from 'fs';

const INPUT = '/home/mkagent/repos/pixel-forge/output/laser_tower_variations/laser_tower_v2.png';
const OUTPUT = '/home/mkagent/repos/Space-Laser/assets/laser_tower.png';

async function main() {
  console.log('Resizing laser tower sprite...');
  console.log('Input:', INPUT);
  console.log('Output:', OUTPUT);

  // Ensure output directory exists
  const outputDir = '/home/mkagent/repos/Space-Laser/assets';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Resize to 64x64 with high-quality downscaling
  await sharp(INPUT)
    .resize(64, 64, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .png({
      compressionLevel: 9,
      quality: 100,
      palette: true, // Use palette for smaller file size
    })
    .toFile(OUTPUT);

  // Check file size
  const stats = fs.statSync(OUTPUT);
  const sizeKB = (stats.size / 1024).toFixed(2);

  console.log('\n✓ Resized successfully');
  console.log(`  Size: ${sizeKB} KB`);
  console.log(`  Target: < 50 KB`);

  if (stats.size > 50 * 1024) {
    console.warn('\n⚠ Warning: File size exceeds 50KB target');
  } else {
    console.log('\n✓ File size meets target');
  }
}

main().catch(console.error);
