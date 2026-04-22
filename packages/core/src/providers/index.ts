/**
 * Provider contracts + implementations.
 *
 *   import { providers } from '@pixel-forge/core';
 *   const gemini: providers.ImageProvider = providers.createGeminiProvider();
 *
 * Interfaces land first (W2.3); W3a fills in the implementations (gemini,
 * fal, openai, anthropic adapter). Each factory is side-effect free at
 * import time — API key probing happens only when the factory is called.
 */

export type {
  ImageProvider,
  TextureProvider,
  BgRemovalProvider,
  CodeGenProvider,
  AnyProvider,
} from './types';

export {
  createGeminiProvider,
  type GeminiProviderOptions,
} from './gemini';

export {
  createFalTextureProvider,
  createFalBgRemovalProvider,
  type FalTextureProviderOptions,
  type FalBgRemovalProviderOptions,
} from './fal';

export {
  createAnthropicProvider,
  type AnthropicProviderOptions,
} from './anthropic';

export {
  createOpenAIProvider,
  type OpenAIProviderOptions,
} from './openai';
