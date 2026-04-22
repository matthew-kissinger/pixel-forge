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
// 2. Vending machine: body carved with button grid, product window, coin
//    slot, coin return, and dispense tray. Header cap + emissive trim + a
//    blue pay-strip label sit on top of the carved body for extra read.
// ---------------------------------------------------------------------------
async function vendingMachine() {
  const root = createRoot('VendingMachine');
  const redPaint = gameMaterial(0xaa2222, { roughness: 0.7 });
  const darkTrim = gameMaterial(0x1a1a1a, { roughness: 0.9 });
  const chrome = gameMaterial(0xc8c8c8, { metalness: 0.85, roughness: 0.25 });
  const labelBlue = gameMaterial(0x1a4a8a, { roughness: 0.5 });
  const yellowTrim = gameMaterial(0xffcc33, {
    emissive: 0xffaa00,
    emissiveIntensity: 1.2,
    roughness: 0.4,
  });
  const glassGlow = gameMaterial(0x00ff88, {
    emissive: 0x00ff66,
    emissiveIntensity: 1.6,
    roughness: 0.25,
  });

  const body = new THREE.Mesh(boxGeo(1, 2, 0.6), redPaint);

  const cutters: THREE.Mesh[] = [];
  // 3x2 button recesses — 0.12u deep. Shifted down to make room for the
  // taller product window above.
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const c = new THREE.Mesh(boxGeo(0.18, 0.18, 0.24), darkTrim);
      c.position.set(-0.3 + col * 0.3, -0.45 + row * 0.28, 0.3);
      cutters.push(c);
    }
  }

  // Product window.
  const windowCutter = new THREE.Mesh(boxGeo(0.7, 0.55, 0.24), darkTrim);
  windowCutter.position.set(0, 0.45, 0.3);
  cutters.push(windowCutter);

  // Coin slot (narrow vertical) — right of the button grid.
  const coinSlot = new THREE.Mesh(boxGeo(0.04, 0.12, 0.24), darkTrim);
  coinSlot.position.set(0.32, 0.05, 0.3);
  cutters.push(coinSlot);

  // Coin return (small rectangular tray) below buttons on the right.
  const coinReturn = new THREE.Mesh(boxGeo(0.18, 0.06, 0.24), darkTrim);
  coinReturn.position.set(0.28, -0.78, 0.3);
  cutters.push(coinReturn);

  // Dispense tray — wide shallow opening at the bottom.
  const tray = new THREE.Mesh(boxGeo(0.6, 0.16, 0.28), darkTrim);
  tray.position.set(-0.1, -0.88, 0.3);
  cutters.push(tray);

  const carved = await boolDiff('Body', body, ...cutters, { smooth: false });
  root.add(carved);

  // Emissive glass pane recessed into the product window.
  createPart('GlassPane', boxGeo(0.66, 0.51, 0.02), glassGlow, {
    position: [0, 0.45, 0.24],
    parent: root,
  });

  // Header cap: raised black box across the top for brand strip contrast.
  createPart('Header', boxGeo(1.02, 0.12, 0.62), darkTrim, {
    position: [0, 1.04, 0],
    parent: root,
  });

  // Blue "VEND" label strip across the header front.
  createPart('Label', boxGeo(0.6, 0.08, 0.01), labelBlue, {
    position: [0, 1.04, 0.31],
    parent: root,
  });

  // Emissive yellow trim: thin strip running below the header and another
  // framing the dispense tray.
  createPart('TopTrim', boxGeo(0.92, 0.03, 0.02), yellowTrim, {
    position: [0, 0.97, 0.31],
    parent: root,
  });
  createPart('TrayTrim', boxGeo(0.62, 0.02, 0.02), yellowTrim, {
    position: [-0.1, -0.79, 0.31],
    parent: root,
  });

  // Chrome coin-return bezel that hints at a metal tray lip.
  createPart('CoinBezel', boxGeo(0.2, 0.02, 0.02), chrome, {
    position: [0.28, -0.74, 0.31],
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
