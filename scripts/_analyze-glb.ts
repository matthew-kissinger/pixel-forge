#!/usr/bin/env bun
/**
 * Quick GLB structural analyzer. Loads a GLB via gltf-transform, inspects
 * the scene graph, and reports red flags for common failure modes:
 *   - stray planes (raw PlaneGeometry with few verts, often leftover markers)
 *   - disconnected parts (meshes whose bounding boxes don't overlap with any sibling)
 *   - expected named pivots missing per category
 *   - axis hints (barrel long axis, rotor plane) via OBB aspect ratio
 *
 * Usage:
 *   bun scripts/_analyze-glb.ts war-assets/validation/aircraft-uh1-huey.glb ...
 *   bun scripts/_analyze-glb.ts --category=aircraft war-assets/vehicles/aircraft/*.glb
 */

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { NodeIO } from '@gltf-transform/core';

interface MeshSummary {
  name: string;
  parentName: string;
  tris: number;
  bbox: { min: [number, number, number]; max: [number, number, number] };
  extent: [number, number, number]; // size along x/y/z
  longAxis: 'x' | 'y' | 'z' | null;
  aspect: number; // long / second-long
}

interface Report {
  file: string;
  meshes: number;
  tris: number;
  pivots: string[];
  meshes_detail: MeshSummary[];
  flags: string[];
  missing_expected_pivots: string[];
}

const CATEGORY_EXPECTED: Record<string, string[]> = {
  aircraft: ['fuselage', 'main_rotor', 'tail_rotor'], // loose
  ground: ['turret', 'mainGun', 'chassis'],
  watercraft: ['hull', 'deck'],
  weapons: ['barrel', 'receiver'],
  animals: ['body', 'head'],
  buildings: [],
  structures: [],
  props: [],
};

async function analyze(filePath: string, category: string | null): Promise<Report> {
  const io = new NodeIO();
  const doc = await io.read(filePath);
  const root = doc.getRoot();
  const scene = root.listScenes()[0];
  const flags: string[] = [];
  const meshes_detail: MeshSummary[] = [];
  const pivots = new Set<string>();
  let totalTris = 0;

  if (!scene) {
    return {
      file: basename(filePath),
      meshes: 0,
      tris: 0,
      pivots: [],
      meshes_detail: [],
      flags: ['ERROR: no scene'],
      missing_expected_pivots: [],
    };
  }

  scene.traverse((node) => {
    const n = node.getName() || '(anon)';
    if (!node.getMesh()) {
      if (n && n !== '(anon)') pivots.add(n);
      return;
    }
    const mesh = node.getMesh();
    if (!mesh) return;
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      const indices = prim.getIndices();
      const triCount = indices
        ? indices.getCount() / 3
        : pos
          ? pos.getCount() / 3
          : 0;
      totalTris += triCount;
      if (!pos) continue;
      const arr = pos.getArray() as Float32Array;
      const cnt = pos.getCount();
      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      for (let i = 0; i < cnt; i++) {
        const x = arr[i * 3]!;
        const y = arr[i * 3 + 1]!;
        const z = arr[i * 3 + 2]!;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (z < minZ) minZ = z;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        if (z > maxZ) maxZ = z;
      }
      // apply node world transform approx: just mesh-local is fine for relative shape
      const ex = maxX - minX;
      const ey = maxY - minY;
      const ez = maxZ - minZ;
      const sorted = [
        ['x', ex],
        ['y', ey],
        ['z', ez],
      ].sort((a, b) => (b[1] as number) - (a[1] as number)) as [string, number][];
      const longAxis = sorted[0]![0] as 'x' | 'y' | 'z';
      const aspect = sorted[1]![1] > 0 ? sorted[0]![1] / sorted[1]![1] : Infinity;

      meshes_detail.push({
        name: n,
        parentName: (() => {
          const p = (node as unknown as { getParentNode?: () => { getName(): string } | null }).getParentNode?.();
          return p ? p.getName() || '(anon)' : '(scene)';
        })(),
        tris: triCount,
        bbox: { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] },
        extent: [ex, ey, ez],
        longAxis,
        aspect,
      });

      // Stray plane heuristic: indices == 6 (2 tris) and extent on one axis near 0
      if (triCount === 2) {
        const minExtent = Math.min(ex, ey, ez);
        if (minExtent < 1e-4) {
          flags.push(
            `STRAY_PLANE: "${n}" 2-tri plane at ${JSON.stringify([
              +((minX + maxX) / 2).toFixed(2),
              +((minY + maxY) / 2).toFixed(2),
              +((minZ + maxZ) / 2).toFixed(2),
            ])} extent=${JSON.stringify([+ex.toFixed(2), +ey.toFixed(2), +ez.toFixed(2)])}`,
          );
        }
      }
    }
  });

  // Attachment check: flag meshes whose bbox is disjoint from ALL other meshes
  for (const m of meshes_detail) {
    let touches = false;
    for (const other of meshes_detail) {
      if (m === other) continue;
      const xOverlap =
        m.bbox.max[0] >= other.bbox.min[0] - 0.05 &&
        m.bbox.min[0] <= other.bbox.max[0] + 0.05;
      const yOverlap =
        m.bbox.max[1] >= other.bbox.min[1] - 0.05 &&
        m.bbox.min[1] <= other.bbox.max[1] + 0.05;
      const zOverlap =
        m.bbox.max[2] >= other.bbox.min[2] - 0.05 &&
        m.bbox.min[2] <= other.bbox.max[2] + 0.05;
      if (xOverlap && yOverlap && zOverlap) {
        touches = true;
        break;
      }
    }
    if (!touches && meshes_detail.length > 1) {
      flags.push(`FLOATING: "${m.name}" no bbox overlap with any sibling`);
    }
  }

  const missing_expected_pivots: string[] = [];
  if (category && CATEGORY_EXPECTED[category]) {
    const lowerPivots = Array.from(pivots).map((p) => p.toLowerCase());
    for (const expected of CATEGORY_EXPECTED[category]!) {
      const hit = lowerPivots.some((p) => p.includes(expected.toLowerCase()));
      if (!hit) missing_expected_pivots.push(expected);
    }
  }

  return {
    file: basename(filePath),
    meshes: meshes_detail.length,
    tris: totalTris,
    pivots: Array.from(pivots),
    meshes_detail,
    flags,
    missing_expected_pivots,
  };
}

function short(r: Report, opts: { showPivots: boolean }): string {
  const lines = [`## ${r.file}  meshes=${r.meshes} tris=${r.tris}`];
  if (opts.showPivots) {
    lines.push(`  pivots: ${r.pivots.slice(0, 20).join(', ') || '(none)'}`);
  }
  if (r.missing_expected_pivots.length) {
    lines.push(`  missing pivots: ${r.missing_expected_pivots.join(', ')}`);
  }
  if (r.flags.length) {
    for (const f of r.flags) lines.push(`  ${f}`);
  } else {
    lines.push(`  ok`);
  }
  return lines.join('\n');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let category: string | null = null;
  let showPivots = false;
  const files: string[] = [];
  for (const a of args) {
    if (a.startsWith('--category=')) category = a.slice('--category='.length);
    else if (a === '--show-pivots') showPivots = true;
    else files.push(a);
  }
  if (files.length === 0) {
    console.error('usage: bun scripts/_analyze-glb.ts [--category=<cat>] <file.glb> ...');
    process.exit(1);
  }
  for (const f of files) {
    try {
      const r = await analyze(f, category);
      console.log(short(r, { showPivots }));
    } catch (err) {
      console.log(`## ${basename(f)}  ERROR: ${(err as Error).message}`);
    }
  }
}

await main();
