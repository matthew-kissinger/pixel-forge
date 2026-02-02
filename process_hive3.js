import { readFile, writeFile, readdir } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';

const FAL_KEY = '670ef279-ec84-418b-bac0-b079e45510c8:26238e4d31c9d5f8dda6d9a0288e4efa';
const INPUT_DIR = './hive3_variations';
const OUTPUT_DIR = './hive3_processed';

async function removeBackground(imageBuffer) {
  // Convert image to base64 for FAL API
  const base64Image = imageBuffer.toString('base64');
  const dataUrl = `data:image/png;base64,${base64Image}`;

  const response = await fetch('https://fal.run/fal-ai/birefnet', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      image_url: dataUrl,
      model: 'General Use (Light)',
      operating_resolution: '1024x1024'
    })
  });

  if (!response.ok) {
    throw new Error(`FAL API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  // Download the processed image
  const imageUrl = result.image?.url;
  if (!imageUrl) {
    throw new Error('No image URL in FAL response');
  }

  const imageResponse = await fetch(imageUrl);
  const imageArrayBuffer = await imageResponse.arrayBuffer();
  return Buffer.from(imageArrayBuffer);
}

async function processAllVariations() {
  const files = await readdir(INPUT_DIR);
  const pngFiles = files.filter(f => f.endsWith('.png')).sort();

  console.log(`Processing ${pngFiles.length} variations...\n`);

  for (const filename of pngFiles) {
    try {
      console.log(`Processing ${filename}...`);

      const inputPath = join(INPUT_DIR, filename);
      const imageBuffer = await readFile(inputPath);

      // Remove background
      console.log('  - Removing background...');
      const noBgBuffer = await removeBackground(imageBuffer);

      // Resize to 192x192 and optimize
      console.log('  - Resizing to 192x192...');
      const processed = await sharp(noBgBuffer)
        .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ quality: 85, compressionLevel: 9 })
        .toBuffer();

      const outputPath = join(OUTPUT_DIR, filename.replace('.png', '_processed.png'));
      await writeFile(outputPath, processed);

      const sizeKB = (processed.length / 1024).toFixed(1);
      console.log(`  ✓ Saved (${sizeKB}KB)\n`);

      // Rate limit: wait 3 seconds between API calls
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
      console.error(`  ✗ Error: ${error.message}\n`);
    }
  }

  console.log('Processing complete! Check ./hive3_processed/');
}

// Create output directory
import { mkdir } from 'fs/promises';
await mkdir(OUTPUT_DIR, { recursive: true });

processAllVariations();
