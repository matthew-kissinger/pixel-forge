/**
 * Local W2/W3 animated imposter review runner.
 *
 * Writes only under tmp/animated-imposter-review/. Run through tsx because the
 * Playwright imposter harness is more reliable there on Windows.
 */

import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { kiln } from '@pixel-forge/core';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUT_DIR = resolve(REPO_ROOT, 'tmp/animated-imposter-review/tij-character-pack-v1/nva/walk_fight_forward');
const DEFAULT_SOURCE_GLB = resolve(
  REPO_ROOT,
  'tmp/source-glb-selection/derived/tij-character-pack-v1/factions/nva/walk_fight_forward.glb',
);
const DEFAULT_WEAPON_ID = 'ak47';
const DEFAULT_WEAPON_GLB = resolve(REPO_ROOT, 'tmp/weapon-rig-lab/weapons/ak47.glb');
const DEFAULT_FALLBACK_RAW_CLIP = 'Armature|Walk_Fight_Forward|baselayer';

const ATLAS_NAME = 'animated-albedo-packed.png';
const META_NAME = 'animated-imposter.json';
const FRAME_STRIP_NAME = 'animated-frame-strip.png';
const SOURCE_COPY_NAME = 'source.glb';
const WEAPON_COPY_NAME = 'weapon-ak47.glb';
const CLIP_TARGETS = ['idle', 'walking', 'running', 'shoot', 'death'] as const;
type ClipTarget = (typeof CLIP_TARGETS)[number];

const AK47_ATTACHMENT = {
  id: DEFAULT_WEAPON_ID,
  kind: 'weapon' as const,
  glb: DEFAULT_WEAPON_GLB,
  sourcePath: toPortablePath(relative(REPO_ROOT, DEFAULT_WEAPON_GLB)),
  lengthMeters: 0.9,
  gripNames: ['Mesh_PistolGrip', 'Mesh_TriggerGuardBot', 'Mesh_Receiver'],
  supportNames: ['Mesh_LowerHandguard', 'Mesh_UpperHandguard', 'Mesh_GasTube', 'Mesh_Barrel'],
  muzzleNames: ['Mesh_MuzzleBrake', 'Mesh_FrontSightPost', 'Mesh_Barrel'],
  stockNames: ['Mesh_ButtPad', 'Mesh_Stock', 'Mesh_StockComb'],
  pitchTrimDeg: 5,
  forwardHold: 0.11,
  gripOffset: 0,
  socketMode: 'shouldered-forward' as const,
};

const args = parseArgs(process.argv.slice(2));
const SOURCE_GLB = resolveFromRepo(args.source ?? DEFAULT_SOURCE_GLB);
const OUT_DIR = resolveFromRepo(args.outDir ?? DEFAULT_OUT_DIR);
const clipTarget = parseClipTarget(args.clip ?? 'shoot');
const fallbackRawName = args.fallback ?? DEFAULT_FALLBACK_RAW_CLIP;
const viewGrid = parseGrid(args.grid ?? '7x7');
const tileSize = parsePositiveInt(args.tileSize ?? '96', 'tile-size');
const framesPerClip = parsePositiveInt(args.frames ?? '8', 'frames');
const includeWeapon = args.weapon !== 'none';

if (!existsSync(SOURCE_GLB)) {
  throw new Error(`Source GLB not found: ${SOURCE_GLB}`);
}
if (includeWeapon && !existsSync(DEFAULT_WEAPON_GLB)) {
  throw new Error(`Weapon GLB not found: ${DEFAULT_WEAPON_GLB}`);
}

if (!OUT_DIR.startsWith(resolve(REPO_ROOT, 'tmp'))) {
  throw new Error(`Refusing to write review output outside tmp/: ${OUT_DIR}`);
}

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });
copyFileSync(SOURCE_GLB, resolve(OUT_DIR, SOURCE_COPY_NAME));
if (includeWeapon) copyFileSync(DEFAULT_WEAPON_GLB, resolve(OUT_DIR, WEAPON_COPY_NAME));

const sourceRel = toPortablePath(relative(REPO_ROOT, SOURCE_GLB));
const outRel = toPortablePath(relative(REPO_ROOT, OUT_DIR));

console.log('Animated imposter review bake');
console.log(`source: ${sourceRel}`);
console.log(`out: ${outRel}`);
console.log(`clip: ${clipTarget}${fallbackRawName ? ` via ${fallbackRawName}` : ''}`);
console.log(`weapon: ${includeWeapon ? DEFAULT_WEAPON_ID : 'none'}`);

const bakeOptions = {
  clipTargets: [clipTarget],
  clipFallbacks: fallbackRawName ? [{ target: clipTarget, rawName: fallbackRawName }] : [],
  viewGrid,
  tileSize,
  framesPerClip,
  textureLayout: 'atlas' as const,
  colorUri: ATLAS_NAME,
  sourcePath: sourceRel,
  attachments: includeWeapon ? [AK47_ATTACHMENT] : [],
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
  sourceGlb: SOURCE_COPY_NAME,
  weapon: includeWeapon
    ? {
        id: DEFAULT_WEAPON_ID,
        source: AK47_ATTACHMENT.sourcePath,
        glb: WEAPON_COPY_NAME,
        lengthMeters: AK47_ATTACHMENT.lengthMeters,
        socketMode: AK47_ATTACHMENT.socketMode,
        gripNames: AK47_ATTACHMENT.gripNames,
        supportNames: AK47_ATTACHMENT.supportNames,
        muzzleNames: AK47_ATTACHMENT.muzzleNames,
        stockNames: AK47_ATTACHMENT.stockNames,
        pitchTrimDeg: AK47_ATTACHMENT.pitchTrimDeg,
        forwardHold: AK47_ATTACHMENT.forwardHold,
        gripOffset: AK47_ATTACHMENT.gripOffset,
      }
    : null,
  outputDir: outRel,
  clipTarget,
  fallbackRawName,
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
  sourceClipRawName: first.meta.clips[0]?.rawName ?? null,
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

function parseArgs(argv: string[]): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq >= 0) {
      out[toCamel(arg.slice(2, eq))] = arg.slice(eq + 1);
    } else {
      out[toCamel(arg.slice(2))] = argv[i + 1];
      i++;
    }
  }
  return out;
}

function toCamel(input: string): string {
  return input.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}

function resolveFromRepo(input: string): string {
  return resolve(REPO_ROOT, input);
}

function parseClipTarget(input: string): ClipTarget {
  if ((CLIP_TARGETS as readonly string[]).includes(input)) return input as ClipTarget;
  throw new Error(`Invalid --clip=${input}. Expected one of ${CLIP_TARGETS.join(', ')}.`);
}

function parseGrid(input: string): { x: number; y: number } {
  const [xRaw, yRaw] = input.toLowerCase().split('x');
  const x = parsePositiveInt(xRaw ?? '', 'grid x');
  const y = parsePositiveInt(yRaw ?? '', 'grid y');
  return { x, y };
}

function parsePositiveInt(input: string, label: string): number {
  const value = Number(input);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid ${label}: ${input}`);
  }
  return value;
}

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
  sourceGlb: string;
  weapon: {
    id: string;
    source: string;
    glb: string;
    lengthMeters: number;
    socketMode: string;
    gripNames: string[];
    supportNames: string[];
    muzzleNames: string[];
    stockNames: string[];
    pitchTrimDeg: number;
    forwardHold: number;
    gripOffset: number;
  } | null;
  clipTarget: string;
  fallbackRawName?: string;
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
  sourceClipRawName: string | null;
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
  <script type="importmap">
  {
    "imports": {
      "three": "https://unpkg.com/three@0.184.0/build/three.module.js",
      "three/addons/": "https://unpkg.com/three@0.184.0/examples/jsm/"
    }
  }
  </script>
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
    .stage, .compare { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
    figure { margin: 0; }
    figcaption { color: #9aa7b3; font-size: 12px; margin-top: 8px; }
    .note { margin: 14px 0 0; color: #c7d0d9; background: #15191d; border: 1px solid #2b333a; padding: 12px 14px; }
    canvas, img { max-width: 100%; background: #050607; border: 1px solid #2b333a; image-rendering: auto; }
    #scene { width: 100%; aspect-ratio: 16 / 9; }
    #sourceScene, #imposterCompare { width: 100%; aspect-ratio: 1 / 1; }
    pre { white-space: pre-wrap; background: #181c20; padding: 16px; border: 1px solid #2b333a; overflow: auto; }
  </style>
</head>
<body>
<main>
  <h1>Animated Imposter Review</h1>
  <dl>
    <dt>Source</dt><dd>${summary.source}</dd>
    <dt>Weapon</dt><dd>${summary.weapon ? `${summary.weapon.id} (${summary.weapon.source})` : 'none'}</dd>
    <dt>Clip Target</dt><dd>${summary.clipTarget}</dd>
    <dt>Source Clip</dt><dd>${summary.sourceClipRawName ?? 'unresolved'}</dd>
    <dt>Raw Fallback</dt><dd>${summary.fallbackRawName ?? 'none'}</dd>
    <dt>Sidecar</dt><dd>${summary.sidecar}</dd>
    <dt>Frames</dt><dd>${summary.frameCount} packed as ${summary.frameAtlas.framesX}x${summary.frameAtlas.framesY}</dd>
    <dt>Deterministic</dt><dd class="${summary.deterministic ? 'ok' : 'bad'}">${summary.deterministic}</dd>
    <dt>Sidecar Schema</dt><dd class="${summary.sidecarValid ? 'ok' : 'bad'}">${summary.sidecarValid}</dd>
    <dt>Raw Storage</dt><dd class="${summary.storage.fitsEnvelope ? 'ok' : 'bad'}">${summary.storage.totalRawBytes} / ${summary.storage.envelopeBytes} bytes</dd>
    <dt>Alpha Coverage</dt><dd>${summary.alphaCoverage.min.toFixed(4)} min, ${summary.alphaCoverage.max.toFixed(4)} max</dd>
    <dt>Atlas Hash</dt><dd>${summary.atlasHash}</dd>
  </dl>
  <p class="note">This review intentionally magnifies a ${summary.tileSize}px debug tile in the close comparison. The source panel is frame-locked to the same bake frame and weapon/arm solve. The pixelated look is expected at this proof setting; gameplay inspection should focus on the moving camera probe and the storage/readability tradeoff before increasing tile size. This proof uses a 7x7 grid so head-on reads have a centered front column without crossfading duplicate silhouettes.</p>

  <h2>Source vs Impostor</h2>
  <div class="compare">
    <figure>
      <canvas id="sourceScene" width="540" height="540"></canvas>
      <figcaption>Source GLB playing the resolved source clip${summary.weapon ? ' with the review weapon attached' : ''}.</figcaption>
    </figure>
    <figure>
      <canvas id="imposterCompare" width="540" height="540"></canvas>
      <figcaption>Single ${summary.tileSize}px impostor view tile magnified from the packed atlas.</figcaption>
    </figure>
  </div>

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
const impostorCompareCanvas = document.getElementById('imposterCompare');
const impostorCompareCtx = impostorCompareCanvas.getContext('2d');
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
  drawImpostorCompare(now);
  drawScene(now / 1000);
  requestAnimationFrame(animate);
}

function drawAnimatedFrame(now) {
  if (now - lastReviewTick > 120) {
    reviewFrame = (reviewFrame + 1) % frameCount;
    lastReviewTick = now;
  }
  window.__animatedImposterReviewFrame = reviewFrame;
  drawLayer(animCtx, reviewFrame, 0, 0, animCanvas.width, animCanvas.height);
}

function drawImpostorCompare(now) {
  if (now - lastReviewTick > 120) return;
  impostorCompareCtx.clearRect(0, 0, impostorCompareCanvas.width, impostorCompareCanvas.height);
  const tile = bestTileForDirection([0, 0, 1]);
  drawTile(
    impostorCompareCtx,
    reviewFrame,
    tile,
    impostorCompareCanvas.width * 0.2,
    impostorCompareCanvas.height * 0.08,
    impostorCompareCanvas.width * 0.6,
    impostorCompareCanvas.height * 0.78,
  );
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
  const candidates = mode === 'candidate' && sample.release < 0.5 && horizonViewDirs.length ? horizonViewDirs : viewDirs;
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

function bestTileForDirection(dir) {
  const len = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  const norm = [dir[0] / len, dir[1] / len, dir[2] / len];
  let best = viewDirs[0];
  let bestDot = -Infinity;
  for (const candidate of viewDirs) {
    const dot = candidate.dir[0] * norm[0] + candidate.dir[1] * norm[1] + candidate.dir[2] * norm[2];
    if (dot > bestDot) {
      bestDot = dot;
      best = candidate;
    }
  }
  return best;
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
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const sourceCanvas = document.getElementById('sourceScene');
const sourceRenderer = new THREE.WebGLRenderer({ canvas: sourceCanvas, antialias: true, alpha: true });
sourceRenderer.setClearColor(0x050607, 1);
const sourceScene = new THREE.Scene();
const sourceCamera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
sourceCamera.position.set(0, 1.35, 4.2);
sourceScene.add(new THREE.HemisphereLight(0xdde8d5, 0x263026, 2.2));
const key = new THREE.DirectionalLight(0xffffff, 1.2);
key.position.set(2.2, 3.2, 3.6);
sourceScene.add(key);
const loader = new GLTFLoader();
const sourceWeaponConfig = ${JSON.stringify(summary.weapon)};
const sourceWeaponPivot = new THREE.Group();
sourceScene.add(sourceWeaponPivot);
let sourceMixer = null;
let sourceClip = null;
let sourceClipDuration = 1;
let sourceRoot = null;
let sourceWeapon = null;
let sourceBones = {};
let sourceRootMotionBase = null;

loader.load('${summary.sourceGlb}', (gltf) => {
  sourceRoot = gltf.scene;
  sourceScene.add(sourceRoot);
  collectSourceBones(sourceRoot);
  const box = new THREE.Box3().setFromObject(sourceRoot);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  sourceRoot.position.sub(center);
  sourceRoot.position.y += size.y * 0.5;
  sourceRoot.rotation.y = 0;
  sourceCamera.position.set(0, Math.max(1.1, size.y * 0.72), Math.max(3.1, size.y * 2.35));
  sourceCamera.lookAt(0, size.y * 0.52, 0);
  const sourceClipRawName = ${JSON.stringify(summary.sourceClipRawName)};
  const clip = gltf.animations.find((candidate) => candidate.name === sourceClipRawName) ?? gltf.animations[0];
  if (clip) {
    sourceClip = clip;
    sourceClipDuration = clip.duration || 1;
    sourceMixer = new THREE.AnimationMixer(sourceRoot);
    const action = sourceMixer.clipAction(clip);
    action.reset();
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.play();
    sourceMixer.setTime(0);
    sourceRoot.updateMatrixWorld(true);
    sourceRootMotionBase = sourceBones.Hips ? sourceBones.Hips.position.clone() : null;
  }
  if (sourceWeaponConfig) {
    loader.load(sourceWeaponConfig.glb, (weaponGltf) => {
      sourceWeapon = weaponGltf.scene;
      normalizeSourceWeapon(sourceWeapon, sourceWeaponConfig);
      sourceWeaponPivot.add(sourceWeapon);
      updateSourceWeaponSocket();
    });
  }
});

function renderSource() {
  const frame = window.__animatedImposterReviewFrame || 0;
  if (sourceMixer && sourceClip) {
    sourceMixer.setTime((sourceClipDuration * (frame / ${summary.frameCount})) % sourceClipDuration);
    lockSourceRootMotion();
    sourceRoot.updateMatrixWorld(true);
    updateSourceWeaponSocket();
  }
  sourceRenderer.render(sourceScene, sourceCamera);
  requestAnimationFrame(renderSource);
}
requestAnimationFrame(renderSource);

function collectSourceBones(root) {
  sourceBones = {};
  root.traverse((node) => {
    if (node.isBone) sourceBones[node.name] = node;
  });
}

function sourceWorldPosition(name) {
  const bone = sourceBones[name];
  if (!bone) return null;
  return bone.getWorldPosition(new THREE.Vector3());
}

function findSourceNamed(root, names = []) {
  for (const name of names) {
    let found = null;
    root.traverse((node) => {
      if (!found && node.name === name) found = node;
    });
    if (found) return found;
  }
  return null;
}

function sourceCenterOfObject(root, object) {
  if (!object) return null;
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return null;
  const center = box.getCenter(new THREE.Vector3());
  return root.worldToLocal(center.clone());
}

function normalizeSourceWeapon(root, weapon) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const long = Math.max(size.x, size.y, size.z) || 1;
  const scale = (weapon.lengthMeters || 0.9) / long;
  root.scale.setScalar(scale);
  const gripObject = findSourceNamed(root, weapon.gripNames || []);
  const supportObject = findSourceNamed(root, weapon.supportNames || []);
  const muzzleObject = findSourceNamed(root, weapon.muzzleNames || []);
  const stockObject = findSourceNamed(root, weapon.stockNames || []);
  const grip = sourceCenterOfObject(root, gripObject) || new THREE.Vector3(0, 0, 0);
  const support = sourceCenterOfObject(root, supportObject);
  const muzzle = sourceCenterOfObject(root, muzzleObject);
  const stock = sourceCenterOfObject(root, stockObject);
  const muzzleDirection = muzzle ? muzzle.clone().sub(grip) : new THREE.Vector3(1, 0, 0);
  const alignment = muzzleDirection.lengthSq() > 0.0001
    ? new THREE.Quaternion().setFromUnitVectors(muzzleDirection.normalize(), new THREE.Vector3(1, 0, 0))
    : new THREE.Quaternion();
  root.quaternion.copy(alignment);
  const transformLocal = (point) => point.clone().multiplyScalar(scale).applyQuaternion(root.quaternion);
  const transformedGrip = transformLocal(grip);
  root.position.copy(transformedGrip.multiplyScalar(-1));
  root.userData.stockOffset = stock
    ? transformLocal(stock).sub(transformLocal(grip))
    : new THREE.Vector3(-0.28, 0.04, 0);
  root.userData.supportOffset = support
    ? transformLocal(support).sub(transformLocal(grip))
    : new THREE.Vector3(0.28, 0.02, 0);
  root.updateMatrixWorld(true);
}

function sourceRootForward() {
  const q = sourceRoot.getWorldQuaternion(new THREE.Quaternion());
  return new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize();
}

function sourceBodyForward() {
  const hips = sourceBones.Hips || sourceBones.Spine || sourceRoot;
  const q = hips.getWorldQuaternion(new THREE.Quaternion());
  return new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize();
}

function lockSourceRootMotion() {
  if (!sourceRootMotionBase || !sourceBones.Hips) return;
  sourceBones.Hips.position.x = sourceRootMotionBase.x;
  sourceBones.Hips.position.z = sourceRootMotionBase.z;
}

const sourceBoneUp = new THREE.Vector3(0, 1, 0);

function setSourceBoneDirectionWorld(bone, directionWorld) {
  if (!bone?.parent) return;
  const direction = directionWorld.clone().normalize();
  if (direction.lengthSq() < 0.0001) return;
  const parentInv = bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
  const targetLocal = direction.applyQuaternion(parentInv).normalize();
  bone.quaternion.setFromUnitVectors(sourceBoneUp, targetLocal);
  bone.updateMatrixWorld(true);
}

function solveSourceArmToTarget(side, target, axes) {
  const upper = sourceBones[side + 'Arm'];
  const fore = sourceBones[side + 'ForeArm'];
  const hand = sourceBones[side + 'Hand'];
  if (!upper || !fore || !hand || !target) return;

  sourceRoot.updateMatrixWorld(true);
  const shoulder = upper.getWorldPosition(new THREE.Vector3());
  const elbowNow = fore.getWorldPosition(new THREE.Vector3());
  const handNow = hand.getWorldPosition(new THREE.Vector3());
  const upperLength = Math.max(0.001, shoulder.distanceTo(elbowNow));
  const foreLength = Math.max(0.001, elbowNow.distanceTo(handNow));
  const reach = Math.max(0.08, upperLength + foreLength - 0.025);
  const targetVector = target.clone().sub(shoulder);
  const distance = targetVector.length();
  if (distance < 0.001) return;

  const direction = targetVector.clone().normalize();
  const clampedTarget = distance > reach
    ? shoulder.clone().add(direction.clone().multiplyScalar(reach))
    : target.clone();
  const clampedDistance = Math.min(distance, reach);
  const sideSign = side === 'Right' ? 1 : -1;
  const pole = shoulder.clone()
    .add(axes.cleanUp.clone().multiplyScalar(-0.24))
    .add(axes.actorRight.clone().multiplyScalar(0.22 * sideSign))
    .add(axes.forward.clone().multiplyScalar(0.04));
  let planeNormal = direction.clone().cross(pole.clone().sub(shoulder)).normalize();
  if (planeNormal.lengthSq() < 0.0001) planeNormal = axes.actorRight.clone().multiplyScalar(sideSign);
  const bendDirection = planeNormal.clone().cross(direction).normalize();
  const along = (upperLength * upperLength - foreLength * foreLength + clampedDistance * clampedDistance) / (2 * clampedDistance);
  const height = Math.sqrt(Math.max(0, upperLength * upperLength - along * along));
  const elbow = shoulder.clone()
    .add(direction.clone().multiplyScalar(along))
    .add(bendDirection.multiplyScalar(height));

  setSourceBoneDirectionWorld(upper, elbow.clone().sub(shoulder));
  sourceRoot.updateMatrixWorld(true);
  const elbowWorld = fore.getWorldPosition(new THREE.Vector3());
  setSourceBoneDirectionWorld(fore, clampedTarget.clone().sub(elbowWorld));
  sourceRoot.updateMatrixWorld(true);
}

function updateSourceWeaponSocket() {
  if (!sourceRoot || !sourceWeapon || !sourceWeaponConfig) return;
  const right = sourceWorldPosition('RightHand');
  const leftShoulder = sourceWorldPosition('LeftArm') || sourceWorldPosition('LeftShoulder');
  const rightShoulder = sourceWorldPosition('RightArm') || sourceWorldPosition('RightShoulder');
  if (!right) return;
  const up = new THREE.Vector3(0, 1, 0);
  const travelForward = sourceRootForward();
  travelForward.y = 0;
  if (travelForward.lengthSq() < 0.0001) travelForward.set(0, 0, 1);
  travelForward.normalize();
  const torsoForward = sourceBodyForward();
  torsoForward.y = 0;
  if (torsoForward.lengthSq() < 0.0001) torsoForward.set(0, 0, 1);
  torsoForward.normalize();
  const forward = sourceWeaponConfig.socketMode === 'shouldered-forward' ? travelForward : torsoForward;
  forward.y = 0;
  let actorRight = new THREE.Vector3().crossVectors(forward, up).normalize();
  if (leftShoulder && rightShoulder) {
    const shoulderSpan = rightShoulder.clone().sub(leftShoulder);
    shoulderSpan.y = 0;
    if (shoulderSpan.lengthSq() > 0.0001) {
      shoulderSpan.normalize();
      if (shoulderSpan.dot(actorRight) < 0) shoulderSpan.multiplyScalar(-1);
      actorRight = shoulderSpan;
    }
  }
  const cleanUp = new THREE.Vector3().crossVectors(actorRight, forward).normalize();
  sourceWeaponPivot.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(forward, cleanUp, actorRight));
  if (sourceWeaponConfig.pitchTrimDeg) sourceWeaponPivot.rotateZ(THREE.MathUtils.degToRad(sourceWeaponConfig.pitchTrimDeg));
  const shoulder = rightShoulder || right;
  const shoulderCenter = leftShoulder && rightShoulder
    ? leftShoulder.clone().lerp(rightShoulder, 0.5)
    : shoulder.clone().sub(actorRight.clone().multiplyScalar(0.12));
  const shoulderPocket = shoulder.clone()
    .lerp(shoulderCenter, 0.42)
    .add(cleanUp.clone().multiplyScalar(-0.035));
  const stockOffset = sourceWeapon.userData.stockOffset instanceof THREE.Vector3
    ? sourceWeapon.userData.stockOffset.clone()
    : new THREE.Vector3(-0.28, 0.04, 0);
  const stockWorldOffset = stockOffset.applyQuaternion(sourceWeaponPivot.quaternion);
  const stockAnchoredGrip = shoulderPocket.clone()
    .add(forward.clone().multiplyScalar((sourceWeaponConfig.forwardHold ?? 0.06) + (sourceWeaponConfig.gripOffset || 0)))
    .sub(stockWorldOffset);
  sourceWeaponPivot.position.copy(stockAnchoredGrip).add(actorRight.clone().multiplyScalar(0.006));

  const supportOffset = sourceWeapon.userData.supportOffset instanceof THREE.Vector3
    ? sourceWeapon.userData.supportOffset.clone()
    : new THREE.Vector3(0.28, 0.02, 0);
  const supportTarget = sourceWeaponPivot.position.clone().add(supportOffset.applyQuaternion(sourceWeaponPivot.quaternion));
  const gripTarget = sourceWeaponPivot.position.clone();
  const axes = { forward, cleanUp, actorRight };
  solveSourceArmToTarget('Right', gripTarget, axes);
  solveSourceArmToTarget('Left', supportTarget, axes);
  sourceRoot.updateMatrixWorld(true);
}
</script>
</body>
</html>`;
}
