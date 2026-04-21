/**
 * Provider contracts.
 *
 *   import { providers } from '@pixel-forge/core';
 *   const gemini: providers.ImageProvider = ...;
 *
 * W3 wires up real implementations (`gemini.ts`, `openai.ts`, `fal.ts`,
 * `claude.ts`). W2 lands only the contracts so downstream waves can code
 * against them in parallel.
 */

export type {
  ImageProvider,
  TextureProvider,
  BgRemovalProvider,
  CodeGenProvider,
  AnyProvider,
} from './types';
