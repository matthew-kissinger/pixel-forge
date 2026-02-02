import { GoogleGenerativeAI } from '@google/generative-ai';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local manually
const envPath = join(__dirname, '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const apiKey = envContent.match(/GEMINI_API_KEY=(.+)/)[1].trim();

const genAI = new GoogleGenerativeAI(apiKey);

// Variations of the shield prompt for diversity
const prompts = [
  "Energy shield bubble, hexagonal pattern, cyan glow, protective barrier, game effect sprite, transparent background, sci-fi style",
  "Protective energy shield dome, hexagonal tessellation, bright cyan and blue glow, force field effect, transparent PNG, game asset",
  "Shield bubble with honeycomb hex pattern, glowing cyan energy, translucent barrier, sci-fi defense shield, transparent background",
  "Force field bubble shield, geometric hexagonal grid, neon cyan glow, protective dome, video game sprite, PNG with transparency",
  "Energy barrier shield, hexagonal force field pattern, luminous cyan edges, sci-fi bubble shield, transparent game effect"
];

async function generateShield(prompt, index) {
  console.log(`\nGenerating variation ${index + 1}/${prompts.length}...`);
  console.log(`Prompt: ${prompt}`);

  try {
    const model = genAI.getGenerativeModel({ model: 'nano-banana-pro-preview' });

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.8,
        topP: 0.95,
        topK: 40,
      }
    });

    const response = result.response;

    // Extract image data
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
          const imageData = Buffer.from(part.inlineData.data, 'base64');

          // Save to output directory
          const outputDir = join(__dirname, 'output');
          mkdirSync(outputDir, { recursive: true });

          const filename = `shield_variation_${index + 1}.png`;
          const filepath = join(outputDir, filename);

          writeFileSync(filepath, imageData);

          const sizeKB = (imageData.length / 1024).toFixed(2);
          console.log(`✓ Saved ${filename} (${sizeKB} KB)`);

          return { filepath, filename, size: imageData.length };
        }
      }
    }

    throw new Error('No image data in response');

  } catch (error) {
    console.error(`✗ Error generating variation ${index + 1}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('=== Shield Bubble Generation ===');
  console.log(`Generating ${prompts.length} variations...\n`);

  const results = [];

  for (let i = 0; i < prompts.length; i++) {
    const result = await generateShield(prompts[i], i);
    if (result) {
      results.push(result);
    }

    // Add delay between requests to avoid rate limiting
    if (i < prompts.length - 1) {
      console.log('Waiting 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n=== Generation Complete ===');
  console.log(`Successfully generated ${results.length}/${prompts.length} variations`);
  console.log('\nFiles saved to output/ directory:');
  results.forEach(r => {
    const sizeKB = (r.size / 1024).toFixed(2);
    console.log(`  - ${r.filename} (${sizeKB} KB)`);
  });
  console.log('\nReview the variations and select the best one.');
}

main().catch(console.error);
