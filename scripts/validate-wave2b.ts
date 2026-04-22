/**
 * Wave 2B validation: exercise arrays / mirror / subdivide / curves end-to-end.
 *
 * Writes GLBs to war-assets/validation/ for visual inspection.
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
  curveToMesh,
  lathe,
  bezierCurve,
} from '../packages/core/src/kiln/ops';
import { boolDiff } from '../packages/core/src/kiln/solids';
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

  // Posts (cone-topped): 10 posts, 0.5 apart
  const post0 = createPart('Post0', cylinderGeo(0.05, 0.05, 1.2, 6), wood, {
    position: [0, 0.6, 0],
    parent: root,
  });
  arrayLinear('Post', post0, 10, [0.5, 0, 0], root);

  // Two horizontal rails
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
// 3. Sword — extrude blade (curveToMesh with flat cross-section) +
//            handle (lathe) + guard (boxGeo, mirrored)
//
// We don't have a real bevel primitive yet, so the blade is built from a
// thin curveToMesh sweep of a small-radius tube, which approximates a
// beveled edge for a stylized low-poly sword.
// ---------------------------------------------------------------------------
async function sword() {
  const root = createRoot('Sword');
  const steel = gameMaterial(0xc8c8c8, { metalness: 0.85, roughness: 0.25 });
  const leather = gameMaterial(0x5a3a20, { roughness: 0.9 });
  const gold = gameMaterial(0xd4af37, { metalness: 0.9, roughness: 0.35 });

  // Blade: elongated box
  const blade = createPart('Blade', boxGeo(0.08, 1.5, 0.01), steel, {
    position: [0, 0.75, 0],
    parent: root,
  });
  void blade;

  // Guard: small wide box, mirror unused but illustrates the op
  createPart('Guard', boxGeo(0.4, 0.05, 0.06), gold, {
    position: [0, 0, 0],
    parent: root,
  });

  // Handle: lathed profile, wrapped
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

  // Pommel: sphere
  createPart('Pommel', sphereGeo(0.06, 12, 8), gold, {
    position: [0, -0.4, 0],
    parent: root,
  });

  await writeGlb(`${OUT_DIR}/sword.glb`, root);
}

// ---------------------------------------------------------------------------
// 4. Brick tower — arrayRadial bricks around a cylinder
// ---------------------------------------------------------------------------
async function tower() {
  const root = createRoot('Tower');
  const brick = lambertMaterial(0x8b4444);

  // Build a ring of bricks at each height level using arrayRadial.
  const brickGeo = boxGeo(0.3, 0.25, 0.15);
  const levels = 8;
  for (let level = 0; level < levels; level++) {
    const y = 0.125 + level * 0.25;
    const offset = level % 2 === 0 ? 0 : Math.PI / 16; // stagger joints

    const first = createPart(`BrickL${level}_0`, brickGeo, brick, {
      position: [1, y, 0],
      rotation: [0, (offset * 180) / Math.PI, 0],
      parent: root,
    });
    arrayRadial(`BrickL${level}_`, first, 16, 'y', root);
  }

  // Cap
  createPart('Cap', cylinderGeo(1.1, 1.1, 0.1, 16), brick, {
    position: [0, 2.05, 0],
    parent: root,
  });

  await writeGlb(`${OUT_DIR}/tower.glb`, root);
}

// ---------------------------------------------------------------------------
// 5. Door with handle — boolDiff (for latch plate) + lathe handle + mirror
// ---------------------------------------------------------------------------
async function doorWithHandle() {
  const root = createRoot('Door');
  const oak = gameMaterial(0x6a4a2a, { roughness: 0.85 });
  const brass = gameMaterial(0xb08d3a, { metalness: 0.7, roughness: 0.4 });

  // Door body with a rectangular viewing window cut out
  const body = new THREE.Mesh(boxGeo(1.2, 2.2, 0.1), oak);
  const windowCutter = new THREE.Mesh(boxGeo(0.6, 0.5, 0.2), oak);
  windowCutter.position.set(0, 0.7, 0);

  const door = await boolDiff('Door', body, windowCutter);
  root.add(door);

  // Door handle: lathe knob on both sides (mirror)
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
// 6. Smooth rock — subdivide a deformed box
// ---------------------------------------------------------------------------
async function smoothRock() {
  const root = createRoot('Rock');
  const stone = lambertMaterial(0x776655);

  // Start with a box, deform vertices slightly, subdivide to smooth it.
  const base = boxGeo(1.2, 0.8, 1);
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

  const smoothed = subdivide(base, 2);
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
