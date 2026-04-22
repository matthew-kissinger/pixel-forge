/**
 * Wave 2A validation: generate gear.glb, vending-machine.glb, rock-hull.glb
 * to war-assets/validation/ for visual inspection.
 *
 * Round 2 rewrites:
 *   - gear → parametric `gearGeo` (was cylinder + CSG cutters at r=1.1 that
 *     barely overlapped the body and produced scalloped lobes).
 *   - vending-machine → 0.12u-deep cutters + emissive glass pane on window.
 *   - all CSG calls take `{ smooth: false }` so mechanical parts render with
 *     hard faceted edges instead of the old averaged-normal blob.
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import * as THREE from 'three';
import {
  createRoot,
  createPart,
  boxGeo,
  cylinderGeo,
  gameMaterial,
} from '../packages/core/src/kiln/primitives';
import { gearGeo } from '../packages/core/src/kiln/gears';
import { boolDiff, hull } from '../packages/core/src/kiln/solids';
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
// 1. Gear — parametric `gearGeo` (12 teeth, center bore, flat-shaded).
// ---------------------------------------------------------------------------
async function gear() {
  const root = createRoot('Gear');
  const steel = gameMaterial(0xb0b0b0, { metalness: 0.8, roughness: 0.3 });

  createPart(
    'Gear',
    gearGeo({ teeth: 12, rootRadius: 0.8, tipRadius: 1.0, boreRadius: 0.2, height: 0.3 }),
    steel,
    { parent: root }
  );

  await writeGlb(`${OUT_DIR}/gear.glb`, root);
}

// ---------------------------------------------------------------------------
// 2. Vending machine: body with 6 button recesses + front window + glass pane
//    Cutter depth = 0.24u @ center z = 0.3 → 0.12u recess into the body front.
// ---------------------------------------------------------------------------
async function vendingMachine() {
  const root = createRoot('VendingMachine');
  const redPaint = gameMaterial(0xaa2222, { roughness: 0.7 });
  const glassGlow = gameMaterial(0x00ff88, {
    emissive: 0x00ff66,
    emissiveIntensity: 1.6,
    roughness: 0.25,
  });

  const body = new THREE.Mesh(boxGeo(1, 2, 0.6), redPaint);

  const cutters: THREE.Mesh[] = [];
  // 3x2 grid of button recesses — 0.12u deep.
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const c = new THREE.Mesh(boxGeo(0.2, 0.2, 0.24), gameMaterial(0x000000));
      c.position.set(-0.3 + col * 0.3, -0.3 + row * 0.3, 0.3);
      cutters.push(c);
    }
  }
  // Front window slot — same 0.12u recess depth.
  const windowCutter = new THREE.Mesh(boxGeo(0.7, 0.5, 0.24), gameMaterial(0x000000));
  windowCutter.position.set(0, 0.5, 0.3);
  cutters.push(windowCutter);

  const carved = await boolDiff('Body', body, ...cutters, { smooth: false });
  root.add(carved);

  // Emissive glass pane recessed into the window pocket.
  createPart('GlassPane', boxGeo(0.65, 0.45, 0.02), glassGlow, {
    position: [0, 0.5, 0.24],
    parent: root,
  });

  await writeGlb(`${OUT_DIR}/vending-machine.glb`, root);
}

// ---------------------------------------------------------------------------
// 3. Hull-wrapped rock cluster (smooth default for organic hull output).
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
