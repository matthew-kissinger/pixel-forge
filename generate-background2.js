import { GoogleGenerativeAI } from '@google/generative-ai';
import { writeFile } from 'fs/promises';
import { join } from 'path';

const GEMINI_API_KEY = '***REMOVED***';
const OUTPUT_DIR = '/home/mkagent/repos/Space-Laser/assets';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const basePrompt = 'Active space region, blue nebula, asteroid field hints, bright stars, seamless tileable pattern, sci-fi atmosphere, game background, 2048x2048';

const variations = [
  { name: 'variation1', prompt: `${basePrompt}, vibrant blue and cyan nebula, scattered asteroids, bright starfield, dynamic atmosphere` },
  { name: 'variation2', prompt: `${basePrompt}, electric blue nebula clouds, subtle asteroid silhouettes, dense bright stars, energetic space` },
  { name: 'variation3', prompt: `${basePrompt}, azure nebula wisps, distant asteroid fragments, glowing stars, active cosmic region, perfectly seamless` },
  { name: 'variation4', prompt: `${basePrompt}, bright cyan space gas, asteroid debris hints, brilliant stars, high energy nebula, tileable edges` },
  { name: 'variation5', prompt: `${basePrompt}, luminous blue cosmic clouds, small asteroid field, sparkling starfield, sci-fi space setting, seamless wrap` }
];

async function generateImage(prompt, name) {
  try {
    console.log(`Generating ${name}...`);

    const model = genAI.getGenerativeModel({ model: 'nano-banana-pro-preview' });

    const result = await model.generateContent([prompt]);
    const response = result.response;

    // Extract image data from response
    if (!response.candidates || !response.candidates[0]) {
      throw new Error('No image generated');
    }

    const candidate = response.candidates[0];
    const imagePart = candidate.content.parts.find(part => part.inlineData);

    if (!imagePart || !imagePart.inlineData) {
      throw new Error('No image data in response');
    }

    const imageData = imagePart.inlineData.data;
    const buffer = Buffer.from(imageData, 'base64');

    const filename = join(OUTPUT_DIR, `background2_${name}.png`);
    await writeFile(filename, buffer);

    const sizeKB = (buffer.length / 1024).toFixed(2);
    console.log(`✓ ${name} saved (${sizeKB} KB)`);

    return { name, filename, sizeKB: parseFloat(sizeKB) };
  } catch (error) {
    console.error(`✗ Failed to generate ${name}:`, error.message);
    return { name, error: error.message };
  }
}

async function main() {
  console.log('Starting background2 generation...\n');

  const results = [];

  // Generate sequentially to avoid rate limits
  for (const variation of variations) {
    const result = await generateImage(variation.prompt, variation.name);
    results.push(result);

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n=== Generation Summary ===');
  results.forEach(r => {
    if (r.error) {
      console.log(`${r.name}: FAILED - ${r.error}`);
    } else {
      console.log(`${r.name}: ${r.sizeKB} KB`);
    }
  });

  console.log('\n=== Next Steps ===');
  console.log('1. Review generated variations in Space-Laser/assets/');
  console.log('2. Test seamless tiling by creating 2x2 grids');
  console.log('3. Select best variation and rename to background2.png');
}

main().catch(console.error);
