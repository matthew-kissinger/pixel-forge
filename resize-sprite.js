#!/usr/bin/env node
import sharp from 'sharp';
import { readFile, writeFile } from 'fs/promises';

const INPUT = '/tmp/nautiloid-variations/nautiloid-v4.png';
const OUTPUT = '/tmp/nautiloid-final.png';
const TARGET_SIZE = 96;
const MAX_SIZE_KB = 50;

async function resizeAndOptimize() {
  console.log(`Processing ${INPUT}...`);

  // Read the input file
  const inputBuffer = await readFile(INPUT);
  const inputStat = await sharp(inputBuffer).metadata();
  console.log(`Original: ${inputStat.width}x${inputStat.height}`);

  // Resize to 96x96 maintaining aspect ratio
  let image = sharp(inputBuffer)
    .resize(TARGET_SIZE, TARGET_SIZE, {
      fit: 'inside',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    });

  // Try different compression levels to hit target file size
  let outputBuffer;
  let quality = 9; // Max PNG compression

  outputBuffer = await image
    .png({ compressionLevel: quality })
    .toBuffer();

  await writeFile(OUTPUT, outputBuffer);

  const sizeKB = (outputBuffer.length / 1024).toFixed(2);
  console.log(`Output: ${OUTPUT}`);
  console.log(`Size: ${sizeKB} KB`);

  if (outputBuffer.length / 1024 > MAX_SIZE_KB) {
    console.log(`Warning: File size (${sizeKB} KB) exceeds target (${MAX_SIZE_KB} KB)`);
    console.log('You may want to reduce quality further or use pngquant');
  } else {
    console.log(`✓ File size is within target (${MAX_SIZE_KB} KB)`);
  }
}

resizeAndOptimize().catch(console.error);
