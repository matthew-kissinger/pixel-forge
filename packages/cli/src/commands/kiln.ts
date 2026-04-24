/**
 * `pixelforge kiln <subcommand>` — drive Kiln introspection / refactor / catalog.
 *
 * - `kiln list-primitives` — dump the sandbox catalog as JSON or table.
 * - `kiln validate ./code.ts` — AST-hardened validation; prints structured
 *   issues + warnings.
 * - `kiln inspect ./code.ts` — execute the code in the sandbox and print
 *   triangle count + named parts + animation tracks.
 * - `kiln refactor ./code.ts --instruction "..." --out ./new.ts` — call
 *   Claude over `core/kiln/generate.ts:refactorCode`.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';

import { defineCommand } from 'citty';

import { kiln } from '@pixel-forge/core';

import { printError, printResult } from '../output';

function ensureDir(filePath: string): void {
  mkdirSync(dirname(resolve(filePath)), { recursive: true });
}

// =============================================================================
// kiln list-primitives
// =============================================================================

const listPrimitivesCommand = defineCommand({
  meta: {
    name: 'list-primitives',
    description: 'Dump the Kiln primitive catalog (geometry / material / structure / animation).',
  },
  args: {
    category: {
      type: 'string',
      description: 'Filter by category (geometry|material|structure|animation|utility).',
    },
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    try {
      const all = kiln.listPrimitives();
      const filtered = args.category
        ? all.filter((p) => p.category === args.category)
        : all;

      if (args.json) {
        printResult({ ok: true, count: filtered.length, primitives: filtered }, { json: true });
        return;
      }

      const lines = filtered.map(
        (p) =>
          `${p.name.padEnd(22)} [${p.category.padEnd(10)}] ${p.signature}\n  -> ${p.returns}\n  ${p.description}`,
      );
      printResult(lines.join('\n\n'), { json: false });
    } catch (err) {
      printError(err);
    }
  },
});

// =============================================================================
// kiln validate
// =============================================================================

const validateCommand = defineCommand({
  meta: {
    name: 'validate',
    description: 'Validate Kiln source code (AST-hardened). Exits non-zero on hard errors.',
  },
  args: {
    file: {
      type: 'positional',
      description: 'Path to the Kiln JS source file.',
      required: true,
    },
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    try {
      const code = readFileSync(resolve(args.file), 'utf-8');
      const result = kiln.validate(code);

      if (args.json) {
        printResult({ ok: result.valid, file: resolve(args.file), ...result }, {
          json: true,
        });
      } else {
        const lines: string[] = [
          `valid:    ${result.valid}`,
          `errors:   ${result.errors.length}`,
          `warnings: ${result.warnings.length}`,
        ];
        for (const issue of result.issues) {
          lines.push(
            `  [error]   ${issue.code}${issue.line ? ` (line ${issue.line})` : ''}: ${issue.message}` +
              (issue.fixHint ? `\n             hint: ${issue.fixHint}` : ''),
          );
        }
        for (const issue of result.warnings) {
          lines.push(
            `  [warn]    ${issue.code}${issue.line ? ` (line ${issue.line})` : ''}: ${issue.message}`,
          );
        }
        printResult(lines.join('\n'), { json: false });
      }

      if (!result.valid) process.exit(1);
    } catch (err) {
      printError(err);
    }
  },
});

// =============================================================================
// kiln inspect
// =============================================================================

const inspectCommand = defineCommand({
  meta: {
    name: 'inspect',
    description:
      'Inspect Kiln source code: triangles, materials, bounding box, named parts, animation tracks.',
  },
  args: {
    file: {
      type: 'positional',
      description: 'Path to the Kiln JS source file.',
      required: true,
    },
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    try {
      const code = readFileSync(resolve(args.file), 'utf-8');
      const result = await kiln.inspect(code);

      if (args.json) {
        printResult({ ok: true, file: resolve(args.file), ...result }, { json: true });
        return;
      }
      const lines = [
        `triangles:        ${result.triangles}`,
        `materials:        ${result.materials}`,
        `bbox min:         [${result.boundingBox.min.map((n) => n.toFixed(2)).join(', ')}]`,
        `bbox max:         [${result.boundingBox.max.map((n) => n.toFixed(2)).join(', ')}]`,
        `bbox size:        [${result.boundingBox.size.map((n) => n.toFixed(2)).join(', ')}]`,
        `named parts:      ${result.namedParts.length}`,
        `animation tracks: ${result.animationTracks.length}`,
        `primitives used:  ${result.primitivesUsed.join(', ') || '(none)'}`,
      ];
      if (result.warnings.length) {
        lines.push('warnings:');
        for (const w of result.warnings) lines.push(`  - ${w}`);
      }
      printResult(lines.join('\n'), { json: false });
    } catch (err) {
      printError(err);
    }
  },
});

// =============================================================================
// kiln refactor
// =============================================================================

const refactorCommand = defineCommand({
  meta: {
    name: 'refactor',
    description: 'Refactor existing Kiln code against a free-form instruction (Claude).',
  },
  args: {
    code: {
      type: 'string',
      description: 'Path to the existing Kiln source file.',
      required: true,
    },
    instruction: {
      type: 'string',
      description: 'What to change (e.g. "add a turret on top").',
      required: true,
    },
    out: {
      type: 'string',
      description: 'Output path for the refactored code.',
      required: true,
    },
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    try {
      const existing = readFileSync(resolve(args.code), 'utf-8');
      // Use `refactor` (companion alias of refactorCode). Accepts a
      // RefactorRequest — pass the existing geometry + the user's
      // instruction, target the geometry path.
      const result = await kiln.refactor({
        instruction: args.instruction,
        geometryCode: existing,
        target: 'geometry',
      });

      if (!result.success || !result.code) {
        throw new Error(`Refactor failed: ${result.error ?? 'unknown error'}`);
      }

      ensureDir(args.out);
      writeFileSync(resolve(args.out), result.code, 'utf-8');

      printResult(
        {
          ok: true,
          path: resolve(args.out),
          codeBytes: result.code.length,
          ...(result.usage ? { usage: result.usage } : {}),
        },
        { json: args.json },
      );
    } catch (err) {
      printError(err);
    }
  },
});

// =============================================================================
// kiln lod
// =============================================================================

const lodCommand = defineCommand({
  meta: {
    name: 'lod',
    description:
      'Generate a multi-level LOD chain from a GLB using meshoptimizer. Writes lod0.glb, lod1.glb, ... + manifest.',
  },
  args: {
    input: {
      type: 'positional',
      description: 'Path to the source GLB.',
      required: true,
    },
    'out-dir': {
      type: 'string',
      description: 'Directory to write lod<N>.glb files into.',
      required: true,
    },
    ratios: {
      type: 'string',
      description: 'Comma-separated target ratios. Default "1.0,0.5,0.25,0.1".',
      default: '1.0,0.5,0.25,0.1',
    },
    error: {
      type: 'string',
      description: 'Error threshold (fraction of mesh radius). Default 0.01.',
      default: '0.01',
    },
    'lock-border': {
      type: 'boolean',
      description: 'Lock topological borders (for tiled terrain).',
      default: false,
    },
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    try {
      const ratios = (args.ratios as string)
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0 && n <= 1);
      if (!ratios.length) throw new Error(`invalid --ratios (got "${args.ratios}")`);
      const errorThreshold = Number(args.error);
      if (!Number.isFinite(errorThreshold)) throw new Error(`invalid --error (got "${args.error}")`);

      const inputPath = resolve(args.input);
      const outDir = resolve(args['out-dir'] as string);
      mkdirSync(outDir, { recursive: true });

      const { kiln: kilnNs } = await import('@pixel-forge/core');
      const result = await kilnNs.generateLODChain(inputPath, {
        ratios,
        errorThreshold,
        lockBorder: !!args['lock-border'],
      });

      const written: Array<{ level: number; path: string; triangles: number; bytes: number }> = [];
      for (const lod of result.lods) {
        const outPath = resolve(outDir, `lod${lod.level}.glb`);
        writeFileSync(outPath, lod.glb);
        written.push({ level: lod.level, path: outPath, triangles: lod.triangles, bytes: lod.bytes });
      }

      printResult(
        {
          ok: true,
          source: result.source,
          lods: written,
        },
        { json: args.json },
      );
    } catch (err) {
      printError(err);
    }
  },
});

// =============================================================================
// kiln bake-imposter
// =============================================================================

const bakeImposterCommand = defineCommand({
  meta: {
    name: 'bake-imposter',
    description:
      'Bake an imposter atlas (lat/lon billboard) from a GLB. Writes <out>.png + <out>.json sidecar.',
  },
  args: {
    input: {
      type: 'positional',
      description: 'Path to the source GLB.',
      required: true,
    },
    out: {
      type: 'string',
      description: 'Output path for the albedo PNG (no extension auto-added).',
      required: true,
    },
    angles: {
      type: 'string',
      description: 'Total viewpoints: 8 | 16 | 32.',
      default: '16',
    },
    axis: {
      type: 'string',
      description: "'y' (full sphere) or 'hemi-y' (upper hemi, foliage default).",
    },
    'tile-size': {
      type: 'string',
      description: 'Pixel size per tile: 128 | 256 | 512 | 1024.',
      default: '512',
    },
    'aux-layers': {
      type: 'string',
      description: 'Comma-separated aux layers: depth,normal',
    },
    bg: {
      type: 'string',
      description: "'transparent' (default) or 'magenta'.",
      default: 'transparent',
    },
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    try {
      const angles = Number(args.angles) as 8 | 16 | 32;
      if (![8, 16, 32].includes(angles)) {
        throw new Error(`--angles must be 8, 16, or 32 (got ${args.angles})`);
      }
      const tileSize = Number(args['tile-size']) as 128 | 256 | 512 | 1024;
      if (![128, 256, 512, 1024].includes(tileSize)) {
        throw new Error(`--tile-size must be 128, 256, 512, or 1024 (got ${args['tile-size']})`);
      }
      const axis = (args.axis as 'y' | 'hemi-y' | undefined) ?? (angles === 16 ? 'y' : 'hemi-y');
      const bg = args.bg === 'magenta' ? 'magenta' : 'transparent';
      const auxLayers = args['aux-layers']
        ? (args['aux-layers'] as string)
            .split(',')
            .map((s) => s.trim())
            .filter((s): s is 'depth' | 'normal' => s === 'depth' || s === 'normal')
        : undefined;

      const inputPath = resolve(args.input);
      const outPath = resolve(args.out);
      ensureDir(outPath);

      const { kiln: kilnNs } = await import('@pixel-forge/core');
      const result = await kilnNs.bakeImposter(inputPath, {
        angles,
        axis,
        tileSize,
        bgColor: bg,
        ...(auxLayers ? { auxLayers } : {}),
        sourcePath: inputPath,
      });

      writeFileSync(outPath, result.atlas);
      const baseOut = outPath.replace(new RegExp(`${extname(outPath)}$`), '');
      writeFileSync(`${baseOut}.json`, JSON.stringify(result.meta, null, 2), 'utf-8');
      const auxPaths: Record<string, string> = {};
      for (const [layer, buf] of Object.entries(result.aux)) {
        if (!buf) continue;
        const p = `${baseOut}.${layer}.png`;
        writeFileSync(p, buf as Buffer);
        auxPaths[layer] = p;
      }

      printResult(
        {
          ok: true,
          albedo: outPath,
          meta: `${baseOut}.json`,
          aux: auxPaths,
          angles: result.meta.angles,
          tiles: `${result.meta.tilesX}x${result.meta.tilesY}`,
          atlas: `${result.meta.atlasWidth}x${result.meta.atlasHeight}`,
          worldSize: result.meta.worldSize,
          tris: result.meta.source.tris,
        },
        { json: args.json },
      );
    } catch (err) {
      printError(err);
    }
  },
});

// =============================================================================
// kiln (root)
// =============================================================================

export const kilnCommand = defineCommand({
  meta: {
    name: 'kiln',
    description: 'Kiln introspection + refactor commands.',
  },
  subCommands: {
    'list-primitives': listPrimitivesCommand,
    validate: validateCommand,
    inspect: inspectCommand,
    refactor: refactorCommand,
    'bake-imposter': bakeImposterCommand,
    lod: lodCommand,
  },
});
