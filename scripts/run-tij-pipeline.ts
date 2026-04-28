/**
 * TIJ asset pipeline runner.
 *
 * Iterates the ranked shortlist from docs/tij-asset-pipeline-proposal.md and
 * drives every kiln module against the real input assets. Writes artifacts
 * under packages/server/output/tij/ in the directory contract described by
 * the proposal, plus a flat gallery-manifest.json the validation gallery
 * reads at startup.
 *
 * IMPORTANT: run via `tsx` (node), NOT `bun`. Playwright's CDP pipe doesn't
 * cooperate with Bun's process spawner on Windows — same reason as
 * scripts/visual-audit.ts. The root `package.json` exposes `bun run
 * tij:pipeline` which shells out to tsx for you.
 *
 * Resumable — skips any output that already exists on disk. To force a
 * regen, delete the artifact first.
 *
 * Usage:
 *   bun run tij:pipeline                    # run everything (shells to tsx)
 *   bun run tij:pipeline -- --only soldiers
 *   bun run tij:pipeline -- --only vegetation
 *   bun run tij:pipeline -- --only weapons
 *   bun run tij:pipeline -- --only props    # survival-kit FBX ingest
 *   bun run tij:pipeline -- --only atlas    # 60-free-plants
 *
 * Environment knobs:
 *   TIJ_PIPELINE_SOLDIER_LIMIT=4   # bake imposters for only the first N soldiers
 *   TIJ_PIPELINE_PROP_LIMIT=10     # ingest only the first N FBX from survival-kit
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  statSync,
} from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { kiln } from '@pixel-forge/core';
const {
  generateLODChain,
  openImposterSession,
  openFbxIngestSession,
  packSpriteAtlas,
} = kiln;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_ROOT = resolve(REPO_ROOT, 'packages/server/output/tij');
const TMP_ROOT = resolve(REPO_ROOT, 'tmp/tij-pipeline');

const SOLDIER_ROOT = 'C:/Users/Mattm/X/soldier-research/downloads/polypizza';
const WEAPON_ROOT = 'C:/Users/Mattm/X/soldier-research/downloads/polypizza-props';
const VEG_ROOT = 'C:/Users/Mattm/X/vegetation-research/assets/tier-a-psx/polypizza';
const TIJ_ROOT = 'C:/Users/Mattm/X/games-3d/terror-in-the-jungle';

const SOLDIERS = [
  { rank: 1, stem: 'DgOCW9ZCRJ__Character_Animated_-_Free_Model_By_Quaternius', role: 'hero' },
  { rank: 2, stem: 'PpLF4rt4ah__Character_Soldier_-_Free_Model_By_Quaternius', role: 'us_arvn_base' },
  { rank: 3, stem: '5EGWBMpuXq__Adventurer_-_Free_Model_By_Quaternius', role: 'us_variant' },
  { rank: 4, stem: '66kQ4dBBC7__Characters_Matt_-_Free_Model_By_Quaternius', role: 'nva_base' },
  { rank: 5, stem: 'UcLErL2W37__Characters_Sam_-_Free_Model_By_Quaternius', role: 'vc_base' },
  { rank: 6, stem: 'Btfn3G5Xv4__SWAT_-_Free_Model_By_Quaternius', role: 'us_heavy' },
  { rank: 7, stem: '75ikp7NEDx__Cube_Woman_Character_-_Free_Model_By_Quaternius', role: 'civilian_female' },
  { rank: 8, stem: 'DojKLcO34E__Beach_Character_-_Free_Model_By_Quaternius', role: 'civilian_male' },
];

const WEAPONS = [
  { rank: 1, stem: 'Bgvuu4CUMV__Assault_Rifle_-_Free_Model_By_Quaternius', standin: 'M16' },
  { rank: 2, stem: 'ASOMZIErq3__Sniper_Rifle_-_Free_Model_By_Quaternius', standin: 'M14_DMR' },
  { rank: 3, stem: '7ehatxr7FY__Submachine_Gun_-_Free_Model_By_Quaternius', standin: 'MAT49' },
  { rank: 4, stem: 'ZmPTnh7njL__Shotgun_-_Free_Model_By_Quaternius', standin: 'Rem870' },
  { rank: 5, stem: '52kQzphmeF__Pistol_-_Free_Model_By_Quaternius', standin: 'M1911' },
  { rank: 6, stem: 'YWhHlmKOtx__Hand_Grenade_-_Free_Model_By_CreativeTrio', standin: 'M67' },
  { rank: 7, stem: '2g9Jm7kvIU__Backpack_-_Free_Model_By_Quaternius', standin: 'ALICE' },
];

interface VegCombo {
  rank: number;
  species: string;
  variants: Array<string | { id: string; sourcePath: string }>;
  angles: 8 | 16 | 32;
  tileSize: 256 | 512 | 1024;
  axis: 'y' | 'hemi-y';
  tijTextureName: string;
  tier: 'groundCover' | 'midLevel' | 'canopy';
  representation: 'imposter';
  atlasProfile: 'ground-compact' | 'mid-balanced' | 'canopy-balanced' | 'canopy-hero';
  shaderProfile: 'hemisphere' | 'normal-lit';
  productionStatus?: 'candidate' | 'blocked';
  productionBlockers?: string[];
}

// Angle budgets:
//  - Every production vegetation type is GLB-sourced and runtime-imposter
//    rendered. Legacy flat sprite textures are debug/fallback only.
//  - Aerial gameplay still needs elevation-aware selection, but mid-tier laptop
//    budgets rule out 32×1024 color+normal atlases for broad scatter.
//  - Ground cover uses clump GLBs with compact atlases and cheaper lighting.
const VEG_COMBOS: VegCombo[] = [
  {
    rank: 1,
    species: 'fern',
    tijTextureName: 'Fern',
    variants: [
      'fern-danni-bittman',
      'fern-quaternius',
      'fiddlehead-google',
      'big-leaf-plant-reyshapes',
    ],
    angles: 8,
    tileSize: 256,
    axis: 'hemi-y',
    tier: 'groundCover',
    representation: 'imposter',
    atlasProfile: 'ground-compact',
    shaderProfile: 'hemisphere',
  },
  {
    rank: 2,
    species: 'elephantEar',
    tijTextureName: 'ElephantEarPlants',
    variants: [
      'big-leaf-plant-reyshapes',
    ],
    angles: 8,
    tileSize: 256,
    axis: 'hemi-y',
    tier: 'groundCover',
    representation: 'imposter',
    atlasProfile: 'ground-compact',
    shaderProfile: 'hemisphere',
  },
  {
    rank: 3,
    species: 'elephantGrass',
    tijTextureName: 'ElephantGrass',
    variants: [
      { id: 'nature-grass-clump-1', sourcePath: 'C:/Users/Mattm/X/vegetation-research/assets/converted-glb/nature_pack_vol3/Grass1.glb' },
      { id: 'nature-grass-clump-2', sourcePath: 'C:/Users/Mattm/X/vegetation-research/assets/converted-glb/nature_pack_vol3/Grass2.glb' },
    ],
    angles: 8,
    tileSize: 256,
    axis: 'hemi-y',
    tier: 'groundCover',
    representation: 'imposter',
    atlasProfile: 'ground-compact',
    shaderProfile: 'hemisphere',
    productionStatus: 'blocked',
    productionBlockers: ['current_elephant_grass_candidates_bake_grey_low_chroma'],
  },
  {
    rank: 4,
    species: 'ricePaddyPlants',
    tijTextureName: 'RicePaddyPlants',
    variants: [
      { id: 'nature-grass-paddy-clump', sourcePath: 'C:/Users/Mattm/X/vegetation-research/assets/converted-glb/nature_pack_vol3/Grass3.glb' },
    ],
    angles: 8,
    tileSize: 256,
    axis: 'hemi-y',
    tier: 'groundCover',
    representation: 'imposter',
    atlasProfile: 'ground-compact',
    shaderProfile: 'hemisphere',
    productionStatus: 'blocked',
    productionBlockers: ['needs_dedicated_rice_paddy_clump_glb_source'],
  },
  {
    rank: 5,
    species: 'bambooGrove',
    tijTextureName: 'BambooGrove',
    variants: [
      'bamboo-google-1', 'bamboo-google-2', 'bamboo-google-3',
      'bamboo-quaternius-1', 'bamboo-quaternius-2', 'bamboo-quaternius-3',
    ],
    angles: 16,
    tileSize: 512,
    axis: 'hemi-y',
    tier: 'midLevel',
    representation: 'imposter',
    atlasProfile: 'mid-balanced',
    shaderProfile: 'normal-lit',
  },
  {
    rank: 6,
    species: 'coconut',
    tijTextureName: 'CoconutPalm',
    variants: [
      'coconut-palm-google',
      'royal-palm-google-1',
      'royal-palm-google-2',
      'queen-palm-google',
      'date-palm-google',
      { id: 'coconut-green-envpack', sourcePath: 'C:/Users/Mattm/X/vegetation-research/assets/converted-glb/tropical-env-pack-v20/CoconutGreen.glb' },
      { id: 'coconut-brown-envpack', sourcePath: 'C:/Users/Mattm/X/vegetation-research/assets/converted-glb/tropical-env-pack-v20/CoconutBrown.glb' },
    ],
    angles: 16,
    tileSize: 512,
    axis: 'hemi-y',
    tier: 'midLevel',
    representation: 'imposter',
    atlasProfile: 'mid-balanced',
    shaderProfile: 'normal-lit',
  },
  {
    rank: 7,
    species: 'areca',
    tijTextureName: 'ArecaPalmCluster',
    variants: [
      { id: 'palm-plant-cluster', sourcePath: 'C:/Users/Mattm/X/vegetation-research/assets/converted-glb/free_palm_plant/PalmPlant.glb' },
      { id: 'palm-plant-single', sourcePath: 'C:/Users/Mattm/X/vegetation-research/assets/converted-glb/free_palm_plant/PalmPlant_Single.glb' },
    ],
    angles: 16,
    tileSize: 512,
    axis: 'hemi-y',
    tier: 'midLevel',
    representation: 'imposter',
    atlasProfile: 'mid-balanced',
    shaderProfile: 'normal-lit',
    productionStatus: 'blocked',
    productionBlockers: ['current_areca_candidates_bake_blank_materials'],
  },
  {
    rank: 8,
    species: 'bananaPlant',
    tijTextureName: 'BananaPlant',
    variants: [
      'banana-tree-google',
      'banana-tree-sean-tarrant',
    ],
    angles: 16,
    tileSize: 512,
    axis: 'hemi-y',
    tier: 'midLevel',
    representation: 'imposter',
    atlasProfile: 'mid-balanced',
    shaderProfile: 'normal-lit',
  },
  {
    rank: 9,
    species: 'mangrove',
    tijTextureName: 'Mangrove',
    variants: [
      { id: 'tropical-shrub-01', sourcePath: 'C:/Users/Mattm/X/vegetation-research/assets/converted-glb/tropical_shrubs/trop_shrub_01.glb' },
      { id: 'tropical-shrub-02', sourcePath: 'C:/Users/Mattm/X/vegetation-research/assets/converted-glb/tropical_shrubs/trop_shrub_02.glb' },
      { id: 'tropical-shrub-03', sourcePath: 'C:/Users/Mattm/X/vegetation-research/assets/converted-glb/tropical_shrubs/trop_shrub_03.glb' },
    ],
    angles: 16,
    tileSize: 512,
    axis: 'hemi-y',
    tier: 'midLevel',
    representation: 'imposter',
    atlasProfile: 'mid-balanced',
    shaderProfile: 'normal-lit',
    productionStatus: 'blocked',
    productionBlockers: ['needs_true_mangrove_root_canopy_source_glb'],
  },
  {
    rank: 10,
    species: 'fanPalm',
    tijTextureName: 'FanPalmCluster',
    variants: [
      'lady-palm-google-1', 'lady-palm-google-2',
      'triangle-palm-google', 'umbrella-palm-google',
      'ivory-cane-palm-google', 'everglades-palm-google',
    ],
    angles: 16,
    tileSize: 512,
    axis: 'hemi-y',
    tier: 'midLevel',
    representation: 'imposter',
    atlasProfile: 'mid-balanced',
    shaderProfile: 'normal-lit',
  },
  {
    rank: 11,
    species: 'giantPalm',
    tijTextureName: 'GiantPalm',
    variants: [
      'palm-quaternius-1', 'palm-quaternius-2', 'palm-quaternius-3', 'palm-quaternius-4', 'palm-quaternius-5',
    ],
    angles: 32,
    tileSize: 512,
    axis: 'hemi-y',
    tier: 'canopy',
    representation: 'imposter',
    atlasProfile: 'canopy-balanced',
    shaderProfile: 'normal-lit',
  },
  {
    rank: 12,
    species: 'banyan',
    tijTextureName: 'TwisterBanyan',
    variants: [
      { id: 'amazon-twisted-young', sourcePath: 'C:/Users/Mattm/X/vegetation-research/assets/converted-glb/AmazonInspiredTrees/AmazonInpiredYoung1(Twisted).glb' },
      { id: 'amazon-ancient-little', sourcePath: 'C:/Users/Mattm/X/vegetation-research/assets/converted-glb/AmazonInspiredTrees/AmazonInspiredTree4(AncientLittle).glb' },
    ],
    angles: 32,
    tileSize: 512,
    axis: 'hemi-y',
    tier: 'canopy',
    representation: 'imposter',
    atlasProfile: 'canopy-balanced',
    shaderProfile: 'normal-lit',
    productionStatus: 'blocked',
    productionBlockers: ['needs_banyan_specific_canopy_and_root_review'],
  },
  {
    rank: 13,
    species: 'rubberTree',
    tijTextureName: 'RubberTree',
    variants: [
      'palm-tree-jarlan-perez-1',
      'palm-tree-jarlan-perez-2',
      'vine-google',
      { id: 'amazon-broadleaf-big-bark', sourcePath: 'C:/Users/Mattm/X/vegetation-research/assets/converted-glb/AmazonInspiredTrees/AmazonInspiredTree1(BigBark).glb' },
      { id: 'amazon-broadleaf-thick-base', sourcePath: 'C:/Users/Mattm/X/vegetation-research/assets/converted-glb/AmazonInspiredTrees/AmazonInpiredYoung2(ThickBase).glb' },
    ],
    angles: 32,
    tileSize: 512,
    axis: 'hemi-y',
    tier: 'canopy',
    representation: 'imposter',
    atlasProfile: 'canopy-balanced',
    shaderProfile: 'normal-lit',
    productionStatus: 'blocked',
    productionBlockers: ['needs_non_potted_rubber_tree_species_review'],
  },
];

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

interface ManifestEntry {
  kind: 'soldier' | 'weapon' | 'vegetation' | 'prop' | 'atlas';
  rank?: number;
  id: string;
  source?: string;
  paths: Record<string, string>;
  meta: Record<string, unknown>;
  failed?: { reason: string };
}

interface GalleryManifest {
  version: 1;
  generatedAt: string;
  counts: Record<string, number>;
  entries: ManifestEntry[];
}

function loadManifest(): GalleryManifest {
  const p = join(OUT_ROOT, 'gallery-manifest.json');
  if (existsSync(p)) {
    try {
      return JSON.parse(readFileSync(p, 'utf-8')) as GalleryManifest;
    } catch {
      // fall through
    }
  }
  return { version: 1, generatedAt: new Date().toISOString(), counts: {}, entries: [] };
}

function saveManifest(m: GalleryManifest): void {
  mkdirSync(OUT_ROOT, { recursive: true });
  m.generatedAt = new Date().toISOString();
  m.counts = m.entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.kind] = (acc[e.kind] ?? 0) + 1;
    return acc;
  }, {});
  writeFileSync(join(OUT_ROOT, 'gallery-manifest.json'), JSON.stringify(m, null, 2), 'utf-8');
}

function upsertEntry(m: GalleryManifest, entry: ManifestEntry): void {
  const idx = m.entries.findIndex((e) => e.kind === entry.kind && e.id === entry.id);
  if (idx >= 0) m.entries[idx] = entry;
  else m.entries.push(entry);
  saveManifest(m);
}

function rel(p: string): string {
  return p.replace(REPO_ROOT + '\\', '').replace(REPO_ROOT + '/', '').split('\\').join('/');
}

function readJsonFile<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T;
  } catch {
    return null;
  }
}

function isProductionVegetationImposter(meta: Record<string, unknown> | null, combo: VegCombo): boolean {
  return Boolean(
    meta
      && meta.angles === combo.angles
      && meta.tileSize === combo.tileSize
      && meta.axis === combo.axis
      && meta.colorLayer === 'baseColor'
      && meta.textureColorSpace === 'srgb'
      && meta.normalSpace === 'capture-view'
      && Array.isArray(meta.auxLayers)
      && meta.auxLayers.includes('normal')
      && typeof meta.edgeBleedPx === 'number'
      && meta.edgeBleedPx > 0,
  );
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

async function runSoldiers(manifest: GalleryManifest): Promise<void> {
  const limit = Number(process.env.TIJ_PIPELINE_SOLDIER_LIMIT ?? SOLDIERS.length);
  const set = SOLDIERS.slice(0, limit);
  console.log(`\n=== Soldiers (${set.length} / ${SOLDIERS.length}) ===`);

  const imposterSession = await openImposterSession();
  try {
    for (const s of set) {
      const srcPath = join(SOLDIER_ROOT, `${s.stem}.glb`);
      if (!existsSync(srcPath)) {
        console.warn(`  [SKIP] ${s.stem}: source not found`);
        upsertEntry(manifest, {
          kind: 'soldier', rank: s.rank, id: s.stem, paths: {},
          meta: { role: s.role },
          failed: { reason: 'source_not_found' },
        });
        continue;
      }
      const outDir = join(OUT_ROOT, 'soldiers', s.stem);
      mkdirSync(outDir, { recursive: true });

      const paths: Record<string, string> = {};
      const meta: Record<string, unknown> = { role: s.role, rank: s.rank };

      // 1. LOD chain (lod0 = original)
      const lodPaths = [0, 1, 2, 3].map((n) => join(outDir, `lod${n}.glb`));
      if (!lodPaths.every(existsSync)) {
        try {
          console.log(`  ${s.stem} -> LOD chain`);
          const lodResult = await generateLODChain(srcPath, {
            ratios: [1.0, 0.5, 0.25, 0.1],
          });
          for (const l of lodResult.lods) {
            writeFileSync(lodPaths[l.level]!, l.glb);
          }
          meta.sourceTriangles = lodResult.source.triangles;
          meta.lodTriangles = lodResult.lods.map((l: { triangles: number }) => l.triangles);
        } catch (err) {
          console.warn(`    LOD failed: ${(err as Error).message}`);
          meta.lodError = (err as Error).message;
        }
      }
      lodPaths.forEach((p, i) => {
        if (existsSync(p)) paths[`lod${i}`] = rel(p);
      });

      // 2. Imposter (16-angle, hemi, 512)
      const imposterPng = join(outDir, 'imposter.png');
      const imposterJson = join(outDir, 'imposter.json');
      if (!existsSync(imposterPng) || !existsSync(imposterJson)) {
        try {
          console.log(`  ${s.stem} -> imposter`);
          const r = await imposterSession.bake(srcPath, {
            angles: 16, axis: 'hemi-y', tileSize: 512, bgColor: 'transparent',
            sourcePath: srcPath,
          });
          writeFileSync(imposterPng, r.atlas);
          writeFileSync(imposterJson, JSON.stringify(r.meta, null, 2), 'utf-8');
          meta.imposterAngles = r.meta.angles;
          meta.imposterTiles = `${r.meta.tilesX}x${r.meta.tilesY}`;
          meta.imposterAtlas = `${r.meta.atlasWidth}x${r.meta.atlasHeight}`;
          meta.worldSize = r.meta.worldSize;
        } catch (err) {
          console.warn(`    Imposter failed: ${(err as Error).message}`);
          meta.imposterError = (err as Error).message;
        }
      }
      if (existsSync(imposterPng)) paths.imposter = rel(imposterPng);
      if (existsSync(imposterJson)) paths.imposterMeta = rel(imposterJson);

      meta.sourceBytes = statSync(srcPath).size;
      upsertEntry(manifest, {
        kind: 'soldier', rank: s.rank, id: s.stem, source: srcPath,
        paths, meta,
      });
    }
  } finally {
    await imposterSession.close();
  }
}

async function runWeapons(manifest: GalleryManifest): Promise<void> {
  console.log(`\n=== Weapons (${WEAPONS.length}) ===`);
  for (const w of WEAPONS) {
    const srcPath = join(WEAPON_ROOT, `${w.stem}.glb`);
    if (!existsSync(srcPath)) {
      console.warn(`  [SKIP] ${w.stem}: source not found`);
      upsertEntry(manifest, {
        kind: 'weapon', rank: w.rank, id: w.stem, paths: {},
        meta: { standin: w.standin }, failed: { reason: 'source_not_found' },
      });
      continue;
    }
    const outDir = join(OUT_ROOT, 'weapons', w.stem);
    mkdirSync(outDir, { recursive: true });
    const outPath = join(outDir, 'weapon.glb');
    if (!existsSync(outPath)) {
      console.log(`  ${w.stem} -> weapon.glb`);
      const bytes = readFileSync(srcPath);
      writeFileSync(outPath, bytes);
    }
    upsertEntry(manifest, {
      kind: 'weapon', rank: w.rank, id: w.stem, source: srcPath,
      paths: { weapon: rel(outPath) },
      meta: { standin: w.standin, bytes: statSync(outPath).size },
    });
  }
}

async function runVegetation(manifest: GalleryManifest): Promise<void> {
  console.log(`\n=== Vegetation (${VEG_COMBOS.length} combos) ===`);
  const expectedSpecies = new Set(VEG_COMBOS.map((combo) => combo.species));
  const before = manifest.entries.length;
  manifest.entries = manifest.entries.filter((entry) => entry.kind !== 'vegetation' || expectedSpecies.has(entry.id));
  if (manifest.entries.length !== before) saveManifest(manifest);

  const session = await openImposterSession();
  try {
    for (const combo of VEG_COMBOS) {
      const outDir = join(OUT_ROOT, 'vegetation', combo.species);
      mkdirSync(outDir, { recursive: true });

      const variantMeta: Array<{
        id: string;
        src: string;
        variant: string;
        representation: 'imposter';
        tier: VegCombo['tier'];
        atlasProfile: VegCombo['atlasProfile'];
        shaderProfile: VegCombo['shaderProfile'];
        imposter?: string;
        imposterMeta?: string;
        imposterNormal?: string;
        model?: string;
        lod0?: string;
        lod1?: string;
        lod2?: string;
        lod3?: string;
        sourceBytes?: number;
        tris?: number;
        sourceTriangles?: number;
        lodTriangles?: number[];
        worldSize?: number;
        colorLayer?: string;
        auxLayers?: string[];
        edgeBleedPx?: number;
        normalSpace?: string;
        textureColorSpace?: string;
        failed?: string;
      }> = [];

      for (const variantDef of combo.variants) {
        const variant = typeof variantDef === 'string' ? variantDef : variantDef.id;
        const srcPath = typeof variantDef === 'string' ? join(VEG_ROOT, variantDef, 'model.glb') : variantDef.sourcePath;
        if (!existsSync(srcPath)) {
          console.warn(`  [SKIP] ${combo.species}/${variant}: source not found`);
          variantMeta.push({
            id: `${combo.species}/${variant}`,
            src: srcPath,
            variant,
            representation: combo.representation,
            tier: combo.tier,
            atlasProfile: combo.atlasProfile,
            shaderProfile: combo.shaderProfile,
            failed: 'source_not_found',
          });
          continue;
        }
        const varOutDir = join(outDir, variant);
        mkdirSync(varOutDir, { recursive: true });
        const variantGlb = join(varOutDir, 'model.glb');
        if (!existsSync(variantGlb)) writeFileSync(variantGlb, readFileSync(srcPath));

        const imposterPng = join(varOutDir, 'imposter.png');
        const imposterJson = join(varOutDir, 'imposter.json');
        const imposterNormal = join(varOutDir, 'imposter.normal.png');
        const existingMeta = readJsonFile<Record<string, unknown>>(imposterJson);
        const recorded: (typeof variantMeta)[number] = {
          id: `${combo.species}/${variant}`, src: srcPath, variant,
          representation: combo.representation,
          tier: combo.tier,
          atlasProfile: combo.atlasProfile,
          shaderProfile: combo.shaderProfile,
          model: rel(variantGlb), imposter: rel(imposterPng), imposterMeta: rel(imposterJson), imposterNormal: rel(imposterNormal),
        };
        const lodPaths = [0, 1, 2, 3].map((n) => join(varOutDir, `lod${n}.glb`));
        if (!lodPaths.every(existsSync)) {
          try {
            console.log(`  ${combo.species}/${variant} -> LOD chain`);
            const lodResult = await generateLODChain(srcPath, {
              ratios: [1.0, 0.5, 0.25, 0.1],
            });
            for (const l of lodResult.lods) {
              writeFileSync(lodPaths[l.level]!, l.glb);
            }
            recorded.sourceTriangles = lodResult.source.triangles;
            recorded.lodTriangles = lodResult.lods.map((l: { triangles: number }) => l.triangles);
          } catch (err) {
            console.warn(`    LOD failed: ${(err as Error).message}`);
          }
        }
        lodPaths.forEach((p, i) => {
          if (existsSync(p)) recorded[`lod${i}` as 'lod0' | 'lod1' | 'lod2' | 'lod3'] = rel(p);
        });
        if (!existsSync(imposterPng) || !existsSync(imposterJson) || !existsSync(imposterNormal) || !isProductionVegetationImposter(existingMeta, combo)) {
          try {
            console.log(`  ${combo.species}/${variant} -> imposter`);
            const r = await session.bake(srcPath, {
              angles: combo.angles, axis: combo.axis, tileSize: combo.tileSize,
              bgColor: 'transparent', sourcePath: srcPath,
              colorLayer: 'baseColor', auxLayers: ['normal'], edgeBleedPx: 2,
            });
            writeFileSync(imposterPng, r.atlas);
            if (r.aux.normal) writeFileSync(imposterNormal, r.aux.normal);
            writeFileSync(imposterJson, JSON.stringify(r.meta, null, 2), 'utf-8');
            recorded.sourceBytes = r.meta.source.bytes;
            recorded.tris = r.meta.source.tris;
            recorded.worldSize = r.meta.worldSize;
            recorded.colorLayer = r.meta.colorLayer;
            recorded.auxLayers = r.meta.auxLayers;
            recorded.edgeBleedPx = r.meta.edgeBleedPx;
            recorded.normalSpace = r.meta.normalSpace;
            recorded.textureColorSpace = r.meta.textureColorSpace;
          } catch (err) {
            console.warn(`    Imposter failed: ${(err as Error).message}`);
            recorded.failed = (err as Error).message;
          }
        }
        const finalMeta = readJsonFile<{
          source?: { bytes?: number; tris?: number };
          worldSize?: number;
          colorLayer?: string;
          auxLayers?: string[];
          edgeBleedPx?: number;
          normalSpace?: string;
          textureColorSpace?: string;
        }>(imposterJson);
        if (finalMeta) {
          recorded.sourceBytes ??= finalMeta.source?.bytes;
          recorded.tris ??= finalMeta.source?.tris;
          recorded.worldSize ??= finalMeta.worldSize;
          recorded.colorLayer ??= finalMeta.colorLayer;
          recorded.auxLayers ??= finalMeta.auxLayers;
          recorded.edgeBleedPx ??= finalMeta.edgeBleedPx;
          recorded.normalSpace ??= finalMeta.normalSpace;
          recorded.textureColorSpace ??= finalMeta.textureColorSpace;
        }
        if (!existsSync(imposterNormal)) delete recorded.imposterNormal;
        variantMeta.push(recorded);
      }

      upsertEntry(manifest, {
        kind: 'vegetation', rank: combo.rank, id: combo.species,
        paths: {},
        meta: {
          tijTextureName: combo.tijTextureName,
          representation: combo.representation,
          tier: combo.tier,
          atlasProfile: combo.atlasProfile,
          shaderProfile: combo.shaderProfile,
          productionStatus: combo.productionStatus ?? 'candidate',
          productionBlockers: combo.productionBlockers ?? [],
          angles: combo.angles,
          tileSize: combo.tileSize,
          axis: combo.axis,
          variants: variantMeta,
        },
      });
    }
  } finally {
    await session.close();
  }
}

async function runProps(manifest: GalleryManifest): Promise<void> {
  console.log('\n=== Props (survival-kit FBX ingest) ===');
  const survivalDir = join(TMP_ROOT, 'survival-kit');
  if (!existsSync(survivalDir)) {
    console.warn(`  [SKIP] survival-kit not unzipped at ${survivalDir}`);
    console.warn(`    Run: unzip ${TIJ_ROOT}/survival-kit.zip -d ${TMP_ROOT}/survival-kit`);
    return;
  }
  const fbxFiles = walk(survivalDir).filter((p) => p.toLowerCase().endsWith('.fbx'));
  const limit = Number(process.env.TIJ_PIPELINE_PROP_LIMIT ?? fbxFiles.length);
  const set = fbxFiles.slice(0, limit);
  console.log(`  ${set.length} FBX files (of ${fbxFiles.length})`);
  if (!set.length) return;

  const session = await openFbxIngestSession();
  try {
    const outDir = join(OUT_ROOT, 'props');
    mkdirSync(outDir, { recursive: true });
    for (const fbxPath of set) {
      const stem = basename(fbxPath, extname(fbxPath));
      const outPath = join(outDir, `${stem}.glb`);
      const recordPath = join(outDir, `${stem}.json`);
      const entry: ManifestEntry = {
        kind: 'prop', id: stem, source: fbxPath,
        paths: { glb: rel(outPath), provenance: rel(recordPath) },
        meta: {},
      };
      if (existsSync(outPath) && existsSync(recordPath)) {
        try {
          entry.meta = JSON.parse(readFileSync(recordPath, 'utf-8'));
        } catch { /* ignore */ }
        upsertEntry(manifest, entry);
        continue;
      }
      try {
        console.log(`  ${stem}`);
        const r = await session.ingest(fbxPath, { scale: 1.0, mergeMaterials: true });
        writeFileSync(outPath, r.glb);
        writeFileSync(recordPath, JSON.stringify(r.meta, null, 2), 'utf-8');
        entry.meta = r.meta as unknown as Record<string, unknown>;
      } catch (err) {
        console.warn(`    Ingest failed: ${(err as Error).message}`);
        entry.failed = { reason: (err as Error).message };
      }
      upsertEntry(manifest, entry);
    }
  } finally {
    await session.close();
  }
}

async function runAtlas(manifest: GalleryManifest): Promise<void> {
  console.log('\n=== Atlas (60-free-plants) ===');
  const plantsDir = join(TMP_ROOT, '60-free-plants');
  if (!existsSync(plantsDir)) {
    console.warn(`  [SKIP] 60-free-plants not unzipped at ${plantsDir}`);
    console.warn(`    Run: unzip ${TIJ_ROOT}/60-free-plants.zip -d ${TMP_ROOT}/60-free-plants`);
    return;
  }
  const pngs = walk(plantsDir).filter((p) => p.toLowerCase().endsWith('.png'));
  console.log(`  Found ${pngs.length} PNGs`);
  if (!pngs.length) return;

  // Downscale each sprite to 512px max (typical billboard texture). 60 raw
  // sprites at 2048px would need >32 MP of atlas, which forces a split. 512px
  // retains plenty of detail for foliage billboards.
  const sprites = await Promise.all(
    pngs.map(async (p) => ({
      name: basename(p, extname(p)),
      data: await sharp(p).resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true }).png().toBuffer(),
    })),
  );

  const outDir = join(OUT_ROOT, 'vegetation', 'atlases');
  mkdirSync(outDir, { recursive: true });
  const atlasPng = join(outDir, 'ground-cover.png');
  const atlasJson = join(outDir, 'ground-cover.json');

  if (!existsSync(atlasPng) || !existsSync(atlasJson)) {
    const result = await packSpriteAtlas(sprites, { maxSize: 4096, padding: 4, pot: true });
    writeFileSync(atlasPng, result.atlas);
    writeFileSync(atlasJson, JSON.stringify(result.frames, null, 2), 'utf-8');
  }

  const frames = JSON.parse(readFileSync(atlasJson, 'utf-8')) as { atlasWidth: number; atlasHeight: number; frames: unknown[] };
  upsertEntry(manifest, {
    kind: 'atlas', id: 'ground-cover',
    paths: { atlas: rel(atlasPng), frames: rel(atlasJson) },
    meta: {
      atlasSize: `${frames.atlasWidth}x${frames.atlasHeight}`,
      sprites: frames.frames.length,
    },
  });
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const onlyIdx = args.indexOf('--only');
  const only = onlyIdx >= 0 ? args[onlyIdx + 1] : null;

  mkdirSync(OUT_ROOT, { recursive: true });
  const manifest = loadManifest();
  console.log(`Output root: ${OUT_ROOT}`);

  // Silence manifold/CSG chatter from kiln imports
  void kiln;

  if (!only || only === 'soldiers') await runSoldiers(manifest);
  if (!only || only === 'weapons') await runWeapons(manifest);
  if (!only || only === 'vegetation') await runVegetation(manifest);
  if (!only || only === 'props') await runProps(manifest);
  if (!only || only === 'atlas') await runAtlas(manifest);

  saveManifest(manifest);
  const counts = manifest.entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.kind] = (acc[e.kind] ?? 0) + 1;
    if (e.failed) acc[`${e.kind}_failed`] = (acc[`${e.kind}_failed`] ?? 0) + 1;
    return acc;
  }, {});
  console.log('\n=== Manifest summary ===');
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);
  console.log(`\nManifest: ${join(OUT_ROOT, 'gallery-manifest.json')}`);
}

await main();
