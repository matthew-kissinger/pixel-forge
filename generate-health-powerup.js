#!/usr/bin/env node

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';

const GEMINI_API_KEY = 'AIzaSyAwamYpN1OZjylQJ-KFlHXyLie-_dxKpiQ';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function generateHealthPowerupVariations() {
  const model = genAI.getGenerativeModel({ model: 'nano-banana-pro-preview' });

  const basePrompt = "Health power-up orb, green glowing sphere, plus symbol, healing pickup, game sprite, transparent background, 48x48 pixels, pixel art style";

  const variations = [
    basePrompt + ", bright neon green glow, white plus symbol, smooth gradient",
    basePrompt + ", emerald green with pulsing aura, medical cross icon",
    basePrompt + ", bioluminescent green, organic healing energy, soft particles",
    basePrompt + ", mint green crystal sphere, geometric plus sign, sci-fi aesthetic",
    basePrompt + ", lime green with white sparkles, bold plus marker, vibrant"
  ];

  const outputDir = '/home/mkagent/repos/pixel-forge/output/health_variations';
  await fs.mkdir(outputDir, { recursive: true });

  console.log('Generating 5 variations of health power-up...\n');

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
            const outputPath = path.join(outputDir, `health_v${i + 1}.png`);

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
  console.log('3. Resize to 48x48px if needed');
  console.log('4. Run background removal if needed');
  console.log('5. Copy to /home/mkagent/repos/Space-Laser/assets/health.png');
}

generateHealthPowerupVariations().catch(console.error);
