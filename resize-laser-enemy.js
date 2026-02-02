#!/usr/bin/env node

import sharp from 'sharp';
import fs from 'fs/promises';

async function resizeLaserEnemy() {
  const inputPath = '/home/mkagent/repos/pixel-forge/output/laser_enemy_variations/laser_enemy_v2.png';
  const outputPath = '/home/mkagent/repos/Space-Laser/assets/laser_enemy.png';

  console.log('Resizing laser_enemy_v2.png to 16x32px...');

  try {
    await sharp(inputPath)
      .resize(16, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ compressionLevel: 9, palette: true })
      .toFile(outputPath);

    const stats = await fs.stat(outputPath);
    console.log(`✓ Saved: ${outputPath}`);
    console.log(`  Size: ${(stats.size / 1024).toFixed(1)}KB`);

    if (stats.size > 51200) {
      console.warn(`⚠ Warning: File size (${(stats.size / 1024).toFixed(1)}KB) exceeds 50KB target`);
    }
  } catch (error) {
    console.error('✗ Failed to resize:', error.message);
    process.exit(1);
  }
}

resizeLaserEnemy().catch(console.error);
