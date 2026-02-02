import sharp from 'sharp';
import { readdir } from 'fs/promises';
import { join } from 'path';

const OUTPUT_DIR = '/home/mkagent/repos/Space-Laser/assets';
const PREVIEW_DIR = '/home/mkagent/repos/pixel-forge/output/background_previews';

async function createTileablePreview(imagePath, name) {
  try {
    // Load the image
    const image = sharp(imagePath);
    const metadata = await image.metadata();

    console.log(`${name}: ${metadata.width}x${metadata.height}`);

    // Create a 2x2 tiled preview
    const width = metadata.width;
    const height = metadata.height;

    // Read the image buffer
    const buffer = await image.toBuffer();

    // Create 2x2 grid
    const tiled = await sharp({
      create: {
        width: width * 2,
        height: height * 2,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      }
    })
      .composite([
        { input: buffer, top: 0, left: 0 },
        { input: buffer, top: 0, left: width },
        { input: buffer, top: height, left: 0 },
        { input: buffer, top: height, left: width }
      ])
      .png()
      .toFile(join(PREVIEW_DIR, `${name}_tiled.png`));

    console.log(`  ✓ Created tiled preview`);
    return true;
  } catch (error) {
    console.error(`  ✗ Failed to create preview: ${error.message}`);
    return false;
  }
}

async function main() {
  // Create preview directory
  await import('fs/promises').then(fs =>
    fs.mkdir(PREVIEW_DIR, { recursive: true })
  );

  console.log('Creating tileable previews...\n');

  const files = await readdir(OUTPUT_DIR);
  const backgrounds = files
    .filter(f => f.startsWith('background_variation') && f.endsWith('.png'))
    .sort();

  for (const file of backgrounds) {
    const path = join(OUTPUT_DIR, file);
    const name = file.replace('.png', '');
    await createTileablePreview(path, name);
  }

  console.log(`\nPreviews saved to: ${PREVIEW_DIR}`);
  console.log('\nManually inspect the tiled previews to check for seams.');
}

main().catch(console.error);
