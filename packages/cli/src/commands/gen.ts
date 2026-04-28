/**
 * `pixelforge gen <kind>` — drive the W4 pipelines from the command line.
 *
 * Each sub-command is a thin shell: parse argv, build provider, instantiate
 * pipeline, run, write output to disk. No business logic lives here.
 *
 * Output strategy: every command writes its binary payload (PNG / GLB) to
 * the provided `--out` path, then prints a structured summary to stdout.
 * `--json` swaps the human summary for one-line JSON.
 */

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';

import { defineCommand } from 'citty';

import { image as coreImage, writeProvenance, hashContent } from '@pixel-forge/core';

import { loadProvidersFromEnv, requireProvider } from '../providers';
import { parseCsvList, printError, printResult } from '../output';

// =============================================================================
// Helpers
// =============================================================================

function ensureDir(filePath: string): void {
  mkdirSync(dirname(resolve(filePath)), { recursive: true });
}

type CliArgs = Record<string, unknown>;

function optionAlias(name: string): string {
  return name.replace(/-([a-z])/g, (_match, char: string) =>
    char.toUpperCase(),
  );
}

export function readOption(args: CliArgs, name: string): unknown {
  return args[name] ?? args[optionAlias(name)];
}

export function readBooleanOption(args: CliArgs, name: string): boolean {
  if (name.startsWith('no-')) {
    const positiveValue = readOption(args, name.slice(3));
    if (positiveValue === false) {
      return true;
    }
  }
  return Boolean(readOption(args, name));
}

function readStringOption(args: CliArgs, name: string): string | undefined {
  const value = readOption(args, name);
  return typeof value === 'string' ? value : undefined;
}

function loadRefBuffers(refsCsv: string | undefined): Buffer[] {
  const paths = parseCsvList(refsCsv);
  return paths.map((p) => readFileSync(resolve(p)));
}

// =============================================================================
// gen sprite
// =============================================================================

const spriteCommand = defineCommand({
  meta: {
    name: 'sprite',
    description:
      'Generate a 32-bit pixel-art sprite (image gen + optional BiRefNet + chroma cleanup).',
  },
  args: {
    prompt: {
      type: 'string',
      description: 'Subject description (style suffix is appended automatically).',
      required: true,
    },
    bg: {
      type: 'string',
      description: 'Background color: magenta | blue | green. Default magenta.',
      default: 'magenta',
    },
    refs: {
      type: 'string',
      description: 'Comma-separated list of reference image paths.',
    },
    out: {
      type: 'string',
      description: 'Output PNG path.',
      required: true,
    },
    'no-birefnet': {
      type: 'boolean',
      description: 'Skip the BiRefNet bg-removal step.',
      default: false,
    },
    'preserve-flash': {
      type: 'boolean',
      description: 'Skip yellow/orange pixels in chroma cleanup (firing sprites).',
      default: false,
    },
    json: {
      type: 'boolean',
      description: 'Emit machine-readable JSON to stdout.',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const cliArgs = args as CliArgs;
      const registry = loadProvidersFromEnv();
      const imageProvider = requireProvider(
        registry,
        'image',
        'OPENAI_API_KEY or GEMINI_API_KEY',
      );
      const runBiRefNet = !readBooleanOption(cliArgs, 'no-birefnet');
      const bgRemoval = runBiRefNet
        ? requireProvider(registry, 'bgRemoval', 'FAL_KEY')
        : undefined;

      const pipeline = coreImage.pipelines.createSpritePipeline({
        imageProvider,
        ...(bgRemoval ? { bgRemovalProvider: bgRemoval } : {}),
      });

      const refs = loadRefBuffers(args.refs);
      const result = await pipeline.run({
        prompt: args.prompt,
        background: args.bg as 'magenta' | 'blue' | 'green',
        ...(refs.length > 0 ? { refs } : {}),
        runBiRefNet,
        preserveFlash: readBooleanOption(cliArgs, 'preserve-flash'),
      });

      ensureDir(args.out);
      writeFileSync(resolve(args.out), result.image);
      writeProvenance(resolve(args.out), {
        pipeline: 'sprite',
        provider: result.meta.provider,
        model: result.meta.model,
        prompt: args.prompt,
        latencyMs: result.meta.latencyMs,
        ...(result.meta.costUsd !== undefined
          ? { costUsd: result.meta.costUsd }
          : {}),
        warnings: result.meta.warnings,
      });

      printResult(
        {
          ok: true,
          path: resolve(args.out),
          sizeBytes: result.image.byteLength,
          meta: result.meta,
        },
        { json: args.json },
      );
    } catch (err) {
      printError(err);
    }
  },
});

// =============================================================================
// gen icon
// =============================================================================

const iconCommand = defineCommand({
  meta: {
    name: 'icon',
    description:
      'Generate a UI icon (mono silhouette or colored emblem). No BiRefNet — direct chroma key.',
  },
  args: {
    prompt: {
      type: 'string',
      description: 'Icon subject description.',
      required: true,
    },
    variant: {
      type: 'string',
      description: 'Variant: mono | colored. Default mono.',
      default: 'mono',
    },
    refs: {
      type: 'string',
      description: 'Comma-separated list of reference image paths (style sheet first).',
    },
    out: {
      type: 'string',
      description: 'Output PNG path.',
      required: true,
    },
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    try {
      if (args.variant !== 'mono' && args.variant !== 'colored') {
        throw new Error(`--variant must be 'mono' or 'colored', got '${args.variant}'.`);
      }
      const registry = loadProvidersFromEnv();
      const imageProvider = requireProvider(
        registry,
        'image',
        'OPENAI_API_KEY or GEMINI_API_KEY',
      );

      const pipeline = coreImage.pipelines.createIconPipeline({ imageProvider });
      const refs = loadRefBuffers(args.refs);
      const result = await pipeline.run({
        prompt: args.prompt,
        variant: args.variant as 'mono' | 'colored',
        ...(refs.length > 0 ? { refs } : {}),
      });

      ensureDir(args.out);
      writeFileSync(resolve(args.out), result.image);
      writeProvenance(resolve(args.out), {
        pipeline: 'icon',
        provider: result.meta.provider,
        model: result.meta.model,
        prompt: args.prompt,
        latencyMs: result.meta.latencyMs,
        ...(result.meta.costUsd !== undefined
          ? { costUsd: result.meta.costUsd }
          : {}),
        warnings: result.meta.warnings,
        extras: { variant: result.meta.variant },
      });

      printResult(
        {
          ok: true,
          path: resolve(args.out),
          sizeBytes: result.image.byteLength,
          meta: result.meta,
        },
        { json: args.json },
      );
    } catch (err) {
      printError(err);
    }
  },
});

// =============================================================================
// gen texture
// =============================================================================

const textureCommand = defineCommand({
  meta: {
    name: 'texture',
    description:
      'Generate a tileable terrain texture (FAL flux-lora + Seamless LoRA + quantize).',
  },
  args: {
    description: {
      type: 'string',
      description: 'Texture description (terrain/material).',
      required: true,
    },
    size: {
      type: 'string',
      description: 'Final output size in pixels. Default 512.',
      default: '512',
    },
    out: {
      type: 'string',
      description: 'Output PNG path.',
      required: true,
    },
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    try {
      const registry = loadProvidersFromEnv();
      const textureProvider = requireProvider(registry, 'texture', 'FAL_KEY');

      const pipeline = coreImage.pipelines.createTexturePipeline({ textureProvider });
      const result = await pipeline.run({
        description: args.description,
        size: Number(args.size),
      });

      ensureDir(args.out);
      writeFileSync(resolve(args.out), result.image);
      writeProvenance(resolve(args.out), {
        pipeline: 'texture',
        provider: result.meta.provider,
        model: 'fal-ai/flux-lora',
        prompt: args.description,
        latencyMs: result.meta.latencyMs,
        ...(result.meta.costUsd !== undefined
          ? { costUsd: result.meta.costUsd }
          : {}),
        warnings: result.meta.warnings,
        extras: {
          size: result.meta.size,
          ...(result.meta.paletteSize !== undefined
            ? { paletteSize: result.meta.paletteSize }
            : {}),
        },
      });

      printResult(
        {
          ok: true,
          path: resolve(args.out),
          sizeBytes: result.image.byteLength,
          meta: result.meta,
        },
        { json: args.json },
      );
    } catch (err) {
      printError(err);
    }
  },
});

// =============================================================================
// gen glb
// =============================================================================

const glbCommand = defineCommand({
  meta: {
    name: 'glb',
    description: 'Generate a GLB via the Kiln pipeline (Claude codegen + headless render).',
  },
  args: {
    prompt: {
      type: 'string',
      description: 'Asset description.',
      required: true,
    },
    category: {
      type: 'string',
      description:
        'character | prop | vfx | environment | vehicle | building | weapon. Default prop.',
      default: 'prop',
    },
    style: {
      type: 'string',
      description: 'low-poly | stylized | voxel | detailed | realistic.',
    },
    out: {
      type: 'string',
      description: 'Output GLB path.',
      required: true,
    },
    'no-animation': {
      type: 'boolean',
      description: 'Skip animation generation.',
      default: false,
    },
    'save-code': {
      type: 'string',
      description: 'Optional path to also write the generated JS to disk.',
    },
    model: {
      type: 'string',
      description:
        'Override the Kiln code model (e.g. claude-opus-4-7, claude-sonnet-4-6). Takes precedence over KILN_MODEL env var.',
    },
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    try {
      const cliArgs = args as CliArgs;
      // --model flag is the most common override. Set KILN_MODEL so it's
      // picked up by core/kiln/generate.ts's DEFAULT_OPUS_MODEL resolver
      // without needing a pipeline-level model option.
      const modelOverride = readStringOption(cliArgs, 'model');
      if (modelOverride) {
        process.env['KILN_MODEL'] = modelOverride;
      }
      const pipeline = coreImage.pipelines.createGlbPipeline();

      const validCats = [
        'character',
        'prop',
        'vfx',
        'environment',
        'vehicle',
        'building',
        'weapon',
      ] as const;
      const cat = args.category as (typeof validCats)[number];
      if (!validCats.includes(cat)) {
        throw new Error(
          `--category must be one of ${validCats.join(', ')}, got '${args.category}'.`,
        );
      }

      const result = await pipeline.run({
        prompt: args.prompt,
        category: cat,
        ...(args.style ? { style: args.style as 'low-poly' } : {}),
        includeAnimation: !readBooleanOption(cliArgs, 'no-animation'),
      });

      ensureDir(args.out);
      writeFileSync(resolve(args.out), result.glb);

      const saveCode = readStringOption(cliArgs, 'save-code');
      if (saveCode) {
        ensureDir(saveCode);
        writeFileSync(resolve(saveCode), result.code, 'utf-8');
      }

      writeProvenance(resolve(args.out), {
        pipeline: 'glb',
        provider: 'anthropic',
        model:
          process.env['KILN_MODEL'] ??
          process.env['PIXEL_FORGE_MODEL'] ??
          'claude-opus-4-7',
        prompt: args.prompt,
        warnings: result.warnings,
        code: {
          bytes: result.code.length,
          sha1: hashContent(result.code),
        },
        extras: {
          category: cat,
          ...(result.meta.name !== undefined ? { name: result.meta.name } : {}),
          ...(result.meta.tris !== undefined ? { tris: result.meta.tris } : {}),
          ...(result.meta.primitiveUsage
            ? { primitiveUsage: result.meta.primitiveUsage }
            : {}),
        },
      });

      printResult(
        {
          ok: true,
          path: resolve(args.out),
          sizeBytes: result.glb.byteLength,
          codePath: saveCode ? resolve(saveCode) : undefined,
          codeBytes: result.code.length,
          meta: result.meta,
          warnings: result.warnings,
        },
        { json: args.json },
      );
    } catch (err) {
      printError(err);
    }
  },
});

// =============================================================================
// gen soldier-set
// =============================================================================

const soldierSetCommand = defineCommand({
  meta: {
    name: 'soldier-set',
    description:
      'Generate a faction T-pose plus N pose sprites that reference it.',
  },
  args: {
    faction: {
      type: 'string',
      description: 'Faction name (used as a label only).',
      required: true,
    },
    'tpose-prompt': {
      type: 'string',
      description: 'Prompt describing the T-pose character sheet.',
      required: true,
    },
    'poses-file': {
      type: 'string',
      description:
        'JSON file: { poses: [{ name, prompt, poseRefPath?, preserveFlash? }] }.',
      required: true,
    },
    'style-refs': {
      type: 'string',
      description: 'Comma-separated reference image paths for the T-pose.',
    },
    'out-dir': {
      type: 'string',
      description: 'Directory to write all sprites (tpose.png + <pose>.png).',
      required: true,
    },
    bg: {
      type: 'string',
      description: 'Background color: magenta | blue | green. Default magenta.',
      default: 'magenta',
    },
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    try {
      const cliArgs = args as CliArgs;
      const registry = loadProvidersFromEnv();
      const imageProvider = requireProvider(
        registry,
        'image',
        'OPENAI_API_KEY or GEMINI_API_KEY',
      );
      const bgRemoval = requireProvider(registry, 'bgRemoval', 'FAL_KEY');

      const posesFile = readStringOption(cliArgs, 'poses-file');
      const tPosePrompt = readStringOption(cliArgs, 'tpose-prompt');
      const outDir = readStringOption(cliArgs, 'out-dir');
      if (!posesFile || !tPosePrompt || !outDir) {
        throw new Error(
          '--tpose-prompt, --poses-file, and --out-dir are required.',
        );
      }

      const posesFileRaw = readFileSync(resolve(posesFile), 'utf-8');
      const parsed = JSON.parse(posesFileRaw) as {
        poses: Array<{
          name: string;
          prompt: string;
          poseRefPath?: string;
          preserveFlash?: boolean;
        }>;
      };

      const poses = parsed.poses.map((p) => ({
        name: p.name,
        prompt: p.prompt,
        ...(p.poseRefPath
          ? { poseRef: readFileSync(resolve(p.poseRefPath)) }
          : {}),
        ...(p.preserveFlash !== undefined
          ? { preserveFlash: p.preserveFlash }
          : {}),
      }));

      const styleRefs = loadRefBuffers(readStringOption(cliArgs, 'style-refs'));

      const pipeline = coreImage.pipelines.createSoldierSetPipeline({
        imageProvider,
        bgRemovalProvider: bgRemoval,
      });

      const result = await pipeline.run({
        faction: args.faction,
        tPosePrompt,
        ...(styleRefs.length > 0 ? { factionStyleRefs: styleRefs } : {}),
        poses,
        background: args.bg as 'magenta' | 'blue' | 'green',
      });

      mkdirSync(resolve(outDir), { recursive: true });
      const tposePath = resolve(join(outDir, 'tpose.png'));
      writeFileSync(tposePath, result.tPose.image);
      writeProvenance(tposePath, {
        pipeline: 'soldier-set',
        provider: result.tPose.meta.provider,
        model: result.tPose.meta.model,
        prompt: tPosePrompt,
        latencyMs: result.tPose.meta.latencyMs,
        ...(result.tPose.meta.costUsd !== undefined
          ? { costUsd: result.tPose.meta.costUsd }
          : {}),
        warnings: result.tPose.meta.warnings,
        extras: { faction: args.faction, role: 'tpose' },
      });
      const posePaths: string[] = [];
      for (const pose of result.poses) {
        const p = resolve(join(outDir, `${pose.name}.png`));
        writeFileSync(p, pose.sprite.image);
        writeProvenance(p, {
          pipeline: 'soldier-set',
          provider: pose.sprite.meta.provider,
          model: pose.sprite.meta.model,
          prompt: poses.find((q) => q.name === pose.name)?.prompt ?? pose.name,
          latencyMs: pose.sprite.meta.latencyMs,
          ...(pose.sprite.meta.costUsd !== undefined
            ? { costUsd: pose.sprite.meta.costUsd }
            : {}),
          warnings: pose.sprite.meta.warnings,
          extras: {
            faction: args.faction,
            role: 'pose',
            poseName: pose.name,
          },
        });
        posePaths.push(p);
      }

      printResult(
        {
          ok: true,
          tposePath,
          posePaths,
          meta: result.meta,
        },
        { json: args.json },
      );
    } catch (err) {
      printError(err);
    }
  },
});

// =============================================================================
// gen (root)
// =============================================================================

export const genCommand = defineCommand({
  meta: {
    name: 'gen',
    description: 'Generate assets via core pipelines (sprite/icon/texture/glb/soldier-set).',
  },
  subCommands: {
    sprite: spriteCommand,
    icon: iconCommand,
    texture: textureCommand,
    glb: glbCommand,
    'soldier-set': soldierSetCommand,
  },
});
