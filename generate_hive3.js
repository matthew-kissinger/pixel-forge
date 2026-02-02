import { GoogleGenerativeAI } from '@google/generative-ai';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const GEMINI_API_KEY = 'AIzaSyAwamYpN1OZjylQJ-KFlHXyLie-_dxKpiQ';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const PROMPT = "Large alien colony hive, multiple spawning chambers, bioluminescent orange veins, organic space structure, top-down game sprite, transparent background, dark sci-fi aesthetic, 192x192 pixel art style";

async function generateHive3Variations() {
  const model = genAI.getGenerativeModel({ model: 'nano-banana-pro-preview' });
  const outputDir = './hive3_variations';

  await mkdir(outputDir, { recursive: true });

  console.log('Generating 5 variations of hive3.png...\n');

  for (let i = 1; i <= 5; i++) {
    try {
      console.log(`Generating variation ${i}...`);

      const result = await model.generateContent([PROMPT]);
      const response = result.response;

      // Extract image data from response
      if (response.candidates && response.candidates[0]?.content?.parts) {
        const imagePart = response.candidates[0].content.parts.find(
          part => part.inlineData && part.inlineData.mimeType?.startsWith('image/')
        );

        if (imagePart && imagePart.inlineData) {
          const imageData = Buffer.from(imagePart.inlineData.data, 'base64');
          const filename = join(outputDir, `hive3_var${i}.png`);
          await writeFile(filename, imageData);
          console.log(`✓ Saved variation ${i} (${(imageData.length / 1024).toFixed(1)}KB)\n`);
        } else {
          console.log(`✗ No image data in variation ${i}\n`);
        }
      }

      // Rate limit: wait 2 seconds between requests
      if (i < 5) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`Error generating variation ${i}:`, error.message);
    }
  }

  console.log('Generation complete! Check ./hive3_variations/');
}

generateHive3Variations();
