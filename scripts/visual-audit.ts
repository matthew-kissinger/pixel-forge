/**
 * Offline visual audit: render every GLB in `war-assets/validation/` as a
 * 3×2 grid of 6 camera angles (Front / Right / Back / Left / Top / 3-4) and
 * save as a single PNG under `war-assets/validation/_grids/`.
 *
 * Why this exists: <model-viewer> in our inspector renders double-sided by
 * default, which masks inverted-winding bugs (e.g. the Round-1 gear had
 * flipped normals on every face; only visible in a strict back-face-culled
 * render). This script renders with Three.js' own MeshStandardMaterial in
 * a headless Chromium — matching how the GLB will look inside a real game
 * engine. If a face is invisible from one angle in the grid, it's a real
 * winding problem.
 *
 * Runs fully self-contained: no dev-server, no internet for anything other
 * than pulling three.js from a CDN import map. Playwright's bundled
 * Chromium is reused.
 *
 * Usage:
 *   bun run audit:glb                          # all GLBs
 *   bun run audit:glb gear.glb sword.glb       # specific ones
 *
 * (Under the hood this runs `tsx scripts/visual-audit.ts` — not `bun
 * scripts/visual-audit.ts`. Bun's process spawning on Windows doesn't play
 * well with Playwright's CDP pipe; node + tsx handle it fine.)
 *
 * Output: war-assets/validation/_grids/<name>-grid.png (labelled cells,
 * 1230×864 per grid).
 */

import { chromium } from 'playwright';
import sharp from 'sharp';
import {
  readFileSync,
  readdirSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from 'node:fs';
import { basename, extname, join } from 'node:path';

const INPUT_DIR = 'war-assets/validation';
const OUT_DIR = join(INPUT_DIR, '_grids');
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const CELL = 400;
const PAD = 6;
const LABEL_H = 22;
const TITLE_H = 32;

interface View {
  name: string;
  /** Camera position in world space, model is centered+framed at origin. */
  pos: [number, number, number];
}
const VIEWS: View[] = [
  // Kiln world frame: +X forward, +Y up, +Z right.
  { name: 'Front', pos: [1, 0, 0] },
  { name: 'Right', pos: [0, 0, 1] },
  { name: 'Back', pos: [-1, 0, 0] },
  { name: 'Left', pos: [0, 0, -1] },
  { name: 'Top', pos: [0, 1, 0.0001] },
  { name: '3/4', pos: [0.7, 0.5, 0.7] },
];

const RENDER_PAGE = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; background: #1a1a1a; }
  #app { width: ${CELL}px; height: ${CELL}px; }
</style>
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.184.0/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@0.184.0/examples/jsm/"
  }
}
</script>
</head>
<body>
<div id="app"></div>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const app = document.getElementById('app');
const W = ${CELL}, H = ${CELL};
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// Strict back-face culling (match game-engine behaviour). If a triangle's
// winding is inverted, it will be invisible from the correct side — which
// is exactly what we want the grid to reveal.
const ambient = new THREE.AmbientLight(0xffffff, 0.25);
scene.add(ambient);
const key = new THREE.DirectionalLight(0xffffff, 1.1);
key.position.set(1.5, 2, 1);
scene.add(key);

const camera = new THREE.PerspectiveCamera(35, W / H, 0.01, 200);

let root = null;
let boundsRadius = 1;
let boundsCenter = new THREE.Vector3();

window.__loadGlb = async (dataUrl) => {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(dataUrl, (gltf) => {
      if (root) scene.remove(root);
      root = gltf.scene;
      scene.add(root);
      const box = new THREE.Box3().setFromObject(root);
      boundsCenter = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      boundsRadius = Math.max(size.x, size.y, size.z) * 0.5 || 1;
      // Ensure every material uses single-sided (so winding bugs show).
      root.traverse((obj) => {
        if (obj.isMesh && obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            m.side = THREE.FrontSide;
            m.needsUpdate = true;
          }
        }
      });
      resolve({ ok: true });
    }, undefined, (err) => reject(err));
  });
};

window.__renderFromDir = (dir) => {
  const d = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();
  // Frame so the whole model fits. fov vertical = 35° → tan(17.5°) ≈ 0.315.
  // distance = radius / tan(fov/2) * safety.
  const dist = (boundsRadius / Math.tan((35 * Math.PI) / 360)) * 1.8;
  camera.position.copy(boundsCenter).addScaledVector(d, dist);
  camera.up.set(0, 1, 0);
  camera.lookAt(boundsCenter);
  renderer.render(scene, camera);
  return renderer.domElement.toDataURL('image/png');
};

window.__ready = true;
</script>
</body></html>`;

function titleCase(s: string): string {
  return s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

async function labelSvg(text: string, width: number, height: number, bg = '#111', fg = '#ccc', size = 14): Promise<Buffer> {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
       <rect width="${width}" height="${height}" fill="${bg}"/>
       <text x="${width / 2}" y="${height / 2 + size / 3}" fill="${fg}" text-anchor="middle" font-family="Segoe UI, monospace, sans-serif" font-size="${size}" font-weight="600">${text}</text>
     </svg>`
  );
}

async function stitchGrid(cells: Array<{ name: string; png: Buffer }>, title: string, outPath: string): Promise<void> {
  const cols = 3;
  const rows = 2;
  const width = cols * CELL + (cols + 1) * PAD;
  const height = TITLE_H + rows * (CELL + LABEL_H) + (rows + 1) * PAD;

  const composites: sharp.OverlayOptions[] = [];
  composites.push({ input: await labelSvg(title, width, TITLE_H, '#222', '#eaeaea', 16), top: 0, left: 0 });

  for (let i = 0; i < cells.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellX = PAD + col * (CELL + PAD);
    const cellY = TITLE_H + PAD + row * (CELL + LABEL_H + PAD);

    composites.push({ input: cells[i]!.png, top: cellY, left: cellX });
    composites.push({
      input: await labelSvg(cells[i]!.name, CELL, LABEL_H, '#0e0e0e', '#9aa', 12),
      top: cellY + CELL,
      left: cellX,
    });
  }

  const png = await sharp({
    create: { width, height, channels: 4, background: { r: 32, g: 32, b: 32, alpha: 1 } },
  })
    .composite(composites)
    .png()
    .toBuffer();
  writeFileSync(outPath, png);
}

async function run() {
  const args = process.argv.slice(2).filter((a) => a.endsWith('.glb'));
  const all = readdirSync(INPUT_DIR).filter((f) => f.endsWith('.glb') && !f.startsWith('_'));
  const targets = args.length ? args.filter((a) => all.includes(a)) : all;
  if (targets.length === 0) {
    console.log('no .glb files to audit');
    return;
  }

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: CELL, height: CELL }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.setContent(RENDER_PAGE);
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true, { timeout: 30_000 });

  for (const name of targets) {
    const glbPath = join(INPUT_DIR, name);
    const bytes = readFileSync(glbPath);
    const b64 = bytes.toString('base64');
    const dataUrl = `data:model/gltf-binary;base64,${b64}`;

    console.log(`rendering ${name}...`);
    await page.evaluate((url) => (window as unknown as { __loadGlb: (u: string) => Promise<unknown> }).__loadGlb(url), dataUrl);

    const cells: Array<{ name: string; png: Buffer }> = [];
    for (const view of VIEWS) {
      const dataPng = await page.evaluate(
        (pos) => (window as unknown as { __renderFromDir: (d: [number, number, number]) => string }).__renderFromDir(pos),
        view.pos
      );
      const b = Buffer.from(dataPng.split(',')[1]!, 'base64');
      cells.push({ name: view.name, png: b });
    }

    const outName = basename(name, extname(name)) + '-grid.png';
    const outPath = join(OUT_DIR, outName);
    await stitchGrid(cells, titleCase(basename(name, extname(name))), outPath);
    console.log(`  → ${outPath}`);
  }

  await browser.close();
  console.log(`\ndone. ${targets.length} grid(s) in ${OUT_DIR}/`);
}

await run();
