#!/usr/bin/env bun
/**
 * Asset Generation CLI
 *
 * Usage:
 *   bun scripts/generate.ts image --prompt "..." --out vegetation/fern.png [--remove-bg] [--aspect 1:1]
 *   bun scripts/generate.ts batch --manifest scripts/batches/batch1.json
 *   bun scripts/generate.ts kiln  --prompt "low-poly crate" --out structures/crate.glb
 *
 * Environment:
 *   SERVER_URL - defaults to http://localhost:3000
 */

import sharp from 'sharp';

const SERVER = process.env.SERVER_URL || 'http://localhost:3000';
const OUT_BASE = './war-assets';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function apiPost(endpoint: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const resp = await fetch(`${SERVER}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(`API ${endpoint} failed (${resp.status}): ${(err as { error?: string }).error || JSON.stringify(err)}`);
  }
  return resp.json() as Promise<Record<string, unknown>>;
}

async function saveBase64(dataUrl: string, filePath: string): Promise<number> {
  const base64 = (dataUrl as string).replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');
  await Bun.write(filePath, buffer);
  return buffer.length;
}

function formatSize(bytes: number): string {
  return bytes < 1024 ? `${bytes}B` : `${(bytes / 1024).toFixed(0)}KB`;
}

/** Remove magenta chroma key pixels left behind by BiRefNet */
async function chromaCleanMagenta(imageBuffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data.buffer);
  let cleaned = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const isMagenta = r > 150 && b > 150 && g < 100 && Math.abs(r - b) < 60;
    const isPinkish = r > 180 && b > 130 && g < 120 && (r + b) > (g * 4);
    if (isMagenta || isPinkish) {
      pixels[i + 3] = 0;
      cleaned++;
    }
  }

  if (cleaned > 0) console.log(`  Chroma cleanup: removed ${cleaned} magenta pixels`);

  return sharp(Buffer.from(pixels), { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

// ─── Commands ────────────────────────────────────────────────────────────────

interface ImageOpts {
  prompt: string;
  out: string;
  removeBg: boolean;
  aspect: string;
  preset?: string;
}

async function generateImage(opts: ImageOpts) {
  const outPath = `${OUT_BASE}/${opts.out}`;

  console.log(`Generating: ${opts.out}`);
  console.log(`  Prompt: ${opts.prompt.slice(0, 80)}...`);

  // Generate
  const genResult = await apiPost('image/generate', {
    prompt: opts.prompt,
    aspectRatio: opts.aspect,
    presetId: opts.preset,
  });

  if (!genResult.image) throw new Error('No image in response');

  // Save raw
  const rawPath = outPath.replace(/(\.\w+)$/, '_raw$1');
  const rawSize = await saveBase64(genResult.image as string, rawPath);
  console.log(`  Raw: ${rawPath} (${formatSize(rawSize)})`);

  // Optionally remove background
  if (opts.removeBg) {
    const bgResult = await apiPost('image/remove-bg', { image: genResult.image });
    if (bgResult.image) {
      // BiRefNet result -> chroma cleanup to catch remaining magenta
      const bgBase64 = (bgResult.image as string).replace(/^data:image\/\w+;base64,/, '');
      const bgBuffer = Buffer.from(bgBase64, 'base64');
      const cleanBuffer = await chromaCleanMagenta(bgBuffer);
      await Bun.write(outPath, cleanBuffer);
      console.log(`  Clean: ${outPath} (${formatSize(cleanBuffer.length)})`);
    } else {
      console.log(`  BG removal failed, saving raw as final`);
      await saveBase64(genResult.image as string, outPath);
    }
  } else {
    await saveBase64(genResult.image as string, outPath);
    console.log(`  Saved: ${outPath} (${formatSize(rawSize)})`);
  }
}

interface BatchEntry {
  name: string;
  prompt: string;
  out: string;
  removeBg?: boolean;
  aspect?: string;
  preset?: string;
  type?: 'image' | 'kiln';
}

async function runBatch(manifestPath: string) {
  const manifest = await Bun.file(manifestPath).json() as { assets: BatchEntry[] };
  const assets = manifest.assets;

  console.log(`\nBatch: ${assets.length} assets from ${manifestPath}\n`);

  let success = 0;
  let failed = 0;

  for (const [i, asset] of assets.entries()) {
    console.log(`\n[${i + 1}/${assets.length}] ${asset.name}`);

    try {
      if (asset.type === 'kiln') {
        console.log('  Kiln GLB generation not yet implemented in CLI');
        failed++;
        continue;
      }

      await generateImage({
        prompt: asset.prompt,
        out: asset.out,
        removeBg: asset.removeBg ?? true,
        aspect: asset.aspect ?? '1:1',
        preset: asset.preset,
      });
      success++;
    } catch (err) {
      console.log(`  ERROR: ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  console.log(`\nBatch complete: ${success} success, ${failed} failed out of ${assets.length}`);
}

// ─── CLI Parsing ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const command = args[0];

function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : undefined;
}

function hasFlag(flag: string): boolean {
  return args.includes(flag);
}

async function main() {
  // Check server health
  try {
    const health = await fetch(`${SERVER}/health`);
    if (!health.ok) throw new Error(`Server returned ${health.status}`);
  } catch {
    console.error(`Server not reachable at ${SERVER}. Start with: bun run dev:server`);
    process.exit(1);
  }

  switch (command) {
    case 'image': {
      const prompt = getArg('--prompt');
      const out = getArg('--out');
      if (!prompt || !out) {
        console.error('Usage: bun scripts/generate.ts image --prompt "..." --out category/name.png [--remove-bg] [--aspect 1:1]');
        process.exit(1);
      }
      await generateImage({
        prompt,
        out,
        removeBg: hasFlag('--remove-bg'),
        aspect: getArg('--aspect') ?? '1:1',
        preset: getArg('--preset'),
      });
      break;
    }

    case 'batch': {
      const manifest = getArg('--manifest');
      if (!manifest) {
        console.error('Usage: bun scripts/generate.ts batch --manifest path/to/batch.json');
        process.exit(1);
      }
      await runBatch(manifest);
      break;
    }

    default:
      console.log(`
Pixel Forge Asset Generator

Commands:
  image   Generate a single 2D image asset
  batch   Generate multiple assets from a JSON manifest

Examples:
  bun scripts/generate.ts image --prompt "jungle fern on red bg" --out vegetation/fern.png --remove-bg
  bun scripts/generate.ts batch --manifest scripts/batches/batch1.json

Options:
  --prompt      Text prompt for generation
  --out         Output path relative to war-assets/
  --remove-bg   Remove background via BiRefNet
  --aspect      Aspect ratio (default: 1:1)
  --preset      Preset ID from shared/presets.ts
  --manifest    Path to batch JSON manifest
`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
