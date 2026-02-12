// Generate spaceship variations using Gemini API
import { GoogleGenerativeAI } from '@google/generative-ai';
import { writeFile } from 'fs/promises';
import { join } from 'path';

const API_KEY = '***REMOVED***';
const genAI = new GoogleGenerativeAI(API_KEY);

const prompt = "Sleek space fighter ship, angular futuristic design, cyan engine glow, cockpit visible, player spacecraft, top-down game sprite, transparent background, pixel art style, 96x96 pixels";

async function generateSpaceship(variation) {
  try {
    const model = genAI.getGenerativeModel({ model: 'nano-banana-pro-preview' });

    console.log(`Generating variation ${variation}...`);
    const result = await model.generateContent([prompt]);

    // Extract image data
    const response = await result.response;
    const imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;

    if (!imageData) {
      throw new Error('No image data in response');
    }

    // Save to file
    const buffer = Buffer.from(imageData.data, 'base64');
    const filename = join('generated_spaceships', `spaceship_v${variation}.png`);
    await writeFile(filename, buffer);

    console.log(`✓ Saved ${filename} (${Math.round(buffer.length / 1024)}KB)`);
    return filename;
  } catch (error) {
    console.error(`✗ Variation ${variation} failed:`, error.message);
    return null;
  }
}

// Generate 5 variations
console.log('Generating spaceship variations...\n');
const variations = await Promise.all([1, 2, 3, 4, 5].map(generateSpaceship));
console.log('\nComplete! Generated:', variations.filter(Boolean).length, 'variations');
