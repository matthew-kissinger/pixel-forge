/**
 * Lazy provider registry for the MCP adapter.
 *
 * Identical shape to `packages/cli/src/providers.ts` — kept duplicated
 * deliberately so each adapter can be reasoned about in isolation. Both
 * delegate to `@pixel-forge/core`'s `providers.create*` factories and
 * surface the same `ProviderAuthFailed` error when an env var is missing.
 *
 * The registry is built lazily on first use, then cached, so a cold
 * stdio session that only ever calls `providers_capabilities` never has
 * to construct an OpenAI client.
 */

import {
  providers,
  ProviderAuthFailed,
} from '@pixel-forge/core';

export interface ProviderRegistry {
  image?: providers.ImageProvider;
  bgRemoval?: providers.BgRemovalProvider;
  texture?: providers.TextureProvider;
  codegen?: providers.CodeGenProvider;
}

let cached: ProviderRegistry | undefined;

export function loadProvidersFromEnv(): ProviderRegistry {
  if (cached) return cached;
  const registry: ProviderRegistry = {};

  if (process.env['OPENAI_API_KEY']) {
    try {
      registry.image = providers.createOpenAIProvider();
    } catch (err) {
      if (!(err instanceof ProviderAuthFailed)) throw err;
    }
  } else if (process.env['GEMINI_API_KEY']) {
    try {
      registry.image = providers.createGeminiProvider();
    } catch (err) {
      if (!(err instanceof ProviderAuthFailed)) throw err;
    }
  }

  if (process.env['FAL_KEY']) {
    try {
      registry.bgRemoval = providers.createFalBgRemovalProvider();
      registry.texture = providers.createFalTextureProvider();
    } catch (err) {
      if (!(err instanceof ProviderAuthFailed)) throw err;
    }
  }

  if (process.env['ANTHROPIC_API_KEY']) {
    try {
      registry.codegen = providers.createAnthropicProvider();
    } catch (err) {
      if (!(err instanceof ProviderAuthFailed)) throw err;
    }
  }

  cached = registry;
  return registry;
}

export function requireProvider<K extends keyof ProviderRegistry>(
  registry: ProviderRegistry,
  key: K,
  envVar: string,
): NonNullable<ProviderRegistry[K]> {
  const provider = registry[key];
  if (!provider) {
    throw new ProviderAuthFailed({
      provider: String(key),
      message: `Missing provider '${key}'. Set ${envVar} in your environment.`,
      envVar,
    });
  }
  return provider as NonNullable<ProviderRegistry[K]>;
}

/** Reset the cache — test hook. */
export function _resetCache(): void {
  cached = undefined;
}
