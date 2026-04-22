/**
 * Wave 2A validation: generate gear.glb and write it to war-assets/validation/
 * so the user can open it in the gallery.
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import * as THREE from 'three';
import {
  createRoot,
  createPart,
  boxGeo,
  cylinderGeo,
  gameMaterial,
} from '../packages/core/src/kiln/primitives';
import { boolDiff, boolUnion, hull } from '../packages/core/src/kiln/solids';
import { renderSceneToGLB } from '../packages/core/src/kiln/render';

const OUT_DIR = 'war-assets/validation';
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

async function writeGlb(path: string, root: THREE.Object3D) {
  const result = await renderSceneToGLB(root);
  writeFileSync(path, result.bytes);
  console.log(
    `[${path}] ${result.bytes.byteLength.toLocaleString()} bytes, ${result.tris} tris`
  );
  if (result.warnings.length) {
    console.log('  warnings:', result.warnings);
  }
}

// ---------------------------------------------------------------------------
// 1. Gear — cylinder body with 8 radially-arrayed teeth cut out
// ---------------------------------------------------------------------------
async function gear() {
  const root = createRoot('Gear');
  const steel = gameMaterial(0xb0b0b0, { metalness: 0.8, roughness: 0.3 });

  // Body disc
  const body = new THREE.Mesh(cylinderGeo(1, 1, 0.3, 32), steel);

  // Eight rectangular teeth cutters around the rim
  const cutters: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const c = new THREE.Mesh(boxGeo(0.4, 0.4, 0.4), gameMaterial(0x000000));
    c.position.set(Math.cos(angle) * 1.1, 0, Math.sin(angle) * 1.1);
    cutters.push(c);
  }

  // Center hole
  const hole = new THREE.Mesh(cylinderGeo(0.25, 0.25, 0.5, 16), gameMaterial(0x000000));

  const gearMesh = await boolDiff('Gear', body, ...cutters, hole);
  root.add(gearMesh);
  await writeGlb(`${OUT_DIR}/gear.glb`, root);
}

// ---------------------------------------------------------------------------
// 2. Vending machine: box with 6 button recesses + front window slot
// ---------------------------------------------------------------------------
async function vendingMachine() {
  const root = createRoot('VendingMachine');
  const redPaint = gameMaterial(0xaa2222, { roughness: 0.7 });

  const body = new THREE.Mesh(boxGeo(1, 2, 0.6), redPaint);

  const cutters: THREE.Mesh[] = [];
  // 3x2 grid of shallow button recesses on front face
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const c = new THREE.Mesh(boxGeo(0.2, 0.2, 0.1), gameMaterial(0x000000));
      c.position.set(-0.3 + col * 0.3, -0.3 + row * 0.3, 0.3);
      cutters.push(c);
    }
  }
  // Front window slot (item viewing area)
  const window = new THREE.Mesh(boxGeo(0.7, 0.5, 0.1), gameMaterial(0x000000));
  window.position.set(0, 0.5, 0.3);
  cutters.push(window);

  const carved = await boolDiff('Body', body, ...cutters);
  root.add(carved);
  await writeGlb(`${OUT_DIR}/vending-machine.glb`, root);
}

// ---------------------------------------------------------------------------
// 3. Hull-wrapped rock cluster
// ---------------------------------------------------------------------------
async function rockHull() {
  const root = createRoot('Rock');
  const stone = gameMaterial(0x776655, { roughness: 0.95 });

  const chunks: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const size = 0.3 + Math.random() * 0.4;
    const chunk = new THREE.Mesh(boxGeo(size, size, size), stone);
    chunk.position.set(
      (Math.random() - 0.5) * 1.5,
      (Math.random() - 0.5) * 1.2,
      (Math.random() - 0.5) * 1.5
    );
    chunks.push(chunk);
  }

  const rock = await hull('Rock', ...chunks);
  root.add(rock);
  await writeGlb(`${OUT_DIR}/rock-hull.glb`, root);
}

await gear();
await vendingMachine();
await rockHull();

console.log('\nWave 2A validation complete. Check war-assets/validation/');
