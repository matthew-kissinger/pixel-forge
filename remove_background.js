// Remove backgrounds using FAL BiRefNet
import { readdir } from 'fs/promises';
import { join } from 'path';

const FAL_KEY = '670ef279-ec84-418b-bac0-b079e45510c8:26238e4d31c9d5f8dda6d9a0288e4efa';
const inputDir = 'processed_spaceships';
const outputDir = 'final_spaceships';

// Ensure output directory exists
await Bun.write(join(outputDir, '.keep'), '');

// Get all processed PNG files
const files = (await readdir(inputDir)).filter(f => f.endsWith('.png'));

console.log(`Removing backgrounds from ${files.length} spaceships...\n`);

for (const file of files) {
  const inputPath = join(inputDir, file);

  try {
    // Read image as base64
    const imageBuffer = await Bun.file(inputPath).arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString('base64');
    const imageUrl = `data:image/png;base64,${base64}`;

    console.log(`Processing ${file}...`);

    // Call FAL BiRefNet API
    const response = await fetch('https://fal.run/fal-ai/birefnet', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
      }),
    });

    if (!response.ok) {
      throw new Error(`FAL API error: ${response.status} ${await response.text()}`);
    }

    const result = await response.json();
    const outputImageUrl = result.image?.url;

    if (!outputImageUrl) {
      throw new Error('No output image URL in response');
    }

    // Download the result
    const imageResponse = await fetch(outputImageUrl);
    const imageData = await imageResponse.arrayBuffer();

    const outputPath = join(outputDir, file.replace('_processed', '_final'));
    await Bun.write(outputPath, imageData);

    const size = imageData.byteLength;
    console.log(`✓ ${file} -> ${outputPath} (${Math.round(size / 1024)}KB)`);
  } catch (error) {
    console.error(`✗ Failed to process ${file}:`, error.message);
  }
}

console.log('\nBackground removal complete!');
