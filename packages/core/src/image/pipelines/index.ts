/**
 * Pipeline interfaces.
 *
 *   import { image } from '@pixel-forge/core';
 *   const p: image.pipelines.Pipeline<Input, Output> = ...;
 *
 * W4 fills this namespace with concrete pipelines (sprite, icon, texture,
 * soldier-set, glb, batch).
 */

export type { Pipeline, BatchPipeline } from './types';
