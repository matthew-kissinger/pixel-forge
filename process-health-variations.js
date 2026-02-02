#!/usr/bin/env node
import sharp from 'sharp';
import { readFile, writeFile, readdir } from 'fs/promises';
import path from 'path';

const INPUT_DIR = '/home/mkagent/repos/pixel-forge/output/health_variations';
const OUTPUT_DIR = '/home/mkagent/repos/pixel-forge/output/health_processed';
const TARGET_SIZE = 48;
const MAX_SIZE_KB = 50;

async function processHealthVariations() {
  // Create output directory
  await writeFile(OUTPUT_DIR, '', { flag: 'wx' }).catch(() => {});

  const files = await readdir(INPUT_DIR);
  const pngFiles = files.filter(f => f.endsWith('.png'));

  console.log(`Processing ${pngFiles.length} health variations...\n`);

  for (const file of pngFiles) {
    const inputPath = path.join(INPUT_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, file.replace('.png', '_48x48.png'));

    console.log(`\n=== Processing ${file} ===`);

    // Read the input file
    const inputBuffer = await readFile(inputPath);
    const inputMeta = await sharp(inputBuffer).metadata();
    console.log(`Original: ${inputMeta.width}x${inputMeta.height}`);

    // Resize to 48x48
    const image = sharp(inputBuffer)
      .resize(TARGET_SIZE, TARGET_SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      });

    // High compression PNG
    const outputBuffer = await image
      .png({ compressionLevel: 9, quality: 100 })
      .toBuffer();

    await writeFile(outputPath, outputBuffer);

    const sizeKB = (outputBuffer.length / 1024).toFixed(2);
    const outputMeta = await sharp(outputBuffer).metadata();

    console.log(`Resized: ${outputMeta.width}x${outputMeta.height}`);
    console.log(`Size: ${sizeKB} KB`);

    if (outputBuffer.length / 1024 <= MAX_SIZE_KB) {
      console.log(`✓ Within target (${MAX_SIZE_KB} KB)`);
    } else {
      console.log(`⚠ Exceeds target (${MAX_SIZE_KB} KB) - may need pngquant`);
    }
  }

  console.log(`\n✓ All variations processed to: ${OUTPUT_DIR}`);
  console.log('\nNext: Review and select the best variation');
}

processHealthVariations().catch(console.error);
