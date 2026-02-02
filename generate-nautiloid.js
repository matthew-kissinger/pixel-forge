#!/usr/bin/env node
import { GoogleGenAI } from '@google/genai';
import * as fal from '@fal-ai/serverless-client';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Load environment variables
const GEMINI_API_KEY = 'AIzaSyAwamYpN1OZjylQJ-KFlHXyLie-_dxKpiQ';
const FAL_KEY = '670ef279-ec84-418b-bac0-b079e45510c8:26238e4d31c9d5f8dda6d9a0288e4efa';

// Configure clients
const genai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
fal.config({ credentials: FAL_KEY });

const OUTPUT_DIR = '/tmp/nautiloid-variations';
const NUM_VARIATIONS = 5;

// Base prompt for the Nautiloid alien
const BASE_PROMPT = `Pixel art game sprite of a space nautilus alien creature. Top-down view for a 2D game. The alien has a beautiful spiral shell with golden metallic patterns on teal/cyan bioluminescent armor. Several graceful tentacles extending from the shell. Balanced warrior design - medium armored, elegant movement. Retro pixel art style like classic arcade games. Clear silhouette, transparent background. 96x96 pixels. The creature should look threatening but graceful, with the nautilus shell being the dominant feature. Bioluminescent teal and gold coloring with subtle purple accents.`;

// Variations with different angles/styles
const PROMPT_VARIATIONS = [
  `${BASE_PROMPT} Spiral shell facing slightly left, tentacles curled dynamically.`,
  `${BASE_PROMPT} Spiral shell centered, tentacles spread evenly in defensive pose.`,
  `${BASE_PROMPT} Spiral shell with more pronounced gold patterns, tentacles reaching forward.`,
  `${BASE_PROMPT} Compact pose, shell prominent, tentacles tucked closer to body.`,
  `${BASE_PROMPT} Shell with intricate spiral chambers visible, tentacles flowing naturally.`,
];

async function generateImage(prompt, index) {
  console.log(`\nGenerating variation ${index + 1}...`);
  console.log(`Prompt: ${prompt.substring(0, 100)}...`);

  try {
    const response = await genai.models.generateContent({
      model: 'nano-banana-pro-preview',
      contents: prompt,
      config: {
        responseModalities: ['image', 'text'],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      throw new Error('No response from Gemini');
    }

    for (const part of parts) {
      if (part.inlineData) {
        const { mimeType, data } = part.inlineData;
        return `data:${mimeType};base64,${data}`;
      }
    }

    throw new Error('No image in Gemini response');
  } catch (error) {
    console.error(`Failed to generate variation ${index + 1}:`, error.message);
    return null;
  }
}

async function removeBackground(imageDataUrl) {
  console.log('Removing background with BiRefNet...');

  try {
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');

    const result = await fal.subscribe('fal-ai/birefnet', {
      input: {
        image_url: `data:image/png;base64,${base64Data}`,
      },
    });

    if (!result.image?.url) {
      throw new Error('No image in BiRefNet response');
    }

    // Fetch the result image and convert to base64
    const response = await fetch(result.image.url);
    const buffer = await response.arrayBuffer();
    const resultBase64 = Buffer.from(buffer).toString('base64');

    return `data:image/png;base64,${resultBase64}`;
  } catch (error) {
    console.error('Background removal failed:', error.message);
    return imageDataUrl; // Return original if bg removal fails
  }
}

async function saveImage(dataUrl, filename) {
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  await writeFile(filename, buffer);
  const sizeKB = (buffer.length / 1024).toFixed(2);
  console.log(`Saved ${filename} (${sizeKB} KB)`);
  return buffer.length;
}

async function main() {
  console.log('=== Nautiloid Alien Sprite Generator ===\n');
  console.log(`Generating ${NUM_VARIATIONS} variations...`);
  console.log(`Output directory: ${OUTPUT_DIR}\n`);

  // Create output directory
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  const results = [];

  // Generate all variations
  for (let i = 0; i < NUM_VARIATIONS; i++) {
    const imageDataUrl = await generateImage(PROMPT_VARIATIONS[i], i);

    if (!imageDataUrl) {
      console.log(`Skipping variation ${i + 1} due to generation failure`);
      continue;
    }

    // Save original
    const originalPath = join(OUTPUT_DIR, `nautiloid-v${i + 1}-original.png`);
    await saveImage(imageDataUrl, originalPath);

    // Remove background
    const noBgDataUrl = await removeBackground(imageDataUrl);

    // Save with transparent background
    const finalPath = join(OUTPUT_DIR, `nautiloid-v${i + 1}.png`);
    const size = await saveImage(noBgDataUrl, finalPath);

    results.push({
      index: i + 1,
      path: finalPath,
      size,
    });

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n=== Generation Complete ===');
  console.log(`\nGenerated ${results.length} variations:`);
  results.forEach(r => {
    const sizeKB = (r.size / 1024).toFixed(2);
    console.log(`  ${r.index}. ${r.path} (${sizeKB} KB)`);
  });

  console.log('\nNext steps:');
  console.log('1. Review all variations');
  console.log('2. Select the best one');
  console.log('3. Resize to 96x96px if needed');
  console.log('4. Copy to /home/mkagent/repos/Space-Laser/assets/alien3.png');
}

main().catch(console.error);
