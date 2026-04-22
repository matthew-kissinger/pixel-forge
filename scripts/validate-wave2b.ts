/**
 * Wave 2B validation: exercise arrays / mirror / subdivide / curves / blade
 * end-to-end. Writes GLBs to war-assets/validation/ for visual inspection.
 *
 * Round 2 rewrites:
 *   - sword → `bladeGeo` (was boxGeo(0.08, 1.5, 0.01) — a flat ruler).
 *   - rock-smooth → `mergeVertices(..., { positionOnly: true })` BEFORE
 *     jittering so the box's shared corners move as one and subdivide
 *     into a single connected blob, not 3 disconnected shards.
 *   - tower → cylindrical keep (hollow CSG) with 3 course rings and
 *     12 battlement merlons, instead of the radial-brick ring that
 *     left diamond-shaped mortar gaps.
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import * as THREE from 'three';
import {
  createRoot,
  createPart,
  boxGeo,
  cylinderGeo,
  sphereGeo,
  gameMaterial,
  lambertMaterial,
} from '../packages/core/src/kiln/primitives';
import {
  arrayLinear,
  arrayRadial,
  mirror,
  subdivide,
  mergeVertices,
  curveToMesh,
  lathe,
  bezierCurve,
} from '../packages/core/src/kiln/ops';
import { boolDiff } from '../packages/core/src/kiln/solids';
import { bladeGeo } from '../packages/core/src/kiln/gears';
import { renderSceneToGLB } from '../packages/core/src/kiln/render';

const OUT_DIR = 'war-assets/validation';
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

async function writeGlb(path: string, root: THREE.Object3D) {
  const result = await renderSceneToGLB(root);
  writeFileSync(path, result.bytes);
  console.log(
    `[${path}] ${result.bytes.byteLength.toLocaleString()} bytes, ${result.tris} tris`
  );
  if (result.warnings.length) console.log('  warnings:', result.warnings);
}

// ---------------------------------------------------------------------------
// 1. Picket fence — arrayLinear of posts + horizontal rails
// ---------------------------------------------------------------------------
async function fence() {
  const root = createRoot('Fence');
  const wood = gameMaterial(0x8b6f3d, { roughness: 0.9 });

  const post0 = createPart('Post0', cylinderGeo(0.05, 0.05, 1.2, 6), wood, {
    position: [0, 0.6, 0],
    parent: root,
  });
  arrayLinear('Post', post0, 10, [0.5, 0, 0], root);

  const railTop = createPart('RailTop', boxGeo(4.6, 0.08, 0.06), wood, {
    position: [2.25, 0.95, 0],
    parent: root,
  });
  const railBot = createPart('RailBot', boxGeo(4.6, 0.08, 0.06), wood, {
    position: [2.25, 0.35, 0],
    parent: root,
  });
  void railTop;
  void railBot;

  await writeGlb(`${OUT_DIR}/fence.glb`, root);
}

// ---------------------------------------------------------------------------
// 2. Pipe — bezierCurve + curveToMesh
// ---------------------------------------------------------------------------
async function pipe() {
  const root = createRoot('Pipe');
  const brass = gameMaterial(0xb08d3a, { metalness: 0.6, roughness: 0.4 });

  const path = bezierCurve(
    [
      [0, 0, 0],
      [0, 1.5, 0],
      [1.5, 1.5, 0],
      [1.5, 0, 0],
    ],
    32
  );
  const geo = curveToMesh(path, 0.08, 48, 12);
  const pipeMesh = new THREE.Mesh(geo, brass);
  pipeMesh.name = 'Mesh_Pipe';
  root.add(pipeMesh);

  await writeGlb(`${OUT_DIR}/pipe.glb`, root);
}

// ---------------------------------------------------------------------------
// 3. Sword — parametric blade + lathed handle + box guard + sphere pommel.
// ---------------------------------------------------------------------------
async function sword() {
  const root = createRoot('Sword');
  const steel = gameMaterial(0xc8c8c8, { metalness: 0.85, roughness: 0.25 });
  const leather = gameMaterial(0x5a3a20, { roughness: 0.9 });
  const gold = gameMaterial(0xd4af37, { metalness: 0.9, roughness: 0.35 });

  // Blade: origin at base (y=0), tip at y=length. Mount guard at y=0.
  createPart(
    'Blade',
    bladeGeo({ length: 1.5, baseWidth: 0.08, thickness: 0.015, tipLength: 0.3, edgeBevel: 0.6 }),
    steel,
    { position: [0, 0, 0], parent: root }
  );

  // Guard sits at the blade base.
  createPart('Guard', boxGeo(0.4, 0.05, 0.06), gold, {
    position: [0, 0, 0],
    parent: root,
  });

  // Handle: lathed profile wrapped below the guard.
  const handleGeo = lathe(
    [
      [0.03, -0.05],
      [0.035, -0.1],
      [0.035, -0.3],
      [0.03, -0.35],
    ],
    12
  );
  const handle = new THREE.Mesh(handleGeo, leather);
  handle.name = 'Mesh_Handle';
  handle.position.set(0, 0, 0);
  root.add(handle);

  // Pommel cap.
  createPart('Pommel', sphereGeo(0.06, 12, 8), gold, {
    position: [0, -0.4, 0],
    parent: root,
  });

  await writeGlb(`${OUT_DIR}/sword.glb`, root);
}

// ---------------------------------------------------------------------------
// 4. Tower — cylindrical stone keep with battlements + visible courses.
// ---------------------------------------------------------------------------
async function tower() {
  const root = createRoot('Tower');
  const stone = lambertMaterial(0x8a7a6a);
  const darkStone = lambertMaterial(0x5a4a3a);

  // Hollow keep via boolDiff (inner cylinder slightly taller so it fully
  // pierces the outer). Flat CSG for hard architectural edges.
  const outer = new THREE.Mesh(cylinderGeo(1, 1, 3, 16), stone);
  const inner = new THREE.Mesh(cylinderGeo(0.85, 0.85, 3.2, 16), stone);
  const keep = await boolDiff('Keep', outer, inner, { smooth: false });
  keep.position.y = 1.5;
  root.add(keep);

  // Three horizontal course bands — thin protruding rings break the vertical
  // cylinder up with visible joint lines (stand-in for mortar courses).
  for (let i = 1; i <= 3; i++) {
    const y = i * 0.75;
    createPart(`Course${i}`, cylinderGeo(1.04, 1.04, 0.06, 16), darkStone, {
      position: [0, y, 0],
      parent: root,
    });
  }

  // Battlements: 12 merlons around the top rim.
  const merlon0 = createPart('Merlon0', boxGeo(0.2, 0.4, 0.3), stone, {
    position: [1, 3.2, 0],
    parent: root,
  });
  arrayRadial('Merlon', merlon0, 12, 'y', root);

  await writeGlb(`${OUT_DIR}/tower.glb`, root);
}

// ---------------------------------------------------------------------------
// 5. Door with handle — boolDiff (for window) + lathe handle + mirror
// ---------------------------------------------------------------------------
async function doorWithHandle() {
  const root = createRoot('Door');
  const oak = gameMaterial(0x6a4a2a, { roughness: 0.85 });
  const brass = gameMaterial(0xb08d3a, { metalness: 0.7, roughness: 0.4 });

  const body = new THREE.Mesh(boxGeo(1.2, 2.2, 0.1), oak);
  const windowCutter = new THREE.Mesh(boxGeo(0.6, 0.5, 0.2), oak);
  windowCutter.position.set(0, 0.7, 0);

  const door = await boolDiff('Door', body, windowCutter, { smooth: false });
  root.add(door);

  const knobGeo = lathe(
    [
      [0, 0],
      [0.05, 0.02],
      [0.08, 0.05],
      [0.06, 0.08],
      [0.03, 0.1],
    ],
    16
  );
  const knobFront = new THREE.Mesh(knobGeo, brass);
  knobFront.name = 'Mesh_KnobFront';
  knobFront.position.set(0.45, -0.2, 0.08);
  knobFront.rotation.set(Math.PI / 2, 0, 0);
  root.add(knobFront);

  const knobBack = mirror('KnobBack', knobFront, 'z', root);
  void knobBack;

  await writeGlb(`${OUT_DIR}/door.glb`, root);
}

// ---------------------------------------------------------------------------
// 6. Smooth rock — weld corners, jitter the welded verts, subdivide.
// ---------------------------------------------------------------------------
async function smoothRock() {
  const root = createRoot('Rock');
  const stone = lambertMaterial(0x776655);

  // Three.js BoxGeometry has 24 verts (6 faces × 4) because each face needs
  // its own normals / UVs. Welding with positionOnly collapses the 8
  // shared cube corners into one each — essential so jittering and Loop
  // subdivision treat the box as a single connected surface.
  const base = mergeVertices(boxGeo(1.2, 0.8, 1), { positionOnly: true });
  const pos = base.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(
      i,
      pos.getX(i) + (Math.random() - 0.5) * 0.2,
      pos.getY(i) + (Math.random() - 0.5) * 0.2,
      pos.getZ(i) + (Math.random() - 0.5) * 0.2
    );
  }
  pos.needsUpdate = true;

  const smoothed = subdivide(base, 2, { weld: false });
  const rock = new THREE.Mesh(smoothed, stone);
  rock.name = 'Mesh_Rock';
  root.add(rock);

  await writeGlb(`${OUT_DIR}/rock-smooth.glb`, root);
}

await fence();
await pipe();
await sword();
await tower();
await doorWithHandle();
await smoothRock();

console.log('\nWave 2B validation complete. Check war-assets/validation/');
