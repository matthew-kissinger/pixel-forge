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
import { dirname, resolve } from 'node:path';

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
  },
});
