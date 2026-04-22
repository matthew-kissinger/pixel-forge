/**
 * Provider factory for the CLI adapter.
 *
 * Wires `@pixel-forge/core` providers from environment variables. Bun
 * auto-loads `.env.local` so callers don't need a dotenv shim.
 *
 * Each factory is wrapped in a try/catch so that, e.g., a CLI invocation
 * that only needs Gemini doesn't crash because OPENAI_API_KEY is missing.
 * Consumers must check `.image`/`.codegen` for `undefined` before use,
 * or rely on `loadProviders()` which throws structured `ProviderAuthFailed`
 * for the providers each command actually needs.
 */

import {
  providers,
  ProviderAuthFailed,
} from '@pixel-forge/core';

type ImageProvider = providers.ImageProvider;
type BgRemovalProvider = providers.BgRemovalProvider;
type TextureProvider = providers.TextureProvider;
type CodeGenProvider = providers.CodeGenProvider;

export interface ProviderRegistry {
  image?: ImageProvider;
  bgRemoval?: BgRemovalProvider;
  texture?: TextureProvider;
  codegen?: CodeGenProvider;
}

/**
 * Lazily build every provider that has the requisite env var present.
 * Missing creds surface as `undefined` slots rather than throwing — commands
 * call `requireProvider()` for the slot they actually need so the error
 * message tells the user *which* env var to set.
 */
export function loadProvidersFromEnv(): ProviderRegistry {
  const registry: ProviderRegistry = {};

  // Image: prefer OpenAI when both keys present (multi-ref fidelity), else
  // fall back to Gemini. Pipelines don't care which one — they accept any
  // ImageProvider.
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

  return registry;
}

/**
 * Throw a friendly error if the named provider isn't configured. CLI
 * commands call this immediately so the error surfaces before any work
 * is attempted.
 */
export function requireProvider<K extends keyof ProviderRegistry>(
  registry: ProviderRegistry,
  key: K,
  envVar: string,
): NonNullable<ProviderRegistry[K]> {
  const provider = registry[key];
  if (!provider) {
    throw new ProviderAuthFailed({
      provider: String(key),
      message: `Missing provider '${key}'. Set ${envVar} in your environment (or packages/server/.env.local).`,
      envVar,
    });
  }
  return provider as NonNullable<ProviderRegistry[K]>;
}
