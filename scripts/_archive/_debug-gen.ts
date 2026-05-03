#!/usr/bin/env bun
/**
 * Debug helper — calls directGenerate with the textured-Huey prompt and
 * dumps the generated code to stdout so we can see what the LLM actually
 * produced. Used for diagnosing why the body mesh dropped + texture missing.
 */

import { writeFileSync } from 'node:fs';
import { directGenerate } from './_direct-generate';

// Re-import the prompt definition from the gen script (load via dynamic import).
const mod = await import('./gen-aircraft-textured.ts').catch(() => null);
// Fall back to inlining the prompt — gen-aircraft-textured.ts doesn't export it.
// Just call directGenerate with a minimal prompt and inspect.

const PROMPT = process.argv[2] ?? '';
if (!PROMPT) {
  console.error('Usage: bun scripts/_debug-gen.ts "<prompt>"');
  process.exit(1);
}

const result = await directGenerate(
  { prompt: PROMPT, mode: 'glb', category: 'prop', includeAnimation: true },
  { model: process.env['KILN_MODEL'] ?? 'claude-opus-4-7' },
);

writeFileSync('/tmp/debug-gen-code.js', result.code);
console.log('Code saved to /tmp/debug-gen-code.js');
console.log('Tris:', result.meta.tris);
console.log('Warnings:', result.warnings);
console.log('---CODE---');
console.log(result.code);
