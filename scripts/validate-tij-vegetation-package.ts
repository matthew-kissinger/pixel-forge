/**
 * Validates the Pixel Forge -> TIJ production vegetation imposter contract.
 *
 * This is intentionally stricter than the gallery: the gallery can show review
 * work, but this gate decides whether a vegetation package is safe to import
 * into Terror in the Jungle production.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_MANIFEST = resolve(REPO_ROOT, 'packages/server/output/tij/gallery-manifest.json');

const REQUIRED_SPECIES = new Set([
  'fern',
  'elephantEar',
  'elephantGrass',
  'ricePaddyPlants',
  'fanPalm',
  'coconut',
  'areca',
  'bambooGrove',
  'bananaPlant',
  'mangrove',
  'giantPalm',
  'banyan',
  'rubberTree',
]);

const PROFILE_LIMITS = {
  'ground-compact': { maxTileSize: 256, maxAngles: 8, normalRequired: false },
  'mid-balanced': { maxTileSize: 512, maxAngles: 16, normalRequired: true },
  'canopy-balanced': { maxTileSize: 512, maxAngles: 32, normalRequired: true },
  'canopy-hero': { maxTileSize: 1024, maxAngles: 32, normalRequired: true },
} as const;

type AtlasProfile = keyof typeof PROFILE_LIMITS;

interface ManifestEntry {
  kind: string;
  id: string;
  meta?: Record<string, unknown>;
}

interface GalleryManifest {
  entries?: ManifestEntry[];
}

interface VariantMeta {
  id?: string;
  src?: string;
  variant?: string;
  representation?: string;
  tier?: string;
  atlasProfile?: string;
  shaderProfile?: string;
  model?: string;
  lod0?: string;
  lod1?: string;
  lod2?: string;
  lod3?: string;
  imposter?: string;
  imposterMeta?: string;
  imposterNormal?: string;
  colorLayer?: string;
  auxLayers?: string[];
  edgeBleedPx?: number;
  normalSpace?: string;
  textureColorSpace?: string;
  failed?: string;
}

function parseArgs(): { manifestPath: string; allowBlocked: boolean } {
  const args = process.argv.slice(2);
  let manifestPath = DEFAULT_MANIFEST;
  let allowBlocked = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--manifest') {
      manifestPath = resolve(args[++i] ?? DEFAULT_MANIFEST);
    } else if (arg === '--allow-blocked') {
      allowBlocked = true;
    }
  }

  return { manifestPath, allowBlocked };
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

function resolveAsset(path: string | undefined): string | null {
  if (!path) return null;
  return isAbsolute(path) ? path : resolve(REPO_ROOT, path);
}

function requireFile(issues: string[], label: string, path: string | undefined): string | null {
  const resolved = resolveAsset(path);
  if (!resolved) {
    issues.push(`${label}: missing path`);
    return null;
  }
  if (!existsSync(resolved)) {
    issues.push(`${label}: file not found at ${resolved}`);
    return null;
  }
  return resolved;
}

async function inspectAtlas(path: string): Promise<{ opaqueLuma: number; opaqueChroma: number; blackEdgePixels: number }> {
  const image = sharp(path).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  let opaqueCount = 0;
  let lumaTotal = 0;
  let chromaTotal = 0;
  let blackEdgePixels = 0;

  const pixel = (x: number, y: number) => (y * info.width + x) * 4;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = pixel(x, y);
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const a = data[i + 3]!;

      if (a >= 220) {
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        opaqueCount++;
        lumaTotal += 0.2126 * r + 0.7152 * g + 0.0722 * b;
        chromaTotal += max - min;
      }

      if (a === 0 && r + g + b < 8) {
        let neighborLuma = 0;
        let neighborCount = 0;
        for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as const) {
          if (nx < 0 || ny < 0 || nx >= info.width || ny >= info.height) continue;
          const ni = pixel(nx, ny);
          if (data[ni + 3]! === 0) continue;
          neighborLuma += 0.2126 * data[ni]! + 0.7152 * data[ni + 1]! + 0.0722 * data[ni + 2]!;
          neighborCount++;
        }
        if (neighborCount > 0 && neighborLuma / neighborCount > 24) blackEdgePixels++;
      }
    }
  }

  return {
    opaqueLuma: opaqueCount > 0 ? lumaTotal / opaqueCount : 0,
    opaqueChroma: opaqueCount > 0 ? chromaTotal / opaqueCount : 0,
    blackEdgePixels,
  };
}

function validateMetaShape(issues: string[], label: string, meta: Record<string, unknown>, profile: AtlasProfile): void {
  const limits = PROFILE_LIMITS[profile];
  if (meta.colorLayer !== 'baseColor') issues.push(`${label}: colorLayer must be baseColor`);
  if (meta.textureColorSpace !== 'srgb') issues.push(`${label}: textureColorSpace must be srgb`);
  if (typeof meta.edgeBleedPx !== 'number' || meta.edgeBleedPx <= 0) issues.push(`${label}: edgeBleedPx must be > 0`);

  if (limits.normalRequired) {
    if (!Array.isArray(meta.auxLayers) || !meta.auxLayers.includes('normal')) {
      issues.push(`${label}: normal aux layer is required by ${profile}`);
    }
    if (meta.normalSpace !== 'capture-view') {
      issues.push(`${label}: normalSpace must be capture-view`);
    }
  }
}

async function validateVariant(
  issues: string[],
  entry: ManifestEntry,
  variant: VariantMeta,
  profile: AtlasProfile,
  opts: { skipAtlasQuality?: boolean } = {},
): Promise<void> {
  const label = `${entry.id}/${variant.variant ?? variant.id ?? 'unknown'}`;
  if (variant.failed) issues.push(`${label}: variant failed (${variant.failed})`);
  if (variant.representation !== 'imposter') issues.push(`${label}: representation must be imposter`);
  if (variant.atlasProfile !== profile) issues.push(`${label}: atlasProfile must match entry profile ${profile}`);

  requireFile(issues, `${label} source`, variant.src);
  requireFile(issues, `${label} model`, variant.model);
  for (const lod of ['lod0', 'lod1', 'lod2', 'lod3'] as const) {
    requireFile(issues, `${label} ${lod}`, variant[lod]);
  }

  const imposterPath = requireFile(issues, `${label} imposter`, variant.imposter);
  const metaPath = requireFile(issues, `${label} imposter metadata`, variant.imposterMeta);
  const limits = PROFILE_LIMITS[profile];
  if (limits.normalRequired) {
    requireFile(issues, `${label} normal atlas`, variant.imposterNormal);
  }

  if (variant.colorLayer !== 'baseColor') issues.push(`${label}: manifest colorLayer must be baseColor`);
  if (variant.textureColorSpace !== 'srgb') issues.push(`${label}: manifest textureColorSpace must be srgb`);
  if (typeof variant.edgeBleedPx !== 'number' || variant.edgeBleedPx <= 0) {
    issues.push(`${label}: manifest edgeBleedPx must be > 0`);
  }

  if (metaPath) {
    validateMetaShape(issues, `${label} metadata`, loadJson<Record<string, unknown>>(metaPath), profile);
  }

  if (imposterPath && !opts.skipAtlasQuality) {
    const atlas = await inspectAtlas(imposterPath);
    if (atlas.opaqueLuma < 55) {
      issues.push(`${label}: opaque average luminance ${atlas.opaqueLuma.toFixed(1)} is below 55`);
    }
    if (atlas.opaqueChroma < 8) {
      issues.push(`${label}: opaque average chroma ${atlas.opaqueChroma.toFixed(1)} is below 8; atlas is effectively grey/white`);
    }
    if (atlas.blackEdgePixels > 0) {
      issues.push(`${label}: ${atlas.blackEdgePixels} transparent edge pixels still interpolate from black`);
    }
  }
}

async function main(): Promise<void> {
  const { manifestPath, allowBlocked } = parseArgs();
  if (!existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }

  const manifest = loadJson<GalleryManifest>(manifestPath);
  const vegetationEntries = (manifest.entries ?? []).filter((entry) => entry.kind === 'vegetation');
  const seen = new Set<string>();
  const issues: string[] = [];

  for (const entry of vegetationEntries) {
    seen.add(entry.id);
    if (!REQUIRED_SPECIES.has(entry.id)) issues.push(`${entry.id}: unexpected vegetation species`);

    const meta = entry.meta ?? {};
    if (meta.representation !== 'imposter') issues.push(`${entry.id}: representation must be imposter`);
    const profile = meta.atlasProfile as AtlasProfile;
    const limits = PROFILE_LIMITS[profile];
    if (!limits) {
      issues.push(`${entry.id}: unknown atlasProfile ${String(meta.atlasProfile)}`);
      continue;
    }
    if (typeof meta.tileSize !== 'number' || meta.tileSize > limits.maxTileSize) {
      issues.push(`${entry.id}: tileSize ${String(meta.tileSize)} exceeds ${profile} max ${limits.maxTileSize}`);
    }
    if (typeof meta.angles !== 'number' || meta.angles > limits.maxAngles) {
      issues.push(`${entry.id}: angles ${String(meta.angles)} exceeds ${profile} max ${limits.maxAngles}`);
    }
    const isBlocked = meta.productionStatus === 'blocked';
    if (!allowBlocked && isBlocked) {
      issues.push(`${entry.id}: productionStatus is blocked (${(meta.productionBlockers as string[] | undefined)?.join(', ') ?? 'no blocker listed'})`);
      continue;
    }

    const variants = meta.variants;
    if (!Array.isArray(variants) || variants.length === 0) {
      issues.push(`${entry.id}: no variants`);
      continue;
    }

    for (const variant of variants as VariantMeta[]) {
      await validateVariant(issues, entry, variant, profile, {
        skipAtlasQuality: allowBlocked && isBlocked,
      });
    }
  }

  for (const species of REQUIRED_SPECIES) {
    if (!seen.has(species)) issues.push(`${species}: missing production vegetation entry`);
  }

  if (issues.length > 0) {
    console.error(`TIJ vegetation package validation failed (${issues.length} issues):`);
    for (const issue of issues) console.error(`- ${issue}`);
    process.exitCode = 1;
    return;
  }

  console.log(`TIJ vegetation package validation passed (${vegetationEntries.length} species).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
