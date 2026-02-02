#!/usr/bin/env node

/**
 * Generate laser tower variations for Space Laser game
 * Usage: node generate_laser_tower.js
 */

import fs from 'fs';
import path from 'path';

const SERVER_URL = 'http://localhost:3000';
const OUTPUT_DIR = '/home/mkagent/repos/pixel-forge/output/laser_tower_variations';
const NUM_VARIATIONS = 5;

// Base prompt from spec
const BASE_PROMPT = 'Space defense turret, rotating gun platform, targeting laser, cyan energy weapon, automated sentry, top-down game sprite, transparent background, pixel art style, 64x64 pixels, clean lines, sci-fi aesthetic';

async function generateVariation(index) {
  console.log(`\nGenerating variation ${index + 1}/${NUM_VARIATIONS}...`);

  try {
    const response = await fetch(`${SERVER_URL}/api/image/generate-smart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: BASE_PROMPT,
        style: 'pixel-art',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }

    const result = await response.json();

    if (!result.image) {
      throw new Error('No image in response');
    }

    // Save the base64 image
    const base64Data = result.image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const filename = path.join(OUTPUT_DIR, `laser_tower_v${index + 1}.png`);
    fs.writeFileSync(filename, buffer);

    const stats = fs.statSync(filename);
    const sizeKB = (stats.size / 1024).toFixed(2);

    console.log(`✓ Saved: ${filename} (${sizeKB} KB)`);

    return {
      index: index + 1,
      filename,
      size: stats.size,
      sizeKB,
    };
  } catch (error) {
    console.error(`✗ Failed variation ${index + 1}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('=== Laser Tower Variation Generator ===');
  console.log(`Server: ${SERVER_URL}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Variations: ${NUM_VARIATIONS}`);

  // Create output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Generate variations
  const results = [];
  for (let i = 0; i < NUM_VARIATIONS; i++) {
    const result = await generateVariation(i);
    if (result) {
      results.push(result);
    }

    // Small delay between generations
    if (i < NUM_VARIATIONS - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary
  console.log('\n=== Generation Complete ===');
  console.log(`Successfully generated: ${results.length}/${NUM_VARIATIONS}`);

  if (results.length > 0) {
    console.log('\nVariations:');
    results.forEach(r => {
      console.log(`  ${r.index}. ${path.basename(r.filename)} - ${r.sizeKB} KB`);
    });

    console.log('\nNext steps:');
    console.log('1. Review variations in:', OUTPUT_DIR);
    console.log('2. Select best variation');
    console.log('3. Resize to 64x64px if needed');
    console.log('4. Copy to /home/mkagent/repos/Space-Laser/assets/laser_tower.png');
  }
}

main().catch(console.error);
