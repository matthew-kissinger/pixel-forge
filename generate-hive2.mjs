#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SERVER_URL = 'http://localhost:3000';
const OUTPUT_DIR = '/home/mkagent/repos/Space-Laser/assets';
const TEMP_DIR = '/tmp/hive2-variations';

// Create temp directory
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const PROMPT = `Alien hive with tentacle growths, organic spawner, pulsing magenta energy, space coral structure, top-down game sprite, transparent background, 192x192 pixels, game asset, clean silhouette, bioluminescent sci-fi style`;

async function generateVariation(index) {
  console.log(`\n🎨 Generating variation ${index}...`);

  try {
    const response = await fetch(`${SERVER_URL}/api/image/generate-smart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: PROMPT }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Generation failed: ${error.error || response.statusText}`);
    }

    const data = await response.json();

    // Save base64 image to file
    const base64Data = data.image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const tempFile = path.join(TEMP_DIR, `hive2-v${index}.png`);
    fs.writeFileSync(tempFile, buffer);

    const sizeKB = (buffer.length / 1024).toFixed(2);
    console.log(`✅ Variation ${index} saved: ${tempFile} (${sizeKB} KB)`);

    return { index, file: tempFile, size: buffer.length };
  } catch (error) {
    console.error(`❌ Failed to generate variation ${index}:`, error.message);
    return null;
  }
}

async function resizeAndOptimize(inputFile, outputFile) {
  console.log(`\n🔧 Resizing and optimizing: ${path.basename(inputFile)}`);

  // Use ImageMagick to resize and optimize
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    // Resize to 192x192 and optimize
    await execAsync(
      `convert "${inputFile}" -resize 192x192 -strip -define png:compression-level=9 "${outputFile}"`
    );

    const stats = fs.statSync(outputFile);
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`✅ Optimized: ${outputFile} (${sizeKB} KB)`);

    return { file: outputFile, size: stats.size };
  } catch (error) {
    console.error(`❌ Optimization failed:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting hive2.png generation pipeline...');
  console.log(`📝 Prompt: ${PROMPT}\n`);

  // Generate 5 variations
  console.log('═══════════════════════════════════════');
  console.log('  STEP 1: Generate Variations');
  console.log('═══════════════════════════════════════');

  const variations = [];
  for (let i = 1; i <= 5; i++) {
    const result = await generateVariation(i);
    if (result) {
      variations.push(result);
    }
    // Wait 2 seconds between generations to avoid rate limiting
    if (i < 5) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  if (variations.length === 0) {
    console.error('\n❌ No variations were generated successfully!');
    process.exit(1);
  }

  console.log(`\n✅ Generated ${variations.length} variations`);

  // Resize and optimize all variations
  console.log('\n═══════════════════════════════════════');
  console.log('  STEP 2: Resize & Optimize');
  console.log('═══════════════════════════════════════');

  const optimized = [];
  for (const variation of variations) {
    const outputFile = path.join(TEMP_DIR, `hive2-v${variation.index}-optimized.png`);
    const result = await resizeAndOptimize(variation.file, outputFile);
    if (result) {
      optimized.push({ ...variation, ...result });
    }
  }

  if (optimized.length === 0) {
    console.error('\n❌ No variations were optimized successfully!');
    process.exit(1);
  }

  // Find the best one (smallest file size under 50KB)
  console.log('\n═══════════════════════════════════════');
  console.log('  STEP 3: Select Best Variation');
  console.log('═══════════════════════════════════════');

  const validVariations = optimized.filter(v => v.size < 50 * 1024);

  if (validVariations.length === 0) {
    console.log('\n⚠️  No variations under 50KB, selecting smallest...');
    optimized.sort((a, b) => a.size - b.size);
    var best = optimized[0];
  } else {
    console.log(`\n✅ Found ${validVariations.length} variations under 50KB`);
    validVariations.sort((a, b) => a.size - b.size);
    var best = validVariations[0];
  }

  const bestSizeKB = (best.size / 1024).toFixed(2);
  console.log(`\n🏆 Best variation: v${best.index} (${bestSizeKB} KB)`);

  // Copy to final location
  const finalOutput = path.join(OUTPUT_DIR, 'hive2.png');
  fs.copyFileSync(best.file, finalOutput);

  console.log(`\n✅ Saved to: ${finalOutput}`);

  // List all variations for manual review
  console.log('\n═══════════════════════════════════════');
  console.log('  All Variations (for manual review)');
  console.log('═══════════════════════════════════════');

  optimized.forEach(v => {
    const sizeKB = (v.size / 1024).toFixed(2);
    const marker = v.index === best.index ? ' ← SELECTED' : '';
    console.log(`  v${v.index}: ${v.file} (${sizeKB} KB)${marker}`);
  });

  console.log(`\n📁 Review variations at: ${TEMP_DIR}`);
  console.log('\n✨ Generation complete!');
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
