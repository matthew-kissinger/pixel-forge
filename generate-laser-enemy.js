#!/usr/bin/env node

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';

const GEMINI_API_KEY = 'AIzaSyAwamYpN1OZjylQJ-KFlHXyLie-_dxKpiQ';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function generateLaserEnemyVariations() {
  const model = genAI.getGenerativeModel({ model: 'nano-banana-pro-preview' });

  const basePrompt = "Alien energy projectile, magenta orange glow, organic plasma bolt, enemy attack, game sprite, transparent background, 16x32 pixels, pixel art style, vertical orientation, glowing energy";

  const variations = [
    basePrompt + ", smooth gradient",
    basePrompt + ", pulsing energy core",
    basePrompt + ", trailing particles",
    basePrompt + ", spiral pattern",
    basePrompt + ", sharp angular design"
  ];

  const outputDir = '/home/mkagent/repos/pixel-forge/output/laser_enemy_variations';
  await fs.mkdir(outputDir, { recursive: true });

  console.log('Generating 5 variations of enemy laser projectile...\n');

  for (let i = 0; i < variations.length; i++) {
    const prompt = variations[i];
    console.log(`\nVariation ${i + 1}/5:`);
    console.log(`Prompt: ${prompt}`);

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;

      // Extract image data from response
      if (response.candidates && response.candidates[0]?.content?.parts) {
        const parts = response.candidates[0].content.parts;

        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            const imageData = Buffer.from(part.inlineData.data, 'base64');
            const outputPath = path.join(outputDir, `laser_enemy_v${i + 1}.png`);

            await fs.writeFile(outputPath, imageData);
            const stats = await fs.stat(outputPath);
            console.log(`✓ Saved: ${outputPath} (${(stats.size / 1024).toFixed(1)}KB)`);
          }
        }
      }
    } catch (error) {
      console.error(`✗ Failed to generate variation ${i + 1}:`, error.message);
    }

    // Rate limiting - wait between requests
    if (i < variations.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`\n✓ All variations saved to: ${outputDir}`);
  console.log('\nNext steps:');
  console.log('1. Review the variations');
  console.log('2. Select the best one');
  console.log('3. Resize to 16x32px if needed');
  console.log('4. Copy to /home/mkagent/repos/Space-Laser/assets/laser_enemy.png');
}

generateLaserEnemyVariations().catch(console.error);
