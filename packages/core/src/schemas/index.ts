/**
 * Zod schemas re-export surface.
 *
 * Adapters (CLI, MCP, server) use these to validate incoming JSON against
 * the same shape as the native typed calls.
 *
 *   import { schemas } from '@pixel-forge/core';
 *   schemas.ImageGenerateInputSchema.parse(raw);
 */

export * from './image';
export * from './kiln';
