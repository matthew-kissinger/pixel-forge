/**
 * Package the current TIJ NPC review pack as GLBs plus animated impostors.
 *
 * Writes only under tmp/. This is a review bundle, not a war-assets promotion.
 */

import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO, type Accessor, type Document } from '@gltf-transform/core';
import sharp from 'sharp';

import { kiln, type AnimatedClipTarget, type BakeAnimatedImposterOptions } from '@pixel-forge/core';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_SOURCE_MANIFEST = resolve(
  REPO_ROOT,
  'tmp/source-glb-selection/derived/tij-character-pack-v1/manifest.json',
);
const DEFAULT_OUT_DIR = resolve(REPO_ROOT, 'tmp/tij-npc-asset-package/tij-character-pack-v1');
const DEFAULT_GRID = '7x7';
const DEFAULT_TILE_SIZE = 96;
const DEFAULT_FRAMES = 8;
const ATLAS_NAME = 'animated-albedo-packed.png';
const META_NAME = 'animated-imposter.json';
const FRAME_STRIP_NAME = 'animated-frame-strip.png';

const ALL_CLIP_IDS = [
  'rest',
  'idle',
  'patrol_walk',
  'traverse_run',
  'advance_fire',
  'walk_fight_forward',
  'death_fall_back',
  'dead_pose',
] as const;

const USEFUL_CLIP_IDS = [
  'idle',
  'patrol_walk',
  'traverse_run',
  'walk_fight_forward',
  'death_fall_back',
  'dead_pose',
] as const;

type ClipId = (typeof ALL_CLIP_IDS)[number];

interface CharacterPackManifest {
  id: string;
  policy: {
    promoteToWarAssets: boolean;
    excludedClips: Array<{ id: string; reason: string }>;
  };
  socketContract: {
    rightHandBone: string;
    leftHandBone: string;
  };
  factions: Record<string, { label: string; headgear: string; primaryWeapon: string }>;
  clips: Array<{
    id: string;
    label: string;
    tijStates: string[];
    status: string;
    note: string;
  }>;
  outputs: Array<{
    faction: string;
    clip: string;
    label: string;
    path: string;
    bytes: number;
    tijStates: string[];
    status: string;
    primaryWeapon: string;
  }>;
}

interface PackagedNpcEntry {
  faction: string;
  factionLabel: string;
  clip: string;
  clipLabel: string;
  status: string;
  tijStates: string[];
  primaryWeapon: string;
  glb: {
    uri: string;
    bytes: number;
    hash: string;
  };
  impostor: {
    dir: string;
    sidecar: string;
    atlas: string;
    frameStrip: string;
    atlasHash: string;
    sidecarValid: boolean;
    alphaCoverage: {
      min: number;
      max: number;
      perFrame: number[];
    };
    storage: {
      colorBytes: number;
      totalRawBytes: number;
      envelopeBytes: number;
      fitsEnvelope: boolean;
    };
    warnings: unknown[];
  };
}

const CLIP_BAKE: Record<
  ClipId,
  {
    target: AnimatedClipTarget;
    rawName: string;
  }
> = {
  rest: { target: 'idle', rawName: 'Armature|clip0|baselayer' },
  idle: { target: 'idle', rawName: 'Armature|Idle|baselayer' },
  patrol_walk: { target: 'walking', rawName: 'Armature|walking_man|baselayer' },
  traverse_run: { target: 'running', rawName: 'Armature|running|baselayer' },
  advance_fire: { target: 'shoot', rawName: 'Armature|Run_and_Shoot|baselayer' },
  walk_fight_forward: { target: 'shoot', rawName: 'Armature|Walk_Fight_Forward|baselayer' },
  death_fall_back: { target: 'death', rawName: 'Armature|Shot_and_Fall_Backward|baselayer' },
  dead_pose: { target: 'death', rawName: 'Armature|Dead|baselayer' },
};

const WEAPONS = {
  m16a1: {
    id: 'm16a1',
    kind: 'weapon' as const,
    glb: resolve(REPO_ROOT, 'tmp/weapon-rig-lab/weapons/m16a1.glb'),
    sourcePath: 'weapons/m16a1.glb',
    lengthMeters: 0.99,
    gripNames: ['Joint_PistolGrip', 'Mesh_GripBody', 'Mesh_TriggerGuardBottom', 'Mesh_LowerReceiver'],
    supportNames: ['Mesh_HandguardBotL', 'Mesh_HandguardBotR', 'Mesh_HandguardTop', 'Mesh_DeltaRing'],
    muzzleNames: ['Mesh_FlashHider', 'Mesh_Barrel', 'Mesh_FrontSightPost'],
    stockNames: ['Mesh_StockButt', 'Mesh_Buttplate', 'Mesh_StockTube'],
    pitchTrimDeg: 5,
    forwardHold: 0.11,
    gripOffset: 0,
    socketMode: 'shouldered-forward' as const,
  },
  ak47: {
    id: 'ak47',
    kind: 'weapon' as const,
    glb: resolve(REPO_ROOT, 'tmp/weapon-rig-lab/weapons/ak47.glb'),
    sourcePath: 'weapons/ak47.glb',
    lengthMeters: 0.9,
    gripNames: ['Mesh_PistolGrip', 'Mesh_TriggerGuardBot', 'Mesh_Receiver'],
    supportNames: ['Mesh_LowerHandguard', 'Mesh_UpperHandguard', 'Mesh_GasTube', 'Mesh_Barrel'],
    muzzleNames: ['Mesh_MuzzleBrake', 'Mesh_FrontSightPost', 'Mesh_Barrel'],
    stockNames: ['Mesh_ButtPad', 'Mesh_Stock', 'Mesh_StockComb'],
    pitchTrimDeg: 5,
    forwardHold: 0.11,
    gripOffset: 0,
    socketMode: 'shouldered-forward' as const,
  },
} satisfies Record<string, NonNullable<BakeAnimatedImposterOptions['attachments']>[number]>;

const args = parseArgs(process.argv.slice(2));
const sourceManifestPath = resolveFromRepo(args.manifest ?? DEFAULT_SOURCE_MANIFEST);
const outDir = resolveFromRepo(args.outDir ?? DEFAULT_OUT_DIR);
const grid = parseGrid(args.grid ?? DEFAULT_GRID);
const tileSize = parsePositiveInt(args.tileSize ?? String(DEFAULT_TILE_SIZE), 'tile-size');
const framesPerClip = parsePositiveInt(args.frames ?? String(DEFAULT_FRAMES), 'frames');
const clipIds = parseClipIds(args.clips ?? 'all');
const limit = args.limit ? parsePositiveInt(args.limit, 'limit') : Number.POSITIVE_INFINITY;
const clean = args.clean !== 'false';

if (!sourceManifestPath.startsWith(REPO_ROOT)) {
  throw new Error(`Refusing to read manifest outside repo: ${sourceManifestPath}`);
}
if (!outDir.startsWith(resolve(REPO_ROOT, 'tmp'))) {
  throw new Error(`Refusing to write NPC package outside tmp/: ${outDir}`);
}

const sourceManifest = JSON.parse(readFileSync(sourceManifestPath, 'utf8')) as CharacterPackManifest;
const packValidation = await kiln.validateNpcCharacterPack(sourceManifest, {
  rootDir: REPO_ROOT,
  checkFiles: true,
  inspectGlbs: true,
  productionClipIds: [...USEFUL_CLIP_IDS],
});
if (!packValidation.ok) {
  throw new Error(`NPC character pack failed validation: ${packValidation.blockers.map((b) => b.message).join('; ')}`);
}

if (clean) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
mkdirSync(resolve(outDir, 'glb'), { recursive: true });
mkdirSync(resolve(outDir, 'impostors'), { recursive: true });
mkdirSync(resolve(outDir, 'weapons'), { recursive: true });

for (const weapon of Object.values(WEAPONS)) {
  if (!existsSync(weapon.glb)) throw new Error(`Weapon GLB not found: ${weapon.glb}`);
  copyFileSync(weapon.glb, resolve(outDir, weapon.sourcePath));
}

const selectedOutputs = sourceManifest.outputs
  .filter((output) => clipIds.has(output.clip as ClipId))
  .sort((a, b) => {
    const factionCompare = a.faction.localeCompare(b.faction);
    if (factionCompare !== 0) return factionCompare;
    return ALL_CLIP_IDS.indexOf(a.clip as ClipId) - ALL_CLIP_IDS.indexOf(b.clip as ClipId);
  })
  .slice(0, limit);
const outputByFactionClip = new Map(sourceManifest.outputs.map((output) => [`${output.faction}/${output.clip}`, output]));

console.log('TIJ NPC asset package');
console.log(`source manifest: ${toPortablePath(relative(REPO_ROOT, sourceManifestPath))}`);
console.log(`out: ${toPortablePath(relative(REPO_ROOT, outDir))}`);
console.log(`clips: ${[...clipIds].join(', ')}`);
console.log(`entries: ${selectedOutputs.length}`);
console.log(`settings: ${grid.x}x${grid.y}, tile=${tileSize}, frames=${framesPerClip}`);

const session = await kiln.openAnimatedImposterSession();
const entries: PackagedNpcEntry[] = [];
try {
  for (const [index, output] of selectedOutputs.entries()) {
    const clipId = output.clip as ClipId;
    const bake = CLIP_BAKE[clipId];
    const srcPath = resolve(REPO_ROOT, output.path);
    if (!existsSync(srcPath)) throw new Error(`Missing source GLB: ${srcPath}`);

    const factionDir = resolve(outDir, 'glb', output.faction);
    mkdirSync(factionDir, { recursive: true });
    const glbUri = `glb/${output.faction}/${clipId}.glb`;
    const glbPath = resolve(outDir, glbUri);
    copyFileSync(srcPath, glbPath);

    const weapon = WEAPONS[output.primaryWeapon as keyof typeof WEAPONS];
    if (!weapon) throw new Error(`No package weapon config for ${output.primaryWeapon}`);

    const impDirUri = `impostors/${output.faction}/${clipId}`;
    const impDir = resolve(outDir, impDirUri);
    mkdirSync(impDir, { recursive: true });
    const sourcePathForSidecar = glbUri;
    const colorUri = ATLAS_NAME;
    const opts: BakeAnimatedImposterOptions = {
      clipTargets: [bake.target],
      clipFallbacks: [{ target: bake.target, rawName: bake.rawName }],
      viewGrid: grid,
      tileSize,
      framesPerClip,
      textureLayout: 'atlas',
      colorUri,
      sourcePath: sourcePathForSidecar,
      attachments: [
        {
          ...weapon,
          glb: resolve(outDir, weapon.sourcePath),
        },
      ],
    };

    console.log(
      `[${index + 1}/${selectedOutputs.length}] ${output.faction}/${clipId} -> ${bake.target} via ${bake.rawName}`,
    );
    const result = await session.bake(glbPath, opts);
    const atlasPath = resolve(impDir, ATLAS_NAME);
    const metaPath = resolve(impDir, META_NAME);
    const stripPath = resolve(impDir, FRAME_STRIP_NAME);
    writeFileSync(atlasPath, result.atlas);
    writeFileSync(metaPath, JSON.stringify(result.meta, null, 2), 'utf-8');
    for (let frame = 0; frame < result.frameAtlases.length; frame++) {
      writeFileSync(resolve(impDir, `frame-${String(frame).padStart(3, '0')}.png`), result.frameAtlases[frame]!);
    }
    await writeFrameStrip(result.frameAtlases, stripPath);

    const sidecarValid = kiln.AnimatedImposterMetaSchema.safeParse(result.meta).success;
    const alpha = await alphaCoverage(result.frameAtlases);
    if (!sidecarValid) throw new Error(`Sidecar failed schema validation for ${output.faction}/${clipId}`);
    if (alpha.min <= 0) throw new Error(`Blank frame atlas detected for ${output.faction}/${clipId}`);

    const summary = {
      faction: output.faction,
      clip: clipId,
      label: output.label,
      status: output.status,
      tijStates: output.tijStates,
      primaryWeapon: output.primaryWeapon,
      glb: glbUri,
      impostorDir: impDirUri,
      clipTarget: bake.target,
      fallbackRawName: bake.rawName,
      atlasHash: sha256(result.atlas),
      sidecarValid,
      alphaCoverage: alpha,
      storage: result.meta.storage,
      warnings: result.meta.validation.warnings,
    };
    writeFileSync(resolve(impDir, 'review-summary.json'), JSON.stringify(summary, null, 2), 'utf-8');

    entries.push({
      faction: output.faction,
      factionLabel: sourceManifest.factions[output.faction]?.label ?? output.faction,
      clip: clipId,
      clipLabel: output.label,
      status: output.status,
      tijStates: output.tijStates,
      primaryWeapon: output.primaryWeapon,
      glb: {
        uri: glbUri,
        bytes: statSync(glbPath).size,
        hash: sha256(readFileSync(glbPath)),
      },
      impostor: {
        dir: impDirUri,
        sidecar: `${impDirUri}/${META_NAME}`,
        atlas: `${impDirUri}/${ATLAS_NAME}`,
        frameStrip: `${impDirUri}/${FRAME_STRIP_NAME}`,
        atlasHash: summary.atlasHash,
        sidecarValid,
        alphaCoverage: alpha,
        storage: result.meta.storage,
        warnings: result.meta.validation.warnings,
      },
    });
  }
} finally {
  await session.close();
}

const combinedGlbs = await buildCombinedFactionGlbs(sourceManifest, outDir, clipIds, outputByFactionClip);
const packageManifest = {
  schemaVersion: 1,
  id: sourceManifest.id,
  sourceManifest: toPortablePath(relative(outDir, sourceManifestPath)),
  generatedAt: new Date().toISOString(),
  promoteToWarAssets: false,
  note: 'Review-only package. Do not copy to war-assets or TIJ until human batch and runtime gates pass.',
  settings: {
    viewGrid: { ...grid, count: grid.x * grid.y },
    tileSize,
    framesPerClip,
    textureLayout: 'atlas',
    textureFormat: 'rgba8-debug',
  },
  socketContract: sourceManifest.socketContract,
  factions: sourceManifest.factions,
  clips: sourceManifest.clips,
  weapons: Object.fromEntries(
    Object.entries(WEAPONS).map(([id, weapon]) => [
      id,
      {
        uri: weapon.sourcePath,
        bytes: statSync(resolve(outDir, weapon.sourcePath)).size,
        hash: sha256(readFileSync(resolve(outDir, weapon.sourcePath))),
      },
    ]),
  ),
  combinedGlbs,
  entries,
  totals: {
    entries: entries.length,
    glbBytes: entries.reduce((sum, entry) => sum + entry.glb.bytes, 0),
    atlasPngBytes: entries.reduce((sum, entry) => sum + statSync(resolve(outDir, entry.impostor.atlas)).size, 0),
    rawImpostorBytes: entries.reduce((sum, entry) => sum + entry.impostor.storage.totalRawBytes, 0),
    warnings: entries.reduce((sum, entry) => sum + entry.impostor.warnings.length, 0),
  },
};

writeFileSync(resolve(outDir, 'npc-package-manifest.json'), JSON.stringify(packageManifest, null, 2), 'utf-8');
writeFileSync(resolve(outDir, 'index.html'), buildIndexHtml(packageManifest), 'utf-8');

console.log(`package manifest: ${toPortablePath(relative(REPO_ROOT, resolve(outDir, 'npc-package-manifest.json')))}`);
console.log(`review index: ${toPortablePath(relative(REPO_ROOT, resolve(outDir, 'index.html')))}`);
console.log(`raw impostor bytes: ${packageManifest.totals.rawImpostorBytes}`);
console.log(`warnings: ${packageManifest.totals.warnings}`);

function parseArgs(argv: string[]): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq >= 0) {
      out[toCamel(arg.slice(2, eq))] = arg.slice(eq + 1);
    } else {
      out[toCamel(arg.slice(2))] = argv[i + 1] ?? 'true';
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

function parseGrid(input: string): { x: number; y: number } {
  const [xRaw, yRaw] = input.toLowerCase().split('x');
  return {
    x: parsePositiveInt(xRaw ?? '', 'grid x'),
    y: parsePositiveInt(yRaw ?? '', 'grid y'),
  };
}

function parsePositiveInt(input: string, label: string): number {
  const value = Number(input);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`Invalid ${label}: ${input}`);
  return value;
}

function parseClipIds(input: string): Set<ClipId> {
  if (input === 'all') return new Set(ALL_CLIP_IDS);
  if (input === 'useful') return new Set(USEFUL_CLIP_IDS);
  const ids = input.split(',').map((part) => part.trim()).filter(Boolean);
  for (const id of ids) {
    if (!(ALL_CLIP_IDS as readonly string[]).includes(id)) {
      throw new Error(`Unknown clip id ${id}. Expected all, useful, or comma list from ${ALL_CLIP_IDS.join(', ')}`);
    }
  }
  return new Set(ids as ClipId[]);
}

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

function toPortablePath(path: string): string {
  return path.replace(/\\/g, '/');
}

async function alphaCoverage(pngs: Buffer[]): Promise<{ min: number; max: number; perFrame: number[] }> {
  const perFrame: number[] = [];
  for (const png of pngs) {
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let alphaPixels = 0;
    for (let i = 3; i < data.length; i += info.channels) {
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

async function writeFrameStrip(frames: Buffer[], outPath: string): Promise<void> {
  if (!frames.length) throw new Error('Cannot write frame strip with no frames');
  const first = await sharp(frames[0]!).metadata();
  const width = first.width ?? 1;
  const height = first.height ?? 1;
  const { framesX, framesY } = chooseFrameGrid(frames.length);
  await sharp({
    create: {
      width: width * framesX,
      height: height * framesY,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite(
      frames.map((input, frame) => ({
        input,
        left: (frame % framesX) * width,
        top: Math.floor(frame / framesX) * height,
      })),
    )
    .png()
    .toFile(outPath);
}

async function buildCombinedFactionGlbs(
  sourceManifest: CharacterPackManifest,
  outDir: string,
  clipIds: Set<ClipId>,
  outputByFactionClip: Map<string, CharacterPackManifest['outputs'][number]>,
): Promise<Record<string, { uri: string; bytes: number; hash: string; animations: string[] }>> {
  const io = new NodeIO();
  const out: Record<string, { uri: string; bytes: number; hash: string; animations: string[] }> = {};
  const combinedDir = resolve(outDir, 'glb-combined');
  mkdirSync(combinedDir, { recursive: true });

  for (const faction of Object.keys(sourceManifest.factions).sort()) {
    const baseOutput =
      outputByFactionClip.get(`${faction}/idle`) ??
      sourceManifest.outputs.find((output) => output.faction === faction && clipIds.has(output.clip as ClipId));
    if (!baseOutput) continue;

    const baseDoc = await io.read(resolve(REPO_ROOT, baseOutput.path));
    const buffer = baseDoc.getRoot().listBuffers()[0] ?? baseDoc.createBuffer('npc-animation-buffer');
    const nodeByName = new Map(baseDoc.getRoot().listNodes().map((node) => [node.getName(), node]));
    for (const anim of baseDoc.getRoot().listAnimations()) anim.dispose();

    const animationNames: string[] = [];
    for (const clipId of ALL_CLIP_IDS) {
      if (!clipIds.has(clipId)) continue;
      const output = outputByFactionClip.get(`${faction}/${clipId}`);
      if (!output) continue;
      const clipDoc = await io.read(resolve(REPO_ROOT, output.path));
      const sourceAnim = clipDoc.getRoot().listAnimations()[0];
      if (!sourceAnim) continue;
      const targetAnim = baseDoc.createAnimation(clipId);
      animationNames.push(clipId);
      for (const channel of sourceAnim.listChannels()) {
        const sourceSampler = channel.getSampler();
        const sourceTargetNode = channel.getTargetNode();
        const sourceTargetPath = channel.getTargetPath();
        const sourceInput = sourceSampler?.getInput();
        const sourceOutput = sourceSampler?.getOutput();
        if (!sourceSampler || !sourceTargetNode || !sourceTargetPath || !sourceInput || !sourceOutput) continue;
        const targetNode = nodeByName.get(sourceTargetNode.getName());
        if (!targetNode) continue;
        const input = cloneAccessor(baseDoc, buffer, sourceInput, `${clipId}_${sourceTargetNode.getName()}_${sourceTargetPath}_input`);
        const outputAcc = cloneAccessor(
          baseDoc,
          buffer,
          sourceOutput,
          `${clipId}_${sourceTargetNode.getName()}_${sourceTargetPath}_output`,
        );
        const sampler = baseDoc
          .createAnimationSampler(`${clipId}_${sourceTargetNode.getName()}_${sourceTargetPath}_sampler`)
          .setInput(input)
          .setOutput(outputAcc)
          .setInterpolation(sourceSampler.getInterpolation());
        const targetChannel = baseDoc
          .createAnimationChannel(`${clipId}_${sourceTargetNode.getName()}_${sourceTargetPath}_channel`)
          .setTargetNode(targetNode)
          .setTargetPath(sourceTargetPath)
          .setSampler(sampler);
        targetAnim.addSampler(sampler).addChannel(targetChannel);
      }
      if (!targetAnim.listChannels().length) targetAnim.dispose();
    }

    const uri = `glb-combined/${faction}.glb`;
    const path = resolve(outDir, uri);
    const bytes = Buffer.from(await io.writeBinary(baseDoc));
    writeFileSync(path, bytes);
    out[faction] = {
      uri,
      bytes: bytes.byteLength,
      hash: sha256(bytes),
      animations: animationNames,
    };
  }

  return out;
}

function cloneAccessor(doc: Document, buffer: ReturnType<Document['createBuffer']>, source: Accessor, name: string): Accessor {
  const array = source.getArray();
  if (!array) throw new Error(`Cannot clone sparse or empty accessor: ${source.getName()}`);
  const cloned = new (array.constructor as new (input: ArrayLike<number>) => typeof array)(array);
  return doc
    .createAccessor(name, buffer)
    .setType(source.getType())
    .setArray(cloned)
    .setNormalized(source.getNormalized());
}

function chooseFrameGrid(count: number): { framesX: number; framesY: number } {
  const framesX = Math.ceil(Math.sqrt(count));
  return { framesX, framesY: Math.ceil(count / framesX) };
}

function buildIndexHtml(manifest: {
  id: string;
  generatedAt: string;
  settings: { viewGrid: { x: number; y: number; count: number }; tileSize: number; framesPerClip: number };
  totals: { entries: number; glbBytes: number; atlasPngBytes: number; rawImpostorBytes: number; warnings: number };
  combinedGlbs?: Record<string, { uri: string; bytes: number; hash: string; animations: string[] }>;
  entries: PackagedNpcEntry[];
}): string {
  const combined = Object.entries(manifest.combinedGlbs ?? {})
    .map(
      ([faction, glb]) =>
        `<li><a href="${glb.uri}">${escapeHtml(faction)} combined GLB</a> - ${glb.animations.length} clips, ${glb.bytes.toLocaleString()} bytes</li>`,
    )
    .join('\n');
  const rows = manifest.entries
    .map(
      (entry) => `
      <tr>
        <td>${escapeHtml(entry.factionLabel)}<br><small>${escapeHtml(entry.faction)}</small></td>
        <td>${escapeHtml(entry.clip)}<br><small>${escapeHtml(entry.status)}</small></td>
        <td>${escapeHtml(entry.primaryWeapon)}</td>
        <td>${entry.impostor.storage.totalRawBytes.toLocaleString()} / ${entry.impostor.storage.envelopeBytes.toLocaleString()}</td>
        <td>${entry.impostor.alphaCoverage.min.toFixed(4)}</td>
        <td>${entry.impostor.warnings.length}</td>
        <td><a href="${entry.glb.uri}">GLB</a></td>
        <td><a href="${entry.impostor.sidecar}">sidecar</a></td>
        <td><img src="${entry.impostor.frameStrip}" alt="${escapeHtml(entry.faction)} ${escapeHtml(entry.clip)} frames"></td>
      </tr>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>TIJ NPC Asset Package</title>
  <style>
    :root { color-scheme: dark; font-family: system-ui, sans-serif; background: #101314; color: #e8ede8; }
    body { margin: 24px; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    .meta { margin: 0 0 20px; color: #b8c0bb; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-top: 1px solid #2e3837; padding: 10px; vertical-align: top; text-align: left; }
    th { position: sticky; top: 0; background: #171d1f; z-index: 1; }
    small { color: #9aa49f; }
    a { color: #9ad7ff; }
    img { width: 320px; max-width: 38vw; image-rendering: auto; background: #050607; border: 1px solid #273030; }
  </style>
</head>
<body>
  <h1>TIJ NPC Asset Package</h1>
  <p class="meta">
    ${escapeHtml(manifest.id)} generated ${escapeHtml(manifest.generatedAt)}.<br>
    ${manifest.totals.entries} entries, grid ${manifest.settings.viewGrid.x}x${manifest.settings.viewGrid.y},
    ${manifest.settings.tileSize}px tiles, ${manifest.settings.framesPerClip} frames per clip.<br>
    GLB bytes ${manifest.totals.glbBytes.toLocaleString()},
    atlas PNG bytes ${manifest.totals.atlasPngBytes.toLocaleString()},
    raw impostor bytes ${manifest.totals.rawImpostorBytes.toLocaleString()},
    warnings ${manifest.totals.warnings}.
  </p>
  <h2>Combined GLBs</h2>
  <ul>${combined}</ul>
  <table>
    <thead>
      <tr>
        <th>Faction</th>
        <th>Clip</th>
        <th>Weapon</th>
        <th>Raw Storage</th>
        <th>Alpha Min</th>
        <th>Warnings</th>
        <th>GLB</th>
        <th>Sidecar</th>
        <th>Frame Strip</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });
}
