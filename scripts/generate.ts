#!/usr/bin/env bun
/**
 * Asset Generation CLI
 *
 * Usage:
 *   bun scripts/generate.ts image --prompt "..." --out vegetation/fern.png [--remove-bg] [--aspect 1:1]
 *   bun scripts/generate.ts batch --manifest scripts/batches/batch1.json
 *   bun scripts/generate.ts kiln  --prompt "low-poly crate" --category prop
 *   bun scripts/generate.ts kiln  --def war-assets/asset-defs/weapons/m16a1.json [--export]
 *   bun scripts/generate.ts kiln  --batch war-assets/asset-defs/weapons/ [--limit 5] [--force]
 *   bun scripts/generate.ts kiln  --status war-assets/asset-defs/
 *
 * Environment:
 *   SERVER_URL - defaults to http://localhost:3000
 */

import sharp from 'sharp';
import { existsSync, statSync, readdirSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import os from 'os';

const SERVER = process.env.SERVER_URL || 'http://localhost:3000';
const OUT_BASE = './war-assets';
const PROJECT_ROOT = path.resolve(import.meta.dir, '..');
const EXPORT_SCRIPT = path.join(PROJECT_ROOT, 'scripts/export-glb.ts');

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function apiPost(endpoint: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const resp = await fetch(`${SERVER}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(300_000),
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
  return bytes < 1024 ? `${bytes}B` : `${(bytes / 1024).toFixed(1)}KB`;
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

// ─── Image Commands ──────────────────────────────────────────────────────────

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

  const genResult = await apiPost('image/generate', {
    prompt: opts.prompt,
    aspectRatio: opts.aspect,
    presetId: opts.preset,
  });

  if (!genResult.image) throw new Error('No image in response');

  const rawPath = outPath.replace(/(\.\w+)$/, '_raw$1');
  const rawSize = await saveBase64(genResult.image as string, rawPath);
  console.log(`  Raw: ${rawPath} (${formatSize(rawSize)})`);

  if (opts.removeBg) {
    const bgResult = await apiPost('image/remove-bg', { image: genResult.image });
    if (bgResult.image) {
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

async function runImageBatch(manifestPath: string) {
  const manifest = await Bun.file(manifestPath).json() as { assets: BatchEntry[] };
  const assets = manifest.assets;

  console.log(`\nBatch: ${assets.length} assets from ${manifestPath}\n`);

  let success = 0;
  let failed = 0;

  for (const [i, asset] of assets.entries()) {
    console.log(`\n[${i + 1}/${assets.length}] ${asset.name}`);

    try {
      if (asset.type === 'kiln') {
        console.log('  Use "kiln --batch" for 3D assets');
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

// ─── Kiln (3D) Commands ─────────────────────────────────────────────────────

interface AssetDef {
  name: string;
  slug: string;
  category: string;
  assetCategory: string;
  budget: number;
  prompt: string;
  animations?: string;
}

function buildKilnPrompt(asset: AssetDef): string {
  const needsAnimation = asset.animations
    && !asset.animations.toLowerCase().startsWith('no animation');

  const parts = [
    `${asset.name} - Vietnam War era military asset.`,
    '',
    `Triangle Budget: ${asset.budget} triangles maximum.`,
    `Style: Low-poly military, flat shading, solid colors.`,
    '',
    asset.prompt,
    '',
    'CRITICAL: Do NOT include ground/terrain/dirt/earth geometry. Only build the asset itself.',
  ];

  if (needsAnimation) {
    parts.push('', `Animation: ${asset.animations}`);
  } else {
    parts.push('', 'No animation needed - static asset. Only define meta and build().');
  }

  return parts.join('\n');
}

function exportGlb(jsonPath: string, glbPath: string): boolean {
  try {
    const result = execSync(
      `bun "${EXPORT_SCRIPT}" "${jsonPath}" "${glbPath}"`,
      { cwd: PROJECT_ROOT, timeout: 30_000, encoding: 'utf-8' }
    );
    console.log(result.trim());
    return true;
  } catch (err: any) {
    console.error(`  Export failed: ${err.message}`);
    if (err.stdout) console.error(err.stdout);
    if (err.stderr) console.error(err.stderr);
    return false;
  }
}

async function generateKilnAsset(asset: AssetDef, force: boolean, doExport: boolean): Promise<boolean> {
  const glbPath = path.join(OUT_BASE, asset.category, `${asset.slug}.glb`);
  const jsonPath = path.join(os.tmpdir(), `kiln-${asset.slug}.json`);

  // Skip if GLB already exists
  if (!force && existsSync(glbPath)) {
    const size = statSync(glbPath).size;
    console.log(`  SKIP: already exists (${formatSize(size)})`);
    return true;
  }

  // Check for cached code
  let code: string | null = null;
  if (!force && existsSync(jsonPath)) {
    try {
      const cached = JSON.parse(readFileSync(jsonPath, 'utf-8'));
      if (cached.code) {
        console.log(`  Using cached code`);
        code = cached.code;
      }
    } catch {}
  }

  // Generate via server API
  if (!code) {
    const prompt = buildKilnPrompt(asset);
    const needsAnimation = asset.animations
      && !asset.animations.toLowerCase().startsWith('no animation');

    console.log(`  Generating via ${SERVER}/api/kiln/generate...`);

    try {
      const data = await apiPost('kiln/generate', {
        prompt,
        mode: 'glb',
        category: asset.assetCategory as 'prop' | 'environment' | 'character' | 'vfx',
        style: 'low-poly',
        includeAnimation: !!needsAnimation,
      }) as { success: boolean; code?: string; error?: string };

      if (!data.success || !data.code) {
        console.error(`  Generation failed: ${data.error || 'no code returned'}`);
        return false;
      }

      code = data.code;

      if (!code.includes('const meta') || !code.includes('function build')) {
        console.error(`  Malformed code (${code.length} chars)`);
        return false;
      }
    } catch (err: any) {
      console.error(`  FAILED: ${err.message}`);
      return false;
    }

    // Cache generated code
    writeFileSync(jsonPath, JSON.stringify({ code }, null, 2));
    console.log(`  Cached: ${jsonPath}`);
  }

  console.log(`  Generated ${code.length} chars of code`);

  // Export GLB if requested
  if (doExport) {
    const dir = path.dirname(glbPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const ok = exportGlb(jsonPath, glbPath);
    if (ok && existsSync(glbPath)) {
      const size = statSync(glbPath).size;
      console.log(`  SUCCESS: ${glbPath} (${formatSize(size)})`);
      return true;
    } else {
      console.error(`  Export failed for ${asset.name}`);
      return false;
    }
  }

  return true;
}

function loadAssetDef(filePath: string): AssetDef {
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function scanAssetDefs(dirPath: string): { file: string; def: AssetDef; glbExists: boolean; glbSize?: number }[] {
  const results: { file: string; def: AssetDef; glbExists: boolean; glbSize?: number }[] = [];

  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.json')) {
        try {
          const def = loadAssetDef(full);
          const glbPath = path.join(OUT_BASE, def.category, `${def.slug}.glb`);
          const glbExists = existsSync(glbPath);
          results.push({
            file: full,
            def,
            glbExists,
            glbSize: glbExists ? statSync(glbPath).size : undefined,
          });
        } catch {}
      }
    }
  }

  walk(dirPath);
  return results.sort((a, b) => a.def.slug.localeCompare(b.def.slug));
}

async function runKilnCommand() {
  const defFile = getArg('--def');
  const batchDir = getArg('--batch');
  const statusDir = getArg('--status');
  const prompt = getArg('--prompt');
  const force = hasFlag('--force');
  const doExport = hasFlag('--export');
  const limit = parseInt(getArg('--limit') ?? '0') || Infinity;

  // Status mode
  if (statusDir) {
    const items = scanAssetDefs(statusDir);
    const done = items.filter(i => i.glbExists);
    const pending = items.filter(i => !i.glbExists);

    console.log(`\nAsset Definitions: ${items.length} total, ${done.length} done, ${pending.length} pending\n`);

    if (done.length > 0) {
      console.log('DONE:');
      for (const i of done) {
        console.log(`  ${i.def.slug.padEnd(22)} ${i.def.name} (${formatSize(i.glbSize!)})`);
      }
    }
    if (pending.length > 0) {
      console.log('\nPENDING:');
      for (const i of pending) {
        console.log(`  ${i.def.slug.padEnd(22)} ${i.def.name}`);
      }
    }
    return;
  }

  // Single asset from definition file
  if (defFile) {
    if (!existsSync(defFile)) {
      console.error(`Not found: ${defFile}`);
      process.exit(1);
    }
    const asset = loadAssetDef(defFile);
    console.log(`\nKiln: ${asset.name} (${asset.budget} tris)`);
    const ok = await generateKilnAsset(asset, force, doExport);
    process.exit(ok ? 0 : 1);
  }

  // Batch from directory
  if (batchDir) {
    if (!existsSync(batchDir)) {
      console.error(`Directory not found: ${batchDir}`);
      process.exit(1);
    }
    const items = scanAssetDefs(batchDir);
    const pending = force ? items : items.filter(i => !i.glbExists);
    const toProcess = pending.slice(0, limit);

    if (toProcess.length === 0) {
      console.log('Nothing to generate. All assets already exist. Use --force to regenerate.');
      return;
    }

    console.log(`\nProcessing ${toProcess.length} of ${pending.length} pending assets:\n`);

    let success = 0;
    let failed = 0;

    for (const [i, item] of toProcess.entries()) {
      console.log(`\n[${i + 1}/${toProcess.length}] ${item.def.name}`);
      const ok = await generateKilnAsset(item.def, force, doExport);
      if (ok) success++;
      else failed++;
    }

    console.log(`\nBatch complete: ${success} success, ${failed} failed out of ${toProcess.length}`);
    const allDone = items.filter(i => existsSync(path.join(OUT_BASE, i.def.category, `${i.def.slug}.glb`))).length;
    console.log(`Overall: ${allDone}/${items.length} assets complete`);
    return;
  }

  // Single asset from prompt
  if (prompt) {
    const category = getArg('--category') ?? 'prop';
    const slug = prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'asset';

    console.log(`\nKiln: "${prompt}" (${category})`);

    const data = await apiPost('kiln/generate', {
      prompt,
      mode: 'glb',
      category,
      style: getArg('--style') ?? 'low-poly',
      includeAnimation: !hasFlag('--no-animation'),
    }) as { success: boolean; code?: string; error?: string };

    if (!data.success || !data.code) {
      console.error(`Generation failed: ${data.error || 'no code returned'}`);
      process.exit(1);
    }

    console.log(`Generated ${data.code.length} chars of code`);

    // Cache code
    const jsonPath = path.join(os.tmpdir(), `kiln-${slug}.json`);
    writeFileSync(jsonPath, JSON.stringify({ code: data.code }, null, 2));
    console.log(`Cached: ${jsonPath}`);

    // Export if requested
    if (doExport) {
      const outFile = getArg('--out') ?? `${category}/${slug}.glb`;
      const glbPath = path.join(OUT_BASE, outFile);
      const dir = path.dirname(glbPath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      exportGlb(jsonPath, glbPath);
    }
    return;
  }

  // No kiln args provided
  console.error('Usage:');
  console.error('  bun scripts/generate.ts kiln --prompt "..." --category prop [--export] [--out path.glb]');
  console.error('  bun scripts/generate.ts kiln --def path/to/asset.json [--export] [--force]');
  console.error('  bun scripts/generate.ts kiln --batch path/to/defs/ [--limit N] [--force] [--export]');
  console.error('  bun scripts/generate.ts kiln --status path/to/defs/');
  process.exit(1);
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
    const health = await fetch(`${SERVER}/health`, { signal: AbortSignal.timeout(5000) });
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
      await runImageBatch(manifest);
      break;
    }

    case 'kiln': {
      await runKilnCommand();
      break;
    }

    default:
      console.log(`
Pixel Forge Asset Generator

Commands:
  image   Generate a single 2D image asset
  batch   Generate multiple 2D assets from a JSON manifest
  kiln    Generate 3D GLB assets via Kiln pipeline

Examples:
  bun scripts/generate.ts image --prompt "jungle fern on red bg" --out vegetation/fern.png --remove-bg
  bun scripts/generate.ts batch --manifest scripts/batches/batch1.json
  bun scripts/generate.ts kiln --prompt "a wooden crate" --category prop --export
  bun scripts/generate.ts kiln --def war-assets/asset-defs/weapons/m16a1.json --export
  bun scripts/generate.ts kiln --batch war-assets/asset-defs/weapons/ --export
  bun scripts/generate.ts kiln --status war-assets/asset-defs/

Options:
  --prompt        Text prompt for generation
  --out           Output path relative to war-assets/
  --remove-bg     Remove background via BiRefNet (image mode)
  --aspect        Aspect ratio (default: 1:1, image mode)
  --preset        Preset ID from shared/presets.ts
  --manifest      Path to batch JSON manifest (batch mode)
  --def           Path to asset definition JSON (kiln mode)
  --batch         Path to directory of asset defs (kiln mode)
  --status        Show completion status of asset defs dir (kiln mode)
  --category      Asset category: prop/character/environment/vfx (kiln mode)
  --style         Asset style: low-poly/stylized/voxel (kiln mode)
  --export        Export GLB after generation (kiln mode)
  --force         Regenerate even if GLB exists (kiln mode)
  --limit N       Process at most N assets (kiln batch mode)
  --no-animation  Generate static asset without animation (kiln mode)
`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
