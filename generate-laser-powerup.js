#!/usr/bin/env node

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const GEMINI_API_KEY = 'AIzaSyAwamYpN1OZjylQJ-KFlHXyLie-_dxKpiQ';
const OUTPUT_DIR = '/home/mkagent/repos/Space-Laser/assets';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'nano-banana-pro-preview' });

const PROMPT_VARIATIONS = [
  'Pixel art weapon power-up, glowing yellow energy crystal with lightning bolt symbol in center, octagonal gem shape, bright yellow and gold gradient with white sparkles, laser upgrade pickup icon, game sprite, transparent background, retro game style, 48x48 pixels',

  'Pixel art laser power-up icon, rotating yellow crystal core with electric arcs, lightning symbol overlay, intense glow effect, bright yellow-gold palette with white highlights, sci-fi weapon upgrade, game collectible sprite, transparent background, 48x48 pixels',

  'Pixel art weapon upgrade, faceted yellow energy gem with crackling electricity, bold lightning icon, radiant golden aura with light rays, laser enhancement pickup, retro arcade style sprite, transparent background, 48x48 pixels',

  'Pixel art power crystal, hexagonal yellow gem with inner lightning bolt, electric sparks around edges, bright yellow core fading to gold, weapon upgrade icon for space shooter, game sprite asset, transparent background, 48x48 pixels',

  'Pixel art laser upgrade orb, pulsing yellow energy sphere with lightning symbol, electric corona effect, golden yellow with white energy wisps, weapon power-up collectible, retro pixel game sprite, transparent background, 48x48 pixels'
];

async function generateImage(prompt, index) {
  console.log(`\n[${index + 1}/${PROMPT_VARIATIONS.length}] Generating variation with prompt:`);
  console.log(`"${prompt}"\n`);

  try {
    const result = await model.generateContent([prompt]);
    const response = result.response;

    if (!response.candidates || response.candidates.length === 0) {
      console.error('No candidates returned');
      return null;
    }

    const candidate = response.candidates[0];

    if (!candidate.content || !candidate.content.parts) {
      console.error('No content parts in response');
      return null;
    }

    // Find inline data part with image
    const imagePart = candidate.content.parts.find(part => part.inlineData);

    if (!imagePart || !imagePart.inlineData) {
      console.error('No image data in response');
      return null;
    }

    const base64Data = imagePart.inlineData.data;
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Save raw output
    const rawPath = path.join(OUTPUT_DIR, `laserpowerup_raw_${index + 1}.png`);
    await fs.writeFile(rawPath, imageBuffer);
    console.log(`✓ Saved raw output: ${rawPath}`);

    // Get image info
    const metadata = await sharp(imageBuffer).metadata();
    console.log(`  Size: ${metadata.width}x${metadata.height}`);

    // Resize to 48x48 and remove background
    const resizedPath = path.join(OUTPUT_DIR, `laserpowerup_v${index + 1}.png`);
    await sharp(imageBuffer)
      .resize(48, 48, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(resizedPath);

    const stats = await fs.stat(resizedPath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`✓ Resized to 48x48: ${resizedPath} (${sizeKB} KB)`);

    return {
      index: index + 1,
      path: resizedPath,
      size: stats.size,
      prompt: prompt
    };

  } catch (error) {
    console.error(`Error generating variation ${index + 1}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('=== Laser Power-Up Sprite Generator ===');
  console.log(`Model: nano-banana-pro-preview`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Variations: ${PROMPT_VARIATIONS.length}`);

  // Create output directory if needed
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Generate all variations
  const results = [];
  for (let i = 0; i < PROMPT_VARIATIONS.length; i++) {
    const result = await generateImage(PROMPT_VARIATIONS[i], i);
    if (result) {
      results.push(result);
    }

    // Brief pause between generations
    if (i < PROMPT_VARIATIONS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n=== Generation Complete ===');
  console.log(`Successfully generated: ${results.length}/${PROMPT_VARIATIONS.length} variations`);

  if (results.length > 0) {
    console.log('\nGenerated files:');
    results.forEach(r => {
      console.log(`  [v${r.index}] ${path.basename(r.path)} - ${(r.size / 1024).toFixed(2)} KB`);
    });

    console.log('\n✓ Review variations and select the best one');
    console.log('✓ Rename chosen file to: laserpowerup.png');
  }
}

main().catch(console.error);
