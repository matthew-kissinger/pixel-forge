import { GoogleGenerativeAI } from '@google/generative-ai';
import { writeFileSync } from 'fs';
import { join } from 'path';

const GEMINI_API_KEY = '***REMOVED***';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const basePrompt = 'Explosion sprite sheet, 4 frames showing sequential explosion progression from small to large, orange yellow fire, space explosion, game effect, transparent background, pixel art style, 256x64 pixels (4 frames of 64x64 each arranged horizontally), retro game aesthetic';

const variations = [
  { name: 'variation1', prompt: `${basePrompt}, bright orange yellow core, expanding fireball, smooth animation frames` },
  { name: 'variation2', prompt: `${basePrompt}, intense yellow center fading to orange edges, dramatic expansion, clear frame progression` },
  { name: 'variation3', prompt: `${basePrompt}, fiery orange explosion with yellow highlights, space debris particles, sequential animation` },
  { name: 'variation4', prompt: `${basePrompt}, vibrant yellow-orange flames, circular blast wave, smooth transition between frames` },
  { name: 'variation5', prompt: `${basePrompt}, hot white core to orange outer flames, classic explosion animation, even spacing` }
];

async function generateExplosion(prompt, name) {
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

    const filename = join('/home/mkagent/repos/Space-Laser/assets', `explosion_${name}.png`);
    writeFileSync(filename, buffer);

    const sizeKB = (buffer.length / 1024).toFixed(2);
    console.log(`✓ ${name} saved (${sizeKB} KB)`);

    return { name, filename, sizeKB: parseFloat(sizeKB) };
  } catch (error) {
    console.error(`✗ Failed to generate ${name}:`, error.message);
    return { name, error: error.message };
  }
}

async function main() {
  console.log('Starting explosion sprite sheet generation...\n');

  const results = [];

  // Generate sequentially to avoid rate limits
  for (const variation of variations) {
    const result = await generateExplosion(variation.prompt, variation.name);
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

  console.log('\nReview the variations and select the best one.');
}

main().catch(console.error);
