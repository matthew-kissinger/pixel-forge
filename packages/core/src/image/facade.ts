/**
 * Image generation facade with capability-based auto-routing.
 *
 * Agents hit this surface when they don't care which provider answers —
 * the facade picks gemini/openai/fal based on the input shape by consulting
 * `capabilities.pickProviderFor(...)`. Explicit provider selection via
 * `input.provider` bypasses routing.
 *
 *   import { image } from '@pixel-forge/core';
 *   const out = await image.generate({ prompt, provider: 'auto' });
 *
 * Construction:
 * - `createImageGen({ providers })` — inject provider map (tests, DI).
 * - `getDefaultImageGen()` — lazy singleton that instantiates real providers
 *   on first call. Throws structured `ProviderAuthFailed` when a needed
 *   env var is missing.
 */

import {
  pickProviderFor,
  type PickProviderResult,
} from '../capabilities';
import {
  ImageEditInputSchema,
  ImageGenerateInputSchema,
  type ImageEditInput,
  type ImageGenerateInput,
  type ImageGenerateOutput,
} from '../schemas/image';
import {
  ProviderAuthFailed,
  ProviderCapabilityMismatch,
  SchemaValidationFailed,
  isPixelForgeError,
} from '../errors';
import {
  createGeminiProvider,
  createOpenAIProvider,
} from '../providers';
import type { ImageProvider } from '../providers';

// =============================================================================
// Types
// =============================================================================

export interface ImageGenFacade {
  /**
   * Generate an image. If `input.refs` is present (non-empty), routes to
   * the ref-capable provider (`gpt-image-2` by default). Otherwise routes
   * based on capability rules.
   *
   * @throws `SchemaValidationFailed` on bad input shape.
   * @throws `ProviderCapabilityMismatch` if no registered provider satisfies
   *   the inferred requirements.
   * @throws `ProviderAuthFailed` if the chosen provider lacks credentials.
   */
  generate(
    input: ImageGenerateInput | ImageEditInput,
  ): Promise<ImageGenerateOutput>;
}

export interface ImageProviderRegistry {
  gemini?: ImageProvider;
  openai?: ImageProvider;
}

export interface CreateImageGenOptions {
  providers?: ImageProviderRegistry;
  /**
   * Enable fallback to the next-best provider on a retryable provider
   * failure. Default true.
   */
  allowFallback?: boolean;
}

// =============================================================================
// Facade
// =============================================================================

/**
 * Build a facade from an explicit provider map. Useful for tests and DI.
 * Missing providers are fine — they'll surface only if routing picks them.
 */
export function createImageGen(opts: CreateImageGenOptions = {}): ImageGenFacade {
  const registry = opts.providers ?? {};
  const allowFallback = opts.allowFallback ?? true;

  return {
    async generate(rawInput): Promise<ImageGenerateOutput> {
      const parsed = parseInput(rawInput);
      const refs = 'refs' in parsed ? parsed.refs : undefined;

      // Routing decision
      const req = {
        kind: 'image' as const,
        ...(refs?.length ? { refs: refs.length } : {}),
        ...(parsed.provider ? { preferProvider: parsed.provider } : {}),
      };
      const pick = pickProviderFor(req);
      if (pick.provider === 'none') {
        throw new ProviderCapabilityMismatch({
          provider: 'unknown',
          requirement: 'image',
          message: `No provider matches the request: ${pick.reason}`,
        });
      }

      const primary = resolveProvider(registry, pick);
      const warnings = [`Routing: ${pick.reason}`];

      try {
        const out = refs && refs.length > 0
          ? await primary.editWithRefs(parsed as ImageEditInput)
          : await primary.generate(parsed as ImageGenerateInput);
        out.meta.warnings = [...warnings, ...out.meta.warnings];
        return out;
      } catch (err) {
        if (
          allowFallback &&
          isPixelForgeError(err) &&
          err.retryable &&
          !parsed.provider // only auto-fallback when caller didn't pin
        ) {
          const alt = pickAlternateProvider(pick, refs?.length ?? 0);
          if (alt && alt.provider !== 'none' && alt.provider !== pick.provider) {
            try {
              const altProvider = resolveProvider(registry, alt);
              const out =
                refs && refs.length > 0
                  ? await altProvider.editWithRefs(parsed as ImageEditInput)
                  : await altProvider.generate(parsed as ImageGenerateInput);
              out.meta.warnings = [
                ...warnings,
                `Primary ${pick.provider} failed (${err.code}); fell back to ${alt.provider}: ${alt.reason}`,
                ...out.meta.warnings,
              ];
              return out;
            } catch {
              throw err;
            }
          }
        }
        throw err;
      }
    },
  };
}

// =============================================================================
// Lazy default singleton
// =============================================================================

let _default: ImageGenFacade | undefined;

/**
 * Return the process-wide default facade. Instantiates real providers on
 * first call; subsequent calls reuse them. Provider construction only
 * requires the env var for the provider actually routed to — the facade
 * is tolerant of one or the other being missing until that provider is
 * picked.
 */
export function getDefaultImageGen(): ImageGenFacade {
  if (_default) return _default;

  const providers: ImageProviderRegistry = {};
  try {
    providers.gemini = createGeminiProvider();
  } catch (err) {
    if (!(err instanceof ProviderAuthFailed)) throw err;
    // Lazy: defer until routing actually needs gemini.
  }
  try {
    providers.openai = createOpenAIProvider();
  } catch (err) {
    if (!(err instanceof ProviderAuthFailed)) throw err;
  }

  _default = createImageGen({ providers });
  return _default;
}

/**
 * Reset the default singleton. Test hook — production code should not
 * call this.
 */
export function _resetDefaultImageGen(): void {
  _default = undefined;
}

// =============================================================================
// Internals
// =============================================================================

function parseInput(
  raw: ImageGenerateInput | ImageEditInput,
): ImageGenerateInput | ImageEditInput {
  // Fast path: if the input looks like an edit request (has refs), use that
  // schema; otherwise fall back to the generate schema.
  const looksLikeEdit = raw && typeof raw === 'object' && Array.isArray((raw as { refs?: unknown }).refs);
  const schema = looksLikeEdit ? ImageEditInputSchema : ImageGenerateInputSchema;
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new SchemaValidationFailed({
      message: 'Image input failed schema validation.',
      issues: result.error.issues.map((i) => ({
        path: i.path.filter(
          (p): p is string | number => typeof p === 'string' || typeof p === 'number',
        ),
        message: i.message,
      })),
    });
  }
  return result.data;
}

function resolveProvider(
  registry: ImageProviderRegistry,
  pick: PickProviderResult,
): ImageProvider {
  if (pick.provider === 'gemini') {
    const p = registry.gemini ?? createGeminiProvider();
    registry.gemini = p;
    return p;
  }
  if (pick.provider === 'openai') {
    const p = registry.openai ?? createOpenAIProvider();
    registry.openai = p;
    return p;
  }
  // Should not be reachable — routing validated upstream.
  throw new ProviderCapabilityMismatch({
    provider: String(pick.provider),
    requirement: 'image',
    message: `Facade has no handler for provider '${pick.provider}'.`,
  });
}

/**
 * Given a failed primary routing pick, propose a fallback. Current policy:
 * openai <-> gemini as long as the ref cap allows. Never returns 'none'
 * unless no alternative exists.
 */
function pickAlternateProvider(
  primary: PickProviderResult,
  refs: number,
): PickProviderResult | undefined {
  if (primary.provider === 'gemini') {
    // Try OpenAI.
    return pickProviderFor({
      kind: 'image',
      ...(refs ? { refs } : {}),
      preferProvider: 'openai',
    });
  }
  if (primary.provider === 'openai') {
    // Try Gemini (as long as refs <= gemini's cap).
    return pickProviderFor({
      kind: 'image',
      ...(refs ? { refs } : {}),
      preferProvider: 'gemini',
    });
  }
  return undefined;
}
