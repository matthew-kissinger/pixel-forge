/**
 * Image generation namespace.
 *
 *   import { image } from '@pixel-forge/core';
 *   const facade = image.createImageGen({ providers: { gemini, openai } });
 *   const out = await facade.generate({ prompt });
 *   // Or: image.getDefaultImageGen() for a lazy-constructed singleton.
 *   image.chromaCleanMagenta(buf);
 *
 * The auto-routing facade (gemini/openai) lands in W3a.5. W4 wires the
 * pipelines sub-namespace + reusable chroma + texture-processing utilities.
 */

export * as pipelines from './pipelines';

export {
  createImageGen,
  getDefaultImageGen,
  _resetDefaultImageGen,
  type ImageGenFacade,
  type ImageProviderRegistry,
  type CreateImageGenOptions,
} from './facade';

export {
  chromaCleanMagenta,
  chromaCleanMagentaPreserveFlash,
  chromaCleanBlue,
  chromaCleanGreen,
  chromaCleanFor,
  type ChromaBackground,
  type ChromaResult,
} from './chroma';

export {
  pixelateNearest,
  upscaleNearest,
  quantizePalette,
  cleanNearBlacks,
  type CleanNearBlacksOptions,
  type CleanNearBlacksResult,
} from './texture-processing';
