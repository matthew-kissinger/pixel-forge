#!/usr/bin/env bun
/**
 * Generate the 6 remaining weapon GLBs.
 * Recipe — uses the @pixel-forge/core glb pipeline directly (no running
 * server required). Resumable: existing .glb files skip via the batch
 * wrapper.
 *
 *   bun scripts/gen-weapons.ts
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { image } from '@pixel-forge/core';

const OUT_DIR = 'war-assets/weapons';
mkdirSync(OUT_DIR, { recursive: true });

interface Weapon { slug: string; prompt: string; }

const WEAPONS: Weapon[] = [
  { slug: 'm60', prompt: `M60 machine gun - Vietnam War 'The Pig'. Budget: 1500 tris.

Coordinate system: barrel along +Z, Y is up. All parts connected, nothing floating.

RECEIVER: boxGeo(0.06, 0.08, 0.3) dark parkerized 0x333338 at [0, 0.05, 0]. Main body.
BARREL: cylinderGeo(0.015, 0.015, 0.55, 8) at [0, 0.05, 0.42] rotation [90,0,0]. Dark metal 0x333338.
HEAT SHIELD: cylinderGeo(0.022, 0.022, 0.3, 8) at [0, 0.05, 0.3] rotation [90,0,0] lighter 0x3a3a3a.
BIPOD: Left leg: cylinderGeo(0.006, 0.006, 0.2, 4) at [-0.06, -0.08, 0.5] rotation [30,0,15]. Right: mirrored at [0.06, -0.08, 0.5] rotation [30,0,-15].
FEED TRAY: boxGeo(0.05, 0.02, 0.1) at [0, 0.1, 0.05].
PISTOL GRIP: boxGeo(0.025, 0.06, 0.02) black 0x1a1a1a at [0, -0.02, -0.05] rotation [15,0,0].
BUTTSTOCK: boxGeo(0.03, 0.05, 0.2) black 0x1a1a1a at [0, 0.03, -0.22].
CARRYING HANDLE: boxGeo(0.01, 0.03, 0.08) at [0, 0.1, 0.25].
AMMO BELT: boxGeo(0.04, 0.08, 0.01) brass 0xb5a642 at [-0.04, 0.0, 0.05].
GAS TUBE: cylinderGeo(0.008, 0.008, 0.25, 4) at [0, 0.02, 0.25] rotation [90,0,0].
FRONT SIGHT: boxGeo(0.005, 0.015, 0.005) at [0, 0.075, 0.68].` },

  { slug: 'm2-browning', prompt: `M2 Browning .50 cal heavy machine gun on M3 tripod - Vietnam War. Budget: 2000 tris.

Coordinate system: barrel along +Z, Y is up. All parts connected.

RECEIVER: boxGeo(0.08, 0.1, 0.4) gun metal 0x2a2a30 at [0, 0.25, 0].
BARREL: cylinderGeo(0.02, 0.02, 0.7, 8) at [0, 0.25, 0.55] rotation [90,0,0].
BARREL JACKET: cylinderGeo(0.03, 0.03, 0.4, 8) at [0, 0.25, 0.4] rotation [90,0,0] lighter 0x333338.
FLASH HIDER: cylinderGeo(0.015, 0.022, 0.05, 6) at [0, 0.25, 0.9] rotation [90,0,0].
SPADE GRIPS: Left boxGeo(0.012, 0.08, 0.015) at [-0.035, 0.22, -0.22] rotation [-20,0,10]. Right mirrored.
FEED TRAY: boxGeo(0.06, 0.02, 0.12) at [0, 0.31, 0.05].
AMMO BOX: boxGeo(0.1, 0.08, 0.12) olive 0x556B2F at [-0.1, 0.22, 0.05].
AMMO BELT: boxGeo(0.06, 0.01, 0.02) brass 0xb5a642 at [-0.06, 0.28, 0.05].
TRIPOD PINTLE: cylinderGeo(0.025, 0.025, 0.08, 8) at [0, 0.2, 0.0] dark 0x333333.
FRONT LEG: cylinderGeo(0.012, 0.01, 0.35, 6) at [0, 0.05, 0.2] rotation [40,0,0].
LEFT REAR LEG: cylinderGeo(0.012, 0.01, 0.35, 6) at [-0.15, 0.05, -0.15] rotation [40,0,25].
RIGHT REAR LEG: cylinderGeo(0.012, 0.01, 0.35, 6) at [0.15, 0.05, -0.15] rotation [40,0,-25].
T&E MECHANISM: boxGeo(0.03, 0.03, 0.06) at [0, 0.18, -0.08].` },

  { slug: 'm1911', prompt: `M1911A1 pistol - Vietnam War Colt .45 ACP. Budget: 800 tris.

Coordinate system: barrel along +Z, Y is up. All parts connected.

SLIDE: boxGeo(0.025, 0.03, 0.17) parkerized 0x444840 at [0, 0.035, 0.02].
FRAME: boxGeo(0.025, 0.025, 0.12) at [0, 0.01, 0.0] shade 0x3a3f38.
BARREL: cylinderGeo(0.008, 0.008, 0.04, 6) at [0, 0.035, 0.12] rotation [90,0,0].
BARREL BUSHING: cylinderGeo(0.012, 0.012, 0.01, 6) at [0, 0.035, 0.11] rotation [90,0,0].
GRIP: boxGeo(0.024, 0.06, 0.03) dark 0x2a2016 at [0, -0.025, -0.035] rotation [-15,0,0].
TRIGGER GUARD: boxGeo(0.003, 0.003, 0.04) at [0, -0.01, 0.01]. Front: boxGeo(0.003, 0.015, 0.003) at [0, -0.003, 0.03].
TRIGGER: boxGeo(0.003, 0.012, 0.005) silver 0x666666 at [0, -0.005, 0.015].
HAMMER: boxGeo(0.005, 0.012, 0.008) at [0, 0.05, -0.05].
FRONT SIGHT: boxGeo(0.003, 0.008, 0.003) at [0, 0.053, 0.09].
REAR SIGHT: boxGeo(0.012, 0.006, 0.003) at [0, 0.052, -0.03].
SAFETY: boxGeo(0.008, 0.004, 0.006) at [-0.015, 0.04, -0.02] 0x666666.
MAGAZINE BASE: boxGeo(0.02, 0.005, 0.025) at [0, -0.055, -0.035].` },

  { slug: 'm79', prompt: `M79 grenade launcher 'Thumper' - Vietnam War. Budget: 800 tris.

Coordinate system: barrel along +Z, Y is up. All parts connected.

BARREL: cylinderGeo(0.025, 0.025, 0.35, 8) dark 0x3a3a38 at [0, 0.03, 0.2] rotation [90,0,0]. Fat 40mm.
MUZZLE RING: torusGeo(0.025, 0.004, 6, 8) at [0, 0.03, 0.375].
RECEIVER: boxGeo(0.05, 0.06, 0.1) at [0, 0.03, 0.0] dark 0x3a3a38.
BARREL LATCH: boxGeo(0.015, 0.01, 0.015) at [0, 0.065, 0.05].
STOCK: boxGeo(0.035, 0.055, 0.25) wood 0x7B5B3A at [0, 0.01, -0.15] rotation [5,0,0].
BUTTPAD: boxGeo(0.035, 0.055, 0.015) dark 0x222222 at [0, 0.005, -0.28].
TRIGGER GUARD: boxGeo(0.003, 0.035, 0.06) at [0, -0.005, -0.01].
TRIGGER: boxGeo(0.003, 0.012, 0.005) at [0, -0.005, 0.0] metal 0x444444.
FRONT SIGHT: boxGeo(0.004, 0.01, 0.004) at [0, 0.06, 0.37].
REAR SIGHT: boxGeo(0.015, 0.015, 0.005) at [0, 0.065, 0.02].` },

  { slug: 'rpg7', prompt: `RPG-7 rocket launcher with warhead - Vietnam War NVA. Budget: 1200 tris.

Coordinate system: warhead points +Z, Y is up. All parts connected.

LAUNCH TUBE: cylinderGeo(0.02, 0.02, 0.95, 8) olive 0x444a3a at [0, 0, 0] rotation [90,0,0].
FLARED MUZZLE: coneGeo(0.035, 0.08, 8) at [0, 0, 0.48] rotation [-90,0,0].
REAR VENTURI: coneGeo(0.04, 0.12, 8) at [0, 0, -0.48] rotation [90,0,0].
HEAT SHIELD: cylinderGeo(0.028, 0.028, 0.3, 8) wood 0x7B5B3A at [0, 0, 0] rotation [90,0,0].
PISTOL GRIP: boxGeo(0.02, 0.07, 0.025) dark 0x333333 at [0, -0.045, -0.05] rotation [10,0,0].
TRIGGER GUARD: boxGeo(0.003, 0.03, 0.04) at [0, -0.025, -0.04].
OPTICAL SIGHT: cylinderGeo(0.012, 0.012, 0.06, 6) at [-0.03, 0.03, 0.05] rotation [90,0,0].
SIGHT BRACKET: boxGeo(0.015, 0.01, 0.02) at [-0.02, 0.02, 0.05].
WARHEAD BODY: sphereGeo(0.035, 8, 6) olive 0x4a4a40 at [0, 0, 0.55].
WARHEAD TIP: coneGeo(0.02, 0.06, 6) at [0, 0, 0.6] rotation [-90,0,0].
BOOSTER: cylinderGeo(0.015, 0.015, 0.05, 6) at [0, 0, 0.50] rotation [90,0,0].
FINS: 4x boxGeo(0.003, 0.025, 0.04) at 90-degree offsets around rear at Z=-0.3.` },

  { slug: 'ithaca37', prompt: `Ithaca 37 pump-action shotgun - Vietnam War tunnel rat weapon. Budget: 1000 tris.

Coordinate system: barrel along +Z, Y is up. All parts connected.

RECEIVER: boxGeo(0.03, 0.04, 0.12) blued steel 0x1a1a2a at [0, 0.02, 0].
BARREL: cylinderGeo(0.012, 0.012, 0.45, 6) at [0, 0.025, 0.32] rotation [90,0,0].
MAGAZINE TUBE: cylinderGeo(0.01, 0.01, 0.38, 6) at [0, -0.005, 0.28] rotation [90,0,0].
PUMP GRIP: cylinderGeo(0.018, 0.018, 0.1, 6) walnut 0x6B4226 at [0, 0.01, 0.18] rotation [90,0,0].
ACTION BARS: Left boxGeo(0.002, 0.003, 0.12) at [-0.015, 0.01, 0.12]. Right at [0.015, 0.01, 0.12].
STOCK: boxGeo(0.03, 0.05, 0.25) walnut 0x5C3317 at [0, 0.005, -0.17] rotation [3,0,0].
BUTTPAD: boxGeo(0.03, 0.05, 0.01) rubber 0x222222 at [0, 0.003, -0.295].
TRIGGER GUARD: boxGeo(0.003, 0.025, 0.04) at [0, -0.01, -0.01].
TRIGGER: boxGeo(0.003, 0.01, 0.005) at [0, -0.01, 0.0] metal 0x444444.
FRONT BEAD: sphereGeo(0.003, 4, 4) silver 0xCCCCCC at [0, 0.04, 0.54].` },
];

const glb = image.pipelines.createGlbPipeline();
const batch = image.pipelines.createBatchPipeline<Weapon, image.pipelines.GlbOutput>({
  pipeline: {
    id: 'glb-weapon',
    description: 'GLB pipeline that takes our local Weapon shape.',
    run: (w) => glb.run({ prompt: w.prompt, category: 'weapon', style: 'low-poly', includeAnimation: false }),
  },
  getOutputPath: (w) => join(OUT_DIR, `${w.slug}.glb`),
  getOutputBuffer: (o) => o.glb,
  onProgress: (done, total) => console.log(`[${done}/${total}] processed`),
});

console.log(`=== Generating ${WEAPONS.length} weapons ===`);
await batch.run(WEAPONS);
console.log('=== Done ===');
