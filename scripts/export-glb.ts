/**
 * Headless GLB Export Script
 *
 * Thin wrapper over `@pixel-forge/core/kiln.renderGLB()`. Takes Kiln-
 * generated JavaScript (or a JSON response from `/api/kiln/generate`) and
 * writes a binary GLB. No WebGL, no browser APIs, no polyfills.
 *
 * The primitives library + Three.js -> gltf-transform bridge that used to
 * live here has been absorbed into `packages/core/src/kiln/*` as part of
 * W2.1. Keep this script as a CLI so existing workflows (`bun
 * scripts/export-glb.ts <input> <output>`) keep working.
 *
 * Usage:
 *   bun scripts/export-glb.ts <code-json-or-file> <output-path>
 *
 * Examples:
 *   bun scripts/export-glb.ts /tmp/kiln-ammo-crate.json war-assets/structures/ammo-crate.glb
 *   bun scripts/export-glb.ts packages/server/output/kiln/.../geometry.ts war-assets/structures/ammo-crate.glb
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { renderGLB } from '@pixel-forge/core/kiln';

async function main() {
  const [inputPath, outputPath] = process.argv.slice(2);

  if (!inputPath || !outputPath) {
    console.error('Usage: bun scripts/export-glb.ts <code-json-or-file> <output-path>');
    console.error('  <code-json-or-file>  Path to JSON response or .ts code file');
    console.error('  <output-path>        Where to write the .glb (e.g. war-assets/structures/ammo-crate.glb)');
    process.exit(1);
  }

  // Read input (JSON response or raw code file).
  const raw = readFileSync(inputPath, 'utf-8');
  let code: string;
  if (inputPath.endsWith('.json')) {
    const json = JSON.parse(raw);
    code = json.code;
    if (!code) {
      console.error('No "code" field in JSON');
      process.exit(1);
    }
  } else {
    code = raw;
  }

  console.log('Rendering GLB via @pixel-forge/core/kiln.renderGLB()...');
  const { glb, tris, meta, warnings } = await renderGLB(code);

  console.log('Asset:', meta.name || 'Unknown', '| Category:', meta.category || 'prop');
  console.log('Triangles:', tris);
  for (const warning of warnings) {
    console.warn('  warning:', warning);
  }

  const outDir = path.dirname(outputPath);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(outputPath, glb);

  console.log(`Written: ${outputPath} (${(glb.byteLength / 1024).toFixed(1)} KB, ${tris} tris)`);
}

main().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});
