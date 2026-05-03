/**
 * Asset Gallery Routes
 *
 * GET /gallery - Browse all generated war-assets with raw/clean comparison
 * GET /gallery/api/assets - JSON list of all assets
 * GET /gallery/file/* - Serve asset files from war-assets/
 */

import { Hono } from 'hono';
import path from 'path';
import { readdirSync, statSync, existsSync } from 'fs';
import { logger } from '@pixel-forge/shared/logger';

const galleryRouter = new Hono();

// Resolve war-assets directory relative to project root
const WAR_ASSETS_DIR = path.resolve(
  process.env.WAR_ASSETS_DIR || path.join(import.meta.dir, '../../../../war-assets')
);

interface AssetEntry {
  name: string;
  category: string;
  rawPath?: string;
  cleanPath?: string;
  rawSize?: number;
  cleanSize?: number;
  modified: string;
}

/**
 * Recursively scan war-assets/ for image files, pairing _raw with clean versions.
 */
function scanAssets(): AssetEntry[] {
  const assets: AssetEntry[] = [];

  if (!existsSync(WAR_ASSETS_DIR)) {
    logger.warn(`War assets directory not found: ${WAR_ASSETS_DIR}`);
    return assets;
  }

  function walkDir(dir: string, category: string) {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    // Collect files, skip _raw files (will be paired later)
    const files = new Map<string, { raw?: string; clean?: string; rawSize?: number; cleanSize?: number; modified: string }>();

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        const subCategory = category ? `${category}/${entry}` : entry;
        walkDir(fullPath, subCategory);
      } else if (/\.(png|jpg|jpeg|webp|glb|gltf)$/i.test(entry)) {
        // Determine if this is a _raw variant
        const isRaw = /_raw\.\w+$/.test(entry);
        const baseName = entry.replace(/_raw(\.\w+)$/, '$1');
        const existing = files.get(baseName) || { modified: stat.mtime.toISOString() };

        if (isRaw) {
          existing.raw = entry;
          existing.rawSize = stat.size;
        } else {
          existing.clean = entry;
          existing.cleanSize = stat.size;
        }

        // Keep the latest modification time
        if (stat.mtime.toISOString() > existing.modified) {
          existing.modified = stat.mtime.toISOString();
        }

        files.set(baseName, existing);
      }
    }

    for (const [baseName, info] of files.entries()) {
      const name = baseName.replace(/\.\w+$/, '');
      assets.push({
        name,
        category,
        rawPath: info.raw ? `${category}/${info.raw}` : undefined,
        cleanPath: info.clean ? `${category}/${info.clean}` : undefined,
        rawSize: info.rawSize,
        cleanSize: info.cleanSize,
        modified: info.modified,
      });
    }
  }

  walkDir(WAR_ASSETS_DIR, '');
  assets.sort((a, b) => b.modified.localeCompare(a.modified));
  return assets;
}

/**
 * GET /gallery/api/assets - JSON list of all assets
 */
galleryRouter.get('/api/assets', (c) => {
  const assets = scanAssets();
  return c.json({ assets, total: assets.length, dir: WAR_ASSETS_DIR });
});

/**
 * GET /gallery/file/* - Serve raw asset files
 */
galleryRouter.get('/file/*', async (c) => {
  const filePath = c.req.path.replace('/gallery/file/', '');

  // Security: prevent directory traversal
  if (filePath.includes('..')) {
    return c.text('Forbidden', 403);
  }

  const fullPath = path.join(WAR_ASSETS_DIR, filePath);

  if (!existsSync(fullPath)) {
    return c.text('Not found', 404);
  }

  // Determine content type
  const ext = path.extname(fullPath).toLowerCase();
  const contentTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.html': 'text/html; charset=UTF-8',
    '.json': 'application/json',
  };

  const file = Bun.file(fullPath);
  return new Response(file, {
    headers: {
      'Content-Type': contentTypes[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    },
  });
});

/**
 * GET /gallery - HTML gallery page
 */
galleryRouter.get('/', (c) => {
  return c.html(GALLERY_HTML);
});

/**
 * GET /gallery/view/* - Dedicated fullscreen inspector for a single GLB.
 *
 * Provides 7 camera presets (front/back/left/right/top/bottom/three-quarter),
 * wireframe toggle, auto-rotate, exposure control, and per-asset metadata.
 * This is what you click into when a card's rendering looks off and you need
 * orthogonal views to judge whether the primitive is actually correct.
 */
galleryRouter.get('/view/*', (c) => {
  const assetPath = c.req.path.replace('/gallery/view/', '');
  if (assetPath.includes('..')) return c.text('Forbidden', 403);
  if (!assetPath.toLowerCase().endsWith('.glb')) return c.redirect('/gallery');

  const fullPath = path.join(WAR_ASSETS_DIR, assetPath);
  if (!existsSync(fullPath)) return c.text('Not found', 404);

  const fileSize = statSync(fullPath).size;
  const src = `/gallery/file/${assetPath}`;
  const name = path.basename(assetPath, '.glb');
  const category = path.dirname(assetPath) || 'root';

  return c.html(renderInspectPage({ src, name, category, fileSize, assetPath }));
});

interface InspectParams {
  src: string;
  name: string;
  category: string;
  fileSize: number;
  assetPath: string;
}

function renderInspectPage(p: InspectParams): string {
  const esc = (s: string) =>
    s.replace(/[&<>"']/g, (ch) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string
    );
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Inspect: ${esc(p.name)}</title>
<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #050505; color: #e0e0e0; overflow: hidden; }
  header { position: fixed; top: 0; left: 0; right: 0; height: 48px; background: rgba(10,10,10,0.9); backdrop-filter: blur(8px); border-bottom: 1px solid #222; display: flex; align-items: center; gap: 16px; padding: 0 20px; z-index: 10; }
  header a { color: #888; text-decoration: none; font-size: 13px; padding: 6px 12px; border: 1px solid #333; border-radius: 6px; }
  header a:hover { border-color: #666; color: #ccc; }
  header h1 { font-size: 15px; font-weight: 500; }
  header .category { font-size: 12px; color: #666; background: #1a1a1a; padding: 3px 10px; border-radius: 4px; }
  .viewer-wrap { position: absolute; top: 48px; bottom: 0; left: 0; right: 0; background: #0a0a0a; }
  model-viewer { width: 100%; height: 100%; }
  /* Scene modes — controlled by a body class. Gives us contrast against dark
     meshes, light meshes, and transparent cutouts (door window) alike. */
  body.scene-studio model-viewer { background: linear-gradient(to bottom, #8aa0b8 0%, #c8d3e0 55%, #5a5550 55%, #3a352e 100%); }
  body.scene-void    model-viewer { background: radial-gradient(ellipse at center, #1a1a1a 0%, #050505 100%); }
  body.scene-checker model-viewer { background-color: #444; background-image: linear-gradient(45deg, #666 25%, transparent 25%), linear-gradient(-45deg, #666 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #666 75%), linear-gradient(-45deg, transparent 75%, #666 75%); background-size: 32px 32px; background-position: 0 0, 0 16px, 16px -16px, -16px 0px; }

  /* Left toolbar: camera presets + toggles */
  .toolbar { position: absolute; top: 68px; left: 12px; width: 180px; background: rgba(15,15,15,0.92); border: 1px solid #262626; border-radius: 10px; padding: 10px; z-index: 5; }
  .toolbar h4 { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; margin-top: 8px; }
  .toolbar h4:first-child { margin-top: 0; }
  .preset-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
  .preset-grid button { padding: 6px 4px; background: #1a1a1a; border: 1px solid #333; border-radius: 5px; color: #ccc; cursor: pointer; font-size: 11px; display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .preset-grid button:hover { border-color: #555; background: #222; }
  .preset-grid button.active { background: #2563eb; border-color: #2563eb; color: white; }
  .preset-grid button .key { font-size: 9px; color: #666; font-family: ui-monospace, monospace; }
  .preset-grid button.active .key { color: #bfdbfe; }
  .preset-grid .wide { grid-column: 1 / -1; }
  .toggles { display: flex; flex-direction: column; gap: 4px; }
  .toggles button { padding: 6px 8px; background: #1a1a1a; border: 1px solid #333; border-radius: 5px; color: #ccc; cursor: pointer; font-size: 11px; display: flex; justify-content: space-between; align-items: center; }
  .toggles button:hover { border-color: #555; }
  .toggles button.active { background: #eab308; border-color: #eab308; color: #111; font-weight: 600; }
  .toggles button .key { font-size: 9px; color: #666; font-family: ui-monospace, monospace; }
  .toggles button.active .key { color: #713f12; }
  .slider-row { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #999; }
  .slider-row input { flex: 1; }

  /* Bottom-right metadata */
  .meta-panel { position: absolute; bottom: 12px; right: 12px; background: rgba(15,15,15,0.92); border: 1px solid #262626; border-radius: 10px; padding: 10px 14px; font-family: ui-monospace, monospace; font-size: 11px; color: #999; line-height: 1.6; min-width: 220px; z-index: 5; }
  .meta-panel .row { display: flex; justify-content: space-between; gap: 12px; }
  .meta-panel .row .label { color: #666; }
  .meta-panel .row .val { color: #eab308; }
  .meta-panel .row .val.green { color: #86efac; }
  .meta-panel .row .val.blue { color: #93c5fd; }
  .meta-panel .row .val.purple { color: #d8b4fe; }

  /* Bottom-left orientation hint */
  .orient-hint { position: absolute; bottom: 12px; left: 12px; background: rgba(15,15,15,0.85); border: 1px solid #262626; border-radius: 8px; padding: 8px 12px; font-size: 10px; color: #777; font-family: ui-monospace, monospace; line-height: 1.5; z-index: 5; }
  .orient-hint .x { color: #f87171; }
  .orient-hint .y { color: #86efac; }
  .orient-hint .z { color: #93c5fd; }

  /* Compact toggle for toolbar */
  .toolbar-collapse { position: absolute; top: 68px; left: 12px; background: rgba(15,15,15,0.92); border: 1px solid #262626; border-radius: 10px; padding: 6px 10px; font-size: 11px; color: #999; cursor: pointer; z-index: 5; display: none; }
</style>
</head>
<body class="scene-studio">
<header>
  <a href="/gallery">&larr; Back</a>
  <h1>${esc(p.name)}</h1>
  <span class="category">${esc(p.category)}</span>
  <span style="margin-left:auto;font-size:11px;color:#555;font-family:ui-monospace,monospace;">
    Shortcuts: 1-7 views · W wire · R rotate · C cycle · B/N/M scene · +/- expose · Esc back
  </span>
</header>

<div class="viewer-wrap">
  <model-viewer
    id="mv"
    src="${esc(p.src)}"
    alt="${esc(p.name)}"
    camera-controls
    shadow-intensity="1"
    environment-image="neutral"
    exposure="1"
    tone-mapping="aces"
    interaction-prompt="none">
  </model-viewer>
</div>

<div class="toolbar" id="toolbar">
  <h4>Camera</h4>
  <div class="preset-grid">
    <button data-view="front"  onclick="applyPreset('front')"><span>Front</span><span class="key">1</span></button>
    <button data-view="back"   onclick="applyPreset('back')"><span>Back</span><span class="key">2</span></button>
    <button data-view="right"  onclick="applyPreset('right')"><span>Right</span><span class="key">3</span></button>
    <button data-view="left"   onclick="applyPreset('left')"><span>Left</span><span class="key">4</span></button>
    <button data-view="top"    onclick="applyPreset('top')"><span>Top</span><span class="key">5</span></button>
    <button data-view="bottom" onclick="applyPreset('bottom')"><span>Bottom</span><span class="key">6</span></button>
    <button data-view="three"  class="wide" onclick="applyPreset('three')"><span>3/4 View</span><span class="key">7</span></button>
  </div>

  <h4>Toggles</h4>
  <div class="toggles">
    <button id="btn-wire"   onclick="toggleWireframe()"><span>Wireframe</span><span class="key">W</span></button>
    <button id="btn-rotate" onclick="toggleRotate()"><span>Auto-rotate</span><span class="key">R</span></button>
    <button id="btn-shadow" class="active" onclick="toggleShadow()"><span>Shadow</span><span class="key">S</span></button>
  </div>

  <h4>Scene</h4>
  <div class="toggles">
    <button id="btn-scene-studio" class="active" onclick="setScene('studio')"><span>Studio</span><span class="key">B</span></button>
    <button id="btn-scene-void"   onclick="setScene('void')"><span>Void</span><span class="key">N</span></button>
    <button id="btn-scene-checker" onclick="setScene('checker')"><span>Checker</span><span class="key">M</span></button>
  </div>

  <h4>Tools</h4>
  <div class="toggles">
    <button onclick="cycleAllViews()"><span>Cycle all views</span><span class="key">C</span></button>
  </div>

  <h4>Exposure</h4>
  <div class="slider-row">
    <button onclick="bumpExposure(-0.25)" style="padding:3px 8px;background:#1a1a1a;border:1px solid #333;border-radius:4px;color:#ccc;cursor:pointer;font-size:11px;">-</button>
    <span id="exposure-val">1.00</span>
    <button onclick="bumpExposure(0.25)"  style="padding:3px 8px;background:#1a1a1a;border:1px solid #333;border-radius:4px;color:#ccc;cursor:pointer;font-size:11px;">+</button>
  </div>
</div>

<div class="orient-hint">
  Axes: <span class="x">X right</span> · <span class="y">Y up</span> · <span class="z">Z front</span>
</div>

<div class="meta-panel" id="meta">
  <div class="row"><span class="label">File</span><span class="val">${(p.fileSize / 1024).toFixed(1)} KB</span></div>
  <div class="row"><span class="label">Tris</span><span class="val green" id="m-tris">–</span></div>
  <div class="row"><span class="label">Materials</span><span class="val blue" id="m-mats">–</span></div>
  <div class="row"><span class="label">Meshes</span><span class="val purple" id="m-meshes">–</span></div>
  <div class="row"><span class="label">BBox W</span><span class="val" id="m-bbx">–</span></div>
  <div class="row"><span class="label">BBox H</span><span class="val" id="m-bby">–</span></div>
  <div class="row"><span class="label">BBox D</span><span class="val" id="m-bbz">–</span></div>
</div>

<script>
const mv = document.getElementById('mv');

// model-viewer's public \`.model\` only exposes a material API. The underlying
// THREE.Scene (with traversable meshes) is on a symbol-keyed property —
// lookup by description since the symbol itself is library-internal.
function getScene(el) {
  const sceneSym = Object.getOwnPropertySymbols(el).find(s => s.description === 'scene');
  return sceneSym ? el[sceneSym] : null;
}

// ---------------------------------------------------------------------------
// Camera presets — model-viewer camera-orbit is "theta phi radius"
// where theta rotates around Y-up, phi tilts from +Y.
// Convention: +Z is "front" (matches pixel-forge asset convention).
// ---------------------------------------------------------------------------
const PRESETS = {
  front:  '0deg 90deg auto',
  back:   '180deg 90deg auto',
  right:  '90deg 90deg auto',
  left:   '-90deg 90deg auto',
  top:    '0deg 0.1deg auto',
  bottom: '0deg 179.9deg auto',
  three:  '-35deg 65deg auto',
};

let activeView = 'three';

function applyPreset(name) {
  mv.cameraOrbit = PRESETS[name];
  // jumpCameraToGoal is only defined after model-viewer upgrades the element.
  if (typeof mv.jumpCameraToGoal === 'function') mv.jumpCameraToGoal();
  activeView = name;
  document.querySelectorAll('.preset-grid button').forEach(function(b) {
    b.classList.toggle('active', b.dataset.view === name);
  });
}

// Default to 3/4 once the model-viewer custom element has upgraded.
if (customElements.get('model-viewer')) applyPreset('three');
else customElements.whenDefined('model-viewer').then(function() { applyPreset('three'); });

// ---------------------------------------------------------------------------
// Toggles
//
// Wireframe is rendered as a pre-baked LineSegments overlay (built from
// EdgesGeometry once on model load) sitting alongside each solid mesh.
// Toggling = flipping .visible on the overlay group. No material mutation,
// no shader recompile, no force-render nudge. Pattern adapted from chili3d's
// solid/wireframe Three.js layer split — adapted for model-viewer (which
// hides its renderer) by using a separate Three.js ES module import for the
// overlay classes.
// ---------------------------------------------------------------------------
let wireframeOn = false;
let _edgeOverlayBuilt = false;
let _threePromise = null;

function loadThree() {
  if (!_threePromise) {
    _threePromise = import('https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.js');
  }
  return _threePromise;
}

async function buildEdgeOverlay() {
  if (_edgeOverlayBuilt) return true;
  const scene = getScene(mv);
  if (!scene) return false;
  let T;
  try { T = await loadThree(); } catch (e) { console.warn('three.js load failed:', e); return false; }
  const mat = new T.LineBasicMaterial({ color: 0xffd54a });
  scene.traverse(function(n) {
    if (!n.isMesh || !n.geometry) return;
    if (n.userData.kilnEdgeOverlayHost) return;
    const edges = new T.EdgesGeometry(n.geometry, 30);
    const seg = new T.LineSegments(edges, mat);
    seg.userData.kilnEdgeOverlay = true;
    seg.visible = false;
    seg.renderOrder = 999;
    n.userData.kilnEdgeOverlayHost = true;
    n.add(seg);
  });
  _edgeOverlayBuilt = true;
  return true;
}

async function toggleWireframe() {
  const scene = getScene(mv);
  if (!scene) return;
  wireframeOn = !wireframeOn;
  document.getElementById('btn-wire').classList.toggle('active', wireframeOn);

  const ok = await buildEdgeOverlay();
  if (ok) {
    scene.traverse(function(n) {
      if (n.userData && n.userData.kilnEdgeOverlay) n.visible = wireframeOn;
    });
    return;
  }

  // Fallback if the Three.js dynamic import failed (e.g. CDN unreachable):
  // mutate material.wireframe directly. Same behavior as the legacy
  // implementation.
  scene.traverse(function(n) {
    if (n.isMesh) {
      const mats = Array.isArray(n.material) ? n.material : [n.material];
      mats.forEach(function(m) {
        if (!m) return;
        m.wireframe = wireframeOn;
        m.needsUpdate = true;
      });
    }
  });
  const orbit = mv.getCameraOrbit();
  mv.cameraOrbit = orbit.theta + 'rad ' + orbit.phi + 'rad ' + orbit.radius + 'm';
}

let rotateOn = false;
function toggleRotate() {
  rotateOn = !rotateOn;
  document.getElementById('btn-rotate').classList.toggle('active', rotateOn);
  if (rotateOn) mv.setAttribute('auto-rotate', '');
  else mv.removeAttribute('auto-rotate');
}

let shadowOn = true;
function toggleShadow() {
  shadowOn = !shadowOn;
  document.getElementById('btn-shadow').classList.toggle('active', shadowOn);
  mv.shadowIntensity = shadowOn ? 1 : 0;
}

// Grid floor: inject a THREE.GridHelper into mv.model. Model-viewer doesn't
// expose THREE directly, but it's bundled — mv.model has .type === 'Object3D'
// and we can construct a simple GridHelper-like mesh via mv.model's internal
// three constructor. Simplest: inject a flat plane with a tiled texture.
let gridOn = false;
let gridHelper = null;
function toggleGrid() {
  const scene = getScene(mv);
  if (!scene) return;
  gridOn = !gridOn;
  document.getElementById('btn-grid').classList.toggle('active', gridOn);
  if (gridOn) {
    try {
      let firstMesh = null;
      scene.traverse(function(n){ if(!firstMesh && n.isMesh) firstMesh = n; });
      if (!firstMesh) { gridOn = false; document.getElementById('btn-grid').classList.remove('active'); return; }
      const GeoCtor = firstMesh.geometry.constructor;
      const MatCtor = firstMesh.material.constructor;
      const PosAttr = firstMesh.geometry.getAttribute('position').constructor;
      const verts = [];
      const size = 10, step = 1;
      for (let i = -size / 2; i <= size / 2; i += step) {
        verts.push(i, 0, -size / 2,  i, 0, size / 2);
        verts.push(-size / 2, 0, i,  size / 2, 0, i);
      }
      const geo = new GeoCtor();
      geo.setAttribute('position', new PosAttr(new Float32Array(verts), 3));
      const mat = new MatCtor({ color: 0x444444 });
      mat.wireframe = true;
      gridHelper = new firstMesh.constructor(geo, mat);
      gridHelper.name = 'KilnGridHelper';
      scene.add(gridHelper);
    } catch (err) {
      console.warn('Grid inject failed:', err);
      gridOn = false;
      document.getElementById('btn-grid').classList.remove('active');
    }
  } else if (gridHelper) {
    const s = getScene(mv);
    if (s) s.remove(gridHelper);
    gridHelper = null;
  }
}

function setScene(mode) {
  document.body.classList.remove('scene-studio', 'scene-void', 'scene-checker');
  document.body.classList.add('scene-' + mode);
  document.getElementById('btn-scene-studio').classList.toggle('active', mode === 'studio');
  document.getElementById('btn-scene-void').classList.toggle('active', mode === 'void');
  document.getElementById('btn-scene-checker').classList.toggle('active', mode === 'checker');
}

// Cycle through all 7 camera presets on a timer. Useful when capturing a
// screenshot sheet — the external tool can snap each view as it settles.
let _cycleTimer = null;
function cycleAllViews() {
  if (_cycleTimer) { clearInterval(_cycleTimer); _cycleTimer = null; return; }
  const order = ['front', 'right', 'back', 'left', 'top', 'bottom', 'three'];
  let i = 0;
  applyPreset(order[0]);
  _cycleTimer = setInterval(function() {
    i = (i + 1) % order.length;
    applyPreset(order[i]);
    if (i === 0) { clearInterval(_cycleTimer); _cycleTimer = null; }
  }, 1200);
}

function bumpExposure(delta) {
  const cur = parseFloat(mv.exposure) || 1;
  const next = Math.max(0.1, Math.min(3, cur + delta));
  mv.exposure = next;
  document.getElementById('exposure-val').textContent = next.toFixed(2);
}

// ---------------------------------------------------------------------------
// Metadata on load
// ---------------------------------------------------------------------------
function extractMetadata() {
  const scene = getScene(mv);
  if (!scene) return;

  let tris = 0;
  const mats = new Set();
  let meshCount = 0;
  const bbMin = { x: Infinity, y: Infinity, z: Infinity };
  const bbMax = { x: -Infinity, y: -Infinity, z: -Infinity };

  if (typeof scene.updateMatrixWorld === 'function') scene.updateMatrixWorld(true);
  scene.traverse(function(n) {
    if (!n.isMesh || !n.geometry) return;
    meshCount++;
    const idx = n.geometry.index;
    if (idx) tris += idx.count / 3;
    else {
      const pos = n.geometry.getAttribute('position');
      if (pos) tris += pos.count / 3;
    }
    const m = n.material;
    if (Array.isArray(m)) m.forEach(function(x) { mats.add(x); });
    else if (m) mats.add(m);

    // World-space bbox
    const pos = n.geometry.getAttribute('position');
    if (!pos) return;
    const mat = n.matrixWorld.elements;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const wx = mat[0]*x + mat[4]*y + mat[8]*z  + mat[12];
      const wy = mat[1]*x + mat[5]*y + mat[9]*z  + mat[13];
      const wz = mat[2]*x + mat[6]*y + mat[10]*z + mat[14];
      if (wx < bbMin.x) bbMin.x = wx; if (wx > bbMax.x) bbMax.x = wx;
      if (wy < bbMin.y) bbMin.y = wy; if (wy > bbMax.y) bbMax.y = wy;
      if (wz < bbMin.z) bbMin.z = wz; if (wz > bbMax.z) bbMax.z = wz;
    }
  });

  document.getElementById('m-tris').textContent = Math.floor(tris).toLocaleString();
  document.getElementById('m-mats').textContent = mats.size;
  document.getElementById('m-meshes').textContent = meshCount;
  document.getElementById('m-bbx').textContent = (bbMax.x - bbMin.x).toFixed(3);
  document.getElementById('m-bby').textContent = (bbMax.y - bbMin.y).toFixed(3);
  document.getElementById('m-bbz').textContent = (bbMax.z - bbMin.z).toFixed(3);
}

mv.addEventListener('load', extractMetadata);
// Guard against event-registration races: poll until scene is available.
let _metaTries = 0;
const _metaPoll = setInterval(function() {
  const scene = getScene(mv);
  let hasMesh = false;
  if (scene && typeof scene.traverse === 'function') {
    scene.traverse(function(n){ if (n.isMesh) hasMesh = true; });
  }
  if (hasMesh) {
    extractMetadata();
    clearInterval(_metaPoll);
  } else if (++_metaTries > 40) {
    clearInterval(_metaPoll);
  }
}, 150);

// ---------------------------------------------------------------------------
// Keyboard shortcuts
// ---------------------------------------------------------------------------
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') { window.location.href = '/gallery'; return; }
  if (e.key === '1') applyPreset('front');
  if (e.key === '2') applyPreset('back');
  if (e.key === '3') applyPreset('right');
  if (e.key === '4') applyPreset('left');
  if (e.key === '5') applyPreset('top');
  if (e.key === '6') applyPreset('bottom');
  if (e.key === '7') applyPreset('three');
  if (e.key === 'w' || e.key === 'W') toggleWireframe();
  if (e.key === 'r' || e.key === 'R') toggleRotate();
  if (e.key === 's' || e.key === 'S') toggleShadow();
  if (e.key === 'c' || e.key === 'C') cycleAllViews();
  if (e.key === 'b' || e.key === 'B') setScene('studio');
  if (e.key === 'n' || e.key === 'N') setScene('void');
  if (e.key === 'm' || e.key === 'M') setScene('checker');
  if (e.key === '+' || e.key === '=') bumpExposure(0.25);
  if (e.key === '-' || e.key === '_') bumpExposure(-0.25);
});
</script>
</body>
</html>`;
}

const GALLERY_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pixel Forge - Asset Gallery</title>
<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #e0e0e0; }
  header { background: #111; border-bottom: 1px solid #333; padding: 16px 24px; display: flex; align-items: center; gap: 16px; }
  header h1 { font-size: 20px; font-weight: 600; }
  header .count { color: #888; font-size: 14px; }
  .filters { padding: 12px 24px; background: #111; border-bottom: 1px solid #222; display: flex; gap: 8px; flex-wrap: wrap; }
  .filters button { padding: 6px 14px; border: 1px solid #333; border-radius: 6px; background: #1a1a1a; color: #ccc; cursor: pointer; font-size: 13px; }
  .filters button.active { background: #2563eb; border-color: #2563eb; color: white; }
  .filters button:hover { border-color: #555; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(480px, 1fr)); gap: 20px; padding: 24px; padding-bottom: 60px; }
  .card { background: #151515; border: 1px solid #262626; border-radius: 10px; overflow: hidden; }
  .card-header { padding: 12px 16px; border-bottom: 1px solid #222; display: flex; justify-content: space-between; align-items: center; }
  .card-header h3 { font-size: 15px; font-weight: 500; }
  .card-header .category { font-size: 12px; color: #666; background: #1a1a1a; padding: 2px 8px; border-radius: 4px; }
  .comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: #222; }
  .comparison .panel { background: #0a0a0a; position: relative; }
  .comparison .panel img { width: 100%; height: auto; display: block; }
  .comparison .panel .label { position: absolute; top: 8px; left: 8px; font-size: 11px; padding: 2px 8px; border-radius: 4px; }
  .label.raw { background: rgba(220, 38, 38, 0.8); }
  .label.clean { background: rgba(34, 197, 94, 0.8); }
  .label.glb { background: rgba(139, 92, 246, 0.8); }
  .card-footer { padding: 8px 16px; font-size: 12px; color: #666; display: flex; justify-content: space-between; }
  .checkerboard { background-image: linear-gradient(45deg, #1a1a1a 25%, transparent 25%), linear-gradient(-45deg, #1a1a1a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a1a 75%), linear-gradient(-45deg, transparent 75%, #1a1a1a 75%); background-size: 16px 16px; background-position: 0 0, 0 8px, 8px -8px, -8px 0px; }
  .single img { width: 100%; height: auto; display: block; }
  .single { position: relative; }
  .tiled-preview { position: relative; overflow: hidden; background-color: #0a0a0a; }
  .tiled-toggle { position: absolute; top: 8px; right: 8px; padding: 4px 10px; background: rgba(37,99,235,0.85); color: white; border: none; border-radius: 4px; font-size: 11px; cursor: pointer; z-index: 2; }
  .empty { padding: 60px; text-align: center; color: #555; font-size: 16px; }
  .status-bar { padding: 8px 24px; background: #0d0d0d; border-top: 1px solid #222; font-size: 12px; color: #555; position: fixed; bottom: 0; width: 100%; z-index: 5; }

  /* GLB model viewer */
  .glb-viewer { position: relative; background: #0d0d0d; }
  .glb-viewer model-viewer { width: 100%; height: 320px; --poster-color: transparent; }
  .glb-viewer .expand-btn { position: absolute; top: 8px; right: 8px; padding: 4px 10px; background: rgba(139,92,246,0.85); color: white; border: none; border-radius: 4px; font-size: 11px; cursor: pointer; z-index: 2; }
  .glb-viewer .expand-btn:hover { background: rgba(139,92,246,1); }
  .glb-viewer .wireframe-btn { position: absolute; top: 8px; right: 80px; padding: 4px 10px; background: rgba(55,65,81,0.85); color: white; border: none; border-radius: 4px; font-size: 11px; cursor: pointer; z-index: 2; }
  .glb-viewer .wireframe-btn:hover { background: rgba(55,65,81,1); }
  .glb-viewer .wireframe-btn.active { background: rgba(234,179,8,0.95); color: #111; font-weight: 600; }
  .glb-meta { position: absolute; top: 8px; left: 8px; z-index: 2; display: flex; gap: 4px; flex-wrap: wrap; }
  .glb-meta .badge { font-size: 10px; padding: 2px 6px; border-radius: 3px; background: rgba(0,0,0,0.65); color: #ddd; font-family: ui-monospace, monospace; }
  .glb-meta .badge.tris { color: #86efac; }
  .glb-meta .badge.mats { color: #93c5fd; }
  .glb-meta .badge.size { color: #fcd34d; }

  /* Expand button for images */
  .expand-img-btn { position: absolute; top: 8px; right: 8px; padding: 4px 10px; background: rgba(37,99,235,0.85); color: white; border: none; border-radius: 4px; font-size: 11px; cursor: pointer; z-index: 2; }
  .expand-img-btn:hover { background: rgba(37,99,235,1); }

  /* Fullscreen modal */
  .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.92); z-index: 100; align-items: center; justify-content: center; }
  .modal-overlay.active { display: flex; }
  .modal-content { position: relative; width: 90vw; height: 90vh; max-width: 1400px; background: #111; border: 1px solid #333; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
  .modal-header { padding: 12px 20px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
  .modal-header h2 { font-size: 16px; font-weight: 500; }
  .modal-close { padding: 6px 14px; background: #1a1a1a; border: 1px solid #444; border-radius: 6px; color: #ccc; cursor: pointer; font-size: 13px; }
  .modal-close:hover { border-color: #666; background: #222; }
  .modal-body { flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .modal-body model-viewer { width: 100%; height: 100%; }
  .modal-body img { max-width: 100%; max-height: 100%; object-fit: contain; image-rendering: pixelated; }

  @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } .comparison { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<header>
  <h1>Asset Gallery</h1>
  <span class="count" id="count">Loading...</span>
  <button onclick="loadAssets()" style="margin-left:auto; padding:6px 14px; background:#1a1a1a; border:1px solid #333; border-radius:6px; color:#ccc; cursor:pointer;">Refresh</button>
</header>
<div class="filters" id="filters"></div>
<div class="grid" id="grid"></div>
<div class="status-bar" id="status">Scanning war-assets/...</div>

<!-- Fullscreen modal -->
<div class="modal-overlay" id="modal" onclick="closeModal(event)">
  <div class="modal-content" onclick="event.stopPropagation()">
    <div class="modal-header">
      <h2 id="modal-title">Asset</h2>
      <button class="modal-close" onclick="closeModal()">Close (Esc)</button>
    </div>
    <div class="modal-body" id="modal-body"></div>
  </div>
</div>

<script>
let allAssets = [];
let activeFilter = 'all';

async function loadAssets() {
  const resp = await fetch('/gallery/api/assets');
  const data = await resp.json();
  allAssets = data.assets;
  document.getElementById('count').textContent = data.total + ' assets in ' + data.dir;
  document.getElementById('status').textContent = 'Last scan: ' + new Date().toLocaleTimeString() + ' | ' + data.total + ' assets';
  buildFilters();
  renderGrid();
}

function buildFilters() {
  // Pin 'all' first, then 'vehicles' (combined virtual filter), then the
  // vehicle subcategories, then 'validation', then the rest alphabetical.
  // The 'vehicles' pill is virtual — it matches any category starting
  // with 'vehicles/'.
  const raw = [...new Set(allAssets.map(a => a.category).filter(Boolean))];
  const vehicleSubs = raw.filter(c => c && c.startsWith('vehicles/')).sort();
  const hasVehicles = vehicleSubs.length > 0;
  const hasValidation = raw.includes('validation');
  const pinnedSet = new Set([...vehicleSubs, 'validation', 'vehicles']);
  const rest = raw.filter(c => c && !pinnedSet.has(c)).sort();
  const cats = [
    'all',
    ...(hasVehicles ? ['vehicles'] : []),
    ...vehicleSubs,
    ...(hasValidation ? ['validation'] : []),
    ...rest,
  ];
  const container = document.getElementById('filters');
  container.innerHTML = '';
  for (const cat of cats) {
    const btn = document.createElement('button');
    if (cat === 'all') btn.textContent = 'All';
    else if (cat === 'vehicles') btn.textContent = 'Vehicles (all)';
    else btn.textContent = cat;
    btn.className = cat === activeFilter ? 'active' : '';
    btn.onclick = () => { activeFilter = cat; buildFilters(); renderGrid(); };
    container.appendChild(btn);
  }
}

function formatSize(bytes) {
  if (!bytes) return '-';
  if (bytes < 1024) return bytes + ' B';
  return (bytes / 1024).toFixed(0) + ' KB';
}

function isTexture(asset) {
  return asset.category === 'textures' || asset.name.includes('texture') || asset.name.includes('floor') || asset.name.includes('trail');
}

function isGlbAsset(asset) {
  return (asset.cleanPath || '').endsWith('.glb') || (asset.rawPath || '').endsWith('.glb');
}

function showTiled(id, cols) {
  var single = document.getElementById('ts-' + id);
  var wrap = document.getElementById('tw-' + id);
  var src = single.querySelector('img').src;
  single.style.display = 'none';
  wrap.style.display = 'block';
  var pct = (100 / cols) + '%';
  wrap.style.backgroundImage = 'url(' + src + ')';
  wrap.style.backgroundSize = pct + ' ' + pct;
  wrap.style.backgroundRepeat = 'repeat';
  wrap.style.imageRendering = 'pixelated';
  wrap.style.height = '480px';
}

function showSingle(id) {
  document.getElementById('tw-' + id).style.display = 'none';
  document.getElementById('ts-' + id).style.display = 'block';
}

// ---------------------------------------------------------------------------
// GLB metadata + wireframe toggle (Wave 2.5a quick wins)
//
// model-viewer exposes its internal Three.js scene via .model once loaded.
// We traverse to count tris + unique materials and stamp badges on the card,
// and we can flip material.wireframe on all meshes for the wireframe toggle.
// ---------------------------------------------------------------------------

function onGlbLoad(mv, badgeId) {
  // model-viewer's internal Three.js object is exposed through .model.
  // Guard against hot-swap races by bailing if .model is gone by the time
  // this handler runs.
  const scene = mv.model;
  if (!scene) return;
  let tris = 0;
  const mats = new Set();
  scene.traverse(function(node) {
    if (node && node.isMesh && node.geometry) {
      const idx = node.geometry.index;
      if (idx) tris += idx.count / 3;
      else {
        const pos = node.geometry.getAttribute('position');
        if (pos) tris += pos.count / 3;
      }
      const m = node.material;
      if (Array.isArray(m)) m.forEach(function(x) { mats.add(x); });
      else if (m) mats.add(m);
    }
  });
  const badge = document.getElementById(badgeId);
  if (badge) {
    badge.innerHTML =
      '<span class="badge glb">GLB</span>' +
      '<span class="badge tris">' + Math.floor(tris).toLocaleString() + ' tris</span>' +
      '<span class="badge mats">' + mats.size + ' mat' + (mats.size === 1 ? '' : 's') + '</span>';
  }
}

// Pre-baked LineSegments edge overlays: built once per model on first toggle,
// flipped via .visible thereafter. See the inspector page for the same
// pattern. Avoids material.wireframe mutation cost.
let _galleryThreePromise = null;
function loadGalleryThree() {
  if (!_galleryThreePromise) {
    _galleryThreePromise = import('https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.js');
  }
  return _galleryThreePromise;
}

async function buildGridEdgeOverlay(mv) {
  if (!mv || !mv.model || mv.model.userData.kilnEdgeOverlayBuilt) return true;
  let T;
  try { T = await loadGalleryThree(); } catch (e) { console.warn('three.js load failed:', e); return false; }
  const mat = new T.LineBasicMaterial({ color: 0xffd54a });
  mv.model.traverse(function(n) {
    if (!n.isMesh || !n.geometry) return;
    if (n.userData.kilnEdgeOverlayHost) return;
    const edges = new T.EdgesGeometry(n.geometry, 30);
    const seg = new T.LineSegments(edges, mat);
    seg.userData.kilnEdgeOverlay = true;
    seg.visible = false;
    seg.renderOrder = 999;
    n.userData.kilnEdgeOverlayHost = true;
    n.add(seg);
  });
  mv.model.userData.kilnEdgeOverlayBuilt = true;
  return true;
}

async function toggleWireframe(btnEl, mvSelector) {
  const mv = document.querySelector(mvSelector);
  if (!mv || !mv.model) return;
  const on = !btnEl.classList.contains('active');
  btnEl.classList.toggle('active', on);
  btnEl.textContent = on ? 'Wireframe ON' : 'Wireframe';

  const ok = await buildGridEdgeOverlay(mv);
  if (ok) {
    mv.model.traverse(function(n) {
      if (n.userData && n.userData.kilnEdgeOverlay) n.visible = on;
    });
    return;
  }

  // Fallback to legacy material.wireframe mutation.
  mv.model.traverse(function(node) {
    if (node && node.isMesh) {
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach(function(m) { if (m) m.wireframe = on; });
    }
  });
}

// Fullscreen modal — supports W (wireframe toggle) + Esc (close) in-modal.
let modalWireframe = false;

function openModalGlb(src, name) {
  modalWireframe = false;
  document.getElementById('modal-title').textContent = name;
  document.getElementById('modal-body').innerHTML =
    '<model-viewer id="modal-mv" src="' + src + '" alt="' + name + '" camera-controls auto-rotate shadow-intensity="1" environment-image="neutral" style="width:100%;height:100%;background:#0d0d0d;"></model-viewer>';
  document.getElementById('modal').classList.add('active');
}

function openModalImg(src, name) {
  document.getElementById('modal-title').textContent = name;
  document.getElementById('modal-body').innerHTML =
    '<img src="' + src + '" alt="' + name + '" style="max-width:100%;max-height:100%;object-fit:contain;">';
  document.getElementById('modal').classList.add('active');
}

function closeModal(e) {
  if (e && e.target && e.target !== document.getElementById('modal')) return;
  document.getElementById('modal').classList.remove('active');
  document.getElementById('modal-body').innerHTML = '';
}

document.addEventListener('keydown', async function(e) {
  if (e.key === 'Escape') closeModal();
  // 'w' toggles wireframe on the fullscreen model, if any.
  if ((e.key === 'w' || e.key === 'W') && document.getElementById('modal').classList.contains('active')) {
    const mv = document.getElementById('modal-mv');
    if (!mv || !mv.model) return;
    modalWireframe = !modalWireframe;
    const ok = await buildGridEdgeOverlay(mv);
    if (ok) {
      mv.model.traverse(function(n) {
        if (n.userData && n.userData.kilnEdgeOverlay) n.visible = modalWireframe;
      });
      return;
    }
    mv.model.traverse(function(node) {
      if (node && node.isMesh) {
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        mats.forEach(function(m) { if (m) m.wireframe = modalWireframe; });
      }
    });
  }
});

var texId = 0;

function renderGrid() {
  var container = document.getElementById('grid');
  var filtered;
  if (activeFilter === 'all') {
    filtered = allAssets;
  } else if (activeFilter === 'vehicles') {
    // Virtual category: match any subcategory starting with 'vehicles/',
    // but exclude underscore-prefixed siblings (e.g. '_bonus-aircraft')
    // so the in-game review fleet stays clean. Bonus content is reachable
    // via its own pinned pill.
    filtered = allAssets.filter(function(a) {
      if (!a.category || a.category.indexOf('vehicles/') !== 0) return false;
      var sub = a.category.slice('vehicles/'.length);
      return sub.length > 0 && sub.charAt(0) !== '_';
    });
  } else {
    filtered = allAssets.filter(function(a) { return a.category === activeFilter; });
  }

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty">No assets found. Generate some with the API or scripts.</div>';
    return;
  }

  texId = 0;
  container.innerHTML = filtered.map(function(asset) {
    var hasRaw = !!asset.rawPath;
    var hasClean = !!asset.cleanPath;
    var isGlb = isGlbAsset(asset);
    var isTex = isTexture(asset);
    var imgPath = asset.cleanPath || asset.rawPath;

    var body;
    if (isGlb) {
      var glbSrc = '/gallery/file/' + imgPath;
      var inspectUrl = '/gallery/view/' + imgPath;
      var mvId = 'mv-' + asset.name.replace(/[^a-zA-Z0-9]/g, '');
      var badgeId = 'badge-' + mvId;
      body = '<div class="glb-viewer">' +
        '<div class="glb-meta" id="' + badgeId + '"><span class="badge glb">GLB</span></div>' +
        '<button class="wireframe-btn" onclick="toggleWireframe(this, \\'#' + mvId + '\\')">Wireframe</button>' +
        '<a class="expand-btn" href="' + inspectUrl + '" target="_blank" style="text-decoration:none;display:inline-block;">Inspect</a>' +
        '<model-viewer id="' + mvId + '" src="' + glbSrc + '" alt="' + asset.name + '" camera-controls auto-rotate shadow-intensity="1" environment-image="neutral" loading="lazy" onload="onGlbLoad(this, \\'' + badgeId + '\\')" style="width:100%;height:320px;background:#0d0d0d;"></model-viewer>' +
        '</div>';
    } else if (isTex && imgPath) {
      var tid = texId++;
      body = '<div class="single" id="ts-' + tid + '">' +
        '<span class="label clean" style="position:absolute;top:8px;left:8px;">Texture</span>' +
        '<button class="expand-img-btn" onclick="openModalImg(\\'/gallery/file/' + imgPath + '\\', \\'' + asset.name.replace(/'/g, '') + '\\')">Expand</button>' +
        '<img src="/gallery/file/' + imgPath + '" loading="lazy" style="width:100%;display:block;image-rendering:pixelated;">' +
        '</div>' +
        '<div class="tiled-preview" id="tw-' + tid + '" style="display:none;"><button class="tiled-toggle" onclick="showSingle(' + tid + ')">Back to Single</button></div>' +
        '<div style="padding:6px 12px;border-top:1px solid #222;display:flex;gap:6px;">' +
        '<button onclick="showTiled(' + tid + ',3)" style="padding:4px 10px;background:#1a1a1a;border:1px solid #333;border-radius:4px;color:#ccc;cursor:pointer;font-size:11px;">3x3</button>' +
        '<button onclick="showTiled(' + tid + ',5)" style="padding:4px 10px;background:#1a1a1a;border:1px solid #333;border-radius:4px;color:#ccc;cursor:pointer;font-size:11px;">5x5</button>' +
        '<button onclick="showTiled(' + tid + ',8)" style="padding:4px 10px;background:#1a1a1a;border:1px solid #333;border-radius:4px;color:#ccc;cursor:pointer;font-size:11px;">8x8</button>' +
        '</div>';
    } else if (hasRaw && hasClean) {
      body = '<div class="comparison" style="position:relative;">' +
        '<button class="expand-img-btn" onclick="openModalImg(\\'/gallery/file/' + asset.cleanPath + '\\', \\'' + asset.name.replace(/'/g, '') + '\\')">Expand</button>' +
        '<div class="panel"><span class="label raw">Raw</span><img src="/gallery/file/' + asset.rawPath + '" loading="lazy"></div>' +
        '<div class="panel checkerboard"><span class="label clean">Clean</span><img src="/gallery/file/' + asset.cleanPath + '" loading="lazy"></div>' +
        '</div>';
    } else if (hasClean) {
      body = '<div class="single checkerboard">' +
        '<span class="label clean" style="position:absolute;top:8px;left:8px;">Clean</span>' +
        '<button class="expand-img-btn" onclick="openModalImg(\\'/gallery/file/' + asset.cleanPath + '\\', \\'' + asset.name.replace(/'/g, '') + '\\')">Expand</button>' +
        '<img src="/gallery/file/' + asset.cleanPath + '" loading="lazy">' +
        '</div>';
    } else if (hasRaw) {
      body = '<div class="single">' +
        '<span class="label raw" style="position:absolute;top:8px;left:8px;">Raw</span>' +
        '<button class="expand-img-btn" onclick="openModalImg(\\'/gallery/file/' + asset.rawPath + '\\', \\'' + asset.name.replace(/'/g, '') + '\\')">Expand</button>' +
        '<img src="/gallery/file/' + asset.rawPath + '" loading="lazy">' +
        '</div>';
    }

    return '<div class="card">' +
      '<div class="card-header"><h3>' + asset.name + '</h3><span class="category">' + asset.category + '</span></div>' +
      body +
      '<div class="card-footer"><span>Raw: ' + formatSize(asset.rawSize) + ' | Clean: ' + formatSize(asset.cleanSize) + '</span><span>' + new Date(asset.modified).toLocaleString() + '</span></div>' +
      '</div>';
  }).join('');
}

loadAssets();
// Auto-refresh every 30s
setInterval(loadAssets, 30000);
</script>
</body>
</html>`;

export { galleryRouter };
