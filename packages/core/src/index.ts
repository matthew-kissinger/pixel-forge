/**
 * @pixel-forge/core
 *
 * Headless, browser-free building blocks for Pixel Forge.
 * Public API is grouped by domain — agents should import the namespace they need:
 *
 *   import { kiln } from '@pixel-forge/core';
 *   const { glb, meta, warnings } = await kiln.generate(prompt, opts);
 *
 *   import { image, providers, capabilities } from '@pixel-forge/core';
 *
 * Kiln (3D model generation) is the first real surface. image/ providers/
 * schemas/ are scaffolded stubs — W2+ fills them in.
 */

export * as kiln from './kiln';
export * as image from './image';
export * as providers from './providers';
export * as schemas from './schemas';
export { capabilities } from './capabilities';
export * from './errors';
export {
  writeProvenance,
  hashContent,
  type ProvenanceInput,
  type ProvenanceCodeInfo,
  type ProvenanceRefInfo,
} from './provenance';
