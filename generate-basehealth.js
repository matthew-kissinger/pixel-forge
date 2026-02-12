import { GoogleGenerativeAI } from '@google/generative-ai';
import { writeFile } from 'fs/promises';
import { join } from 'path';

const GEMINI_API_KEY = '***REMOVED***';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function generateVariation(prompt, index) {
  console.log(`\nGenerating variation ${index}...`);
  console.log(`Prompt: ${prompt}`);

  const model = genAI.getGenerativeModel({ model: 'nano-banana-pro-preview' });

  const result = await model.generateContent(prompt);
  const response = await result.response;

  // Extract image data
  const imagePart = response.candidates[0].content.parts.find(part => part.inlineData);

  if (!imagePart) {
    throw new Error('No image data in response');
  }

  const imageData = Buffer.from(imagePart.inlineData.data, 'base64');
  const outputPath = join('/home/mkagent/repos/pixel-forge/output', `basehealth_v${index}.png`);

  await writeFile(outputPath, imageData);
  console.log(`Saved ${outputPath} (${(imageData.length / 1024).toFixed(2)} KB)`);

  return outputPath;
}

async function main() {
  // Base prompt with variations
  const prompts = [
    "Base repair power-up, glowing blue cube with wrench symbol, holographic medical cross, sci-fi station repair pickup, game sprite, pixel art style, transparent background, centered, isometric view",

    "Base repair kit, bright cyan glowing cube, metallic wrench icon overlay, bioluminescent edges, floating station repair pickup, game icon, clean design, transparent background, simple shapes",

    "Space station repair power-up, electric blue cubic container, white wrench symbol, energy particles, futuristic medical supply, game asset, minimalist, transparent background, front view",

    "Repair module pickup, azure glowing box, circuit pattern wrench, neon blue accents, orbital station supplies, video game sprite, compact design, transparent background, slight rotation",

    "Base health restore item, cobalt blue cube, glowing wrench emblem, sci-fi repair tool, space game collectible, simple geometric, transparent background, centered composition"
  ];

  console.log('Generating 5 basehealth.png variations...\n');

  for (let i = 0; i < prompts.length; i++) {
    try {
      await generateVariation(prompts[i], i + 1);
      // Rate limiting - wait between requests
      if (i < prompts.length - 1) {
        console.log('Waiting 3 seconds before next generation...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error) {
      console.error(`Error generating variation ${i + 1}:`, error.message);
    }
  }

  console.log('\nAll variations generated! Review output/ directory to select best.');
}

main().catch(console.error);
