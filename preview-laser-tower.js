#!/usr/bin/env node

/**
 * Create a preview of the laser tower at 4x scale for visual inspection
 */

import sharp from 'sharp';

const INPUT = '/home/mkagent/repos/Space-Laser/assets/laser_tower.png';
const OUTPUT = '/home/mkagent/repos/pixel-forge/output/laser_tower_preview_4x.png';

async function main() {
  console.log('Creating 4x preview for visual inspection...');

  await sharp(INPUT)
    .resize(256, 256, {
      fit: 'contain',
      background: { r: 64, g: 64, b: 64, alpha: 1 }, // Gray background for visibility
      kernel: sharp.kernel.nearest, // Pixel-perfect scaling
    })
    .png()
    .toFile(OUTPUT);

  console.log('✓ Preview saved to:', OUTPUT);
}

main().catch(console.error);
