#!/usr/bin/env node
// Remove background from health power-up using FAL BiRefNet
import { readFile, writeFile } from 'fs/promises';

const FAL_KEY = '670ef279-ec84-418b-bac0-b079e45510c8:26238e4d31c9d5f8dda6d9a0288e4efa';
const inputPath = '/home/mkagent/repos/pixel-forge/output/health_processed/health_v2_48x48.png';
const outputPath = '/home/mkagent/repos/Space-Laser/assets/health.png';

async function removeBackground() {
  console.log('Removing background from health power-up...\n');

  try {
    // Read image as base64
    const imageBuffer = await readFile(inputPath);
    const base64 = imageBuffer.toString('base64');
    const imageUrl = `data:image/png;base64,${base64}`;

    console.log(`Processing health_v2_48x48.png...`);

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

    await writeFile(outputPath, Buffer.from(imageData));

    const size = imageData.byteLength;
    console.log(`✓ Saved: ${outputPath} (${Math.round(size / 1024)}KB)`);

    // Verify it has transparency
    console.log('\nVerifying transparency...');
    const sharp = (await import('sharp')).default;
    const meta = await sharp(outputPath).metadata();
    console.log(`Channels: ${meta.channels} (4 = RGBA with transparency)`);
    console.log(`Size: ${meta.width}x${meta.height}`);

  } catch (error) {
    console.error('✗ Failed:', error.message);
    process.exit(1);
  }
}

removeBackground();
