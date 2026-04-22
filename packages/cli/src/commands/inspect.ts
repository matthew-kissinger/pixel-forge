/**
 * `pixelforge inspect <kind>` — query existing artifacts.
 *
 * Currently only `inspect glb` is implemented. It reads the GLB and prints
 * triangle count + node count from the parsed gltf-transform document — no
 * Kiln code re-execution needed.
 *
 * For inspecting Kiln source code (pre-render), see `pixelforge kiln inspect`.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { defineCommand } from 'citty';
import { NodeIO } from '@gltf-transform/core';

import { printError, printResult } from '../output';

// =============================================================================
// inspect glb
// =============================================================================

const inspectGlbCommand = defineCommand({
  meta: {
    name: 'glb',
    description:
      'Inspect a GLB file: triangle count, node count, mesh names, animation list.',
  },
  args: {
    file: {
      type: 'positional',
      description: 'Path to the GLB file.',
      required: true,
    },
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    try {
      const path = resolve(args.file);
      const bytes = readFileSync(path);

      const io = new NodeIO();
      const doc = await io.readBinary(bytes);
      const root = doc.getRoot();

      let triangles = 0;
      const meshes: Array<{ name: string; primitives: number; tris: number }> = [];

      for (const mesh of root.listMeshes()) {
        let mTris = 0;
        const prims = mesh.listPrimitives();
        for (const prim of prims) {
          const indices = prim.getIndices();
          if (indices) {
            mTris += indices.getCount() / 3;
          } else {
            const pos = prim.getAttribute('POSITION');
            if (pos) mTris += pos.getCount() / 3;
          }
        }
        triangles += mTris;
        meshes.push({
          name: mesh.getName() || '(unnamed)',
          primitives: prims.length,
          tris: Math.round(mTris),
        });
      }

      const nodes = root.listNodes().map((n) => ({
        name: n.getName() || '(unnamed)',
        hasMesh: n.getMesh() !== null,
      }));

      const animations = root.listAnimations().map((a) => ({
        name: a.getName() || '(unnamed)',
        channels: a.listChannels().length,
      }));

      const result = {
        ok: true,
        path,
        sizeBytes: bytes.byteLength,
        triangles: Math.round(triangles),
        nodeCount: nodes.length,
        meshCount: meshes.length,
        animationCount: animations.length,
        meshes,
        nodes,
        animations,
      };

      printResult(result, { json: args.json });
    } catch (err) {
      printError(err);
    }
  },
});

// =============================================================================
// inspect (root)
// =============================================================================

export const inspectCommand = defineCommand({
  meta: {
    name: 'inspect',
    description: 'Inspect an existing artifact (currently: GLB).',
  },
  subCommands: {
    glb: inspectGlbCommand,
  },
});
