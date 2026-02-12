import { GoogleGenerativeAI } from '@google/generative-ai';
import { writeFile } from 'fs/promises';
import { join } from 'path';

const GEMINI_API_KEY = '***REMOVED***';
const OUTPUT_DIR = '/home/mkagent/repos/Space-Laser/assets';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const basePrompt = 'Deep space background, purple nebula, distant stars, cosmic dust, seamless tileable pattern, dark atmospheric, game background, 2048x2048';

const variations = [
  { name: 'variation1', prompt: `${basePrompt}, vibrant purple and blue nebula clouds, scattered bright stars, cosmic gas, tileable edges` },
  { name: 'variation2', prompt: `${basePrompt}, subtle purple haze, dense star field, dark space, minimal nebula, perfectly seamless` },
  { name: 'variation3', prompt: `${basePrompt}, dramatic purple and magenta nebula, cosmic dust lanes, medium star density, seamless wrap` },
  { name: 'variation4', prompt: `${basePrompt}, deep purple void, wispy nebula tendrils, sparse bright stars, dark atmospheric, tileable pattern` },
  { name: 'variation5', prompt: `${basePrompt}, rich purple space clouds, glowing nebula core, balanced star distribution, seamless texture` }
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

    const filename = join(OUTPUT_DIR, `background_${name}.png`);
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
  console.log('Starting background generation...\n');

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
}

main().catch(console.error);
