/**
 * Local W2/W3 animated imposter review runner.
 *
 * Writes only under tmp/animated-imposter-review/. Run through tsx because the
 * Playwright imposter harness is more reliable there on Windows.
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { kiln } from '@pixel-forge/core';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(REPO_ROOT, 'tmp/animated-imposter-review');
const SOURCE_GLB = resolve(
  REPO_ROOT,
  '../../soldier-research/downloads/polypizza/PpLF4rt4ah__Character_Soldier_-_Free_Model_By_Quaternius.glb',
);

const ATLAS_NAME = 'animated-albedo-packed.png';
const META_NAME = 'animated-imposter.json';
const FRAME_STRIP_NAME = 'animated-frame-strip.png';

if (!existsSync(SOURCE_GLB)) {
  throw new Error(`Source GLB not found: ${SOURCE_GLB}`);
}

if (!OUT_DIR.startsWith(resolve(REPO_ROOT, 'tmp'))) {
  throw new Error(`Refusing to write review output outside tmp/: ${OUT_DIR}`);
}

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

const sourceRel = toPortablePath(relative(REPO_ROOT, SOURCE_GLB));
const outRel = toPortablePath(relative(REPO_ROOT, OUT_DIR));

console.log('Animated imposter review bake');
console.log(`source: ${sourceRel}`);
console.log(`out: ${outRel}`);

const bakeOptions = {
  clipTargets: ['running'] as const,
  viewGrid: { x: 6, y: 6 },
  tileSize: 96,
  framesPerClip: 8,
  textureLayout: 'atlas' as const,
  colorUri: ATLAS_NAME,
  sourcePath: sourceRel,
};

const first = await kiln.bakeAnimatedImposter(SOURCE_GLB, bakeOptions);
const second = await kiln.bakeAnimatedImposter(SOURCE_GLB, bakeOptions);

const atlasPath = resolve(OUT_DIR, ATLAS_NAME);
const metaPath = resolve(OUT_DIR, META_NAME);
const stripPath = resolve(OUT_DIR, FRAME_STRIP_NAME);
writeFileSync(atlasPath, first.atlas);
writeFileSync(metaPath, JSON.stringify(first.meta, null, 2), 'utf-8');

for (let i = 0; i < first.frameAtlases.length; i++) {
  writeFileSync(resolve(OUT_DIR, `frame-${String(i).padStart(3, '0')}.png`), first.frameAtlases[i]!);
}

await writeFrameStrip(first.frameAtlases, stripPath);

const atlasHash = sha256(first.atlas);
const repeatHash = sha256(second.atlas);
const alpha = await alphaCoverage(first.frameAtlases);
const sidecar = kiln.AnimatedImposterMetaSchema.safeParse(first.meta);
const summary = {
  source: sourceRel,
  outputDir: outRel,
  atlas: ATLAS_NAME,
  sidecar: META_NAME,
  frameStrip: FRAME_STRIP_NAME,
  atlasHash,
  repeatHash,
  deterministic: atlasHash === repeatHash,
  sidecarValid: sidecar.success,
  frameCount: first.frameAtlases.length,
  frameAtlas: first.frameAtlas,
  viewGrid: first.meta.view.grid,
  tileSize: first.meta.view.tileSize,
  alphaCoverage: alpha,
  storage: first.meta.storage,
  warnings: first.meta.validation.warnings,
};

writeFileSync(resolve(OUT_DIR, 'review-summary.json'), JSON.stringify(summary, null, 2), 'utf-8');
writeFileSync(resolve(OUT_DIR, 'index.html'), buildReviewHtml(summary), 'utf-8');

if (!summary.sidecarValid) {
  throw new Error('Animated imposter sidecar failed schema validation');
}
if (!summary.deterministic) {
  throw new Error('Animated imposter repeat bake produced a different atlas hash');
}
if (alpha.min <= 0) {
  throw new Error('Animated imposter bake produced at least one blank frame atlas');
}

console.log(`atlas: ${toPortablePath(relative(REPO_ROOT, atlasPath))}`);
console.log(`sidecar: ${toPortablePath(relative(REPO_ROOT, metaPath))}`);
console.log(`review: ${toPortablePath(relative(REPO_ROOT, resolve(OUT_DIR, 'index.html')))}`);
console.log(`frames: ${summary.frameCount}`);
console.log(`deterministic: ${summary.deterministic}`);
console.log(`min alpha coverage: ${alpha.min.toFixed(4)}`);

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

function toPortablePath(input: string): string {
  return input.replace(/\\/g, '/');
}

async function writeFrameStrip(frames: Buffer[], outPath: string): Promise<void> {
  const thumb = 288;
  const inputs = await Promise.all(
    frames.map((frame) =>
      sharp(frame)
        .resize(thumb, thumb, { fit: 'fill', kernel: 'nearest' })
        .png()
        .toBuffer(),
    ),
  );
  const composites = inputs.map((input, idx) => ({ input, left: idx * thumb, top: 0 }));
  await sharp({
    create: {
      width: thumb * frames.length,
      height: thumb,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toFile(outPath);
}

async function alphaCoverage(frames: Buffer[]): Promise<{ min: number; max: number; perFrame: number[] }> {
  const perFrame: number[] = [];
  for (const frame of frames) {
    const { data, info } = await sharp(frame)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let alphaPixels = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i]! > 0) alphaPixels++;
    }
    perFrame.push(alphaPixels / (info.width * info.height));
  }
  return {
    min: Math.min(...perFrame),
    max: Math.max(...perFrame),
    perFrame,
  };
}

function buildReviewHtml(summary: {
  source: string;
  atlas: string;
  sidecar: string;
  frameStrip: string;
  atlasHash: string;
  deterministic: boolean;
  sidecarValid: boolean;
  frameCount: number;
  frameAtlas: { width: number; height: number; framesX: number; framesY: number };
  viewGrid: { x: number; y: number; count: number };
  tileSize: number;
  alphaCoverage: { min: number; max: number; perFrame: number[] };
  storage: { totalRawBytes: number; envelopeBytes: number; fitsEnvelope: boolean };
  warnings: unknown[];
}): string {
  const { width, height, framesX } = summary.frameAtlas;
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Animated Imposter Review</title>
  <style>
    body { margin: 24px; font-family: ui-sans-serif, system-ui, sans-serif; background: #101214; color: #e8ecef; }
    main { max-width: 1180px; margin: 0 auto; }
    h1 { font-size: 28px; margin: 0 0 16px; }
    h2 { font-size: 18px; margin: 28px 0 10px; }
    dl { display: grid; grid-template-columns: 180px 1fr; gap: 8px 16px; background: #181c20; padding: 16px; border: 1px solid #2b333a; }
    dt { color: #9aa7b3; }
    dd { margin: 0; overflow-wrap: anywhere; }
    .ok { color: #7bd88f; }
    .bad { color: #ff7b72; }
    .stage { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
    canvas, img { max-width: 100%; background: #050607; border: 1px solid #2b333a; image-rendering: auto; }
    #scene { width: 100%; aspect-ratio: 16 / 9; }
    pre { white-space: pre-wrap; background: #181c20; padding: 16px; border: 1px solid #2b333a; overflow: auto; }
  </style>
</head>
<body>
<main>
  <h1>Animated Imposter Review</h1>
  <dl>
    <dt>Source</dt><dd>${summary.source}</dd>
    <dt>Sidecar</dt><dd>${summary.sidecar}</dd>
    <dt>Frames</dt><dd>${summary.frameCount} packed as ${summary.frameAtlas.framesX}x${summary.frameAtlas.framesY}</dd>
    <dt>Deterministic</dt><dd class="${summary.deterministic ? 'ok' : 'bad'}">${summary.deterministic}</dd>
    <dt>Sidecar Schema</dt><dd class="${summary.sidecarValid ? 'ok' : 'bad'}">${summary.sidecarValid}</dd>
    <dt>Raw Storage</dt><dd class="${summary.storage.fitsEnvelope ? 'ok' : 'bad'}">${summary.storage.totalRawBytes} / ${summary.storage.envelopeBytes} bytes</dd>
    <dt>Alpha Coverage</dt><dd>${summary.alphaCoverage.min.toFixed(4)} min, ${summary.alphaCoverage.max.toFixed(4)} max</dd>
    <dt>Atlas Hash</dt><dd>${summary.atlasHash}</dd>
  </dl>

  <h2>Moving Camera Scene Probe</h2>
  <canvas id="scene" width="960" height="540"></canvas>

  <h2>Animated Frame Playback</h2>
  <canvas id="anim" width="${width}" height="${height}"></canvas>

  <h2>Frame Strip</h2>
  <img src="${summary.frameStrip}" alt="Animated frame strip">

  <h2>Packed Atlas</h2>
  <img src="${summary.atlas}" alt="Packed animated atlas">

  <h2>Warnings</h2>
  <pre>${JSON.stringify(summary.warnings, null, 2)}</pre>
</main>
<script>
const img = new Image();
img.src = '${summary.atlas}';
const animCanvas = document.getElementById('anim');
const animCtx = animCanvas.getContext('2d');
const sceneCanvas = document.getElementById('scene');
const sceneCtx = sceneCanvas.getContext('2d');
const layerWidth = ${width};
const layerHeight = ${height};
const framesX = ${framesX};
const frameCount = ${summary.frameCount};
const gridX = ${summary.viewGrid.x};
const gridY = ${summary.viewGrid.y};
const tileSize = ${summary.tileSize};
const viewDirs = buildViewDirs(gridX, gridY);
const horizonViewDirs = viewDirs.filter((candidate) => Math.abs(candidate.dir[1]) < 0.001);
const crowd = buildCrowd(80);
let reviewFrame = 0;
let lastReviewTick = 0;
let camera = { x: -18, y: 9.5, z: -26, targetX: 0, targetZ: 0, nextRetarget: 0 };

function animate(now) {
  if (!img.complete) return requestAnimationFrame(animate);
  drawAnimatedFrame(now);
  drawScene(now / 1000);
  requestAnimationFrame(animate);
}

function drawAnimatedFrame(now) {
  if (now - lastReviewTick > 120) {
    reviewFrame = (reviewFrame + 1) % frameCount;
    lastReviewTick = now;
  }
  drawLayer(animCtx, reviewFrame, 0, 0, animCanvas.width, animCanvas.height);
}

function drawScene(t) {
  updateCamera(t);
  const widthPx = sceneCanvas.width;
  const heightPx = sceneCanvas.height;
  sceneCtx.clearRect(0, 0, widthPx, heightPx);
  drawScenePane(0, 0, widthPx, heightPx, t, 'candidate');
}

function drawScenePane(originX, originY, widthPx, heightPx, t, mode) {
  const yaw = Math.atan2(camera.targetX - camera.x, camera.targetZ - camera.z);
  const forwardX = Math.sin(yaw);
  const forwardZ = Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);
  const focal = 470;
  sceneCtx.save();
  sceneCtx.beginPath();
  sceneCtx.rect(originX, originY, widthPx, heightPx);
  sceneCtx.clip();
  sceneCtx.translate(originX, originY);
  drawGround(sceneCtx, widthPx, heightPx, t);

  const visible = [];
  for (const agent of crowd) {
    const dx = agent.x - camera.x;
    const dz = agent.z - camera.z;
    const depth = dx * forwardX + dz * forwardZ + 36;
    if (depth <= 8 || depth > 88) continue;
    const side = dx * rightX + dz * rightZ;
    const screenX = widthPx * 0.5 + (side * focal) / depth;
    const baseY = heightPx * 0.52 + (9.5 * focal) / depth;
    const size = Math.max(16, Math.min(84, (2.8 * focal) / depth));
    if (screenX < -size || screenX > widthPx + size || baseY < -size || baseY > heightPx + size) continue;
    visible.push({ agent, depth, screenX, baseY, size });
  }

  visible.sort((a, b) => b.depth - a.depth);
  for (const item of visible) {
    const frame = Math.floor((t * 8 + item.agent.frameOffset) % frameCount);
    const tile = chooseViewTile(camera, item.agent, mode);
    drawTile(sceneCtx, frame, tile, item.screenX - item.size * 0.5, item.baseY - item.size, item.size, item.size);
  }

  sceneCtx.fillStyle = 'rgba(232,236,239,0.72)';
  sceneCtx.font = '12px ui-sans-serif, system-ui, sans-serif';
  sceneCtx.fillText('upright cylinder + spherical cap: ' + visible.length + ' visible', 16, 24);
  sceneCtx.restore();
}

function drawGround(ctx, widthPx, heightPx, t) {
  const gradient = ctx.createLinearGradient(0, 0, 0, heightPx);
  gradient.addColorStop(0, '#11191c');
  gradient.addColorStop(1, '#080a09');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, widthPx, heightPx);
  ctx.strokeStyle = 'rgba(98, 124, 101, 0.20)';
  ctx.lineWidth = 1;
  const drift = (t * 16) % 44;
  for (let y = heightPx * 0.52 + drift; y < heightPx; y += 44) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(widthPx, y);
    ctx.stroke();
  }
  for (let x = -widthPx; x < widthPx * 2; x += 58) {
    ctx.beginPath();
    ctx.moveTo(x, heightPx);
    ctx.lineTo(widthPx * 0.5 + (x - widthPx * 0.5) * 0.22, heightPx * 0.52);
    ctx.stroke();
  }
}

function drawLayer(ctx, frame, dx, dy, dw, dh) {
  const sx = (frame % framesX) * layerWidth;
  const sy = Math.floor(frame / framesX) * layerHeight;
  ctx.clearRect(dx, dy, dw, dh);
  ctx.drawImage(img, sx, sy, layerWidth, layerHeight, dx, dy, dw, dh);
}

function drawTile(ctx, frame, tile, dx, dy, dw, dh) {
  const frameX = (frame % framesX) * layerWidth;
  const frameY = Math.floor(frame / framesX) * layerHeight;
  const sx = frameX + tile.i * tileSize;
  const sy = frameY + tile.j * tileSize;
  ctx.drawImage(img, sx, sy, tileSize, tileSize, dx, dy, dw, dh);
}

function updateCamera(t) {
  if (t > camera.nextRetarget) {
    camera.targetX = Math.sin(t * 1.37) * 20 + Math.cos(t * 0.41) * 9;
    camera.targetZ = Math.cos(t * 1.11) * 20 + Math.sin(t * 0.53) * 9;
    camera.nextRetarget = t + 2.8 + (Math.sin(t * 2.1) + 1) * 1.4;
  }
  camera.x += (camera.targetX - camera.x) * 0.012;
  camera.z += (camera.targetZ - camera.z) * 0.012;
}

function chooseViewTile(cameraPos, agent, mode) {
  const worldX = cameraPos.x - agent.x;
  const worldY = cameraPos.y - agent.y;
  const worldZ = cameraPos.z - agent.z;
  const local = mode === 'candidate'
    ? rotateIntoActorLocal(worldX, worldZ, agent.yaw)
    : { x: worldX, z: worldZ };
  const cameraHeight = 9.5;
  const sample = mode === 'candidate'
    ? candidateViewVector(local.x, worldY, local.z, agent.viewYaw)
    : { vector: { x: local.x, y: cameraHeight, z: local.z }, release: 1 };
  const view = sample.vector;
  const len = Math.hypot(view.x, view.y, view.z) || 1;
  const dir = [view.x / len, view.y / len, view.z / len];
  const candidates = mode === 'candidate' && sample.release < 0.5 ? horizonViewDirs : viewDirs;
  let best = candidates[0];
  let bestDot = -Infinity;
  for (const candidate of candidates) {
    const dot = candidate.dir[0] * dir[0] + candidate.dir[1] * dir[1] + candidate.dir[2] * dir[2];
    if (dot > bestDot) {
      bestDot = dot;
      best = candidate;
    }
  }
  return best;
}

function candidateViewVector(localX, worldY, localZ, stableYaw) {
  const horizontal = Math.hypot(localX, localZ);
  const elevation = Math.atan2(worldY, Math.max(horizontal, 0.001));
  const angleRelease = smoothstep(degToRad(35), degToRad(70), Math.abs(elevation));
  const heightRelease = smoothstep(18, 45, Math.abs(worldY));
  const release = angleRelease * heightRelease;
  const locked = { x: Math.cos(stableYaw), y: 0, z: Math.sin(stableYaw) };
  const actualLen = Math.hypot(localX, worldY, localZ) || 1;
  const actual = { x: localX / actualLen, y: worldY / actualLen, z: localZ / actualLen };
  const vector = normalizeVec3({
    x: lerp(locked.x, actual.x, release),
    y: lerp(locked.y, actual.y, release),
    z: lerp(locked.z, actual.z, release),
  });
  return { vector, release };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

function normalizeVec3(v) {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function rotateIntoActorLocal(worldX, worldZ, yaw) {
  const cos = Math.cos(-yaw);
  const sin = Math.sin(-yaw);
  return {
    x: worldX * cos - worldZ * sin,
    z: worldX * sin + worldZ * cos,
  };
}

function buildCrowd(count) {
  let seed = 12345;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: count }, () => ({
    x: (next() - 0.5) * 64,
    y: next() < 0.08 ? (next() - 0.5) * 18 : 0,
    z: (next() - 0.5) * 64,
    frameOffset: next() * frameCount,
    yaw: next() * Math.PI * 2,
    viewYaw: next() * Math.PI * 2,
  }));
}

function buildViewDirs(xCount, yCount) {
  const out = [];
  for (let j = 0; j < yCount; j++) {
    for (let i = 0; i < xCount; i++) {
      const u = ((i + 0.5) / xCount) * 2 - 1;
      const v = 1 - ((j + 0.5) / yCount) * 2;
      out.push({ i, j, dir: octaDecode(u, v) });
    }
  }
  return out;
}

function octaDecode(u, v) {
  let x = u;
  const y = 1 - Math.abs(u) - Math.abs(v);
  let z = v;
  if (y < 0) {
    const oldX = x;
    x = (1 - Math.abs(z)) * Math.sign(oldX || 1);
    z = (1 - Math.abs(oldX)) * Math.sign(z || 1);
  }
  const len = Math.hypot(x, y, z) || 1;
  return [x / len, y / len, z / len];
}

requestAnimationFrame(animate);
</script>
</body>
</html>`;
}
