/**
 * Image generation namespace.
 *
 *   import { image } from '@pixel-forge/core';
 *   image.pipelines.Pipeline<...>;
 *
 * The actual generate facade (auto-routing across gemini/openai/fal) lands
 * in W3a.5 as `image.generate(...)`. W2 only ships the pipelines
 * sub-namespace so W4 pipelines can code against a stable Pipeline
 * interface.
 */

export * as pipelines from './pipelines';
