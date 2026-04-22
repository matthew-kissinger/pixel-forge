/**
 * Anthropic code-gen provider adapter (`CodeGenProvider`).
 *
 * Thin façade over `@pixel-forge/core/kiln` — the real implementation lives
 * in `kiln/generate.ts`. This module re-shapes those entry points as a
 * {@link CodeGenProvider} so the provider routing layer can dispatch to it
 * alongside the image providers.
 *
 * - `generate(input)` → `generateKilnCode` (or `editKilnCode` when
 *   `existingCode` is present).
 * - `refactor(input)` → `refactorCode` with `target='geometry'`.
 * - `compact(input)`  → `compactCode` (Haiku).
 *
 * Errors from the underlying Claude Agent SDK bubble up through the kiln
 * module as plain `Error` — we translate them into the structured taxonomy.
 */

import { capabilitiesFor } from '../capabilities';
import {
  ProviderAuthFailed,
  ProviderNetworkError,
  ProviderRateLimited,
  ProviderCapabilityMismatch,
  ProviderTimeout,
} from '../errors';
import {
  generateKilnCode,
  editKilnCode,
  compactCode,
  refactorCode,
  type KilnGenerateResult,
} from '../kiln';
import type {
  CodeCompactInput,
  CodeGenInput,
  CodeGenOutput,
  CodeRefactorInput,
} from '../schemas/image';
import type { CodeGenProvider } from './types';

// =============================================================================
// Factory
// =============================================================================

export interface AnthropicProviderOptions {
  /** Override the default Opus model id. */
  model?: string;
  /** Per-call timeout in ms. */
  timeoutMs?: number;
}

/**
 * Create an Anthropic `CodeGenProvider`. The API key is not read directly
 * here — the Claude Agent SDK resolves it via `ANTHROPIC_API_KEY` in the
 * environment, exactly like the kiln entry points it wraps.
 */
export function createAnthropicProvider(
  apiKey?: string,
  opts: AnthropicProviderOptions = {},
): CodeGenProvider {
  // Surface the key up-front so failure happens at factory-time (agents get a
  // clean error before they spin up an expensive Kiln query).
  const resolvedKey = apiKey ?? process.env['ANTHROPIC_API_KEY'];
  if (!resolvedKey) {
    throw new ProviderAuthFailed({
      provider: 'anthropic',
      envVar: 'ANTHROPIC_API_KEY',
      message: 'ANTHROPIC_API_KEY is not set.',
    });
  }
  if (apiKey) {
    // Surface it into the process env so the nested Claude Code SDK picks it
    // up without requiring the caller to set it globally.
    process.env['ANTHROPIC_API_KEY'] = apiKey;
  }

  const caps = capabilitiesFor('anthropic');
  if (!caps) {
    throw new ProviderCapabilityMismatch({
      provider: 'anthropic',
      requirement: 'code-gen',
      message: 'Anthropic code-gen capabilities are not registered.',
    });
  }

  const defaultModel = opts.model;
  const defaultTimeout = opts.timeoutMs;

  return {
    id: 'anthropic',
    capabilities: caps,

    async generate(input: CodeGenInput): Promise<CodeGenOutput> {
      const callOpts = {
        ...(defaultModel !== undefined ? { model: defaultModel } : {}),
        ...(defaultTimeout !== undefined ? { timeoutMs: defaultTimeout } : {}),
      };

      try {
        const result = input.existingCode
          ? await editKilnCode(input.existingCode, input.prompt, input.mode, callOpts)
          : await generateKilnCode(
              {
                prompt: input.prompt,
                mode: input.mode,
                category: input.category,
                style: input.style,
                budget: input.budget,
                includeAnimation: input.includeAnimation,
                existingCode: input.existingCode,
                referenceImageUrl: input.referenceImageUrl,
              },
              callOpts,
            );
        return translateResult(result);
      } catch (err) {
        throw translateError(err);
      }
    },

    async refactor(input: CodeRefactorInput): Promise<CodeGenOutput> {
      const callOpts = {
        ...(defaultModel !== undefined ? { model: defaultModel } : {}),
        ...(defaultTimeout !== undefined ? { timeoutMs: defaultTimeout } : {}),
      };
      try {
        const result = await refactorCode(
          {
            instruction: input.instruction,
            geometryCode: input.code,
            target: 'geometry',
          },
          callOpts,
        );
        return translateResult(result);
      } catch (err) {
        throw translateError(err);
      }
    },

    async compact(input: CodeCompactInput): Promise<CodeGenOutput> {
      const callOpts = {
        ...(defaultTimeout !== undefined ? { timeoutMs: defaultTimeout } : {}),
      };
      try {
        const result = await compactCode(input.code, callOpts);
        return translateResult(result);
      } catch (err) {
        throw translateError(err);
      }
    },
  };
}

// =============================================================================
// Internals
// =============================================================================

function translateResult(result: KilnGenerateResult): CodeGenOutput {
  if (!result.success || !result.code) {
    // Kiln never throws on a soft failure — it returns `{ success: false }`.
    // Route that into a structured error so the caller doesn't need to
    // special-case success-boolean returns.
    const msg = result.error ?? 'Unknown Kiln failure';
    throw translateError(new Error(msg));
  }
  return {
    code: result.code,
    ...(result.effectCode !== undefined ? { effectCode: result.effectCode } : {}),
    ...(result.usage !== undefined ? { usage: result.usage } : {}),
    warnings: [],
  };
}

function translateError(err: unknown): Error {
  if (
    err instanceof ProviderRateLimited ||
    err instanceof ProviderAuthFailed ||
    err instanceof ProviderTimeout ||
    err instanceof ProviderNetworkError ||
    err instanceof ProviderCapabilityMismatch
  ) {
    return err;
  }

  if (!(err instanceof Error)) {
    return new ProviderNetworkError({
      provider: 'anthropic',
      message: 'Unknown non-Error value thrown by Claude Agent SDK.',
      cause: err,
    });
  }

  const msg = err.message.toLowerCase();

  if (msg.includes('rate limit') || msg.includes('429') || msg.includes('quota')) {
    return new ProviderRateLimited({
      provider: 'anthropic',
      message: err.message,
      cause: err,
    });
  }
  if (
    msg.includes('auth') ||
    msg.includes('unauthorized') ||
    msg.includes('401') ||
    msg.includes('api key')
  ) {
    return new ProviderAuthFailed({
      provider: 'anthropic',
      envVar: 'ANTHROPIC_API_KEY',
      message: err.message,
      cause: err,
    });
  }
  if (msg.includes('timeout') || msg.includes('abort')) {
    return new ProviderTimeout({
      provider: 'anthropic',
      message: err.message,
      cause: err,
    });
  }
  return new ProviderNetworkError({
    provider: 'anthropic',
    message: err.message,
    cause: err,
  });
}
