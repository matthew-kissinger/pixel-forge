#!/usr/bin/env tsx
/**
 * Surgical fix for the helicopter tail-rotor spin-axis bug.
 *
 * Symptom: Huey + Gunship tail rotor disc faces forward/back instead of
 * sideways — looks "mounted 90 degrees the wrong way" in TIJ runtime.
 *
 * Root cause: the asset-generation prompt said "tail rotors spin around the X
 * axis" — but in the asset's `+X forward, +Y up, +Z right` convention, X is
 * the LONGITUDINAL axis, not the lateral. The LLM correctly emitted
 * `Joint_tailRotor.quaternion` keyframes that rotate around joint-local X,
 * which after all transforms ends up rotating the rotor disc around the
 * helicopter's forward axis. Result: disc faces forward/back, not sideways.
 *
 * Fix: swap X ↔ Z components in every keyframe quaternion of
 * `Joint_tailRotor.quaternion`. That converts X-axis spin (longitudinal /
 * forward-back) into Z-axis spin (lateral / sideways) — which IS the correct
 * anti-torque rotor behavior. Blade geometry stays put; only the spin axis
 * changes.
 *
 * What is touched:    ~3-5 keyframes × 16 bytes = ~48-80 bytes of BIN chunk.
 * What is NOT touched: any vertex, mesh, normal, UV, material, hierarchy,
 *                      other animation, joint position, or metadata.
 *
 * Idempotent: detects the post-fix state (max|z| > max|x|) and skips.
 *
 * Usage:
 *   bun scripts/fix-helicopter-tail-rotor.ts --dry-run     # report only
 *   bun scripts/fix-helicopter-tail-rotor.ts --apply       # write in-place
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const JSON_CHUNK_TYPE = 0x4e4f534a;
const BIN_CHUNK_TYPE = 0x004e4942;
const FLOAT_COMPONENT_TYPE = 5126;
const QUATERNION_FLOAT_COUNT = 4;
const QUATERNION_BYTE_SIZE = QUATERNION_FLOAT_COUNT * 4;
const TARGET_NODE_NAME = 'Joint_tailRotor';

const TARGET_FILES = [
  'war-assets/vehicles/aircraft/uh1-huey.glb',
  'war-assets/vehicles/aircraft/uh1c-gunship.glb',
];

interface ParsedGlb {
  json: Record<string, unknown> & {
    nodes?: Array<{ name?: string; [k: string]: unknown }>;
    accessors?: Array<{
      bufferView?: number;
      byteOffset?: number;
      componentType?: number;
      count?: number;
      type?: string;
      [k: string]: unknown;
    }>;
    bufferViews?: Array<{ byteOffset?: number; byteLength?: number; [k: string]: unknown }>;
    animations?: Array<{
      channels?: Array<{ sampler: number; target?: { node?: number; path?: string } }>;
      samplers?: Array<{ input: number; output: number; interpolation?: string }>;
      [k: string]: unknown;
    }>;
  };
  binChunk: Buffer;
}

function readGlb(path: string): ParsedGlb {
  const data = readFileSync(path);
  if (data.toString('utf-8', 0, 4) !== 'glTF') {
    throw new Error(`${path} is not a binary glTF file.`);
  }

  let offset = 12;
  let jsonChunkBytes: Buffer | null = null;
  let binChunk: Buffer | null = null;

  while (offset < data.length) {
    const length = data.readUInt32LE(offset);
    const type = data.readUInt32LE(offset + 4);
    offset += 8;
    const chunk = Buffer.from(data.subarray(offset, offset + length));
    offset += length;

    if (type === JSON_CHUNK_TYPE) jsonChunkBytes = chunk;
    else if (type === BIN_CHUNK_TYPE) binChunk = chunk;
  }

  if (!jsonChunkBytes) throw new Error(`No JSON chunk in ${path}`);
  if (!binChunk) throw new Error(`No BIN chunk in ${path}`);

  const json = JSON.parse(jsonChunkBytes.toString('utf-8').trim()) as ParsedGlb['json'];
  return { json, binChunk };
}

function writeGlb(path: string, parsed: ParsedGlb): void {
  const jsonText = JSON.stringify(parsed.json);
  const jsonPad = (4 - (Buffer.byteLength(jsonText) % 4)) % 4;
  const jsonBuf = Buffer.from(jsonText + ' '.repeat(jsonPad), 'utf-8');

  const binPad = (4 - (parsed.binChunk.length % 4)) % 4;
  const binBuf = binPad === 0
    ? parsed.binChunk
    : Buffer.concat([parsed.binChunk, Buffer.alloc(binPad, 0)]);

  const jsonChunkHeader = Buffer.alloc(8);
  jsonChunkHeader.writeUInt32LE(jsonBuf.length, 0);
  jsonChunkHeader.writeUInt32LE(JSON_CHUNK_TYPE, 4);

  const binChunkHeader = Buffer.alloc(8);
  binChunkHeader.writeUInt32LE(binBuf.length, 0);
  binChunkHeader.writeUInt32LE(BIN_CHUNK_TYPE, 4);

  const totalLength = 12 + 8 + jsonBuf.length + 8 + binBuf.length;
  const header = Buffer.alloc(12);
  header.write('glTF', 0, 4, 'utf-8');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);

  writeFileSync(path, Buffer.concat([
    header,
    jsonChunkHeader, jsonBuf,
    binChunkHeader, binBuf,
  ]));
}

function findNodeIndex(parsed: ParsedGlb, name: string): number {
  const nodes = parsed.json.nodes;
  if (!nodes) throw new Error('No nodes in glTF');
  const idx = nodes.findIndex((n) => n?.name === name);
  if (idx < 0) throw new Error(`Node "${name}" not found`);
  return idx;
}

function findRotationOutputAccessor(parsed: ParsedGlb, nodeIndex: number): number {
  const animations = parsed.json.animations;
  if (!animations) throw new Error('No animations in glTF');
  for (const anim of animations) {
    if (!anim.channels || !anim.samplers) continue;
    for (const channel of anim.channels) {
      if (channel.target?.node === nodeIndex && channel.target?.path === 'rotation') {
        const sampler = anim.samplers[channel.sampler];
        if (!sampler) throw new Error(`Sampler ${channel.sampler} missing`);
        return sampler.output;
      }
    }
  }
  throw new Error(`No rotation animation channel for node ${nodeIndex}`);
}

function getAccessorBinRange(parsed: ParsedGlb, accessorIndex: number): {
  offset: number;
  count: number;
} {
  const accessor = parsed.json.accessors?.[accessorIndex];
  if (!accessor) throw new Error(`Accessor ${accessorIndex} missing`);
  if (accessor.componentType !== FLOAT_COMPONENT_TYPE) {
    throw new Error(`Accessor ${accessorIndex} is not FLOAT (got ${accessor.componentType})`);
  }
  if (accessor.type !== 'VEC4') {
    throw new Error(`Accessor ${accessorIndex} is not VEC4 (got ${accessor.type})`);
  }
  const bufferView = parsed.json.bufferViews?.[accessor.bufferView ?? -1];
  if (!bufferView) throw new Error(`BufferView for accessor ${accessorIndex} missing`);
  const offset = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  return { offset, count: accessor.count ?? 0 };
}

function readQuaternions(bin: Buffer, offset: number, count: number): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < count; i++) {
    const o = offset + i * QUATERNION_BYTE_SIZE;
    out.push([
      bin.readFloatLE(o),
      bin.readFloatLE(o + 4),
      bin.readFloatLE(o + 8),
      bin.readFloatLE(o + 12),
    ]);
  }
  return out;
}

function writeQuaternions(bin: Buffer, offset: number, quats: number[][]): void {
  for (let i = 0; i < quats.length; i++) {
    const o = offset + i * QUATERNION_BYTE_SIZE;
    const [x, y, z, w] = quats[i];
    bin.writeFloatLE(x, o);
    bin.writeFloatLE(y, o + 4);
    bin.writeFloatLE(z, o + 8);
    bin.writeFloatLE(w, o + 12);
  }
}

function isAlreadyXZSwapped(quats: number[][]): boolean {
  let maxX = 0;
  let maxZ = 0;
  for (const q of quats) {
    maxX = Math.max(maxX, Math.abs(q[0]));
    maxZ = Math.max(maxZ, Math.abs(q[2]));
  }
  return maxZ > maxX;
}

function fmtQuat(q: number[]): string {
  return `(${q.map((v) => v.toFixed(4).padStart(8)).join(', ')})`;
}

function processFile(relPath: string, apply: boolean): { changed: boolean; skipped: boolean } {
  const fullPath = join(process.cwd(), relPath);
  console.log(`\n=== ${relPath} ===`);

  const parsed = readGlb(fullPath);
  const nodeIndex = findNodeIndex(parsed, TARGET_NODE_NAME);
  const accessorIndex = findRotationOutputAccessor(parsed, nodeIndex);
  const { offset, count } = getAccessorBinRange(parsed, accessorIndex);

  console.log(`  ${TARGET_NODE_NAME} node index: ${nodeIndex}`);
  console.log(`  rotation accessor index:    ${accessorIndex}`);
  console.log(`  BIN byte offset:            ${offset}`);
  console.log(`  keyframe count:             ${count}`);
  console.log(`  bytes affected:             ${count * QUATERNION_BYTE_SIZE}`);

  const before = readQuaternions(parsed.binChunk, offset, count);

  if (isAlreadyXZSwapped(before)) {
    console.log(`  [SKIP] already X↔Z swapped (max|z| > max|x|)`);
    return { changed: false, skipped: true };
  }

  const after = before.map(([x, y, z, w]) => [z, y, x, w]);

  console.log('  before (x, y, z, w):');
  for (const q of before) console.log(`    ${fmtQuat(q)}`);
  console.log('  after  (x, y, z, w):');
  for (const q of after) console.log(`    ${fmtQuat(q)}`);

  if (apply) {
    writeQuaternions(parsed.binChunk, offset, after);
    writeGlb(fullPath, parsed);
    console.log(`  [WRITTEN] ${relPath}`);
    return { changed: true, skipped: false };
  } else {
    console.log(`  [DRY RUN] no write`);
    return { changed: false, skipped: false };
  }
}

function main(): void {
  const dryRun = process.argv.includes('--dry-run');
  const apply = process.argv.includes('--apply');

  if (dryRun === apply) {
    console.error('Usage: bun scripts/fix-helicopter-tail-rotor.ts [--dry-run | --apply]');
    process.exit(1);
  }

  console.log(`Mode: ${apply ? 'APPLY (writes in-place)' : 'DRY RUN (no writes)'}`);

  let changed = 0;
  let skipped = 0;
  for (const f of TARGET_FILES) {
    const result = processFile(f, apply);
    if (result.changed) changed++;
    if (result.skipped) skipped++;
  }

  console.log(`\nSummary: ${changed} file(s) modified, ${skipped} skipped (already fixed).`);
}

main();
