/**
 * Canonical asset pipelines.
 *
 *   import { image } from '@pixel-forge/core';
 *   const sprite = image.pipelines.createSpritePipeline({ ... });
 *   await sprite.run({ prompt: 'banana plant' });
 *
 * Each pipeline implements `Pipeline<Input, Output>` so agents and
 * adapters (CLI, MCP) iterate over them uniformly. `batch` wraps any
 * pipeline in a resumable batch runner.
 */

export type { Pipeline, BatchPipeline } from './types';

export {
  createSpritePipeline,
  DEFAULT_SPRITE_SUFFIX,
  type SpriteInput,
  type SpriteOutput,
  type SpriteMeta,
  type CreateSpritePipelineDeps,
} from './sprite';

export {
  createIconPipeline,
  MONO_ICON_STYLE,
  COLORED_ICON_STYLE,
  type IconInput,
  type IconOutput,
  type IconMeta,
  type CreateIconPipelineDeps,
} from './icon';

export {
  createTexturePipeline,
  type TextureInput,
  type TextureOutput,
  type TextureMeta,
  type CreateTexturePipelineDeps,
} from './texture';

export {
  createSoldierSetPipeline,
  type PoseDef,
  type SoldierSetInput,
  type SoldierSetOutput,
  type CreateSoldierSetPipelineDeps,
} from './soldier-set';

export {
  createGlbPipeline,
  type GlbInput,
  type GlbOutput,
  type CreateGlbPipelineDeps,
} from './glb';

export {
  createBatchPipeline,
  type BatchFs,
  type CreateBatchPipelineOptions,
} from './batch';
