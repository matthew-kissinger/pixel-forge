#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const TEMP_DIR = '/tmp/hive2-variations';
const OUTPUT_DIR = '/home/mkagent/repos/Space-Laser/assets';

async function optimizeVariation(inputFile, index) {
  console.log(`\n🔧 Processing variation ${index}...`);

  try {
    const outputFile = path.join(TEMP_DIR, `hive2-v${index}-optimized.png`);

    // Resize to 192x192 and optimize
    await sharp(inputFile)
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({
        compressionLevel: 9,
        quality: 80,
        effort: 10,
      })
      .toFile(outputFile);

    const stats = fs.statSync(outputFile);
    const sizeKB = (stats.size / 1024).toFixed(2);
    const meetsRequirement = stats.size < 50 * 1024 ? '✅' : '⚠️';

    console.log(`${meetsRequirement} v${index}: ${sizeKB} KB (${stats.size < 50 * 1024 ? 'PASS' : 'FAIL'})`);

    return { index, file: outputFile, size: stats.size };
  } catch (error) {
    console.error(`❌ Failed to process v${index}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Optimizing hive2 variations...\n');

  // Process all 3 variations
  const results = [];
  for (let i = 1; i <= 3; i++) {
    const inputFile = path.join(TEMP_DIR, `hive2-v${i}.png`);
    if (!fs.existsSync(inputFile)) {
      console.log(`⏭️  Skipping v${i} - file not found`);
      continue;
    }
    const result = await optimizeVariation(inputFile, i);
    if (result) {
      results.push(result);
    }
  }

  if (results.length === 0) {
    console.error('\n❌ No variations were optimized successfully!');
    process.exit(1);
  }

  console.log('\n═══════════════════════════════════════');
  console.log('  Results Summary');
  console.log('═══════════════════════════════════════');

  // Sort by size
  results.sort((a, b) => a.size - b.size);

  results.forEach((r, idx) => {
    const sizeKB = (r.size / 1024).toFixed(2);
    const marker = idx === 0 ? ' ← BEST (smallest)' : '';
    const status = r.size < 50 * 1024 ? '✅' : '⚠️';
    console.log(`${status} v${r.index}: ${sizeKB} KB${marker}`);
  });

  const best = results[0];
  const bestSizeKB = (best.size / 1024).toFixed(2);

  // Copy best variation to output
  const finalOutput = path.join(OUTPUT_DIR, 'hive2.png');
  fs.copyFileSync(best.file, finalOutput);

  console.log(`\n🏆 Selected: v${best.index} (${bestSizeKB} KB)`);
  console.log(`✅ Saved to: ${finalOutput}`);

  console.log(`\n📁 All variations available at: ${TEMP_DIR}`);
  console.log('   Review them visually to ensure quality!\n');
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
