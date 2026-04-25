/**
 * Zod schemas for Kiln (code -> GLB) operations.
 *
 * These mirror the runtime types already exported from `core/kiln/*` but
 * expressed as zod schemas so CLI / MCP adapters can validate JSON payloads
 * against the same contract.
 *
 * We don't re-export the kiln runtime types here — callers that need those
 * should `import { kiln } from '@pixel-forge/core'`. What lives here is the
 * zod half of the contract.
 */

import { z } from 'zod';

import {
  CodeGenInputSchema,
  CodeGenOutputSchema,
  CodeRefactorInputSchema,
  CodeCompactInputSchema,
} from './image';
export {
  ANIMATED_IMPOSTER_DEFAULT_ENVELOPE_BYTES,
  ANIMATED_IMPOSTER_KIND,
  ANIMATED_IMPOSTER_SCHEMA_VERSION,
  AnimatedClipTargetSchema,
  AnimatedImposterMetaSchema,
  AnimatedImposterPreBakeInputSchema,
  AnimatedImposterRuntimeAttributeSchema,
  AnimatedImposterTextureFormatSchema,
  AnimatedImposterTextureLayoutSchema,
  AnimatedImposterTextureModeSchema,
  AnimatedImposterWarningSchema,
} from '../kiln/imposter/animated-schema';
export type {
  AnimatedClipTarget,
  AnimatedImposterMeta,
  AnimatedImposterPreBakeConfig,
  AnimatedImposterPreBakeInput,
  AnimatedImposterRuntimeAttribute,
  AnimatedImposterTextureFormat,
  AnimatedImposterTextureLayout,
  AnimatedImposterTextureMode,
  AnimatedImposterWarning,
} from '../kiln/imposter/animated-schema';

// =============================================================================
// Re-exports (the code-gen schemas ARE the kiln schemas today)
// =============================================================================

export const KilnGenerateRequestSchema = CodeGenInputSchema;
export type KilnGenerateRequest = z.infer<typeof KilnGenerateRequestSchema>;

export const KilnGenerateResultSchema = CodeGenOutputSchema.extend({
  success: z.boolean(),
  sessionId: z.string().optional(),
  error: z.string().optional(),
}).strict();
export type KilnGenerateResult = z.infer<typeof KilnGenerateResultSchema>;

export const KilnRefactorInputSchema = CodeRefactorInputSchema;
export type KilnRefactorInput = z.infer<typeof KilnRefactorInputSchema>;

export const KilnCompactInputSchema = CodeCompactInputSchema;
export type KilnCompactInput = z.infer<typeof KilnCompactInputSchema>;

// =============================================================================
// Kiln-specific output
// =============================================================================

export const KilnRenderOutputSchema = z
  .object({
    /** GLB bytes. */
    glb: z.instanceof(Buffer),
    /** Triangle count extracted from the rendered scene. */
    tris: z.number().int().nonnegative(),
    meta: z
      .object({
        name: z.string().optional(),
        category: z.string().optional(),
        tris: z.number().int().nonnegative().optional(),
      })
      .passthrough(),
    warnings: z.array(z.string()).default([]),
  })
  .strict();
export type KilnRenderOutput = z.infer<typeof KilnRenderOutputSchema>;

export const KilnValidationResultSchema = z
  .object({
    valid: z.boolean(),
    errors: z.array(z.string()),
  })
  .strict();
export type KilnValidationResult = z.infer<typeof KilnValidationResultSchema>;
