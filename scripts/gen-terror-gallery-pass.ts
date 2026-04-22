/**
 * Generate a first curated Terror in the Jungle GLB gallery pass.
 *
 * This intentionally avoids provider calls. The goal is a dependable public
 * gallery even when live AI keys, quotas, or model latency are unavailable.
 * Assets are built from the upgraded Kiln primitive library and exported via
 * the same gltf-transform bridge used by the app.
 */

import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import sharp from 'sharp';
import * as THREE from 'three';

import { renderSceneToGLB } from '@pixel-forge/core/kiln';
import {
  basicMaterial,
  bobbingAnimation,
  boxGeo,
  capsuleGeo,
  coneGeo,
  createClip,
  createPart,
  createPivot,
  createRoot,
  cylinderGeo,
  gameMaterial,
  glassMaterial,
  lambertMaterial,
  planeGeo,
  positionTrack,
  rotationTrack,
  sphereGeo,
  spinAnimation,
  torusGeo,
} from '@pixel-forge/core/kiln/primitives';

const OUT_DIR = 'docs/terror-gallery';
const ASSET_DIR = join(OUT_DIR, 'assets');
const SPRITE_DIR = join(OUT_DIR, 'sprites');

type Category =
  | 'aircraft'
  | 'ground'
  | 'watercraft'
  | 'weapon'
  | 'structure'
  | 'building'
  | 'prop';

type SpriteCategory = 'npc' | 'vegetation' | 'icon' | 'effect';

interface BuildOutput {
  root: THREE.Object3D;
  clips?: THREE.AnimationClip[];
  notes?: string[];
}

interface AssetSpec {
  slug: string;
  title: string;
  category: Category;
  priority: 'high' | 'medium';
  triBudget: number;
  scale: string;
  prompt: string;
  requiredParts: string[];
  build: () => BuildOutput;
}

interface ManifestAsset {
  slug: string;
  title: string;
  category: Category;
  priority: 'high' | 'medium';
  path: string;
  sizeBytes: number;
  tris: number;
  triBudget: number;
  materialCount: number;
  namedParts: string[];
  animationClips: string[];
  warnings: string[];
  scale: string;
  prompt: string;
  notes: string[];
}

interface SpriteSpec {
  slug: string;
  title: string;
  category: SpriteCategory;
  size: number;
  prompt: string;
  svg: string;
}

interface SpriteManifestAsset {
  slug: string;
  title: string;
  category: SpriteCategory;
  path: string;
  sizeBytes: number;
  width: number;
  height: number;
  prompt: string;
  validation: string[];
}

const materials = {
  olive: gameMaterial(0x4f5f32, { roughness: 0.82, metalness: 0.18 }),
  darkOlive: gameMaterial(0x26351f, { roughness: 0.86, metalness: 0.12 }),
  fadedOlive: gameMaterial(0x657047, { roughness: 0.88, metalness: 0.1 }),
  blackMetal: gameMaterial(0x111416, { roughness: 0.48, metalness: 0.65 }),
  gunmetal: gameMaterial(0x272c2d, { roughness: 0.42, metalness: 0.72 }),
  rubber: gameMaterial(0x090909, { roughness: 0.92, metalness: 0.02 }),
  tan: gameMaterial(0x9a8158, { roughness: 0.9, metalness: 0.04 }),
  khaki: gameMaterial(0x8d875d, { roughness: 0.92, metalness: 0.03 }),
  wood: gameMaterial(0x6f4a2b, { roughness: 0.86, metalness: 0.0 }),
  darkWood: gameMaterial(0x382417, { roughness: 0.9, metalness: 0.0 }),
  sand: gameMaterial(0x8c7656, { roughness: 0.94, metalness: 0.02 }),
  canvas: lambertMaterial(0x6c6a45),
  glass: glassMaterial(0x9fc5cf, { opacity: 0.38, roughness: 0.16 }),
  redMark: basicMaterial(0xaa1f22),
  whiteMark: basicMaterial(0xe8e8dc),
  mud: gameMaterial(0x4b3925, { roughness: 0.96, metalness: 0.0 }),
  stone: gameMaterial(0x5d6254, { roughness: 0.98, metalness: 0.0 }),
  paleStone: gameMaterial(0x8f9181, { roughness: 0.95, metalness: 0.0 }),
  roofTin: gameMaterial(0x697078, { roughness: 0.52, metalness: 0.42 }),
  jungleGreen: gameMaterial(0x2d5a2c, { roughness: 0.92, metalness: 0.0 }),
  leafLight: gameMaterial(0x62904b, { roughness: 0.9, metalness: 0.0 }),
  warningYellow: basicMaterial(0xb79f42),
};

function part(
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  options: Parameters<typeof createPart>[3] = {},
): THREE.Object3D {
  const obj = createPart(name, geometry, material, options);
  obj.name = name;
  return obj;
}

function pivot(name: string, position: [number, number, number], parent: THREE.Object3D): THREE.Object3D {
  const obj = createPivot(name, position, parent);
  obj.name = name;
  return obj;
}

function cylX(
  name: string,
  radius: number,
  length: number,
  material: THREE.Material,
  parent: THREE.Object3D,
  position: [number, number, number],
  segments = 12,
): THREE.Object3D {
  return part(name, cylinderGeo(radius, radius, length, segments), material, {
    parent,
    position,
    rotation: [0, 0, 90],
  });
}

function cylY(
  name: string,
  radius: number,
  length: number,
  material: THREE.Material,
  parent: THREE.Object3D,
  position: [number, number, number],
  segments = 12,
): THREE.Object3D {
  return part(name, cylinderGeo(radius, radius, length, segments), material, {
    parent,
    position,
  });
}

function cylZ(
  name: string,
  radius: number,
  length: number,
  material: THREE.Material,
  parent: THREE.Object3D,
  position: [number, number, number],
  segments = 12,
): THREE.Object3D {
  return part(name, cylinderGeo(radius, radius, length, segments), material, {
    parent,
    position,
    rotation: [90, 0, 0],
  });
}

function spinTrack(name: string, duration: number, axis: 'x' | 'y' | 'z'): THREE.KeyframeTrack {
  return spinAnimation(name, duration, axis).tracks[0]!;
}

function addStar(parent: THREE.Object3D, name: string, position: [number, number, number], rotation: [number, number, number]): void {
  part(name, planeGeo(0.34, 0.34), materials.whiteMark, {
    parent,
    position,
    rotation,
  });
}

function addRotor(root: THREE.Object3D, topY: number, tailX: number): THREE.AnimationClip {
  const mainRotor = pivot('mainRotor', [0.15, topY, 0], root);
  part('mainHub', cylinderGeo(0.16, 0.16, 0.16, 12), materials.blackMetal, { parent: mainRotor });
  part('mainBlade1', boxGeo(4.6, 0.035, 0.16), materials.blackMetal, { parent: mainRotor });
  part('mainBlade2', boxGeo(0.16, 0.035, 4.6), materials.blackMetal, { parent: mainRotor });

  const tailRotor = pivot('tailRotor', [tailX, 1.0, 0.08], root);
  part('tailBlade1', boxGeo(0.12, 0.035, 0.92), materials.blackMetal, { parent: tailRotor });
  part('tailBlade2', boxGeo(0.92, 0.035, 0.12), materials.blackMetal, { parent: tailRotor });

  return createClip('rotor-spin', 0.6, [
    spinTrack('mainRotor', 0.6, 'y'),
    spinTrack('tailRotor', 0.6, 'x'),
  ]);
}

function buildHueyTransport(): BuildOutput {
  const root = createRoot('UH-1H Huey Transport');

  part('fuselage', capsuleGeo(0.54, 2.45, 10), materials.olive, {
    parent: root,
    position: [0, 1.2, 0],
    rotation: [0, 0, 90],
    scale: [1.18, 1, 0.92],
  });
  part('noseGlass', sphereGeo(0.45, 12, 8), materials.glass, {
    parent: root,
    position: [1.62, 1.22, 0],
    scale: [0.72, 0.58, 0.82],
  });
  part('tailBoom', cylinderGeo(0.18, 0.11, 2.9, 10), materials.olive, {
    parent: root,
    position: [-2.4, 1.28, 0],
    rotation: [0, 0, 90],
  });
  part('tailFin', boxGeo(0.08, 0.88, 0.42), materials.darkOlive, {
    parent: root,
    position: [-3.92, 1.55, 0],
    rotation: [0, 0, -8],
  });
  part('doorLeft', boxGeo(0.95, 0.62, 0.04), materials.fadedOlive, {
    parent: root,
    position: [0.18, 1.12, 0.56],
  });
  part('doorRight', boxGeo(0.95, 0.62, 0.04), materials.fadedOlive, {
    parent: root,
    position: [0.18, 1.12, -0.56],
  });
  cylZ('doorGunLeft', 0.035, 0.9, materials.gunmetal, root, [0.36, 1.0, 0.86], 8);
  cylZ('doorGunRight', 0.035, 0.9, materials.gunmetal, root, [0.36, 1.0, -0.86], 8);
  cylX('skidLeft', 0.045, 2.8, materials.blackMetal, root, [0.15, 0.28, 0.72], 8);
  cylX('skidRight', 0.045, 2.8, materials.blackMetal, root, [0.15, 0.28, -0.72], 8);
  cylY('skidStrutA', 0.025, 0.76, materials.blackMetal, root, [0.9, 0.66, 0.72], 8);
  cylY('skidStrutB', 0.025, 0.76, materials.blackMetal, root, [-0.7, 0.66, 0.72], 8);
  cylY('skidStrutC', 0.025, 0.76, materials.blackMetal, root, [0.9, 0.66, -0.72], 8);
  cylY('skidStrutD', 0.025, 0.76, materials.blackMetal, root, [-0.7, 0.66, -0.72], 8);
  addStar(root, 'whiteStarLeft', [0.62, 1.28, 0.565], [0, 0, 0]);
  addStar(root, 'whiteStarRight', [0.62, 1.28, -0.565], [0, 180, 0]);

  return { root, clips: [addRotor(root, 1.94, -3.92)] };
}

function buildHueyGunship(): BuildOutput {
  const out = buildHueyTransport();
  out.root.name = 'UH-1C Huey Gunship';
  part('rocketPodLeft', cylinderGeo(0.16, 0.16, 0.85, 16), materials.gunmetal, {
    parent: out.root,
    position: [0.25, 0.96, 0.98],
    rotation: [0, 0, 90],
  });
  part('rocketPodRight', cylinderGeo(0.16, 0.16, 0.85, 16), materials.gunmetal, {
    parent: out.root,
    position: [0.25, 0.96, -0.98],
    rotation: [0, 0, 90],
  });
  part('pylonLeft', boxGeo(0.08, 0.12, 0.55), materials.blackMetal, {
    parent: out.root,
    position: [0.18, 1.06, 0.74],
  });
  part('pylonRight', boxGeo(0.08, 0.12, 0.55), materials.blackMetal, {
    parent: out.root,
    position: [0.18, 1.06, -0.74],
  });
  const minigun = pivot('minigun', [1.38, 0.9, 0], out.root);
  cylX('minigunBarrels', 0.055, 0.55, materials.gunmetal, minigun, [0.28, 0, 0], 12);
  return {
    root: out.root,
    clips: [
      ...(out.clips ?? []),
      createClip('minigun-spin', 0.35, [spinTrack('minigun', 0.35, 'x')]),
    ],
    notes: ['Transport base upgraded with reusable rocket pods and animated chin gun.'],
  };
}

function buildCobra(): BuildOutput {
  const root = createRoot('AH-1G Cobra');
  part('fuselage', capsuleGeo(0.33, 3.05, 10), materials.darkOlive, {
    parent: root,
    position: [0, 1.05, 0],
    rotation: [0, 0, 90],
    scale: [1.08, 0.8, 0.62],
  });
  part('cockpitFront', sphereGeo(0.28, 10, 6), materials.glass, {
    parent: root,
    position: [0.85, 1.34, 0],
    scale: [1.0, 0.55, 0.65],
  });
  part('cockpitRear', sphereGeo(0.3, 10, 6), materials.glass, {
    parent: root,
    position: [0.2, 1.42, 0],
    scale: [1.1, 0.58, 0.65],
  });
  part('tailBoom', cylinderGeo(0.12, 0.07, 2.7, 10), materials.darkOlive, {
    parent: root,
    position: [-2.2, 1.08, 0],
    rotation: [0, 0, 90],
  });
  part('stubWingLeft', boxGeo(0.72, 0.08, 0.18), materials.olive, {
    parent: root,
    position: [0.0, 0.96, 0.62],
    rotation: [0, 0, -4],
  });
  part('stubWingRight', boxGeo(0.72, 0.08, 0.18), materials.olive, {
    parent: root,
    position: [0.0, 0.96, -0.62],
    rotation: [0, 0, -4],
  });
  cylX('rocketPodLeft', 0.12, 0.68, materials.gunmetal, root, [0.05, 0.86, 0.85], 16);
  cylX('rocketPodRight', 0.12, 0.68, materials.gunmetal, root, [0.05, 0.86, -0.85], 16);
  const chinTurret = pivot('chinTurret', [1.62, 0.83, 0], root);
  part('turretGun', cylinderGeo(0.035, 0.035, 0.52, 8), materials.gunmetal, {
    parent: chinTurret,
    position: [0.28, 0, 0],
    rotation: [0, 0, 90],
  });
  cylX('skidLeft', 0.035, 2.25, materials.blackMetal, root, [0.1, 0.26, 0.56], 8);
  cylX('skidRight', 0.035, 2.25, materials.blackMetal, root, [0.1, 0.26, -0.56], 8);
  return {
    root,
    clips: [
      addRotor(root, 1.86, -3.58),
      createClip('turret-sweep', 2.4, [
        rotationTrack('chinTurret', [
          { time: 0, rotation: [0, -12, 0] },
          { time: 1.2, rotation: [0, 12, 0] },
          { time: 2.4, rotation: [0, -12, 0] },
        ]),
      ]),
    ],
  };
}

function addWheel(parent: THREE.Object3D, name: string, position: [number, number, number], radius = 0.34): THREE.Object3D {
  return part(name, cylinderGeo(radius, radius, 0.24, 16), materials.rubber, {
    parent,
    position,
    rotation: [90, 0, 0],
  });
}

function buildJeep(): BuildOutput {
  const root = createRoot('M151 MUTT Jeep');
  part('body', boxGeo(2.1, 0.38, 1.18), materials.olive, { parent: root, position: [0.1, 0.72, 0] });
  part('hood', boxGeo(0.82, 0.22, 1.08), materials.fadedOlive, { parent: root, position: [0.92, 0.91, 0] });
  part('seatBench', boxGeo(0.72, 0.18, 0.84), materials.darkOlive, { parent: root, position: [-0.34, 0.98, 0] });
  part('windshield', boxGeo(0.08, 0.55, 1.0), materials.glass, { parent: root, position: [0.45, 1.25, 0], rotation: [0, 0, -18] });
  const gunMount = pivot('gunMount', [-0.68, 1.08, 0], root);
  cylY('pedestal', 0.045, 0.52, materials.blackMetal, gunMount, [0, -0.26, 0], 8);
  part('gunBarrel', cylinderGeo(0.035, 0.035, 0.85, 8), materials.gunmetal, { parent: gunMount, position: [0.36, 0.08, 0], rotation: [0, 0, 90] });
  part('spareTire', torusGeo(0.26, 0.08, 8, 14), materials.rubber, { parent: root, position: [-1.08, 0.86, 0], rotation: [90, 0, 0] });
  const wheels = [
    addWheel(root, 'wheelFL', [0.8, 0.42, 0.68]),
    addWheel(root, 'wheelFR', [0.8, 0.42, -0.68]),
    addWheel(root, 'wheelRL', [-0.78, 0.42, 0.68]),
    addWheel(root, 'wheelRR', [-0.78, 0.42, -0.68]),
  ];
  void wheels;
  addStar(root, 'hoodStar', [1.03, 1.025, 0], [-90, 0, 0]);
  return {
    root,
    clips: [
      createClip('drive-loop', 1, [
        spinTrack('wheelFL', 1, 'z'),
        spinTrack('wheelFR', 1, 'z'),
        spinTrack('wheelRL', 1, 'z'),
        spinTrack('wheelRR', 1, 'z'),
        rotationTrack('gunMount', [
          { time: 0, rotation: [0, -25, 0] },
          { time: 1.5, rotation: [0, 25, 0] },
          { time: 3, rotation: [0, -25, 0] },
        ]),
      ]),
    ],
  };
}

function buildM113(): BuildOutput {
  const root = createRoot('M113 APC');
  part('hull', boxGeo(2.6, 0.82, 1.35), materials.fadedOlive, { parent: root, position: [0, 0.92, 0] });
  part('frontSlope', boxGeo(0.62, 0.66, 1.28), materials.olive, { parent: root, position: [1.42, 0.88, 0], rotation: [0, 0, -12] });
  part('trackLeft', boxGeo(2.72, 0.28, 0.25), materials.rubber, { parent: root, position: [0, 0.43, 0.82] });
  part('trackRight', boxGeo(2.72, 0.28, 0.25), materials.rubber, { parent: root, position: [0, 0.43, -0.82] });
  for (let i = 0; i < 5; i++) {
    const x = -1.0 + i * 0.5;
    addWheel(root, `roadWheelLeft${i + 1}`, [x, 0.43, 0.84], 0.17);
    addWheel(root, `roadWheelRight${i + 1}`, [x, 0.43, -0.84], 0.17);
  }
  const cupola = pivot('cupola', [0.45, 1.44, 0], root);
  cylY('commanderRing', 0.25, 0.14, materials.blackMetal, cupola, [0, 0, 0], 16);
  part('turretGun', cylinderGeo(0.04, 0.04, 0.9, 8), materials.gunmetal, { parent: cupola, position: [0.46, 0.04, 0], rotation: [0, 0, 90] });
  part('rearRamp', boxGeo(0.08, 0.62, 1.06), materials.darkOlive, { parent: root, position: [-1.34, 0.78, 0] });
  part('hatchDriver', boxGeo(0.42, 0.05, 0.34), materials.darkOlive, { parent: root, position: [0.9, 1.36, -0.32], rotation: [0, 12, 0] });
  cylY('antenna', 0.015, 1.0, materials.blackMetal, root, [-0.55, 1.78, -0.5], 6);
  return {
    root,
    clips: [
      createClip('cupola-scan', 2.4, [
        rotationTrack('cupola', [
          { time: 0, rotation: [0, -30, 0] },
          { time: 1.2, rotation: [0, 30, 0] },
          { time: 2.4, rotation: [0, -30, 0] },
        ]),
      ]),
    ],
  };
}

function buildM35(): BuildOutput {
  const root = createRoot('M35 Cargo Truck');
  part('cab', boxGeo(1.0, 0.72, 1.05), materials.olive, { parent: root, position: [1.0, 0.88, 0] });
  part('hood', boxGeo(0.72, 0.38, 0.96), materials.fadedOlive, { parent: root, position: [1.78, 0.76, 0] });
  part('cargoBed', boxGeo(1.85, 0.42, 1.12), materials.darkOlive, { parent: root, position: [-0.45, 0.76, 0] });
  part('canvasCover', boxGeo(1.78, 0.58, 1.08), materials.canvas, { parent: root, position: [-0.45, 1.22, 0] });
  part('tailgate', boxGeo(0.08, 0.48, 1.08), materials.olive, { parent: root, position: [-1.42, 0.78, 0] });
  part('windshield', boxGeo(0.08, 0.42, 0.84), materials.glass, { parent: root, position: [1.34, 1.16, 0], rotation: [0, 0, -10] });
  addWheel(root, 'wheelFL', [1.34, 0.42, 0.64], 0.29);
  addWheel(root, 'wheelFR', [1.34, 0.42, -0.64], 0.29);
  addWheel(root, 'wheelRL1', [-0.2, 0.42, 0.64], 0.3);
  addWheel(root, 'wheelRR1', [-0.2, 0.42, -0.64], 0.3);
  addWheel(root, 'wheelRL2', [-0.82, 0.42, 0.64], 0.3);
  addWheel(root, 'wheelRR2', [-0.82, 0.42, -0.64], 0.3);
  return {
    root,
    clips: [
      createClip('rolling', 1, [
        spinTrack('wheelFL', 1, 'z'),
        spinTrack('wheelFR', 1, 'z'),
        spinTrack('wheelRL1', 1, 'z'),
        spinTrack('wheelRR1', 1, 'z'),
        spinTrack('wheelRL2', 1, 'z'),
        spinTrack('wheelRR2', 1, 'z'),
      ]),
    ],
  };
}

function addWeaponCore(root: THREE.Object3D, name: string, stockColor: THREE.Material): void {
  part(`${name}Receiver`, boxGeo(0.28, 0.18, 0.68), materials.gunmetal, { parent: root, position: [0, 0.86, 0] });
  part(`${name}Stock`, boxGeo(0.3, 0.24, 0.55), stockColor, { parent: root, position: [0, 0.85, -0.62], rotation: [6, 0, 0] });
  cylZ(`${name}Barrel`, 0.035, 0.92, materials.blackMetal, root, [0, 0.9, 0.8], 10);
  cylZ(`${name}Muzzle`, 0.045, 0.16, materials.blackMetal, root, [0, 0.9, 1.34], 10);
  part(`${name}Trigger`, torusGeo(0.08, 0.012, 8, 10), materials.blackMetal, { parent: root, position: [0, 0.69, 0.08], rotation: [90, 0, 0] });
}

function buildM16(): BuildOutput {
  const root = createRoot('M16A1 Rifle');
  addWeaponCore(root, 'm16', materials.blackMetal);
  part('triangularHandguard', boxGeo(0.34, 0.2, 0.58), materials.blackMetal, { parent: root, position: [0, 0.9, 0.47] });
  part('carryHandle', boxGeo(0.16, 0.24, 0.54), materials.blackMetal, { parent: root, position: [0, 1.05, -0.05] });
  part('magazine', boxGeo(0.22, 0.46, 0.18), materials.gunmetal, { parent: root, position: [0, 0.5, -0.08], rotation: [10, 0, 0] });
  const chargingHandle = pivot('chargingHandle', [0, 0.98, -0.25], root);
  part('chargingHandleGrip', boxGeo(0.36, 0.05, 0.06), materials.blackMetal, { parent: chargingHandle });
  return {
    root,
    clips: [
      createClip('reload-check', 1.4, [
        positionTrack('chargingHandle', [
          { time: 0, position: [0, 0.98, -0.25] },
          { time: 0.45, position: [0, 0.98, -0.48] },
          { time: 1.4, position: [0, 0.98, -0.25] },
        ]),
      ]),
    ],
  };
}

function buildAK47(): BuildOutput {
  const root = createRoot('AK-47 Rifle');
  addWeaponCore(root, 'ak47', materials.wood);
  part('woodHandguard', boxGeo(0.34, 0.22, 0.48), materials.wood, { parent: root, position: [0, 0.89, 0.36] });
  part('dustCover', boxGeo(0.3, 0.13, 0.5), materials.gunmetal, { parent: root, position: [0, 1.0, -0.06] });
  part('magazine', boxGeo(0.25, 0.55, 0.24), materials.gunmetal, { parent: root, position: [0, 0.46, -0.03], rotation: [18, 0, 0] });
  const chargingHandle = pivot('chargingHandle', [0.2, 0.98, -0.16], root);
  part('chargingHandleKnob', sphereGeo(0.05, 8, 6), materials.blackMetal, { parent: chargingHandle });
  return {
    root,
    clips: [
      createClip('bolt-cycle', 0.8, [
        positionTrack('chargingHandle', [
          { time: 0, position: [0.2, 0.98, -0.16] },
          { time: 0.32, position: [0.2, 0.98, -0.4] },
          { time: 0.8, position: [0.2, 0.98, -0.16] },
        ]),
      ]),
    ],
  };
}

function buildM60(): BuildOutput {
  const root = createRoot('M60 Machine Gun');
  part('body', boxGeo(0.36, 0.25, 0.88), materials.gunmetal, { parent: root, position: [0, 0.88, -0.12] });
  part('stock', boxGeo(0.34, 0.27, 0.42), materials.blackMetal, { parent: root, position: [0, 0.84, -0.82] });
  cylZ('barrel', 0.045, 1.08, materials.blackMetal, root, [0, 0.9, 0.7], 12);
  cylZ('muzzle', 0.065, 0.18, materials.blackMetal, root, [0, 0.9, 1.34], 12);
  part('feedCover', boxGeo(0.42, 0.08, 0.48), materials.darkOlive, { parent: root, position: [0, 1.08, -0.08] });
  part('ammoBelt', boxGeo(0.52, 0.08, 0.18), materials.tan, { parent: root, position: [-0.42, 0.79, -0.1], rotation: [0, 0, 7] });
  const bipod = pivot('bipod', [0, 0.78, 0.6], root);
  cylY('bipodLegLeft', 0.02, 0.72, materials.blackMetal, bipod, [0.18, -0.34, 0.08], 6);
  cylY('bipodLegRight', 0.02, 0.72, materials.blackMetal, bipod, [-0.18, -0.34, 0.08], 6);
  part('carryHandle', torusGeo(0.2, 0.02, 8, 12), materials.blackMetal, { parent: root, position: [0, 1.16, -0.02], rotation: [90, 0, 0] });
  return {
    root,
    clips: [
      createClip('bipod-deploy', 1.2, [
        rotationTrack('bipod', [
          { time: 0, rotation: [0, 0, 0] },
          { time: 0.6, rotation: [18, 0, 0] },
          { time: 1.2, rotation: [0, 0, 0] },
        ]),
      ]),
    ],
  };
}

function buildBunker(): BuildOutput {
  const root = createRoot('Firebase Sandbag Bunker');
  part('earthBerm', boxGeo(2.8, 0.45, 1.9), materials.sand, { parent: root, position: [0, 0.35, 0] });
  part('timberRoof', boxGeo(2.55, 0.22, 1.72), materials.darkWood, { parent: root, position: [0, 1.18, 0] });
  part('firingSlot', boxGeo(1.28, 0.18, 0.05), materials.blackMetal, { parent: root, position: [1.42, 0.82, 0] });
  part('ammoCrate', boxGeo(0.42, 0.28, 0.34), materials.olive, { parent: root, position: [-0.75, 0.7, 0.48] });
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 6; i++) {
      const x = -1.15 + i * 0.46 + (row % 2) * 0.08;
      part(`sandbagFront${row + 1}_${i + 1}`, capsuleGeo(0.1, 0.32, 6), materials.khaki, {
        parent: root,
        position: [x, 0.56 + row * 0.18, 0.96],
        rotation: [90, 0, 90],
        scale: [1, 1, 0.72],
      });
      part(`sandbagRear${row + 1}_${i + 1}`, capsuleGeo(0.1, 0.32, 6), materials.khaki, {
        parent: root,
        position: [x, 0.56 + row * 0.18, -0.96],
        rotation: [90, 0, 90],
        scale: [1, 1, 0.72],
      });
    }
  }
  return { root, clips: [bobbingAnimation('Firebase Sandbag Bunker', 4, 0.02)] };
}

function buildGuardTower(): BuildOutput {
  const root = createRoot('Jungle Guard Tower');
  for (const [name, x, z] of [
    ['postFL', 0.8, 0.8],
    ['postFR', 0.8, -0.8],
    ['postRL', -0.8, 0.8],
    ['postRR', -0.8, -0.8],
  ] as const) {
    cylY(name, 0.055, 2.25, materials.darkWood, root, [x, 1.1, z], 8);
  }
  part('platform', boxGeo(1.95, 0.18, 1.95), materials.wood, { parent: root, position: [0, 2.12, 0] });
  part('roof', coneGeo(1.25, 0.75, 4), materials.canvas, { parent: root, position: [0, 3.02, 0], rotation: [0, 45, 0] });
  part('ladder', boxGeo(0.12, 1.7, 0.08), materials.darkWood, { parent: root, position: [-1.05, 1.2, 0.62], rotation: [0, 0, -11] });
  for (let i = 0; i < 5; i++) {
    part(`ladderRung${i + 1}`, boxGeo(0.52, 0.05, 0.05), materials.darkWood, {
      parent: root,
      position: [-1.1, 0.52 + i * 0.32, 0.62],
      rotation: [0, 0, -11],
    });
  }
  part('railFront', boxGeo(1.82, 0.1, 0.08), materials.darkWood, { parent: root, position: [0, 2.55, 0.98] });
  part('railRear', boxGeo(1.82, 0.1, 0.08), materials.darkWood, { parent: root, position: [0, 2.55, -0.98] });
  part('railLeft', boxGeo(0.08, 0.1, 1.82), materials.darkWood, { parent: root, position: [-0.98, 2.55, 0] });
  part('railRight', boxGeo(0.08, 0.1, 1.82), materials.darkWood, { parent: root, position: [0.98, 2.55, 0] });
  part('searchLight', sphereGeo(0.16, 10, 6), materials.blackMetal, { parent: root, position: [0.65, 2.42, 0.65] });
  return { root };
}

function addAntenna(parent: THREE.Object3D, name: string, position: [number, number, number], height = 1): void {
  cylY(name, 0.012, height, materials.blackMetal, parent, position, 6);
  part(`${name}Tip`, sphereGeo(0.035, 8, 6), materials.redMark, {
    parent,
    position: [position[0], position[1] + height * 0.52, position[2]],
  });
}

function buildFixedWing(kind: 'ac47' | 'f4' | 'a1'): BuildOutput {
  if (kind === 'f4') {
    const root = createRoot('F-4 Phantom');
    part('fuselage', capsuleGeo(0.33, 3.8, 10), materials.fadedOlive, {
      parent: root,
      position: [0, 1.08, 0],
      rotation: [0, 0, 90],
      scale: [1.08, 0.82, 0.72],
    });
    part('noseCone', coneGeo(0.34, 0.76, 16), materials.darkOlive, {
      parent: root,
      position: [2.2, 1.08, 0],
      rotation: [0, 0, -90],
    });
    part('canopyFront', sphereGeo(0.26, 10, 6), materials.glass, {
      parent: root,
      position: [0.78, 1.34, 0],
      scale: [1.25, 0.48, 0.58],
    });
    part('canopyRear', sphereGeo(0.25, 10, 6), materials.glass, {
      parent: root,
      position: [0.2, 1.36, 0],
      scale: [1.1, 0.45, 0.55],
    });
    part('leftWing', boxGeo(1.55, 0.08, 0.5), materials.darkOlive, {
      parent: root,
      position: [0.0, 0.96, 0.88],
      rotation: [0, 18, 0],
    });
    part('rightWing', boxGeo(1.55, 0.08, 0.5), materials.darkOlive, {
      parent: root,
      position: [0.0, 0.96, -0.88],
      rotation: [0, -18, 0],
    });
    part('tailFin', boxGeo(0.12, 0.92, 0.38), materials.darkOlive, {
      parent: root,
      position: [-1.64, 1.54, 0],
      rotation: [0, 0, 20],
    });
    part('leftElevator', boxGeo(0.62, 0.06, 0.26), materials.darkOlive, {
      parent: root,
      position: [-1.74, 1.1, 0.48],
      rotation: [0, 10, 0],
    });
    part('rightElevator', boxGeo(0.62, 0.06, 0.26), materials.darkOlive, {
      parent: root,
      position: [-1.74, 1.1, -0.48],
      rotation: [0, -10, 0],
    });
    cylX('leftIntake', 0.18, 0.55, materials.gunmetal, root, [0.72, 0.95, 0.46], 16);
    cylX('rightIntake', 0.18, 0.55, materials.gunmetal, root, [0.72, 0.95, -0.46], 16);
    cylX('leftExhaust', 0.15, 0.36, materials.blackMetal, root, [-2.05, 0.98, 0.22], 16);
    cylX('rightExhaust', 0.15, 0.36, materials.blackMetal, root, [-2.05, 0.98, -0.22], 16);
    part('leftPylon', boxGeo(0.1, 0.1, 0.55), materials.blackMetal, { parent: root, position: [0.18, 0.82, 1.02] });
    part('rightPylon', boxGeo(0.1, 0.1, 0.55), materials.blackMetal, { parent: root, position: [0.18, 0.82, -1.02] });
    cylX('leftBomb', 0.11, 0.62, materials.olive, root, [0.2, 0.68, 1.08], 12);
    cylX('rightBomb', 0.11, 0.62, materials.olive, root, [0.2, 0.68, -1.08], 12);
    addWheel(root, 'noseWheel', [1.2, 0.5, 0], 0.15);
    addWheel(root, 'leftMainWheel', [-0.36, 0.48, 0.62], 0.18);
    addWheel(root, 'rightMainWheel', [-0.36, 0.48, -0.62], 0.18);
    return {
      root,
      clips: [
        createClip('taxi-roll', 1, [
          spinTrack('noseWheel', 1, 'z'),
          spinTrack('leftMainWheel', 1, 'z'),
          spinTrack('rightMainWheel', 1, 'z'),
        ]),
      ],
    };
  }

  if (kind === 'ac47') {
    const root = createRoot('AC-47 Spooky');
    part('fuselage', capsuleGeo(0.44, 3.75, 12), materials.olive, {
      parent: root,
      position: [0, 1.08, 0],
      rotation: [0, 0, 90],
      scale: [1.18, 0.88, 0.88],
    });
    part('noseGlass', sphereGeo(0.34, 10, 6), materials.glass, {
      parent: root,
      position: [2.05, 1.1, 0],
      scale: [0.9, 0.6, 0.8],
    });
    part('leftWing', boxGeo(1.8, 0.08, 0.44), materials.darkOlive, {
      parent: root,
      position: [0.2, 1.18, 1.14],
      rotation: [0, -8, 0],
    });
    part('rightWing', boxGeo(1.8, 0.08, 0.44), materials.darkOlive, {
      parent: root,
      position: [0.2, 1.18, -1.14],
      rotation: [0, 8, 0],
    });
    part('tailFin', boxGeo(0.12, 0.82, 0.42), materials.darkOlive, { parent: root, position: [-1.9, 1.48, 0] });
    part('tailPlaneLeft', boxGeo(0.62, 0.06, 0.22), materials.darkOlive, { parent: root, position: [-1.9, 1.18, 0.58] });
    part('tailPlaneRight', boxGeo(0.62, 0.06, 0.22), materials.darkOlive, { parent: root, position: [-1.9, 1.18, -0.58] });
    cylX('engineLeft', 0.19, 0.42, materials.gunmetal, root, [0.7, 1.06, 0.92], 16);
    cylX('engineRight', 0.19, 0.42, materials.gunmetal, root, [0.7, 1.06, -0.92], 16);
    const propLeft = pivot('propLeft', [1.0, 1.06, 0.92], root);
    part('propLeftBladeA', boxGeo(0.08, 0.62, 0.04), materials.blackMetal, { parent: propLeft });
    part('propLeftBladeB', boxGeo(0.08, 0.04, 0.62), materials.blackMetal, { parent: propLeft });
    const propRight = pivot('propRight', [1.0, 1.06, -0.92], root);
    part('propRightBladeA', boxGeo(0.08, 0.62, 0.04), materials.blackMetal, { parent: propRight });
    part('propRightBladeB', boxGeo(0.08, 0.04, 0.62), materials.blackMetal, { parent: propRight });
    for (let i = 0; i < 3; i++) {
      cylZ(`sideMinigun${i + 1}`, 0.035, 0.85, materials.gunmetal, root, [-0.15 - i * 0.28, 0.92, 0.52], 8);
    }
    addWheel(root, 'noseWheel', [1.25, 0.48, 0], 0.16);
    addWheel(root, 'leftMainWheel', [0.25, 0.48, 0.7], 0.19);
    addWheel(root, 'rightMainWheel', [0.25, 0.48, -0.7], 0.19);
    return {
      root,
      clips: [createClip('prop-spin', 0.55, [spinTrack('propLeft', 0.55, 'x'), spinTrack('propRight', 0.55, 'x')])],
    };
  }

  const root = createRoot('A-1 Skyraider');
  part('fuselage', capsuleGeo(0.36, 3.15, 12), materials.fadedOlive, {
    parent: root,
    position: [0, 1.02, 0],
    rotation: [0, 0, 90],
    scale: [1.1, 0.82, 0.72],
  });
  part('cowling', cylinderGeo(0.38, 0.32, 0.45, 18), materials.darkOlive, {
    parent: root,
    position: [1.72, 1.02, 0],
    rotation: [0, 0, 90],
  });
  const propeller = pivot('propeller', [1.98, 1.02, 0], root);
  part('propBladeA', boxGeo(0.08, 0.84, 0.04), materials.blackMetal, { parent: propeller });
  part('propBladeB', boxGeo(0.08, 0.04, 0.84), materials.blackMetal, { parent: propeller });
  part('canopy', sphereGeo(0.26, 10, 6), materials.glass, {
    parent: root,
    position: [0.22, 1.36, 0],
    scale: [1.1, 0.5, 0.55],
  });
  part('leftWing', boxGeo(1.8, 0.08, 0.5), materials.darkOlive, { parent: root, position: [0.18, 0.98, 1.02] });
  part('rightWing', boxGeo(1.8, 0.08, 0.5), materials.darkOlive, { parent: root, position: [0.18, 0.98, -1.02] });
  part('tailFin', boxGeo(0.12, 0.86, 0.38), materials.darkOlive, { parent: root, position: [-1.44, 1.42, 0] });
  part('leftElevator', boxGeo(0.62, 0.06, 0.24), materials.darkOlive, { parent: root, position: [-1.5, 1.12, 0.48] });
  part('rightElevator', boxGeo(0.62, 0.06, 0.24), materials.darkOlive, { parent: root, position: [-1.5, 1.12, -0.48] });
  for (let i = 0; i < 4; i++) {
    cylX(`rocketLeft${i + 1}`, 0.055, 0.42, materials.gunmetal, root, [-0.35 + i * 0.28, 0.78, 1.14], 8);
    cylX(`rocketRight${i + 1}`, 0.055, 0.42, materials.gunmetal, root, [-0.35 + i * 0.28, 0.78, -1.14], 8);
  }
  addWheel(root, 'leftMainWheel', [0.52, 0.48, 0.46], 0.18);
  addWheel(root, 'rightMainWheel', [0.52, 0.48, -0.46], 0.18);
  addWheel(root, 'tailWheel', [-1.44, 0.42, 0], 0.1);
  return { root, clips: [createClip('propeller-spin', 0.5, [spinTrack('propeller', 0.5, 'x')])] };
}

function buildTrackedArmor(kind: 'm48' | 'pt76'): BuildOutput {
  const isPt = kind === 'pt76';
  const root = createRoot(isPt ? 'PT-76 Amphibious Tank' : 'M48 Patton Tank');
  const hullMat = isPt ? materials.darkOlive : materials.fadedOlive;
  part('hull', boxGeo(isPt ? 2.75 : 2.95, isPt ? 0.55 : 0.72, isPt ? 1.2 : 1.46), hullMat, {
    parent: root,
    position: [0, isPt ? 0.74 : 0.86, 0],
  });
  part('frontGlacis', boxGeo(0.62, 0.42, isPt ? 1.12 : 1.36), materials.olive, {
    parent: root,
    position: [1.36, isPt ? 0.86 : 0.96, 0],
    rotation: [0, 0, -14],
  });
  part('trackLeft', boxGeo(isPt ? 2.82 : 3.08, 0.28, 0.22), materials.rubber, { parent: root, position: [0, 0.42, isPt ? 0.72 : 0.88] });
  part('trackRight', boxGeo(isPt ? 2.82 : 3.08, 0.28, 0.22), materials.rubber, { parent: root, position: [0, 0.42, isPt ? -0.72 : -0.88] });
  for (let i = 0; i < 6; i++) {
    const x = -1.16 + i * 0.46;
    addWheel(root, `roadWheelLeft${i + 1}`, [x, 0.42, isPt ? 0.72 : 0.88], 0.15);
    addWheel(root, `roadWheelRight${i + 1}`, [x, 0.42, isPt ? -0.72 : -0.88], 0.15);
  }
  const turret = pivot('turret', [0.16, isPt ? 1.18 : 1.34, 0], root);
  part('turretBody', boxGeo(isPt ? 0.92 : 1.1, isPt ? 0.34 : 0.42, isPt ? 0.82 : 0.98), materials.olive, { parent: turret });
  cylX('mainGun', isPt ? 0.04 : 0.055, isPt ? 1.35 : 1.55, materials.gunmetal, turret, [0.78, 0.06, 0], 12);
  cylY('cupola', 0.16, 0.13, materials.blackMetal, turret, [-0.18, 0.28, 0.18], 12);
  part('coaxGun', cylinderGeo(0.018, 0.018, 0.62, 8), materials.blackMetal, { parent: turret, position: [0.63, 0.0, 0.16], rotation: [0, 0, 90] });
  if (isPt) {
    part('bowWakeRail', boxGeo(0.08, 0.08, 1.08), materials.blackMetal, { parent: root, position: [1.44, 0.86, 0] });
    part('rearJetNozzle', cylinderGeo(0.08, 0.08, 0.12, 10), materials.blackMetal, { parent: root, position: [-1.42, 0.62, 0], rotation: [0, 0, 90] });
  } else {
    cylY('antenna', 0.012, 1.0, materials.blackMetal, root, [-0.7, 1.7, -0.52], 6);
    part('searchLight', sphereGeo(0.12, 8, 6), materials.blackMetal, { parent: turret, position: [0.36, 0.32, -0.26] });
  }
  return {
    root,
    clips: [
      createClip('turret-scan', 3, [
        rotationTrack('turret', [
          { time: 0, rotation: [0, -24, 0] },
          { time: 1.5, rotation: [0, 24, 0] },
          { time: 3, rotation: [0, -24, 0] },
        ]),
      ]),
    ],
  };
}

function buildBoat(kind: 'pbr' | 'sampan'): BuildOutput {
  const root = createRoot(kind === 'pbr' ? 'PBR Patrol Boat' : 'Vietnamese Sampan');
  if (kind === 'sampan') {
    part('hull', boxGeo(2.55, 0.28, 0.62), materials.darkWood, { parent: root, position: [0, 0.42, 0] });
    part('bow', coneGeo(0.34, 0.62, 4), materials.darkWood, { parent: root, position: [1.42, 0.43, 0], rotation: [0, 0, -90] });
    part('stern', coneGeo(0.34, 0.5, 4), materials.darkWood, { parent: root, position: [-1.32, 0.43, 0], rotation: [0, 0, 90] });
    part('cargoBasket', boxGeo(0.44, 0.26, 0.42), materials.tan, { parent: root, position: [-0.25, 0.68, 0] });
    cylZ('oarLeft', 0.025, 1.7, materials.wood, root, [0.26, 0.72, 0.64], 6);
    cylZ('oarRight', 0.025, 1.7, materials.wood, root, [0.1, 0.72, -0.64], 6);
    return { root, clips: [bobbingAnimation('Vietnamese Sampan', 2.8, 0.045)] };
  }

  part('hull', boxGeo(2.75, 0.44, 0.78), materials.darkOlive, { parent: root, position: [0, 0.5, 0] });
  part('bowSlope', boxGeo(0.62, 0.34, 0.7), materials.olive, { parent: root, position: [1.42, 0.55, 0], rotation: [0, 0, -16] });
  part('pilotHouse', boxGeo(0.72, 0.5, 0.62), materials.olive, { parent: root, position: [0.28, 0.93, 0] });
  part('windshield', boxGeo(0.06, 0.32, 0.52), materials.glass, { parent: root, position: [0.64, 1.02, 0], rotation: [0, 0, -10] });
  const bowGun = pivot('bowGunMount', [1.15, 0.88, 0], root);
  cylY('bowPedestal', 0.04, 0.38, materials.blackMetal, bowGun, [0, -0.18, 0], 8);
  cylX('bowTwinGun', 0.035, 0.72, materials.gunmetal, bowGun, [0.34, 0.04, 0], 8);
  const sternGun = pivot('sternGunMount', [-1.12, 0.78, 0], root);
  cylX('sternGunBarrel', 0.04, 0.76, materials.gunmetal, sternGun, [0.34, 0.04, 0], 8);
  part('antennaRack', boxGeo(0.56, 0.04, 0.04), materials.blackMetal, { parent: root, position: [-0.25, 1.24, 0] });
  addAntenna(root, 'radioAntenna', [-0.46, 1.28, 0.22], 0.85);
  return {
    root,
    clips: [
      bobbingAnimation('PBR Patrol Boat', 2.6, 0.035),
      createClip('gun-sweep', 2.4, [
        rotationTrack('bowGunMount', [
          { time: 0, rotation: [0, -22, 0] },
          { time: 1.2, rotation: [0, 22, 0] },
          { time: 2.4, rotation: [0, -22, 0] },
        ]),
      ]),
    ],
  };
}

function buildM2Browning(): BuildOutput {
  const root = createRoot('M2 Browning Heavy Machine Gun');
  part('receiver', boxGeo(0.42, 0.28, 0.7), materials.gunmetal, { parent: root, position: [0, 0.94, 0] });
  cylZ('heavyBarrel', 0.055, 1.2, materials.blackMetal, root, [0, 0.96, 0.86], 12);
  cylZ('coolingJacket', 0.082, 0.45, materials.gunmetal, root, [0, 0.96, 0.45], 14);
  part('ammoBox', boxGeo(0.42, 0.28, 0.35), materials.olive, { parent: root, position: [-0.44, 0.78, -0.08] });
  const cradle = pivot('cradle', [0, 0.76, -0.05], root);
  cylY('tripodCenter', 0.035, 0.72, materials.blackMetal, cradle, [0, -0.32, 0], 8);
  cylY('tripodLeft', 0.025, 0.82, materials.blackMetal, cradle, [0.36, -0.4, 0.28], 6);
  cylY('tripodRight', 0.025, 0.82, materials.blackMetal, cradle, [-0.36, -0.4, 0.28], 6);
  part('spadeGripLeft', torusGeo(0.08, 0.012, 8, 10), materials.blackMetal, { parent: root, position: [-0.12, 1.0, -0.44], rotation: [90, 0, 0] });
  part('spadeGripRight', torusGeo(0.08, 0.012, 8, 10), materials.blackMetal, { parent: root, position: [0.12, 1.0, -0.44], rotation: [90, 0, 0] });
  return { root };
}

function buildSmallWeapon(kind: 'm1911' | 'm79' | 'rpg7' | 'ithaca37' | 'm3'): BuildOutput {
  const root = createRoot({
    m1911: 'M1911 Pistol',
    m79: 'M79 Grenade Launcher',
    rpg7: 'RPG-7 Launcher',
    ithaca37: 'Ithaca 37 Shotgun',
    m3: 'M3 Grease Gun',
  }[kind]);

  if (kind === 'm1911') {
    part('slide', boxGeo(0.22, 0.16, 0.6), materials.gunmetal, { parent: root, position: [0, 0.88, 0.18] });
    part('frame', boxGeo(0.2, 0.14, 0.45), materials.blackMetal, { parent: root, position: [0, 0.76, 0.06] });
    part('grip', boxGeo(0.22, 0.38, 0.2), materials.darkWood, { parent: root, position: [0, 0.52, -0.08], rotation: [14, 0, 0] });
    cylZ('barrel', 0.028, 0.62, materials.blackMetal, root, [0, 0.88, 0.26], 8);
    part('triggerGuard', torusGeo(0.09, 0.012, 8, 10), materials.blackMetal, { parent: root, position: [0, 0.66, 0.12], rotation: [90, 0, 0] });
    return { root };
  }

  if (kind === 'm79') {
    part('stock', boxGeo(0.28, 0.24, 0.58), materials.wood, { parent: root, position: [0, 0.82, -0.56], rotation: [8, 0, 0] });
    const breakPivot = pivot('breakPivot', [0, 0.88, -0.05], root);
    cylZ('barrel', 0.075, 1.0, materials.gunmetal, breakPivot, [0, 0, 0.48], 14);
    part('receiver', boxGeo(0.26, 0.2, 0.28), materials.gunmetal, { parent: root, position: [0, 0.86, -0.08] });
    part('frontSight', boxGeo(0.08, 0.08, 0.05), materials.blackMetal, { parent: root, position: [0, 1.0, 0.72] });
    return {
      root,
      clips: [
        createClip('break-open', 1.2, [
          rotationTrack('breakPivot', [
            { time: 0, rotation: [0, 0, 0] },
            { time: 0.6, rotation: [-18, 0, 0] },
            { time: 1.2, rotation: [0, 0, 0] },
          ]),
        ]),
      ],
    };
  }

  if (kind === 'rpg7') {
    cylZ('launchTube', 0.065, 1.75, materials.blackMetal, root, [0, 0.9, 0.16], 14);
    part('rocketWarhead', coneGeo(0.14, 0.38, 16), materials.olive, { parent: root, position: [0, 0.9, 1.22], rotation: [90, 0, 0] });
    part('rearCone', coneGeo(0.12, 0.26, 16), materials.gunmetal, { parent: root, position: [0, 0.9, -0.78], rotation: [-90, 0, 0] });
    part('woodGrip', boxGeo(0.16, 0.32, 0.12), materials.wood, { parent: root, position: [0, 0.62, -0.12] });
    part('opticSight', boxGeo(0.12, 0.1, 0.28), materials.blackMetal, { parent: root, position: [0.16, 1.02, 0.05] });
    return { root };
  }

  if (kind === 'ithaca37') {
    addWeaponCore(root, 'ithaca', materials.wood);
    cylZ('shotgunTube', 0.04, 1.0, materials.gunmetal, root, [0, 0.82, 0.7], 10);
    const pump = pivot('pump', [0, 0.74, 0.38], root);
    part('pumpGrip', boxGeo(0.3, 0.16, 0.34), materials.wood, { parent: pump });
    return {
      root,
      clips: [
        createClip('pump-action', 0.9, [
          positionTrack('pump', [
            { time: 0, position: [0, 0.74, 0.38] },
            { time: 0.38, position: [0, 0.74, 0.08] },
            { time: 0.9, position: [0, 0.74, 0.38] },
          ]),
        ]),
      ],
    };
  }

  part('tubeReceiver', cylinderGeo(0.12, 0.12, 0.78, 14), materials.gunmetal, {
    parent: root,
    position: [0, 0.9, 0],
    rotation: [90, 0, 0],
  });
  cylZ('barrel', 0.035, 0.82, materials.blackMetal, root, [0, 0.9, 0.72], 8);
  part('magazine', boxGeo(0.2, 0.52, 0.16), materials.gunmetal, { parent: root, position: [0, 0.5, -0.06] });
  part('stockWireTop', boxGeo(0.04, 0.04, 0.62), materials.blackMetal, { parent: root, position: [0.12, 0.96, -0.66] });
  part('stockWireBottom', boxGeo(0.04, 0.04, 0.62), materials.blackMetal, { parent: root, position: [-0.12, 0.78, -0.66] });
  part('grip', boxGeo(0.18, 0.34, 0.12), materials.blackMetal, { parent: root, position: [0, 0.62, -0.18], rotation: [10, 0, 0] });
  return { root };
}

function addSandbagStack(root: THREE.Object3D, prefix: string, z: number, rows = 2, count = 6): void {
  for (let row = 0; row < rows; row++) {
    for (let i = 0; i < count; i++) {
      part(`${prefix}${row + 1}_${i + 1}`, capsuleGeo(0.1, 0.34, 6), materials.khaki, {
        parent: root,
        position: [-1.12 + i * 0.45 + (row % 2) * 0.08, 0.36 + row * 0.17, z],
        rotation: [90, 0, 90],
        scale: [1, 1, 0.72],
      });
    }
  }
}

function buildHelipad(): BuildOutput {
  const root = createRoot('Firebase Helipad');
  part('padBase', cylinderGeo(1.45, 1.45, 0.12, 48), materials.mud, { parent: root, position: [0, 0.08, 0] });
  part('timberDeck', cylinderGeo(1.34, 1.34, 0.08, 32), materials.darkWood, { parent: root, position: [0, 0.18, 0] });
  part('landingHBarA', boxGeo(1.4, 0.025, 0.16), materials.whiteMark, { parent: root, position: [0, 0.24, 0], rotation: [0, 0, 0] });
  part('landingHBarB', boxGeo(0.16, 0.025, 1.0), materials.whiteMark, { parent: root, position: [0, 0.245, 0], rotation: [0, 0, 0] });
  for (const [name, x, z] of [
    ['lampFL', 1.1, 1.1],
    ['lampFR', 1.1, -1.1],
    ['lampRL', -1.1, 1.1],
    ['lampRR', -1.1, -1.1],
  ] as const) {
    cylY(name, 0.02, 0.22, materials.blackMetal, root, [x, 0.34, z], 6);
    part(`${name}Glow`, sphereGeo(0.055, 8, 6), materials.warningYellow, { parent: root, position: [x, 0.48, z] });
  }
  return { root };
}

function buildSandbagWall(): BuildOutput {
  const root = createRoot('Sandbag Wall');
  addSandbagStack(root, 'frontBag', 0, 4, 9);
  part('mudFooting', boxGeo(4.35, 0.12, 0.72), materials.mud, { parent: root, position: [0, 0.1, 0] });
  return { root };
}

function buildMortarPit(): BuildOutput {
  const root = createRoot('Mortar Pit');
  part('pitFloor', cylinderGeo(1.0, 1.0, 0.12, 28), materials.mud, { parent: root, position: [0, 0.08, 0] });
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    part(`ringSandbag${i + 1}`, capsuleGeo(0.11, 0.32, 6), materials.khaki, {
      parent: root,
      position: [Math.cos(angle) * 0.88, 0.28, Math.sin(angle) * 0.88],
      rotation: [90, 0, (angle * 180) / Math.PI],
      scale: [1, 1, 0.7],
    });
  }
  const mortar = pivot('mortarTubePivot', [0, 0.45, 0], root);
  cylY('basePlate', 0.18, 0.05, materials.gunmetal, root, [0, 0.32, 0], 14);
  part('mortarTube', cylinderGeo(0.06, 0.06, 0.75, 12), materials.gunmetal, {
    parent: mortar,
    position: [0.18, 0.28, 0],
    rotation: [0, 0, -24],
  });
  part('shellCrate', boxGeo(0.34, 0.22, 0.3), materials.olive, { parent: root, position: [-0.45, 0.38, 0.42] });
  return { root };
}

function buildCrate(title: string, kind: 'ammo' | 'supply'): BuildOutput {
  const root = createRoot(title);
  part('crateBody', boxGeo(0.72, 0.46, 0.48), kind === 'ammo' ? materials.olive : materials.wood, { parent: root, position: [0, 0.33, 0] });
  part('lid', boxGeo(0.76, 0.08, 0.52), kind === 'ammo' ? materials.darkOlive : materials.darkWood, { parent: root, position: [0, 0.62, 0] });
  part('leftStrap', boxGeo(0.04, 0.58, 0.54), materials.blackMetal, { parent: root, position: [-0.25, 0.38, 0] });
  part('rightStrap', boxGeo(0.04, 0.58, 0.54), materials.blackMetal, { parent: root, position: [0.25, 0.38, 0] });
  part('frontStencil', planeGeo(0.28, 0.16), materials.whiteMark, { parent: root, position: [0, 0.42, 0.245] });
  return { root };
}

function buildFoxhole(): BuildOutput {
  const root = createRoot('Foxhole');
  part('dirtRim', torusGeo(0.75, 0.16, 8, 24), materials.mud, { parent: root, position: [0, 0.24, 0] });
  part('darkInterior', cylinderGeo(0.52, 0.52, 0.22, 24), materials.blackMetal, { parent: root, position: [0, 0.18, 0] });
  addSandbagStack(root, 'foxholeBag', 0.52, 2, 4);
  part('shovel', boxGeo(0.06, 0.04, 0.72), materials.wood, { parent: root, position: [-0.55, 0.42, -0.34], rotation: [0, 45, 18] });
  return { root };
}

function buildTent(title: string, kind: 'command' | 'barracks' | 'aid'): BuildOutput {
  const root = createRoot(title);
  const length = kind === 'barracks' ? 2.4 : 1.75;
  part('floor', boxGeo(length, 0.08, 1.25), materials.darkWood, { parent: root, position: [0, 0.08, 0] });
  part('canvasBody', boxGeo(length, 0.85, 1.2), kind === 'aid' ? materials.tan : materials.canvas, { parent: root, position: [0, 0.6, 0] });
  part('ridgeRoof', coneGeo(0.76, length, 4), kind === 'aid' ? materials.tan : materials.canvas, {
    parent: root,
    position: [0, 1.22, 0],
    rotation: [0, 0, 90],
    scale: [1, 1, 0.55],
  });
  part('frontFlap', planeGeo(0.62, 0.72), materials.darkOlive, { parent: root, position: [length / 2 + 0.02, 0.56, 0], rotation: [0, 90, 0] });
  if (kind === 'command') {
    addAntenna(root, 'radioAntenna', [-0.62, 1.1, -0.5], 0.9);
    part('mapTable', boxGeo(0.5, 0.08, 0.36), materials.wood, { parent: root, position: [0.2, 0.35, 0.18] });
  }
  if (kind === 'aid') {
    part('redCrossH', boxGeo(0.34, 0.02, 0.1), materials.redMark, { parent: root, position: [0, 1.64, 0], rotation: [0, 0, 0] });
    part('redCrossV', boxGeo(0.1, 0.02, 0.34), materials.redMark, { parent: root, position: [0, 1.645, 0], rotation: [0, 0, 0] });
  }
  return { root };
}

function buildWire(kind: 'barbed' | 'concertina'): BuildOutput {
  const root = createRoot(kind === 'barbed' ? 'Barbed Wire Fence' : 'Concertina Wire');
  if (kind === 'barbed') {
    for (let i = 0; i < 5; i++) {
      const x = -1.6 + i * 0.8;
      cylY(`post${i + 1}`, 0.035, 0.8, materials.darkWood, root, [x, 0.45, 0], 6);
    }
    for (let y = 0; y < 3; y++) {
      part(`wireStrand${y + 1}`, boxGeo(3.6, 0.02, 0.02), materials.gunmetal, { parent: root, position: [0, 0.38 + y * 0.18, 0] });
    }
    return { root };
  }

  for (let i = 0; i < 7; i++) {
    part(`coil${i + 1}`, torusGeo(0.34, 0.018, 8, 20), materials.gunmetal, {
      parent: root,
      position: [-1.5 + i * 0.5, 0.42, 0],
      rotation: [0, 90, 0],
    });
  }
  part('centerCable', boxGeo(3.4, 0.025, 0.025), materials.gunmetal, { parent: root, position: [0, 0.42, 0] });
  return { root };
}

function buildClaymore(): BuildOutput {
  const root = createRoot('Claymore Mine');
  part('mineBody', boxGeo(0.42, 0.22, 0.09), materials.olive, { parent: root, position: [0, 0.26, 0] });
  part('frontStencil', planeGeo(0.28, 0.1), materials.whiteMark, { parent: root, position: [0, 0.28, 0.047] });
  cylY('leftLeg', 0.012, 0.28, materials.blackMetal, root, [-0.15, 0.08, 0], 6);
  cylY('rightLeg', 0.012, 0.28, materials.blackMetal, root, [0.15, 0.08, 0], 6);
  part('detWire', torusGeo(0.34, 0.01, 6, 20), materials.blackMetal, { parent: root, position: [-0.42, 0.08, 0], rotation: [90, 0, 0] });
  return { root };
}

function buildFootbridge(kind: 'wood' | 'stone' = 'wood'): BuildOutput {
  const root = createRoot(kind === 'stone' ? 'Stone Bridge' : 'Jungle Footbridge');
  const mat = kind === 'stone' ? materials.paleStone : materials.wood;
  part('deck', boxGeo(3.2, 0.16, 0.72), mat, { parent: root, position: [0, 0.55, 0] });
  part('leftRail', boxGeo(3.2, 0.08, 0.08), kind === 'stone' ? materials.stone : materials.darkWood, { parent: root, position: [0, 0.98, 0.42] });
  part('rightRail', boxGeo(3.2, 0.08, 0.08), kind === 'stone' ? materials.stone : materials.darkWood, { parent: root, position: [0, 0.98, -0.42] });
  for (let i = 0; i < 5; i++) {
    const x = -1.4 + i * 0.7;
    cylY(`railPostLeft${i + 1}`, 0.035, 0.6, kind === 'stone' ? materials.stone : materials.darkWood, root, [x, 0.78, 0.42], 6);
    cylY(`railPostRight${i + 1}`, 0.035, 0.6, kind === 'stone' ? materials.stone : materials.darkWood, root, [x, 0.78, -0.42], 6);
  }
  if (kind === 'stone') {
    part('leftArchPier', boxGeo(0.35, 0.8, 0.86), materials.stone, { parent: root, position: [-1.2, 0.25, 0] });
    part('rightArchPier', boxGeo(0.35, 0.8, 0.86), materials.stone, { parent: root, position: [1.2, 0.25, 0] });
  }
  return { root };
}

function buildAA(kind: '37mm' | 'zpu4'): BuildOutput {
  const root = createRoot(kind === '37mm' ? '37mm AA Gun' : 'ZPU-4 AA Gun');
  part('platform', cylinderGeo(0.62, 0.62, 0.1, 22), materials.mud, { parent: root, position: [0, 0.12, 0] });
  const mount = pivot('gunMount', [0, 0.52, 0], root);
  cylY('pedestal', 0.08, 0.6, materials.gunmetal, root, [0, 0.36, 0], 12);
  part('shield', boxGeo(0.78, 0.46, 0.08), materials.olive, { parent: mount, position: [0.12, 0.14, 0.08] });
  const barrels = kind === 'zpu4' ? [-0.18, -0.06, 0.06, 0.18] : [0];
  barrels.forEach((z, index) => cylX(`barrel${index + 1}`, 0.035, 1.1, materials.blackMetal, mount, [0.58, 0.14, z], 8));
  part('seat', boxGeo(0.26, 0.1, 0.26), materials.darkOlive, { parent: mount, position: [-0.3, -0.05, 0] });
  addWheel(root, 'leftWheel', [0, 0.3, 0.58], 0.2);
  addWheel(root, 'rightWheel', [0, 0.3, -0.58], 0.2);
  return {
    root,
    clips: [
      createClip('aa-scan', 2.5, [
        rotationTrack('gunMount', [
          { time: 0, rotation: [0, -35, 0] },
          { time: 1.25, rotation: [0, 35, 0] },
          { time: 2.5, rotation: [0, -35, 0] },
        ]),
      ]),
    ],
  };
}

function buildFirebaseGate(): BuildOutput {
  const root = createRoot('Firebase Gate');
  cylY('leftPost', 0.12, 1.9, materials.darkWood, root, [-1.05, 0.95, 0], 8);
  cylY('rightPost', 0.12, 1.9, materials.darkWood, root, [1.05, 0.95, 0], 8);
  part('crossBeam', boxGeo(2.45, 0.18, 0.18), materials.darkWood, { parent: root, position: [0, 1.82, 0] });
  part('signBoard', boxGeo(1.6, 0.42, 0.08), materials.wood, { parent: root, position: [0, 1.55, 0.05] });
  addSandbagStack(root, 'gateBagLeft', 0.46, 2, 3);
  addSandbagStack(root, 'gateBagRight', -0.46, 2, 3);
  return { root };
}

function buildVillageHut(damaged = false): BuildOutput {
  const root = createRoot(damaged ? 'Damaged Village Hut' : 'Village Hut');
  part('raisedFloor', boxGeo(1.85, 0.12, 1.35), materials.darkWood, { parent: root, position: [0, 0.52, 0] });
  for (const [name, x, z] of [
    ['postFL', 0.78, 0.55],
    ['postFR', 0.78, -0.55],
    ['postRL', -0.78, 0.55],
    ['postRR', -0.78, -0.55],
  ] as const) {
    cylY(name, 0.045, 1.0, materials.darkWood, root, [x, 0.75, z], 6);
  }
  part('wallLeft', boxGeo(1.72, 0.82, 0.06), materials.tan, { parent: root, position: [0, 0.94, 0.63] });
  part('wallRight', boxGeo(1.72, 0.82, 0.06), materials.tan, { parent: root, position: [0, 0.94, -0.63] });
  part('frontWall', boxGeo(0.06, 0.82, 1.15), materials.tan, { parent: root, position: [0.9, 0.94, 0] });
  part('door', boxGeo(0.07, 0.62, 0.36), materials.darkWood, { parent: root, position: [0.94, 0.82, 0] });
  part('thatchRoof', coneGeo(1.12, 0.86, 4), materials.canvas, { parent: root, position: [0, 1.55, 0], rotation: [0, 45, 0], scale: [1, 0.65, 1] });
  part('ladder', boxGeo(0.12, 0.9, 0.08), materials.darkWood, { parent: root, position: [1.08, 0.46, -0.42], rotation: [0, 0, -18] });
  if (damaged) {
    part('brokenRoofHole', boxGeo(0.58, 0.08, 0.46), materials.blackMetal, { parent: root, position: [0.28, 1.66, 0.15], rotation: [0, 22, 0] });
    part('collapsedWall', boxGeo(0.75, 0.12, 0.48), materials.tan, { parent: root, position: [-0.35, 0.42, 0.72], rotation: [0, 0, 18] });
  }
  return { root };
}

function buildRiceDike(): BuildOutput {
  const root = createRoot('Rice Paddy Dike');
  part('mudDike', boxGeo(3.0, 0.32, 0.52), materials.mud, { parent: root, position: [0, 0.24, 0] });
  part('waterLeft', boxGeo(2.8, 0.025, 0.78), materials.glass, { parent: root, position: [0, 0.11, 0.74] });
  part('waterRight', boxGeo(2.8, 0.025, 0.78), materials.glass, { parent: root, position: [0, 0.11, -0.74] });
  for (let i = 0; i < 8; i++) {
    part(`riceShoot${i + 1}`, coneGeo(0.045, 0.32, 4), materials.leafLight, {
      parent: root,
      position: [-1.2 + i * 0.34, 0.3, i % 2 === 0 ? 0.72 : -0.72],
    });
  }
  return { root };
}

function buildFuelDrum(): BuildOutput {
  const root = createRoot('Fuel Drum');
  cylY('drumBody', 0.28, 0.74, materials.olive, root, [0, 0.42, 0], 18);
  cylY('topRim', 0.29, 0.04, materials.blackMetal, root, [0, 0.8, 0], 18);
  cylY('middleHoop', 0.29, 0.035, materials.blackMetal, root, [0, 0.42, 0], 18);
  cylY('bottomRim', 0.29, 0.04, materials.blackMetal, root, [0, 0.08, 0], 18);
  part('hazardStripe', boxGeo(0.45, 0.04, 0.04), materials.warningYellow, { parent: root, position: [0, 0.52, 0.28] });
  part('bungCap', cylinderGeo(0.04, 0.04, 0.03, 10), materials.blackMetal, { parent: root, position: [0.12, 0.84, 0.08] });
  return { root };
}

function buildPunjiTrap(): BuildOutput {
  const root = createRoot('Punji Trap');
  part('pit', boxGeo(1.0, 0.16, 0.78), materials.mud, { parent: root, position: [0, 0.1, 0] });
  for (let i = 0; i < 10; i++) {
    const x = -0.38 + (i % 5) * 0.19;
    const z = -0.22 + Math.floor(i / 5) * 0.44;
    part(`stake${i + 1}`, coneGeo(0.035, 0.48, 6), materials.darkWood, { parent: root, position: [x, 0.36, z], rotation: [0, 0, i % 2 ? 6 : -6] });
  }
  part('leafCover', planeGeo(1.08, 0.86), materials.jungleGreen, { parent: root, position: [0, 0.56, 0], rotation: [-90, 0, 0] });
  return { root };
}

function buildTunnelEntrance(): BuildOutput {
  const root = createRoot('Tunnel Entrance');
  part('dirtMound', sphereGeo(0.88, 14, 8), materials.mud, { parent: root, position: [0, 0.35, 0], scale: [1.35, 0.55, 1] });
  part('darkMouth', cylinderGeo(0.38, 0.38, 0.2, 18), materials.blackMetal, { parent: root, position: [0.78, 0.32, 0], rotation: [0, 0, 90] });
  part('woodBraceTop', boxGeo(0.84, 0.08, 0.08), materials.darkWood, { parent: root, position: [0.82, 0.66, 0] });
  cylY('braceLeft', 0.035, 0.58, materials.darkWood, root, [0.82, 0.38, 0.34], 6);
  cylY('braceRight', 0.035, 0.58, materials.darkWood, root, [0.82, 0.38, -0.34], 6);
  return { root };
}

function buildSAM(): BuildOutput {
  const root = createRoot('SA-2 SAM Launcher');
  part('launcherBase', boxGeo(1.2, 0.16, 0.8), materials.olive, { parent: root, position: [0, 0.22, 0] });
  const railPivot = pivot('launchRail', [0, 0.5, 0], root);
  part('railBeam', boxGeo(1.8, 0.08, 0.08), materials.gunmetal, { parent: railPivot, rotation: [0, 0, -18] });
  cylX('missileBody', 0.08, 1.55, materials.paleStone, railPivot, [0.1, 0.18, 0], 16);
  part('missileNose', coneGeo(0.08, 0.24, 16), materials.redMark, { parent: railPivot, position: [0.92, 0.18, 0], rotation: [0, 0, -90] });
  part('finA', boxGeo(0.18, 0.03, 0.18), materials.warningYellow, { parent: railPivot, position: [-0.62, 0.16, 0.12] });
  part('finB', boxGeo(0.18, 0.03, 0.18), materials.warningYellow, { parent: railPivot, position: [-0.62, 0.16, -0.12] });
  return { root };
}

function buildRadioStack(): BuildOutput {
  const root = createRoot('Radio Stack');
  part('radioBoxLower', boxGeo(0.68, 0.34, 0.42), materials.olive, { parent: root, position: [0, 0.26, 0] });
  part('radioBoxUpper', boxGeo(0.62, 0.28, 0.38), materials.darkOlive, { parent: root, position: [0, 0.58, 0] });
  part('dialPanel', planeGeo(0.44, 0.18), materials.blackMetal, { parent: root, position: [0, 0.58, 0.195] });
  addAntenna(root, 'whipAntenna', [-0.24, 0.8, 0], 0.92);
  part('handset', boxGeo(0.32, 0.08, 0.08), materials.blackMetal, { parent: root, position: [0.18, 0.76, 0.12], rotation: [0, 0, 16] });
  return { root };
}

function buildBunkerVariant(title: string, kind: 'toc' | 'ammo' | 'nva'): BuildOutput {
  const root = createRoot(title);
  part('earthShell', boxGeo(2.1, 0.72, 1.45), kind === 'nva' ? materials.mud : materials.sand, { parent: root, position: [0, 0.48, 0] });
  part('timberFace', boxGeo(0.12, 0.58, 1.22), materials.darkWood, { parent: root, position: [1.08, 0.52, 0] });
  part('entrance', boxGeo(0.08, 0.42, 0.42), materials.blackMetal, { parent: root, position: [1.15, 0.42, 0] });
  part('roofLogs', boxGeo(2.2, 0.16, 1.5), materials.darkWood, { parent: root, position: [0, 0.9, 0] });
  if (kind === 'toc') addAntenna(root, 'tocAntenna', [-0.68, 1.05, -0.42], 1.15);
  if (kind === 'ammo') part('warningStencil', planeGeo(0.4, 0.18), materials.warningYellow, { parent: root, position: [1.17, 0.62, -0.34], rotation: [0, 90, 0] });
  if (kind === 'nva') part('camouflageBranches', boxGeo(1.8, 0.08, 1.3), materials.jungleGreen, { parent: root, position: [-0.1, 1.02, 0], rotation: [0, 12, 0] });
  return { root };
}

function buildArtilleryPit(): BuildOutput {
  const root = createRoot('Artillery Pit');
  part('pitBase', cylinderGeo(1.25, 1.25, 0.12, 28), materials.mud, { parent: root, position: [0, 0.08, 0] });
  addSandbagStack(root, 'artillerySandbag', 0.95, 3, 6);
  const gun = pivot('howitzerPivot', [0, 0.55, 0], root);
  cylX('howitzerBarrel', 0.065, 1.4, materials.gunmetal, gun, [0.68, 0.16, 0], 12);
  part('breech', boxGeo(0.36, 0.28, 0.34), materials.gunmetal, { parent: gun, position: [0, 0.1, 0] });
  part('trailLeft', boxGeo(0.12, 0.08, 1.0), materials.darkOlive, { parent: gun, position: [-0.45, -0.1, 0.36], rotation: [0, 24, 0] });
  part('trailRight', boxGeo(0.12, 0.08, 1.0), materials.darkOlive, { parent: gun, position: [-0.45, -0.1, -0.36], rotation: [0, -24, 0] });
  return { root };
}

function buildTower(kind: 'comms' | 'water'): BuildOutput {
  const root = createRoot(kind === 'comms' ? 'Comms Tower' : 'Water Tower');
  const height = kind === 'comms' ? 3.2 : 2.25;
  for (const [name, x, z] of [
    ['postFL', 0.5, 0.5],
    ['postFR', 0.5, -0.5],
    ['postRL', -0.5, 0.5],
    ['postRR', -0.5, -0.5],
  ] as const) {
    cylY(name, 0.035, height, kind === 'comms' ? materials.blackMetal : materials.darkWood, root, [x, height / 2, z], 6);
  }
  for (let i = 0; i < 4; i++) {
    part(`crossBrace${i + 1}`, boxGeo(1.4, 0.035, 0.035), kind === 'comms' ? materials.blackMetal : materials.darkWood, {
      parent: root,
      position: [0, 0.7 + i * 0.55, i % 2 ? 0.52 : -0.52],
      rotation: [0, 0, i % 2 ? 28 : -28],
    });
  }
  if (kind === 'water') {
    cylY('tank', 0.56, 0.7, materials.roofTin, root, [0, 2.55, 0], 20);
    part('tankRoof', coneGeo(0.58, 0.32, 20), materials.roofTin, { parent: root, position: [0, 3.06, 0] });
  } else {
    part('antennaArray', boxGeo(0.12, 0.92, 0.12), materials.redMark, { parent: root, position: [0, 3.7, 0] });
    addAntenna(root, 'topWhip', [0, 4.0, 0], 0.7);
  }
  return { root };
}

function buildGeneratorShed(): BuildOutput {
  const root = createRoot('Generator Shed');
  part('shedBody', boxGeo(1.25, 0.78, 0.95), materials.darkWood, { parent: root, position: [0, 0.48, 0] });
  part('tinRoof', boxGeo(1.4, 0.12, 1.08), materials.roofTin, { parent: root, position: [0, 0.94, 0], rotation: [0, 0, 5] });
  part('generatorBlock', boxGeo(0.68, 0.34, 0.4), materials.gunmetal, { parent: root, position: [0.2, 0.38, 0] });
  cylX('exhaustPipe', 0.035, 0.62, materials.blackMetal, root, [-0.32, 0.62, 0.22], 8);
  part('ventPanel', planeGeo(0.42, 0.26), materials.blackMetal, { parent: root, position: [0.63, 0.5, 0], rotation: [0, 90, 0] });
  return { root };
}

function buildPerimeterBerm(): BuildOutput {
  const root = createRoot('Perimeter Berm');
  part('bermMass', boxGeo(3.2, 0.56, 0.86), materials.mud, { parent: root, position: [0, 0.32, 0] });
  addSandbagStack(root, 'crestBag', 0.18, 2, 8);
  part('firingStep', boxGeo(2.8, 0.12, 0.32), materials.darkWood, { parent: root, position: [0, 0.55, -0.34] });
  return { root };
}

function buildLatrine(): BuildOutput {
  const root = createRoot('Field Latrine');
  part('shackBody', boxGeo(0.82, 1.1, 0.7), materials.darkWood, { parent: root, position: [0, 0.68, 0] });
  part('tinRoof', boxGeo(0.95, 0.12, 0.82), materials.roofTin, { parent: root, position: [0, 1.32, 0], rotation: [0, 0, 7] });
  part('door', planeGeo(0.48, 0.78), materials.wood, { parent: root, position: [0.42, 0.64, 0], rotation: [0, 90, 0] });
  part('moonVent', sphereGeo(0.055, 8, 6), materials.blackMetal, { parent: root, position: [0.43, 0.92, 0.12], scale: [1, 1.8, 1] });
  return { root };
}

function buildBuilding(kind: 'shophouse' | 'villa' | 'concrete' | 'market' | 'church' | 'pagoda' | 'warehouse' | 'farmhouse' | 'ricebarn', damaged = false): BuildOutput {
  const titleMap = {
    shophouse: damaged ? 'Damaged Shophouse' : 'Shophouse',
    villa: 'French Villa',
    concrete: 'Concrete Building',
    market: 'Market Stall',
    church: 'Church',
    pagoda: 'Pagoda',
    warehouse: 'Warehouse',
    farmhouse: 'Farmhouse',
    ricebarn: 'Rice Barn',
  };
  const root = createRoot(titleMap[kind]);

  if (kind === 'market') {
    part('stallCounter', boxGeo(1.7, 0.26, 0.7), materials.wood, { parent: root, position: [0, 0.42, 0] });
    part('awning', boxGeo(1.95, 0.08, 0.92), materials.canvas, { parent: root, position: [0, 1.05, 0], rotation: [0, 0, 6] });
    for (const x of [-0.78, 0.78]) cylY(`post${x < 0 ? 'Left' : 'Right'}`, 0.035, 0.95, materials.darkWood, root, [x, 0.62, 0.32], 6);
    part('produceCrate', boxGeo(0.4, 0.18, 0.32), materials.tan, { parent: root, position: [-0.36, 0.68, 0.12] });
    return { root };
  }

  const width = kind === 'warehouse' ? 2.4 : kind === 'villa' ? 1.9 : 1.45;
  const height = kind === 'church' ? 1.35 : kind === 'pagoda' ? 1.1 : 1.0;
  const depth = kind === 'warehouse' ? 1.55 : 1.2;
  const wallMat = kind === 'concrete' || kind === 'villa' || kind === 'church' ? materials.paleStone : materials.tan;
  part('foundation', boxGeo(width + 0.18, 0.12, depth + 0.16), materials.stone, { parent: root, position: [0, 0.08, 0] });
  part('walls', boxGeo(width, height, depth), wallMat, { parent: root, position: [0, 0.62, 0] });
  part('frontDoor', boxGeo(0.12, 0.62, 0.34), materials.darkWood, { parent: root, position: [width / 2 + 0.02, 0.42, 0] });
  part('windowLeft', planeGeo(0.26, 0.26), materials.glass, { parent: root, position: [width / 2 + 0.025, 0.76, 0.34], rotation: [0, 90, 0] });
  part('windowRight', planeGeo(0.26, 0.26), materials.glass, { parent: root, position: [width / 2 + 0.025, 0.76, -0.34], rotation: [0, 90, 0] });

  if (kind === 'pagoda') {
    part('tierRoofLower', boxGeo(width + 0.55, 0.1, depth + 0.55), materials.redMark, { parent: root, position: [0, 1.18, 0] });
    part('tierRoofUpper', boxGeo(width + 0.28, 0.1, depth + 0.28), materials.redMark, { parent: root, position: [0, 1.45, 0] });
    part('spire', coneGeo(0.2, 0.5, 8), materials.warningYellow, { parent: root, position: [0, 1.78, 0] });
  } else if (kind === 'church') {
    part('roof', coneGeo(0.92, width + 0.25, 4), materials.roofTin, { parent: root, position: [0, 1.36, 0], rotation: [0, 0, 90], scale: [1, 1, 0.65] });
    part('bellTower', boxGeo(0.46, 1.1, 0.46), wallMat, { parent: root, position: [0.42, 1.25, 0] });
    part('steeple', coneGeo(0.32, 0.6, 4), materials.roofTin, { parent: root, position: [0.42, 2.1, 0], rotation: [0, 45, 0] });
  } else {
    part('roof', boxGeo(width + 0.24, 0.14, depth + 0.2), kind === 'farmhouse' || kind === 'ricebarn' ? materials.canvas : materials.roofTin, {
      parent: root,
      position: [0, 1.18, 0],
      rotation: [0, 0, kind === 'warehouse' ? 0 : 5],
    });
  }

  if (damaged) {
    part('brokenWall', boxGeo(0.44, 0.5, 0.5), materials.blackMetal, { parent: root, position: [width / 2 + 0.03, 0.62, -0.22], rotation: [0, 0, 14] });
    part('rubblePile', sphereGeo(0.34, 8, 6), materials.stone, { parent: root, position: [0.64, 0.22, -0.56], scale: [1.5, 0.35, 1] });
  }

  if (kind === 'ricebarn') {
    for (const [name, x, z] of [
      ['stiltFL', 0.55, 0.46],
      ['stiltFR', 0.55, -0.46],
      ['stiltRL', -0.55, 0.46],
      ['stiltRR', -0.55, -0.46],
    ] as const) {
      cylY(name, 0.035, 0.48, materials.darkWood, root, [x, 0.24, z], 6);
    }
  }

  return { root };
}

function buildWoodenBarrel(): BuildOutput {
  const root = createRoot('Wooden Barrel');
  cylY('barrelBody', 0.3, 0.7, materials.wood, root, [0, 0.4, 0], 16);
  cylY('topHoop', 0.31, 0.035, materials.blackMetal, root, [0, 0.72, 0], 16);
  cylY('middleHoop', 0.31, 0.035, materials.blackMetal, root, [0, 0.4, 0], 16);
  cylY('bottomHoop', 0.31, 0.035, materials.blackMetal, root, [0, 0.08, 0], 16);
  part('woodSlatMark', planeGeo(0.08, 0.52), materials.darkWood, { parent: root, position: [0, 0.4, 0.305] });
  return { root };
}

function buildRock(title: string, slugSeed: number): BuildOutput {
  const root = createRoot(title);
  const color = slugSeed % 2 === 0 ? materials.stone : materials.paleStone;
  part('mainBoulder', sphereGeo(0.64, 10, 7), color, {
    parent: root,
    position: [0, 0.48, 0],
    scale: [1.15 + slugSeed * 0.04, 0.62, 0.88],
    rotation: [0, slugSeed * 17, 0],
  });
  part('sideLobe', sphereGeo(0.34, 8, 6), color, { parent: root, position: [-0.46, 0.28, 0.28], scale: [1.1, 0.6, 0.85] });
  part('mossPatch', planeGeo(0.5, 0.28), materials.jungleGreen, { parent: root, position: [0.08, 0.82, 0.28], rotation: [-45, 0, slugSeed * 12] });
  return { root };
}

const assets: AssetSpec[] = [
  {
    slug: 'uh1h-huey-transport',
    title: 'UH-1H Huey Transport',
    category: 'aircraft',
    priority: 'high',
    triBudget: 5000,
    scale: '14m nose-to-tail target, forward axis +X',
    prompt: 'Vietnam War UH-1H Huey helicopter with skids, cargo doors, door guns, US Army olive-drab markings.',
    requiredParts: ['fuselage', 'mainRotor', 'tailRotor', 'doorGunLeft', 'doorGunRight', 'skidLeft', 'skidRight', 'noseGlass'],
    build: buildHueyTransport,
  },
  {
    slug: 'uh1c-huey-gunship',
    title: 'UH-1C Huey Gunship',
    category: 'aircraft',
    priority: 'high',
    triBudget: 5000,
    scale: 'Huey gunship variant, forward axis +X',
    prompt: 'Vietnam War UH-1C gunship with rocket pods, pylons, chin minigun, animated rotors.',
    requiredParts: ['rocketPodLeft', 'rocketPodRight', 'pylonLeft', 'pylonRight', 'minigun', 'minigunBarrels'],
    build: buildHueyGunship,
  },
  {
    slug: 'ah1g-cobra',
    title: 'AH-1G Cobra',
    category: 'aircraft',
    priority: 'medium',
    triBudget: 5000,
    scale: '16m attack helicopter target, narrow tandem cockpit',
    prompt: 'AH-1G Cobra attack helicopter with tandem canopy, chin turret, stub wings, rocket pods.',
    requiredParts: ['fuselage', 'cockpitFront', 'cockpitRear', 'chinTurret', 'turretGun', 'rocketPodLeft', 'rocketPodRight'],
    build: buildCobra,
  },
  {
    slug: 'm151-mutt-jeep',
    title: 'M151 MUTT Jeep',
    category: 'ground',
    priority: 'medium',
    triBudget: 3000,
    scale: '3.4m length target, forward axis +X',
    prompt: 'Vietnam War M151 MUTT jeep with folded windshield, spare tire, pedestal M60.',
    requiredParts: ['body', 'hood', 'wheelFL', 'wheelFR', 'wheelRL', 'wheelRR', 'gunMount', 'gunBarrel', 'spareTire'],
    build: buildJeep,
  },
  {
    slug: 'm113-apc',
    title: 'M113 APC',
    category: 'ground',
    priority: 'medium',
    triBudget: 5000,
    scale: '4.9m length target, forward axis +X',
    prompt: 'M113 armored personnel carrier with tracks, cupola gun, rear ramp, antenna.',
    requiredParts: ['hull', 'trackLeft', 'trackRight', 'cupola', 'turretGun', 'rearRamp', 'hatchDriver', 'antenna'],
    build: buildM113,
  },
  {
    slug: 'm35-cargo-truck',
    title: 'M35 Cargo Truck',
    category: 'ground',
    priority: 'medium',
    triBudget: 4000,
    scale: '6.7m length target, forward axis +X',
    prompt: 'M35 deuce-and-a-half cargo truck with open cab, canvas cargo cover, dual rear axle.',
    requiredParts: ['cab', 'cargoBed', 'canvasCover', 'wheelFL', 'wheelFR', 'wheelRL1', 'wheelRR1', 'tailgate'],
    build: buildM35,
  },
  {
    slug: 'm16a1-rifle',
    title: 'M16A1 Rifle',
    category: 'weapon',
    priority: 'high',
    triBudget: 2000,
    scale: '1m rifle target, muzzle axis +Z',
    prompt: 'M16A1 rifle with triangular handguard, carry handle, 20-round magazine, charging handle.',
    requiredParts: ['m16Receiver', 'm16Barrel', 'triangularHandguard', 'carryHandle', 'magazine', 'chargingHandle'],
    build: buildM16,
  },
  {
    slug: 'ak47-rifle',
    title: 'AK-47 Rifle',
    category: 'weapon',
    priority: 'high',
    triBudget: 2000,
    scale: '0.87m rifle target, muzzle axis +Z',
    prompt: 'AK-47 rifle with wood furniture, curved magazine, dust cover, right-side charging handle.',
    requiredParts: ['ak47Receiver', 'ak47Barrel', 'woodHandguard', 'dustCover', 'magazine', 'chargingHandle'],
    build: buildAK47,
  },
  {
    slug: 'm60-machine-gun',
    title: 'M60 Machine Gun',
    category: 'weapon',
    priority: 'high',
    triBudget: 2500,
    scale: '1.1m machine gun target, muzzle axis +Z',
    prompt: 'M60 belt-fed machine gun with feed cover, ammo belt, carry handle, folding bipod.',
    requiredParts: ['body', 'barrel', 'muzzle', 'feedCover', 'ammoBelt', 'bipod', 'carryHandle'],
    build: buildM60,
  },
  {
    slug: 'firebase-sandbag-bunker',
    title: 'Firebase Sandbag Bunker',
    category: 'structure',
    priority: 'high',
    triBudget: 5000,
    scale: '3m fighting position target, front faces +X',
    prompt: 'Vietnam firebase sandbag bunker with timber roof, firing slot, ammo crate, stacked sandbags.',
    requiredParts: ['earthBerm', 'timberRoof', 'firingSlot', 'ammoCrate'],
    build: buildBunker,
  },
  {
    slug: 'jungle-guard-tower',
    title: 'Jungle Guard Tower',
    category: 'structure',
    priority: 'medium',
    triBudget: 5000,
    scale: '5m timber tower target, Y-up',
    prompt: 'Jungle guard tower with timber posts, platform, railings, ladder, canvas roof, search light.',
    requiredParts: ['postFL', 'postFR', 'postRL', 'postRR', 'platform', 'roof', 'ladder', 'searchLight'],
    build: buildGuardTower,
  },
  {
    slug: 'ac47-spooky',
    title: 'AC-47 Spooky',
    category: 'aircraft',
    priority: 'high',
    triBudget: 6500,
    scale: '29m gunship target, forward axis +X, prop nodes propLeft/propRight',
    prompt: 'AC-47 Spooky side-firing gunship with twin props, side miniguns, landing gear, olive drab finish.',
    requiredParts: ['fuselage', 'propLeft', 'propRight', 'sideMinigun1', 'sideMinigun2', 'sideMinigun3', 'noseGlass'],
    build: () => buildFixedWing('ac47'),
  },
  {
    slug: 'f4-phantom',
    title: 'F-4 Phantom',
    category: 'aircraft',
    priority: 'high',
    triBudget: 6500,
    scale: '19m fighter target, forward axis +X',
    prompt: 'F-4 Phantom jet fighter with swept wings, tandem canopy, intakes, twin exhausts, pylons, bombs.',
    requiredParts: ['fuselage', 'noseCone', 'canopyFront', 'leftWing', 'rightWing', 'leftIntake', 'rightIntake', 'leftExhaust', 'rightExhaust'],
    build: () => buildFixedWing('f4'),
  },
  {
    slug: 'a1-skyraider',
    title: 'A-1 Skyraider',
    category: 'aircraft',
    priority: 'high',
    triBudget: 6000,
    scale: '12m attack plane target, propeller node propeller',
    prompt: 'A-1 Skyraider prop attack aircraft with large cowling, canopy, fixed stores, animated propeller.',
    requiredParts: ['fuselage', 'cowling', 'propeller', 'leftWing', 'rightWing', 'rocketLeft1', 'rocketRight1'],
    build: () => buildFixedWing('a1'),
  },
  {
    slug: 'm48-patton',
    title: 'M48 Patton Tank',
    category: 'ground',
    priority: 'high',
    triBudget: 6500,
    scale: '9.3m tank target, forward axis +X',
    prompt: 'M48 Patton tank with broad hull, tracked running gear, rotating turret, long gun, search light.',
    requiredParts: ['hull', 'trackLeft', 'trackRight', 'turret', 'mainGun', 'cupola', 'searchLight'],
    build: () => buildTrackedArmor('m48'),
  },
  {
    slug: 'pt76-amphibious-tank',
    title: 'PT-76 Amphibious Tank',
    category: 'ground',
    priority: 'medium',
    triBudget: 6000,
    scale: '7.6m amphibious tank target, forward axis +X',
    prompt: 'PT-76 light amphibious tank with low hull, turret, bow wake rail, rear jet nozzle.',
    requiredParts: ['hull', 'trackLeft', 'trackRight', 'turret', 'mainGun', 'bowWakeRail', 'rearJetNozzle'],
    build: () => buildTrackedArmor('pt76'),
  },
  {
    slug: 'pbr-patrol-boat',
    title: 'PBR Patrol Boat',
    category: 'watercraft',
    priority: 'high',
    triBudget: 5000,
    scale: '9.5m river patrol boat target, forward axis +X',
    prompt: 'Vietnam PBR patrol boat with bow gun, stern gun, pilot house, radio antenna, low river profile.',
    requiredParts: ['hull', 'pilotHouse', 'bowGunMount', 'bowTwinGun', 'sternGunMount', 'radioAntenna'],
    build: () => buildBoat('pbr'),
  },
  {
    slug: 'vietnamese-sampan',
    title: 'Vietnamese Sampan',
    category: 'watercraft',
    priority: 'medium',
    triBudget: 2500,
    scale: '5m sampan target, forward axis +X',
    prompt: 'Small Vietnamese sampan with wood hull, tapered bow and stern, cargo basket, crossing oars.',
    requiredParts: ['hull', 'bow', 'stern', 'cargoBasket', 'oarLeft', 'oarRight'],
    build: () => buildBoat('sampan'),
  },
  {
    slug: 'm2-browning-heavy-machine-gun',
    title: 'M2 Browning Heavy Machine Gun',
    category: 'weapon',
    priority: 'high',
    triBudget: 2500,
    scale: '1.65m heavy machine gun target, muzzle axis +Z',
    prompt: 'M2 Browning heavy machine gun with receiver, heavy barrel, ammo box, tripod, spade grips.',
    requiredParts: ['receiver', 'heavyBarrel', 'coolingJacket', 'ammoBox', 'tripodCenter', 'spadeGripLeft', 'spadeGripRight'],
    build: buildM2Browning,
  },
  {
    slug: 'm1911-pistol',
    title: 'M1911 Pistol',
    category: 'weapon',
    priority: 'medium',
    triBudget: 1500,
    scale: '0.22m sidearm target, muzzle axis +Z',
    prompt: 'M1911 pistol with slide, frame, grip panels, barrel, trigger guard.',
    requiredParts: ['slide', 'frame', 'grip', 'barrel', 'triggerGuard'],
    build: () => buildSmallWeapon('m1911'),
  },
  {
    slug: 'm79-grenade-launcher',
    title: 'M79 Grenade Launcher',
    category: 'weapon',
    priority: 'medium',
    triBudget: 1800,
    scale: '0.73m grenade launcher target, muzzle axis +Z',
    prompt: 'M79 break-action grenade launcher with wood stock, receiver, single barrel, front sight.',
    requiredParts: ['stock', 'breakPivot', 'barrel', 'receiver', 'frontSight'],
    build: () => buildSmallWeapon('m79'),
  },
  {
    slug: 'rpg7-launcher',
    title: 'RPG-7 Launcher',
    category: 'weapon',
    priority: 'high',
    triBudget: 1800,
    scale: '0.95m launcher target, muzzle axis +Z',
    prompt: 'RPG-7 launcher with tube, warhead, rear cone, grip, optic sight.',
    requiredParts: ['launchTube', 'rocketWarhead', 'rearCone', 'woodGrip', 'opticSight'],
    build: () => buildSmallWeapon('rpg7'),
  },
  {
    slug: 'ithaca37-shotgun',
    title: 'Ithaca 37 Shotgun',
    category: 'weapon',
    priority: 'medium',
    triBudget: 1800,
    scale: '1m shotgun target, muzzle axis +Z',
    prompt: 'Ithaca 37 pump shotgun with wood stock, tube magazine, pump grip, barrel.',
    requiredParts: ['ithacaReceiver', 'ithacaBarrel', 'ithacaStock', 'shotgunTube', 'pump', 'pumpGrip'],
    build: () => buildSmallWeapon('ithaca37'),
  },
  {
    slug: 'm3-grease-gun',
    title: 'M3 Grease Gun',
    category: 'weapon',
    priority: 'medium',
    triBudget: 1800,
    scale: '0.75m SMG target, muzzle axis +Z',
    prompt: 'M3 Grease Gun with tube receiver, simple barrel, box magazine, wire stock, pistol grip.',
    requiredParts: ['tubeReceiver', 'barrel', 'magazine', 'stockWireTop', 'stockWireBottom', 'grip'],
    build: () => buildSmallWeapon('m3'),
  },
  {
    slug: 'firebase-helipad',
    title: 'Firebase Helipad',
    category: 'structure',
    priority: 'high',
    triBudget: 3500,
    scale: '9m landing pad target, Y-up',
    prompt: 'Firebase helicopter landing pad with timber deck, H marker, dirt base, perimeter lamps.',
    requiredParts: ['padBase', 'timberDeck', 'landingHBarA', 'landingHBarB', 'lampFL', 'lampFR', 'lampRL', 'lampRR'],
    build: buildHelipad,
  },
  {
    slug: 'sandbag-wall',
    title: 'Sandbag Wall',
    category: 'structure',
    priority: 'high',
    triBudget: 3500,
    scale: '4.2m cover wall target, front faces +Z',
    prompt: 'Modular sandbag wall with stacked bags and mud footing for cover placement.',
    requiredParts: ['frontBag1_1', 'frontBag2_1', 'frontBag3_1', 'frontBag4_1', 'mudFooting'],
    build: buildSandbagWall,
  },
  {
    slug: 'mortar-pit',
    title: 'Mortar Pit',
    category: 'structure',
    priority: 'high',
    triBudget: 4000,
    scale: '2.5m pit target, mortar tube aims +X',
    prompt: 'Circular mortar pit with sandbag ring, base plate, angled mortar tube, shell crate.',
    requiredParts: ['pitFloor', 'ringSandbag1', 'mortarTubePivot', 'mortarTube', 'basePlate', 'shellCrate'],
    build: buildMortarPit,
  },
  {
    slug: 'ammo-crate',
    title: 'Ammo Crate',
    category: 'structure',
    priority: 'medium',
    triBudget: 1200,
    scale: '0.7m crate target',
    prompt: 'Olive ammo crate with straps, hinged lid, front stencil, low-poly game ready.',
    requiredParts: ['crateBody', 'lid', 'leftStrap', 'rightStrap', 'frontStencil'],
    build: () => buildCrate('Ammo Crate', 'ammo'),
  },
  {
    slug: 'foxhole',
    title: 'Foxhole',
    category: 'structure',
    priority: 'medium',
    triBudget: 2200,
    scale: '1.5m fighting hole target',
    prompt: 'Foxhole with dirt rim, dark interior, sandbag front, shovel prop.',
    requiredParts: ['dirtRim', 'darkInterior', 'foxholeBag1_1', 'shovel'],
    build: buildFoxhole,
  },
  {
    slug: 'command-tent',
    title: 'Command Tent',
    category: 'structure',
    priority: 'high',
    triBudget: 3000,
    scale: '4m command tent target',
    prompt: 'Canvas command tent with ridge roof, open flap, map table, radio antenna.',
    requiredParts: ['floor', 'canvasBody', 'ridgeRoof', 'frontFlap', 'radioAntenna', 'mapTable'],
    build: () => buildTent('Command Tent', 'command'),
  },
  {
    slug: 'barbed-wire-fence',
    title: 'Barbed Wire Fence',
    category: 'structure',
    priority: 'medium',
    triBudget: 2200,
    scale: '4m fence module target',
    prompt: 'Barbed wire fence module with wood posts and three metal wire strands.',
    requiredParts: ['post1', 'post2', 'post3', 'wireStrand1', 'wireStrand2', 'wireStrand3'],
    build: () => buildWire('barbed'),
  },
  {
    slug: 'concertina-wire',
    title: 'Concertina Wire',
    category: 'structure',
    priority: 'medium',
    triBudget: 3000,
    scale: '3.4m obstacle target',
    prompt: 'Concertina wire obstacle with repeated wire coils and center cable.',
    requiredParts: ['coil1', 'coil2', 'coil3', 'centerCable'],
    build: () => buildWire('concertina'),
  },
  {
    slug: 'claymore-mine',
    title: 'Claymore Mine',
    category: 'structure',
    priority: 'medium',
    triBudget: 1200,
    scale: '0.25m mine target',
    prompt: 'M18 Claymore mine with curved olive body, stencil, legs, and detonation wire.',
    requiredParts: ['mineBody', 'frontStencil', 'leftLeg', 'rightLeg', 'detWire'],
    build: buildClaymore,
  },
  {
    slug: 'jungle-footbridge',
    title: 'Jungle Footbridge',
    category: 'structure',
    priority: 'medium',
    triBudget: 2500,
    scale: '4m footbridge target',
    prompt: 'Narrow jungle footbridge with wood deck, rails, posts, and simple collision profile.',
    requiredParts: ['deck', 'leftRail', 'rightRail', 'railPostLeft1', 'railPostRight1'],
    build: () => buildFootbridge('wood'),
  },
  {
    slug: '37mm-aa-gun',
    title: '37mm AA Gun',
    category: 'structure',
    priority: 'high',
    triBudget: 4500,
    scale: 'towed AA gun target, muzzle axis +X',
    prompt: '37mm anti-aircraft gun with pedestal, shield, barrel, seat, and tow wheels.',
    requiredParts: ['platform', 'gunMount', 'shield', 'barrel1', 'seat', 'leftWheel', 'rightWheel'],
    build: () => buildAA('37mm'),
  },
  {
    slug: 'firebase-gate',
    title: 'Firebase Gate',
    category: 'structure',
    priority: 'medium',
    triBudget: 2500,
    scale: '4m gate target',
    prompt: 'Firebase timber gate with sign board, posts, crossbeam, and sandbag bases.',
    requiredParts: ['leftPost', 'rightPost', 'crossBeam', 'signBoard', 'gateBagLeft1_1'],
    build: buildFirebaseGate,
  },
  {
    slug: 'village-hut',
    title: 'Village Hut',
    category: 'structure',
    priority: 'high',
    triBudget: 3500,
    scale: '5m stilt hut target',
    prompt: 'Raised Vietnamese village hut with posts, thatch roof, woven walls, door, ladder.',
    requiredParts: ['raisedFloor', 'postFL', 'postFR', 'wallLeft', 'frontWall', 'door', 'thatchRoof', 'ladder'],
    build: () => buildVillageHut(false),
  },
  {
    slug: 'village-hut-damaged',
    title: 'Damaged Village Hut',
    category: 'structure',
    priority: 'medium',
    triBudget: 4000,
    scale: '5m damaged stilt hut target',
    prompt: 'Damaged village hut with broken roof, collapsed wall, posts, thatch, and ladder.',
    requiredParts: ['raisedFloor', 'thatchRoof', 'brokenRoofHole', 'collapsedWall', 'ladder'],
    build: () => buildVillageHut(true),
  },
  {
    slug: 'rice-dike',
    title: 'Rice Paddy Dike',
    category: 'structure',
    priority: 'medium',
    triBudget: 2200,
    scale: '3m rice paddy dike target',
    prompt: 'Rice paddy dike with mud ridge, shallow water panels, and planted rice shoots.',
    requiredParts: ['mudDike', 'waterLeft', 'waterRight', 'riceShoot1', 'riceShoot2'],
    build: buildRiceDike,
  },
  {
    slug: 'fuel-drum',
    title: 'Fuel Drum',
    category: 'structure',
    priority: 'medium',
    triBudget: 1200,
    scale: '55-gallon drum target',
    prompt: 'Olive fuel drum with metal hoops, hazard stripe, cap, optimized prop scale.',
    requiredParts: ['drumBody', 'topRim', 'middleHoop', 'bottomRim', 'hazardStripe', 'bungCap'],
    build: buildFuelDrum,
  },
  {
    slug: 'supply-crate',
    title: 'Supply Crate',
    category: 'structure',
    priority: 'medium',
    triBudget: 1200,
    scale: '0.8m supply crate target',
    prompt: 'Wooden supply crate with straps, lid, and front stencil.',
    requiredParts: ['crateBody', 'lid', 'leftStrap', 'rightStrap', 'frontStencil'],
    build: () => buildCrate('Supply Crate', 'supply'),
  },
  {
    slug: 'zpu4-aa-gun',
    title: 'ZPU-4 AA Gun',
    category: 'structure',
    priority: 'high',
    triBudget: 5000,
    scale: 'quad AA gun target, barrels aim +X',
    prompt: 'ZPU-4 anti-aircraft gun with four barrels, shield, pedestal, seat, and wheels.',
    requiredParts: ['platform', 'gunMount', 'shield', 'barrel1', 'barrel2', 'barrel3', 'barrel4'],
    build: () => buildAA('zpu4'),
  },
  {
    slug: 'punji-trap',
    title: 'Punji Trap',
    category: 'structure',
    priority: 'medium',
    triBudget: 1800,
    scale: '1m trap target',
    prompt: 'Punji trap with mud pit, sharpened stakes, and leaf cover.',
    requiredParts: ['pit', 'stake1', 'stake2', 'leafCover'],
    build: buildPunjiTrap,
  },
  {
    slug: 'tunnel-entrance',
    title: 'Tunnel Entrance',
    category: 'structure',
    priority: 'medium',
    triBudget: 2200,
    scale: '1.8m tunnel entrance target',
    prompt: 'Viet Cong tunnel entrance with dirt mound, dark mouth, and wood braces.',
    requiredParts: ['dirtMound', 'darkMouth', 'woodBraceTop', 'braceLeft', 'braceRight'],
    build: buildTunnelEntrance,
  },
  {
    slug: 'sa2-sam-launcher',
    title: 'SA-2 SAM Launcher',
    category: 'structure',
    priority: 'high',
    triBudget: 3500,
    scale: 'SAM launcher target, missile axis +X',
    prompt: 'SA-2 SAM launcher with base, launch rail, white missile, red nose, fins.',
    requiredParts: ['launcherBase', 'launchRail', 'railBeam', 'missileBody', 'missileNose', 'finA', 'finB'],
    build: buildSAM,
  },
  {
    slug: 'radio-stack',
    title: 'Radio Stack',
    category: 'structure',
    priority: 'medium',
    triBudget: 1200,
    scale: 'portable radio prop target',
    prompt: 'Stacked field radio with boxes, dial panel, handset, and whip antenna.',
    requiredParts: ['radioBoxLower', 'radioBoxUpper', 'dialPanel', 'whipAntenna', 'handset'],
    build: buildRadioStack,
  },
  {
    slug: 'toc-bunker',
    title: 'TOC Bunker',
    category: 'structure',
    priority: 'medium',
    triBudget: 2800,
    scale: 'tactical operations bunker target',
    prompt: 'Tactical operations bunker with earth shell, timber face, roof logs, entrance, antenna.',
    requiredParts: ['earthShell', 'timberFace', 'entrance', 'roofLogs', 'tocAntenna'],
    build: () => buildBunkerVariant('TOC Bunker', 'toc'),
  },
  {
    slug: 'artillery-pit',
    title: 'Artillery Pit',
    category: 'structure',
    priority: 'high',
    triBudget: 4000,
    scale: 'field gun pit target, muzzle axis +X',
    prompt: 'Artillery pit with sandbags, howitzer barrel, breech, trail legs, circular dirt base.',
    requiredParts: ['pitBase', 'artillerySandbag1_1', 'howitzerPivot', 'howitzerBarrel', 'breech', 'trailLeft', 'trailRight'],
    build: buildArtilleryPit,
  },
  {
    slug: 'barracks-tent',
    title: 'Barracks Tent',
    category: 'structure',
    priority: 'medium',
    triBudget: 3000,
    scale: 'long tent target',
    prompt: 'Long barracks tent with canvas walls, ridge roof, floor, and front flap.',
    requiredParts: ['floor', 'canvasBody', 'ridgeRoof', 'frontFlap'],
    build: () => buildTent('Barracks Tent', 'barracks'),
  },
  {
    slug: 'aid-station',
    title: 'Aid Station',
    category: 'structure',
    priority: 'medium',
    triBudget: 3200,
    scale: 'medical tent target',
    prompt: 'Aid station tent with tan canvas, ridge roof, front flap, and red cross marker.',
    requiredParts: ['floor', 'canvasBody', 'ridgeRoof', 'frontFlap', 'redCrossH', 'redCrossV'],
    build: () => buildTent('Aid Station', 'aid'),
  },
  {
    slug: 'ammo-bunker',
    title: 'Ammo Bunker',
    category: 'structure',
    priority: 'high',
    triBudget: 2800,
    scale: 'ammo bunker target',
    prompt: 'Ammo bunker with earth shell, timber face, entrance, roof logs, warning stencil.',
    requiredParts: ['earthShell', 'timberFace', 'entrance', 'roofLogs', 'warningStencil'],
    build: () => buildBunkerVariant('Ammo Bunker', 'ammo'),
  },
  {
    slug: 'comms-tower',
    title: 'Comms Tower',
    category: 'structure',
    priority: 'medium',
    triBudget: 3200,
    scale: 'radio tower target',
    prompt: 'Tall communications tower with four posts, cross braces, antenna array, red tip.',
    requiredParts: ['postFL', 'postFR', 'postRL', 'postRR', 'antennaArray', 'topWhip'],
    build: () => buildTower('comms'),
  },
  {
    slug: 'generator-shed',
    title: 'Generator Shed',
    category: 'structure',
    priority: 'medium',
    triBudget: 2200,
    scale: 'small shed target',
    prompt: 'Generator shed with timber body, tin roof, generator block, exhaust pipe, vent panel.',
    requiredParts: ['shedBody', 'tinRoof', 'generatorBlock', 'exhaustPipe', 'ventPanel'],
    build: buildGeneratorShed,
  },
  {
    slug: 'water-tower',
    title: 'Water Tower',
    category: 'structure',
    priority: 'medium',
    triBudget: 3200,
    scale: 'water tower target',
    prompt: 'Firebase water tower with timber legs, cross braces, metal tank, conical roof.',
    requiredParts: ['postFL', 'postFR', 'postRL', 'postRR', 'tank', 'tankRoof'],
    build: () => buildTower('water'),
  },
  {
    slug: 'perimeter-berm',
    title: 'Perimeter Berm',
    category: 'structure',
    priority: 'medium',
    triBudget: 2600,
    scale: 'perimeter earthwork module target',
    prompt: 'Perimeter berm with earth mass, sandbag crest, and timber firing step.',
    requiredParts: ['bermMass', 'crestBag1_1', 'firingStep'],
    build: buildPerimeterBerm,
  },
  {
    slug: 'latrine',
    title: 'Field Latrine',
    category: 'structure',
    priority: 'medium',
    triBudget: 1800,
    scale: 'small field structure target',
    prompt: 'Field latrine shack with plank body, tin roof, door, and moon vent.',
    requiredParts: ['shackBody', 'tinRoof', 'door', 'moonVent'],
    build: buildLatrine,
  },
  {
    slug: 'shophouse',
    title: 'Shophouse',
    category: 'building',
    priority: 'medium',
    triBudget: 3000,
    scale: 'urban building target',
    prompt: 'Vietnam town shophouse with masonry foundation, walls, door, windows, metal roof.',
    requiredParts: ['foundation', 'walls', 'frontDoor', 'windowLeft', 'windowRight', 'roof'],
    build: () => buildBuilding('shophouse'),
  },
  {
    slug: 'shophouse-damaged',
    title: 'Damaged Shophouse',
    category: 'building',
    priority: 'medium',
    triBudget: 3500,
    scale: 'damaged urban building target',
    prompt: 'Damaged shophouse with broken wall, rubble pile, door, windows, and roof.',
    requiredParts: ['foundation', 'walls', 'frontDoor', 'roof', 'brokenWall', 'rubblePile'],
    build: () => buildBuilding('shophouse', true),
  },
  {
    slug: 'french-villa',
    title: 'French Villa',
    category: 'building',
    priority: 'medium',
    triBudget: 3500,
    scale: 'colonial villa target',
    prompt: 'French colonial villa with pale walls, broad footprint, door, windows, and roof.',
    requiredParts: ['foundation', 'walls', 'frontDoor', 'windowLeft', 'windowRight', 'roof'],
    build: () => buildBuilding('villa'),
  },
  {
    slug: 'concrete-building',
    title: 'Concrete Building',
    category: 'building',
    priority: 'medium',
    triBudget: 3000,
    scale: 'concrete building target',
    prompt: 'Plain concrete building with foundation, hard walls, door, windows, and flat roof.',
    requiredParts: ['foundation', 'walls', 'frontDoor', 'windowLeft', 'windowRight', 'roof'],
    build: () => buildBuilding('concrete'),
  },
  {
    slug: 'market-stall',
    title: 'Market Stall',
    category: 'building',
    priority: 'medium',
    triBudget: 2500,
    scale: 'market prop building target',
    prompt: 'Open market stall with wood counter, awning, posts, and produce crate.',
    requiredParts: ['stallCounter', 'awning', 'postLeft', 'postRight', 'produceCrate'],
    build: () => buildBuilding('market'),
  },
  {
    slug: 'church',
    title: 'Church',
    category: 'building',
    priority: 'medium',
    triBudget: 3800,
    scale: 'village church target',
    prompt: 'Village church with masonry walls, roof, bell tower, steeple, door, windows.',
    requiredParts: ['foundation', 'walls', 'frontDoor', 'roof', 'bellTower', 'steeple'],
    build: () => buildBuilding('church'),
  },
  {
    slug: 'pagoda',
    title: 'Pagoda',
    category: 'building',
    priority: 'medium',
    triBudget: 3800,
    scale: 'pagoda shrine target',
    prompt: 'Pagoda with stepped red roofs, pale walls, central spire, door, windows.',
    requiredParts: ['foundation', 'walls', 'tierRoofLower', 'tierRoofUpper', 'spire', 'frontDoor'],
    build: () => buildBuilding('pagoda'),
  },
  {
    slug: 'warehouse',
    title: 'Warehouse',
    category: 'building',
    priority: 'medium',
    triBudget: 3200,
    scale: 'industrial warehouse target',
    prompt: 'Warehouse with wide footprint, metal roof, concrete foundation, door, windows.',
    requiredParts: ['foundation', 'walls', 'frontDoor', 'windowLeft', 'windowRight', 'roof'],
    build: () => buildBuilding('warehouse'),
  },
  {
    slug: 'farmhouse',
    title: 'Farmhouse',
    category: 'building',
    priority: 'medium',
    triBudget: 3200,
    scale: 'rural farmhouse target',
    prompt: 'Rural farmhouse with tan walls, thatch roof, front door, windows, low profile.',
    requiredParts: ['foundation', 'walls', 'frontDoor', 'windowLeft', 'windowRight', 'roof'],
    build: () => buildBuilding('farmhouse'),
  },
  {
    slug: 'rice-barn',
    title: 'Rice Barn',
    category: 'building',
    priority: 'medium',
    triBudget: 3400,
    scale: 'raised rice barn target',
    prompt: 'Raised rice barn with stilts, tan walls, thatch roof, front door, windows.',
    requiredParts: ['foundation', 'walls', 'frontDoor', 'roof', 'stiltFL', 'stiltFR', 'stiltRL', 'stiltRR'],
    build: () => buildBuilding('ricebarn'),
  },
  {
    slug: 'stone-bridge',
    title: 'Stone Bridge',
    category: 'building',
    priority: 'medium',
    triBudget: 3200,
    scale: 'stone bridge module target',
    prompt: 'Stone bridge with deck, rails, posts, and simple stone pier masses.',
    requiredParts: ['deck', 'leftRail', 'rightRail', 'leftArchPier', 'rightArchPier'],
    build: () => buildFootbridge('stone'),
  },
  {
    slug: 'nva-bunker',
    title: 'NVA Bunker',
    category: 'building',
    priority: 'high',
    triBudget: 3000,
    scale: 'camouflaged bunker target',
    prompt: 'NVA bunker with dirt shell, timber face, dark entrance, roof logs, jungle camouflage.',
    requiredParts: ['earthShell', 'timberFace', 'entrance', 'roofLogs', 'camouflageBranches'],
    build: () => buildBunkerVariant('NVA Bunker', 'nva'),
  },
  {
    slug: 'wooden-barrel',
    title: 'Wooden Barrel',
    category: 'prop',
    priority: 'medium',
    triBudget: 1200,
    scale: '0.8m barrel target',
    prompt: 'Wooden barrel with metal hoops, slat mark, simple low-poly prop.',
    requiredParts: ['barrelBody', 'topHoop', 'middleHoop', 'bottomHoop', 'woodSlatMark'],
    build: buildWoodenBarrel,
  },
  {
    slug: 'limestone-boulder',
    title: 'Limestone Boulder',
    category: 'prop',
    priority: 'medium',
    triBudget: 1200,
    scale: '1.4m boulder target',
    prompt: 'Vietnam limestone boulder with irregular lobes and moss patch.',
    requiredParts: ['mainBoulder', 'sideLobe', 'mossPatch'],
    build: () => buildRock('Limestone Boulder', 1),
  },
  {
    slug: 'laterite-outcrop',
    title: 'Laterite Outcrop',
    category: 'prop',
    priority: 'medium',
    triBudget: 1200,
    scale: '1.8m outcrop target',
    prompt: 'Red-brown laterite rock outcrop with flat base and moss patch for jungle cover.',
    requiredParts: ['mainBoulder', 'sideLobe', 'mossPatch'],
    build: () => buildRock('Laterite Outcrop', 2),
  },
];

function collectNamedParts(root: THREE.Object3D): string[] {
  const names: string[] = [];
  root.traverse((obj) => {
    if (obj.name) names.push(obj.name);
  });
  return names;
}

function countMaterials(root: THREE.Object3D): number {
  const set = new Set<THREE.Material>();
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      if (Array.isArray(obj.material)) obj.material.forEach((m) => set.add(m));
      else set.add(obj.material);
    }
  });
  return set.size;
}

function spriteSvg(size: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">
  ${body}
</svg>`;
}

function rect(x: number, y: number, width: number, height: number, fill: string): string {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"/>`;
}

function circle(cx: number, cy: number, radius: number, fill: string): string {
  return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fill}"/>`;
}

function polygon(points: string, fill: string): string {
  return `<polygon points="${points}" fill="${fill}"/>`;
}

function outlineRects(points: Array<[number, number, number, number]>, fill = '#111111'): string {
  return points.map(([x, y, w, h]) => rect(x, y, w, h, fill)).join('\n');
}

const spriteSpecs: SpriteSpec[] = [
  {
    slug: 'us-rifleman-idle',
    title: 'US Rifleman Idle',
    category: 'npc',
    size: 128,
    prompt: '32-bit pixel art US rifleman idle NPC sprite, olive fatigues, helmet, M16 silhouette, transparent background.',
    svg: spriteSvg(128, [
      circle(48, 18, 10, '#2d351f'),
      rect(40, 24, 16, 10, '#c58f62'),
      rect(35, 34, 26, 30, '#53623a'),
      rect(30, 42, 12, 26, '#45552f'),
      rect(54, 42, 12, 26, '#45552f'),
      rect(38, 64, 9, 24, '#344226'),
      rect(50, 64, 9, 24, '#344226'),
      rect(58, 50, 26, 5, '#1b1e18'),
      outlineRects([[34, 34, 28, 3], [34, 61, 28, 3], [36, 88, 12, 4], [49, 88, 12, 4]]),
    ].join('\n')),
  },
  {
    slug: 'nva-rifleman-idle',
    title: 'NVA Rifleman Idle',
    category: 'npc',
    size: 128,
    prompt: '32-bit pixel art NVA rifleman idle NPC sprite, khaki uniform, pith helmet, AK silhouette, transparent background.',
    svg: spriteSvg(128, [
      polygon('36,18 48,8 60,18 56,24 40,24', '#8b7a49'),
      rect(40, 24, 16, 9, '#b47f57'),
      rect(35, 33, 26, 32, '#8b855a'),
      rect(30, 42, 12, 25, '#746f4c'),
      rect(54, 42, 12, 25, '#746f4c'),
      rect(38, 65, 9, 23, '#5b5d3d'),
      rect(50, 65, 9, 23, '#5b5d3d'),
      rect(56, 49, 25, 5, '#2a1b12'),
      rect(72, 43, 5, 15, '#1d1a14'),
      outlineRects([[34, 33, 28, 3], [34, 62, 28, 3], [36, 88, 12, 4], [49, 88, 12, 4]]),
    ].join('\n')),
  },
  {
    slug: 'vc-sapper-crouch',
    title: 'VC Sapper Crouch',
    category: 'npc',
    size: 128,
    prompt: '32-bit pixel art Viet Cong sapper crouch sprite, black pajamas, satchel charge, transparent background.',
    svg: spriteSvg(128, [
      circle(48, 22, 9, '#1f2219'),
      rect(40, 30, 16, 9, '#9a6c45'),
      rect(34, 39, 30, 24, '#20231c'),
      rect(28, 52, 18, 12, '#191b16'),
      rect(52, 52, 18, 12, '#191b16'),
      rect(34, 64, 20, 9, '#191b16'),
      rect(52, 67, 20, 9, '#191b16'),
      rect(24, 55, 12, 14, '#5f4d33'),
      rect(60, 42, 18, 6, '#2a1b12'),
      outlineRects([[34, 39, 30, 3], [25, 69, 30, 4], [52, 75, 24, 4]]),
    ].join('\n')),
  },
  {
    slug: 'arvn-radio-operator',
    title: 'ARVN Radio Operator',
    category: 'npc',
    size: 128,
    prompt: '32-bit pixel art ARVN radio operator with headset, radio pack, carbine, transparent background.',
    svg: spriteSvg(128, [
      circle(48, 18, 10, '#4c5931'),
      rect(40, 24, 16, 10, '#b77c55'),
      rect(34, 34, 28, 30, '#6b6a45'),
      rect(29, 40, 10, 24, '#5b5a3d'),
      rect(57, 40, 10, 24, '#5b5a3d'),
      rect(25, 36, 12, 24, '#20231c'),
      rect(38, 64, 9, 24, '#3b432b'),
      rect(50, 64, 9, 24, '#3b432b'),
      rect(58, 48, 22, 4, '#1c1f18'),
      rect(63, 18, 3, 22, '#111111'),
      outlineRects([[33, 34, 30, 3], [24, 35, 14, 3], [36, 88, 12, 4], [49, 88, 12, 4]]),
    ].join('\n')),
  },
  {
    slug: 'fern-clump',
    title: 'Fern Clump',
    category: 'vegetation',
    size: 128,
    prompt: 'Transparent high-res pixel art fern clump billboard for dense jungle ground cover.',
    svg: spriteSvg(128, [
      polygon('64,112 50,44 58,44 70,112', '#244b28'),
      polygon('58,108 22,66 29,61 66,104', '#3b7a35'),
      polygon('70,108 108,66 101,61 62,104', '#3b7a35'),
      polygon('60,80 28,42 35,38 67,76', '#5a9846'),
      polygon('68,80 100,42 93,38 61,76', '#5a9846'),
      polygon('64,66 46,24 54,22 70,66', '#6da657'),
      polygon('64,66 82,24 74,22 58,66', '#6da657'),
      rect(54, 108, 22, 6, '#17331d'),
    ].join('\n')),
  },
  {
    slug: 'elephant-grass-cluster',
    title: 'Elephant Grass Cluster',
    category: 'vegetation',
    size: 128,
    prompt: 'Transparent pixel art elephant grass cluster with tall blades and hard edges.',
    svg: spriteSvg(128, [
      polygon('58,118 50,22 59,18 66,118', '#416d2d'),
      polygon('66,118 72,24 82,20 74,118', '#577f36'),
      polygon('47,118 22,42 31,38 56,118', '#335c2a'),
      polygon('82,118 106,44 97,40 72,118', '#335c2a'),
      polygon('58,118 37,56 45,52 65,118', '#6b9542'),
      polygon('69,118 90,55 82,51 62,118', '#6b9542'),
      rect(34, 116, 62, 6, '#1b351d'),
    ].join('\n')),
  },
  {
    slug: 'fan-palm-cluster',
    title: 'Fan Palm Cluster',
    category: 'vegetation',
    size: 128,
    prompt: 'Transparent pixel art fan palm cluster with broad fronds and dark outline.',
    svg: spriteSvg(128, [
      rect(60, 60, 8, 58, '#5b3b22'),
      polygon('64,62 20,38 38,32 68,58', '#4e8a3a'),
      polygon('64,62 108,38 90,32 60,58', '#4e8a3a'),
      polygon('64,62 32,18 48,16 68,58', '#6da657'),
      polygon('64,62 96,18 80,16 60,58', '#6da657'),
      polygon('64,62 56,8 72,8 68,58', '#7ab260'),
      polygon('64,70 28,82 42,90 66,74', '#3b7a35'),
      polygon('64,70 100,82 86,90 62,74', '#3b7a35'),
      rect(52, 116, 28, 6, '#243d20'),
    ].join('\n')),
  },
  {
    slug: 'bamboo-grove',
    title: 'Bamboo Grove',
    category: 'vegetation',
    size: 128,
    prompt: 'Transparent pixel art bamboo grove billboard with clustered stalks and leaves.',
    svg: spriteSvg(128, [
      rect(38, 24, 6, 94, '#6f8b3d'),
      rect(54, 14, 6, 104, '#809a45'),
      rect(71, 20, 6, 98, '#6f8b3d'),
      rect(88, 30, 6, 88, '#809a45'),
      ...[32, 46, 60, 74, 88, 102].map((y) => rect(34, y, 64, 3, '#314f24')),
      polygon('42,46 18,34 22,48', '#4f8b39'),
      polygon('57,34 88,22 83,38', '#5fa047'),
      polygon('72,58 105,48 98,64', '#4f8b39'),
      polygon('90,76 112,72 102,86', '#5fa047'),
      rect(28, 116, 76, 6, '#1b351d'),
    ].join('\n')),
  },
  {
    slug: 'banana-plant',
    title: 'Banana Plant',
    category: 'vegetation',
    size: 128,
    prompt: 'Transparent pixel art banana plant billboard with large split leaves.',
    svg: spriteSvg(128, [
      rect(58, 60, 10, 58, '#60442a'),
      polygon('63,64 20,24 44,20 68,60', '#5f9c3f'),
      polygon('63,64 106,24 84,20 58,60', '#5f9c3f'),
      polygon('63,72 28,58 42,48 68,68', '#78b451'),
      polygon('63,72 100,58 86,48 58,68', '#78b451'),
      polygon('64,56 52,12 70,10 68,58', '#88bf5d'),
      rect(48, 116, 34, 6, '#223b1f'),
    ].join('\n')),
  },
  {
    slug: 'mangrove-roots',
    title: 'Mangrove Roots',
    category: 'vegetation',
    size: 128,
    prompt: 'Transparent pixel art mangrove root cluster for riverbanks and swamps.',
    svg: spriteSvg(128, [
      rect(58, 18, 12, 68, '#5d3b21'),
      rect(50, 28, 8, 58, '#6c4528'),
      rect(70, 34, 8, 52, '#6c4528'),
      polygon('56,82 28,118 40,118 62,86', '#4b301d'),
      polygon('70,82 100,118 88,118 64,86', '#4b301d'),
      polygon('62,82 48,118 58,118 68,86', '#5d3b21'),
      polygon('66,82 80,118 70,118 60,86', '#5d3b21'),
      polygon('64,28 28,14 36,30', '#467d34'),
      polygon('64,28 102,16 92,32', '#467d34'),
      rect(24, 118, 80, 5, '#1b2d1b'),
    ].join('\n')),
  },
  {
    slug: 'medevac-cross-icon',
    title: 'Medevac Cross Icon',
    category: 'icon',
    size: 64,
    prompt: 'Solid white UI medevac icon source on transparent background, helicopter medic cross silhouette.',
    svg: spriteSvg(64, [
      rect(6, 30, 52, 4, '#ffffff'),
      rect(29, 12, 6, 12, '#ffffff'),
      rect(22, 18, 20, 6, '#ffffff'),
      rect(29, 24, 6, 20, '#ffffff'),
      rect(20, 31, 24, 10, '#ffffff'),
      rect(10, 42, 10, 4, '#ffffff'),
      rect(44, 42, 10, 4, '#ffffff'),
      rect(31, 38, 2, 15, '#ffffff'),
      rect(25, 45, 14, 3, '#ffffff'),
    ].join('\n')),
  },
  {
    slug: 'air-support-icon',
    title: 'Air Support Icon',
    category: 'icon',
    size: 64,
    prompt: 'Solid white UI air support icon source, fast jet silhouette and target ring.',
    svg: spriteSvg(64, [
      polygon('32,8 38,34 58,42 58,48 35,43 32,56 29,43 6,48 6,42 26,34', '#ffffff'),
      rect(28, 28, 8, 4, '#10110d'),
      circle(32, 32, 12, 'none" stroke="#ffffff" stroke-width="3'),
    ].join('\n')),
  },
  {
    slug: 'radio-command-icon',
    title: 'Radio Command Icon',
    category: 'icon',
    size: 64,
    prompt: 'Solid white radio command UI icon with antenna and signal bars.',
    svg: spriteSvg(64, [
      rect(18, 26, 28, 26, '#ffffff'),
      rect(22, 30, 20, 7, '#10110d'),
      rect(24, 42, 5, 5, '#10110d'),
      rect(34, 42, 5, 5, '#10110d'),
      rect(31, 13, 3, 13, '#ffffff'),
      polygon('32,13 46,4 48,7 34,17', '#ffffff'),
      rect(48, 13, 3, 10, '#ffffff'),
      rect(53, 18, 3, 15, '#ffffff'),
    ].join('\n')),
  },
  {
    slug: 'ammo-resupply-icon',
    title: 'Ammo Resupply Icon',
    category: 'icon',
    size: 64,
    prompt: 'Solid white ammo resupply UI icon with crate and bullets.',
    svg: spriteSvg(64, [
      rect(12, 30, 40, 22, '#ffffff'),
      rect(16, 34, 32, 4, '#10110d'),
      rect(20, 40, 4, 8, '#10110d'),
      rect(40, 40, 4, 8, '#10110d'),
      rect(20, 13, 6, 14, '#ffffff'),
      rect(30, 9, 6, 18, '#ffffff'),
      rect(40, 15, 6, 12, '#ffffff'),
      polygon('20,13 23,8 26,13', '#ffffff'),
      polygon('30,9 33,4 36,9', '#ffffff'),
      polygon('40,15 43,10 46,15', '#ffffff'),
    ].join('\n')),
  },
  {
    slug: 'lz-marker-icon',
    title: 'LZ Marker Icon',
    category: 'icon',
    size: 64,
    prompt: 'Solid white landing zone marker UI icon with H pad and flare.',
    svg: spriteSvg(64, [
      circle(32, 34, 22, 'none" stroke="#ffffff" stroke-width="4'),
      rect(22, 22, 5, 24, '#ffffff'),
      rect(37, 22, 5, 24, '#ffffff'),
      rect(22, 32, 20, 5, '#ffffff'),
      rect(48, 8, 5, 14, '#ffffff'),
      polygon('50,4 44,14 56,14', '#ffffff'),
    ].join('\n')),
  },
  {
    slug: 'muzzle-flash',
    title: 'Muzzle Flash',
    category: 'effect',
    size: 64,
    prompt: 'Transparent pixel art muzzle flash effect sprite with white hot center and orange fringe.',
    svg: spriteSvg(64, [
      polygon('6,32 32,22 58,32 32,42', '#e67522'),
      polygon('12,32 32,16 52,32 32,48', '#f5b642'),
      polygon('20,32 32,24 44,32 32,40', '#fff2a2'),
      rect(4, 30, 10, 4, '#ffffff'),
    ].join('\n')),
  },
  {
    slug: 'explosion-burst',
    title: 'Explosion Burst',
    category: 'effect',
    size: 128,
    prompt: 'Transparent pixel art explosion burst effect with hard-edged fire and smoke chunks.',
    svg: spriteSvg(128, [
      polygon('48,8 58,34 86,28 64,48 82,72 52,62 34,88 34,60 10,66 30,46 12,22 40,34', '#b83a22'),
      polygon('48,18 56,40 74,38 60,52 66,70 48,60 36,76 38,56 22,58 36,44 26,30 44,38', '#e97924'),
      polygon('48,30 54,44 64,44 56,54 58,64 48,58 40,66 42,54 32,54 42,46 36,38 46,42', '#f7c458'),
      rect(16, 70, 18, 10, '#5c5c55'),
      rect(62, 20, 12, 10, '#5c5c55'),
    ].join('\n')),
  },
  {
    slug: 'smoke-puff',
    title: 'Smoke Puff',
    category: 'effect',
    size: 128,
    prompt: 'Transparent pixel art smoke puff with layered gray hard-edge clouds.',
    svg: spriteSvg(128, [
      circle(34, 56, 18, '#6f736b'),
      circle(50, 46, 22, '#85877e'),
      circle(66, 58, 18, '#6f736b'),
      circle(44, 66, 18, '#54584f'),
      circle(60, 70, 14, '#4a4e46'),
      rect(28, 70, 42, 10, '#4a4e46'),
    ].join('\n')),
  },
  {
    slug: 'tracer-round',
    title: 'Tracer Round',
    category: 'effect',
    size: 64,
    prompt: 'Transparent pixel art tracer round streak with yellow core and orange tail.',
    svg: spriteSvg(64, [
      rect(8, 30, 42, 4, '#e77225'),
      rect(22, 29, 30, 6, '#f5c54f'),
      rect(42, 28, 12, 8, '#fff1a1'),
      rect(4, 31, 12, 2, '#a8351d'),
    ].join('\n')),
  },
];

async function renderSpriteAssets(): Promise<SpriteManifestAsset[]> {
  mkdirSync(SPRITE_DIR, { recursive: true });
  const spriteManifest: SpriteManifestAsset[] = [];

  for (const spec of spriteSpecs) {
    const outPath = join(SPRITE_DIR, `${spec.slug}.png`);
    await sharp(Buffer.from(spec.svg)).png().toFile(outPath);
    const stats = statSync(outPath);
    const meta = await sharp(outPath).metadata();
    const validation: string[] = [];
    if (meta.width !== spec.size || meta.height !== spec.size) validation.push(`Expected ${spec.size}x${spec.size}, got ${meta.width}x${meta.height}`);
    if (spec.size & (spec.size - 1)) validation.push('Sprite size is not power-of-two');
    if (!meta.hasAlpha) validation.push('Missing alpha channel');
    if (stats.size > 50 * 1024) validation.push('Sprite exceeds 50KB target');

    spriteManifest.push({
      slug: spec.slug,
      title: spec.title,
      category: spec.category,
      path: relative(OUT_DIR, outPath).replace(/\\/g, '/'),
      sizeBytes: stats.size,
      width: meta.width ?? spec.size,
      height: meta.height ?? spec.size,
      prompt: spec.prompt,
      validation,
    });
  }

  return spriteManifest;
}

function renderIndex(manifest: ManifestAsset[], sprites: SpriteManifestAsset[]): string {
  const manifestJson = JSON.stringify(manifest, null, 2).replace(/</g, '\\u003c');
  const spriteManifestJson = JSON.stringify(sprites, null, 2).replace(/</g, '\\u003c');
  const categories = Array.from(new Set(manifest.map((asset) => asset.category)));
  const spriteCategories = Array.from(new Set(sprites.map((asset) => asset.category)));
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Terror in the Jungle Asset Gallery - Pixel Forge</title>
  <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
  <style>
    :root {
      color-scheme: dark;
      --bg: #10110d;
      --panel: #191b15;
      --panel-2: #21241c;
      --line: #3a3e31;
      --text: #f1f0e6;
      --muted: #a5a68f;
      --olive: #80935a;
      --brass: #c5a351;
      --red: #ba4d38;
      --blue: #5f86a6;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background:
        linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px) 0 0 / 44px 44px,
        linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px) 0 0 / 44px 44px,
        radial-gradient(circle at 78% 18%, rgba(197,163,81,.10), transparent 32rem),
        var(--bg);
      color: var(--text);
      font-family: "Bahnschrift", "Aptos Condensed", "Segoe UI", sans-serif;
    }
    header {
      min-height: 76vh;
      display: grid;
      grid-template-columns: minmax(280px, 0.95fr) minmax(300px, 1.2fr);
      gap: clamp(24px, 4vw, 72px);
      align-items: center;
      padding: clamp(28px, 5vw, 72px);
      border-bottom: 1px solid var(--line);
    }
    h1 {
      margin: 0;
      max-width: 780px;
      font-size: clamp(44px, 8vw, 112px);
      line-height: .88;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .kicker {
      color: var(--brass);
      font-size: 13px;
      letter-spacing: .16em;
      text-transform: uppercase;
      margin-bottom: 22px;
    }
    .lede {
      max-width: 700px;
      margin: 28px 0 0;
      color: var(--muted);
      font-size: clamp(17px, 2vw, 24px);
      line-height: 1.35;
    }
    .hero-viewer {
      width: 100%;
      min-height: 520px;
      border: 1px solid var(--line);
      background: linear-gradient(155deg, #24281d, #10110d 62%);
    }
    .stats {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 28px;
    }
    .stat {
      border: 1px solid var(--line);
      background: rgba(33,36,28,.74);
      padding: 10px 12px;
      min-width: 118px;
    }
    .stat strong {
      display: block;
      font-size: 24px;
      color: var(--text);
    }
    .stat span {
      display: block;
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .08em;
    }
    main { padding: 28px clamp(18px, 4vw, 56px) 64px; }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 22px;
    }
    .filters { display: flex; flex-wrap: wrap; gap: 8px; }
    button {
      color: var(--text);
      background: var(--panel-2);
      border: 1px solid var(--line);
      padding: 9px 12px;
      font: inherit;
      cursor: pointer;
    }
    button[aria-pressed="true"] { border-color: var(--brass); color: var(--brass); }
    .timestamp { color: var(--muted); font-size: 13px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(310px, 1fr));
      gap: 16px;
    }
    .section-title {
      margin: 48px 0 18px;
      font-size: clamp(28px, 4vw, 54px);
      line-height: 1;
      text-transform: uppercase;
    }
    article {
      background: color-mix(in srgb, var(--panel) 88%, black);
      border: 1px solid var(--line);
      display: grid;
      grid-template-rows: 330px auto;
      min-width: 0;
    }
    model-viewer {
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at 50% 35%, #303526, #11130f 70%);
      --poster-color: #11130f;
    }
    .body { padding: 15px; }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: baseline;
      margin-bottom: 8px;
    }
    h2 { margin: 0; font-size: 20px; line-height: 1.1; }
    .badge {
      color: var(--brass);
      border: 1px solid rgba(197,163,81,.45);
      padding: 3px 6px;
      font-size: 12px;
      text-transform: uppercase;
      white-space: nowrap;
    }
    p { margin: 8px 0; color: var(--muted); line-height: 1.38; }
    dl {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin: 14px 0;
    }
    dt { color: var(--muted); font-size: 11px; text-transform: uppercase; }
    dd { margin: 2px 0 0; font-family: ui-monospace, "Cascadia Mono", monospace; font-size: 13px; }
    .parts {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin: 12px 0;
      max-height: 64px;
      overflow: hidden;
    }
    .parts span {
      border: 1px solid #2f3328;
      background: #151710;
      color: #c7c8b0;
      padding: 3px 5px;
      font-family: ui-monospace, "Cascadia Mono", monospace;
      font-size: 11px;
    }
    a {
      color: var(--text);
      text-decoration: none;
      border-bottom: 1px solid var(--brass);
    }
    .downloads {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 12px;
    }
    .sprite-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 14px;
    }
    .sprite-card {
      background: color-mix(in srgb, var(--panel) 88%, black);
      border: 1px solid var(--line);
      padding: 12px;
      min-width: 0;
    }
    .sprite-preview {
      display: grid;
      place-items: center;
      height: 180px;
      border: 1px solid #2f3328;
      background:
        linear-gradient(45deg, #20241a 25%, transparent 25%),
        linear-gradient(-45deg, #20241a 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #20241a 75%),
        linear-gradient(-45deg, transparent 75%, #20241a 75%),
        #11130f;
      background-size: 24px 24px;
      background-position: 0 0, 0 12px, 12px -12px, -12px 0;
    }
    .sprite-preview img {
      width: min(128px, 82%);
      height: min(128px, 82%);
      object-fit: contain;
      image-rendering: pixelated;
    }
    .sprite-card h3 {
      margin: 12px 0 6px;
      font-size: 18px;
    }
    .sprite-card p {
      font-size: 13px;
    }
    @media (max-width: 900px) {
      header { grid-template-columns: 1fr; min-height: auto; }
      .hero-viewer { min-height: 380px; }
    }
  </style>
</head>
<body>
  <header>
    <section>
      <div class="kicker">Pixel Forge / Terror in the Jungle / first public pass</div>
      <h1>Vietnam War Game Asset Library</h1>
      <p class="lede">A curated GLB pass rebuilt with the upgraded Kiln primitive stack: named parts, animation pivots, strict triangle budgets, and download-ready files for game integration.</p>
      <div class="stats">
        <div class="stat"><strong>${manifest.length}</strong><span>assets</span></div>
        <div class="stat"><strong>${sprites.length}</strong><span>2D PNGs</span></div>
        <div class="stat"><strong>${manifest.reduce((sum, a) => sum + a.tris, 0).toLocaleString()}</strong><span>triangles</span></div>
        <div class="stat"><strong>${new Set(manifest.flatMap((a) => a.animationClips)).size}</strong><span>clip types</span></div>
      </div>
    </section>
    <model-viewer class="hero-viewer" src="${manifest[0]?.path ?? ''}" camera-controls auto-rotate shadow-intensity="0.85" exposure="0.95" environment-image="neutral" ar></model-viewer>
  </header>
  <main>
    <div class="toolbar">
      <div class="filters" role="group" aria-label="Filter assets">
        <button data-filter="all" aria-pressed="true">All</button>
        ${categories.map((category) => `<button data-filter="${category}">${category}</button>`).join('\n        ')}
      </div>
      <div class="timestamp">Generated ${new Date().toISOString().slice(0, 10)} from docs/terror-in-the-jungle-assets.md</div>
    </div>
    <section class="grid" id="grid"></section>
    <h2 class="section-title">2D Transparent PNG Pass</h2>
    <div class="toolbar">
      <div class="filters" role="group" aria-label="Filter 2D assets">
        <button data-sprite-filter="all" aria-pressed="true">All</button>
        ${spriteCategories.map((category) => `<button data-sprite-filter="${category}">${category}</button>`).join('\n        ')}
      </div>
      <div class="timestamp">Provider-free fallback sprites with captured image-model prompts</div>
    </div>
    <section class="sprite-grid" id="spriteGrid"></section>
  </main>
  <script type="application/json" id="manifest">${manifestJson}</script>
  <script type="application/json" id="spriteManifest">${spriteManifestJson}</script>
  <script>
    const assets = JSON.parse(document.getElementById('manifest').textContent);
    const sprites = JSON.parse(document.getElementById('spriteManifest').textContent);
    const grid = document.getElementById('grid');
    const spriteGrid = document.getElementById('spriteGrid');
    const formatKb = (bytes) => (bytes / 1024).toFixed(1) + ' KB';
    const card = (asset) => {
      const parts = asset.namedParts
        .filter((name) => !name.includes('sandbagFront') && !name.includes('sandbagRear') && !name.includes('roadWheel'))
        .slice(0, 16)
        .map((name) => '<span>' + name + '</span>')
        .join('');
      const clips = asset.animationClips.length ? asset.animationClips.join(', ') : 'static';
      const warnings = asset.warnings.length ? asset.warnings.join('; ') : 'none';
      return '<article data-category="' + asset.category + '">' +
        '<model-viewer src="' + asset.path + '" camera-controls auto-rotate shadow-intensity="0.85" exposure="0.95" environment-image="neutral"></model-viewer>' +
        '<div class="body">' +
          '<div class="row"><h2>' + asset.title + '</h2><span class="badge">' + asset.category + '</span></div>' +
          '<p>' + asset.prompt + '</p>' +
          '<dl>' +
            '<div><dt>Tris</dt><dd>' + asset.tris + ' / ' + asset.triBudget + '</dd></div>' +
            '<div><dt>Size</dt><dd>' + formatKb(asset.sizeBytes) + '</dd></div>' +
            '<div><dt>Clips</dt><dd>' + clips + '</dd></div>' +
          '</dl>' +
          '<div class="parts">' + parts + '</div>' +
          '<p>Scale: ' + asset.scale + '</p>' +
          '<p>Validation warnings: ' + warnings + '</p>' +
          '<div class="downloads"><a href="' + asset.path + '" download>Download GLB</a><a href="manifest.json">Manifest JSON</a></div>' +
        '</div>' +
      '</article>';
    };
    function render(filter) {
      grid.innerHTML = assets.filter((a) => filter === 'all' || a.category === filter).map(card).join('');
    }
    const spriteCard = (asset) => {
      const validation = asset.validation.length ? asset.validation.join('; ') : 'transparent, power-of-two, under 50KB';
      return '<article class="sprite-card" data-category="' + asset.category + '">' +
        '<div class="sprite-preview"><img src="' + asset.path + '" alt="' + asset.title + '"></div>' +
        '<h3>' + asset.title + '</h3>' +
        '<span class="badge">' + asset.category + '</span>' +
        '<p>' + asset.prompt + '</p>' +
        '<dl>' +
          '<div><dt>Size</dt><dd>' + asset.width + 'x' + asset.height + '</dd></div>' +
          '<div><dt>File</dt><dd>' + formatKb(asset.sizeBytes) + '</dd></div>' +
          '<div><dt>Checks</dt><dd>' + validation + '</dd></div>' +
        '</dl>' +
        '<div class="downloads"><a href="' + asset.path + '" download>Download PNG</a><a href="sprites-manifest.json">Sprite JSON</a></div>' +
      '</article>';
    };
    function renderSprites(filter) {
      spriteGrid.innerHTML = sprites.filter((a) => filter === 'all' || a.category === filter).map(spriteCard).join('');
    }
    document.querySelectorAll('button[data-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelectorAll('button[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
        render(button.dataset.filter);
      });
    });
    document.querySelectorAll('button[data-sprite-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelectorAll('button[data-sprite-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
        renderSprites(button.dataset.spriteFilter);
      });
    });
    render('all');
    renderSprites('all');
  </script>
</body>
</html>
`;
}

async function main(): Promise<void> {
  mkdirSync(ASSET_DIR, { recursive: true });
  mkdirSync(SPRITE_DIR, { recursive: true });

  const manifest: ManifestAsset[] = [];

  for (const spec of assets) {
    const { root, clips = [], notes = [] } = spec.build();
    const warnings: string[] = [];
    const namedParts = collectNamedParts(root);
    const missingParts = spec.requiredParts.filter((p) => !namedParts.includes(p));
    if (missingParts.length) {
      warnings.push(`Missing required named parts: ${missingParts.join(', ')}`);
    }

    const rendered = await renderSceneToGLB(root, { sceneName: spec.title, clips });
    warnings.push(...rendered.warnings);

    const glbPath = join(ASSET_DIR, `${spec.slug}.glb`);
    writeFileSync(glbPath, rendered.bytes);
    const stats = statSync(glbPath);

    manifest.push({
      slug: spec.slug,
      title: spec.title,
      category: spec.category,
      priority: spec.priority,
      path: relative(OUT_DIR, glbPath).replace(/\\/g, '/'),
      sizeBytes: stats.size,
      tris: rendered.tris,
      triBudget: spec.triBudget,
      materialCount: countMaterials(root),
      namedParts,
      animationClips: clips.map((clip) => clip.name),
      warnings,
      scale: spec.scale,
      prompt: spec.prompt,
      notes,
    });

    console.log(`${spec.slug}: ${rendered.tris} tris, ${stats.size} bytes${warnings.length ? `, warnings: ${warnings.join('; ')}` : ''}`);
  }

  const sprites = await renderSpriteAssets();

  writeFileSync(join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(join(OUT_DIR, 'sprites-manifest.json'), `${JSON.stringify(sprites, null, 2)}\n`);
  writeFileSync(join(OUT_DIR, 'index.html'), renderIndex(manifest, sprites));

  if (!existsSync(join(OUT_DIR, '.nojekyll'))) {
    writeFileSync(join(OUT_DIR, '.nojekyll'), '');
  }

  const totalTris = manifest.reduce((sum, asset) => sum + asset.tris, 0);
  const totalBytes = manifest.reduce((sum, asset) => sum + asset.sizeBytes, 0);
  console.log(`\nwrote ${manifest.length} assets to ${OUT_DIR}`);
  console.log(`wrote ${sprites.length} transparent sprites to ${SPRITE_DIR}`);
  console.log(`total: ${totalTris} tris, ${(totalBytes / 1024).toFixed(1)} KB`);
}

await main();
