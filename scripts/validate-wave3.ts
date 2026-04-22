/**
 * Wave 3A + 3B validation: end-to-end textured asset pipeline.
 *
 * Pipeline: procedural-texture (via sharp) → loadTexture → autoUnwrap →
 * pbrMaterial → GLB. No FAL/Gemini calls — that's Wave 3C. This script
 * proves the UV + PBR + texture-bridge plumbing works with any PNG.
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import * as THREE from 'three';
import sharp from 'sharp';
import {
  createRoot,
  boxGeo,
  cylinderGeo,
} from '../packages/core/src/kiln/primitives';
import { autoUnwrap } from '../packages/core/src/kiln/uv';
import { loadTexture, pbrMaterial } from '../packages/core/src/kiln/textures';
import { renderSceneToGLB } from '../packages/core/src/kiln/render';

const OUT_DIR = 'war-assets/validation';
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// -----------------------------------------------------------------------------
// Procedural texture helpers (SVG → sharp PNG; no external asset dependency).
// Keeps the validation self-contained so Wave 3 ships without requiring art.
// -----------------------------------------------------------------------------

async function woodPlanksPng(size = 256): Promise<Buffer> {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs>
    <pattern id="wood" patternUnits="userSpaceOnUse" width="${size}" height="${size / 4}">
      <rect width="${size}" height="${size / 4}" fill="#8b5a2b"/>
      <rect width="${size}" height="2" y="0" fill="#5c3a1a"/>
      <rect width="${size}" height="1" y="${size / 8}" fill="#6e4621" opacity="0.6"/>
      <rect width="${size}" height="1" y="${size / 6}" fill="#9c6c38" opacity="0.5"/>
    </pattern>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#wood)"/>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function metalBandsPng(size = 256): Promise<Buffer> {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="#7a6f5c"/>
  <rect width="${size}" height="8" y="${size / 4}" fill="#3a352c"/>
  <rect width="${size}" height="8" y="${(3 * size) / 4}" fill="#3a352c"/>
  <circle cx="${size / 6}" cy="${size / 4 + 4}" r="3" fill="#1a1510"/>
  <circle cx="${(5 * size) / 6}" cy="${size / 4 + 4}" r="3" fill="#1a1510"/>
  <circle cx="${size / 6}" cy="${(3 * size) / 4 + 4}" r="3" fill="#1a1510"/>
  <circle cx="${(5 * size) / 6}" cy="${(3 * size) / 4 + 4}" r="3" fill="#1a1510"/>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function signTextPng(size = 256, text = 'KILN'): Promise<Buffer> {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="#d9c9a0"/>
  <rect x="8" y="8" width="${size - 16}" height="${size - 16}" fill="none" stroke="#4a3a20" stroke-width="4"/>
  <text x="50%" y="50%" font-family="Georgia, serif" font-size="${size * 0.28}" fill="#2a1a08" text-anchor="middle" dominant-baseline="middle" font-weight="bold">${text}</text>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function writeGlb(path: string, root: THREE.Object3D) {
  const result = await renderSceneToGLB(root);
  writeFileSync(path, result.bytes);
  console.log(
    `[${path}] ${result.bytes.byteLength.toLocaleString()} bytes, ${result.tris} tris`
  );
  if (result.warnings.length) console.log('  warnings:', result.warnings);
}

// ---------------------------------------------------------------------------
// 1. Textured crate — procedural wood, PBR, auto-UV
// ---------------------------------------------------------------------------
async function crate() {
  const root = createRoot('Crate');
  const woodPng = await woodPlanksPng(256);
  const wood = await loadTexture(woodPng);
  wood.wrapS = THREE.RepeatWrapping;
  wood.wrapT = THREE.RepeatWrapping;

  const mat = pbrMaterial({ albedo: wood, roughness: 0.88, metalness: 0 });
  const geo = await autoUnwrap(boxGeo(1, 1, 1), { resolution: 1024 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'Mesh_Crate';
  root.add(mesh);

  await writeGlb(`${OUT_DIR}/crate-textured.glb`, root);
}

// ---------------------------------------------------------------------------
// 2. Textured barrel — lathe-like via cylinder with metal bands texture
// ---------------------------------------------------------------------------
async function barrel() {
  const root = createRoot('Barrel');
  const bandsPng = await metalBandsPng(256);
  const bands = await loadTexture(bandsPng);

  const mat = pbrMaterial({ albedo: bands, roughness: 0.7, metalness: 0.2 });
  const geo = await autoUnwrap(cylinderGeo(0.5, 0.5, 1.2, 24));
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'Mesh_Barrel';
  mesh.position.y = 0.6;
  root.add(mesh);

  await writeGlb(`${OUT_DIR}/barrel-textured.glb`, root);
}

// ---------------------------------------------------------------------------
// 3. Textured sign — thin box with "KILN" label
// ---------------------------------------------------------------------------
async function sign() {
  const root = createRoot('Sign');
  const signPng = await signTextPng(256, 'KILN');
  const signTex = await loadTexture(signPng);

  const mat = pbrMaterial({ albedo: signTex, roughness: 0.95, metalness: 0 });
  const geo = await autoUnwrap(boxGeo(1, 0.6, 0.05));
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'Mesh_Sign';
  root.add(mesh);

  await writeGlb(`${OUT_DIR}/sign-textured.glb`, root);
}

await crate();
await barrel();
await sign();

console.log('\nWave 3A + 3B validation complete. Check war-assets/validation/');
