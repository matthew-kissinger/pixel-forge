/**
 * Structured error taxonomy for `@pixel-forge/core`.
 *
 * Every error in core extends {@link PixelForgeError} and carries four fields
 * designed for *agent consumption*:
 *
 * - `.code`     — stable machine-readable identifier (e.g. `'PROVIDER_RATE_LIMITED'`)
 * - `.message`  — human-readable description
 * - `.fixHint`  — short suggested next action (agent-facing)
 * - `.retryable`— whether a naive retry is appropriate
 * - `.cause`    — wrapped original error if any
 *
 * Usage:
 *
 * ```ts
 * try {
 *   await provider.generate(input);
 * } catch (e) {
 *   if (isPixelForgeError(e) && e.retryable) {
 *     // automated retry path
 *   } else if (e instanceof ProviderCapabilityMismatch) {
 *     // re-route to a different provider
 *   }
 * }
 * ```
 *
 * Agents should read `.fixHint` on a caught error and use it verbatim as
 * their rationale in any follow-up action or message to the user.
 */

// =============================================================================
// Base
// =============================================================================

export interface PixelForgeErrorInit {
  message: string;
  fixHint?: string;
  retryable?: boolean;
  cause?: unknown;
}

/**
 * Abstract base for every structured error raised inside `@pixel-forge/core`.
 * Do not throw directly — throw a concrete subclass with a stable `.code`.
 */
export abstract class PixelForgeError extends Error {
  /** Stable machine-readable identifier. Subclasses MUST set this. */
  abstract readonly code: string;

  /** Whether a naive retry of the same call is likely to succeed. */
  readonly retryable: boolean;

  /**
   * Short agent-facing suggestion. Should be one action item, not prose.
   * Example: `"Wait 60s and retry with fewer concurrent requests."`
   */
  readonly fixHint?: string;

  /** Wrapped original cause if the error is a translation of another error. */
  override readonly cause?: unknown;

  constructor(init: PixelForgeErrorInit) {
    super(init.message);
    this.name = new.target.name;
    this.retryable = init.retryable ?? false;
    if (init.fixHint !== undefined) this.fixHint = init.fixHint;
    if (init.cause !== undefined) this.cause = init.cause;
    // Preserve prototype chain across transpile / cross-realm boundaries.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * JSON-safe representation. Agents often serialize errors into structured
   * responses; this gives a stable shape.
   */
  toJSON(): {
    name: string;
    code: string;
    message: string;
    fixHint?: string;
    retryable: boolean;
  } {
    const out: {
      name: string;
      code: string;
      message: string;
      fixHint?: string;
      retryable: boolean;
    } = {
      name: this.name,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
    };
    if (this.fixHint !== undefined) out.fixHint = this.fixHint;
    return out;
  }
}

// =============================================================================
// Provider errors
// =============================================================================

/** Base for any error that originates from an external image / code-gen provider. */
export abstract class ProviderError extends PixelForgeError {
  /** `'gemini'`, `'openai'`, `'fal'`, `'anthropic'`, etc. */
  readonly provider: string;

  constructor(init: PixelForgeErrorInit & { provider: string }) {
    super(init);
    this.provider = init.provider;
  }
}

/**
 * Provider returned an explicit rate-limit signal (HTTP 429, quota exceeded,
 * "rate limit" in error body). Agents should back off then retry.
 */
export class ProviderRateLimited extends ProviderError {
  override readonly code = 'PROVIDER_RATE_LIMITED';

  /** Retry-After header from the provider, in seconds, if known. */
  readonly retryAfterSec?: number;

  constructor(
    init: PixelForgeErrorInit & { provider: string; retryAfterSec?: number }
  ) {
    super({
      fixHint:
        init.fixHint ??
        (init.retryAfterSec
          ? `Wait ${init.retryAfterSec}s then retry with lower concurrency.`
          : 'Back off 60s then retry with lower concurrency.'),
      retryable: init.retryable ?? true,
      ...init,
    });
    if (init.retryAfterSec !== undefined) this.retryAfterSec = init.retryAfterSec;
  }
}

/**
 * Provider rejected the request for authentication reasons (missing key,
 * invalid key, revoked token).
 */
export class ProviderAuthFailed extends ProviderError {
  override readonly code = 'PROVIDER_AUTH_FAILED';

  constructor(init: PixelForgeErrorInit & { provider: string; envVar?: string }) {
    super({
      fixHint:
        init.fixHint ??
        (init.envVar
          ? `Set ${init.envVar} in the environment. Check ~/.config/mk-agent/env.`
          : 'Verify the provider API key is set and current.'),
      retryable: false,
      ...init,
    });
  }
}

/**
 * The requested operation can't be satisfied by the chosen provider/model
 * combination (e.g. asking gpt-image-2 for `background: "transparent"`,
 * asking gemini for 20 reference images).
 *
 * Agents should call `capabilities()` and re-route to a supporting provider.
 */
export class ProviderCapabilityMismatch extends ProviderError {
  override readonly code = 'PROVIDER_CAPABILITY_MISMATCH';

  /** Name of the requirement that wasn't met. */
  readonly requirement: string;

  constructor(
    init: PixelForgeErrorInit & {
      provider: string;
      requirement: string;
      suggestedProvider?: string;
    }
  ) {
    super({
      fixHint:
        init.fixHint ??
        (init.suggestedProvider
          ? `Re-run with provider='${init.suggestedProvider}'.`
          : `Call capabilities() and pick a provider that supports '${init.requirement}'.`),
      retryable: false,
      ...init,
    });
    this.requirement = init.requirement;
  }
}

/** Provider call exceeded the configured timeout. Agents can usually retry. */
export class ProviderTimeout extends ProviderError {
  override readonly code = 'PROVIDER_TIMEOUT';

  /** The timeout (ms) that was exceeded. */
  readonly timeoutMs?: number;

  constructor(init: PixelForgeErrorInit & { provider: string; timeoutMs?: number }) {
    super({
      fixHint:
        init.fixHint ??
        'Retry once; if the timeout repeats, increase timeout or switch provider.',
      retryable: init.retryable ?? true,
      ...init,
    });
    if (init.timeoutMs !== undefined) this.timeoutMs = init.timeoutMs;
  }
}

/** Network-level failure talking to the provider (DNS, connect, TLS, socket). */
export class ProviderNetworkError extends ProviderError {
  override readonly code = 'PROVIDER_NETWORK_ERROR';

  constructor(init: PixelForgeErrorInit & { provider: string }) {
    super({
      fixHint: init.fixHint ?? 'Retry with backoff. If persistent, check connectivity.',
      retryable: init.retryable ?? true,
      ...init,
    });
  }
}

// =============================================================================
// Validation errors
// =============================================================================

/** Base for input/output shape validation failures. Not retryable. */
export abstract class ValidationError extends PixelForgeError {}

/**
 * A zod schema rejected the input or output payload. Agents should read
 * `issues` and correct the call shape rather than retrying.
 */
export class SchemaValidationFailed extends ValidationError {
  override readonly code = 'SCHEMA_VALIDATION_FAILED';

  /** Zod-style issue list (path + message pairs). */
  readonly issues: ReadonlyArray<{ path: readonly (string | number)[]; message: string }>;

  constructor(
    init: PixelForgeErrorInit & {
      issues: ReadonlyArray<{ path: readonly (string | number)[]; message: string }>;
    }
  ) {
    super({
      fixHint:
        init.fixHint ??
        'Read `issues` and correct the offending fields before retrying.',
      retryable: false,
      ...init,
    });
    this.issues = init.issues;
  }
}

/**
 * Kiln-generated code failed structural validation (no `build()`, stray
 * imports, wrong keyframe format, tri cap exceeded, joint-name mismatch).
 */
export class KilnCodeValidationFailed extends ValidationError {
  override readonly code = 'KILN_CODE_VALIDATION_FAILED';

  /** The raw code that failed — useful for retry-with-feedback. */
  readonly code_text: string;

  /** Validation issues — one per line of the LLM retry prompt. */
  readonly issues: readonly string[];

  constructor(
    init: PixelForgeErrorInit & { code_text: string; issues: readonly string[] }
  ) {
    super({
      fixHint:
        init.fixHint ??
        'Feed `issues` back to the code-gen provider as a retry prompt.',
      retryable: false,
      ...init,
    });
    this.code_text = init.code_text;
    this.issues = init.issues;
  }
}

// =============================================================================
// Kiln render errors
// =============================================================================

/** The sandboxed `new Function(code)` threw at execution time. */
export class KilnExecutionFailed extends PixelForgeError {
  override readonly code: string = 'KILN_EXECUTION_FAILED';

  /** Code snippet that blew up (for retry feedback). */
  readonly code_text?: string;

  constructor(init: PixelForgeErrorInit & { code_text?: string }) {
    super({
      fixHint:
        init.fixHint ??
        'Inspect `.cause` and feed back to Claude with the failing code.',
      retryable: false,
      ...init,
    });
    if (init.code_text !== undefined) this.code_text = init.code_text;
  }
}

/** Umbrella alias for consumers that only need "a kiln render failed". */
export class KilnRenderError extends KilnExecutionFailed {
  override readonly code: string = 'KILN_RENDER_ERROR';
}

// =============================================================================
// Pipeline errors
// =============================================================================

/** Pipeline input failed its top-level validation before any step ran. */
export class PipelineInputInvalid extends ValidationError {
  override readonly code = 'PIPELINE_INPUT_INVALID';

  /** Pipeline id (`'sprite'`, `'soldier-set'`, `'icon'`, etc). */
  readonly pipeline: string;

  constructor(init: PixelForgeErrorInit & { pipeline: string }) {
    super({
      fixHint: init.fixHint ?? 'Correct the input shape and retry.',
      retryable: false,
      ...init,
    });
    this.pipeline = init.pipeline;
  }
}

/**
 * A step within a multi-step pipeline failed. Wraps the underlying
 * {@link PixelForgeError} so the agent can drill down into the real cause
 * while still knowing which step produced it.
 */
export class PipelineStepFailed extends PixelForgeError {
  override readonly code: string = 'PIPELINE_STEP_FAILED';

  /** Pipeline id (`'sprite'`, `'texture'`, etc). */
  readonly pipeline: string;

  /** Step id within the pipeline (`'gemini-generate'`, `'chroma-clean'`, etc). */
  readonly step: string;

  /**
   * The underlying structured error from the step. Most commonly a
   * {@link ProviderError} or {@link KilnExecutionFailed}.
   */
  readonly underlying: PixelForgeError;

  constructor(
    init: PixelForgeErrorInit & {
      pipeline: string;
      step: string;
      underlying: PixelForgeError;
    }
  ) {
    super({
      fixHint: init.fixHint ?? init.underlying.fixHint,
      retryable: init.retryable ?? init.underlying.retryable,
      cause: init.cause ?? init.underlying,
      ...init,
    });
    this.pipeline = init.pipeline;
    this.step = init.step;
    this.underlying = init.underlying;
  }
}

/** Umbrella alias mirroring {@link KilnRenderError}. */
export class PipelineError extends PipelineStepFailed {
  override readonly code: string = 'PIPELINE_ERROR';
}

// =============================================================================
// Guards + unions
// =============================================================================

/** Type guard: did this throw come from `@pixel-forge/core`? */
export function isPixelForgeError(e: unknown): e is PixelForgeError {
  return e instanceof PixelForgeError;
}

/** Type union of every concrete error class exported from `@pixel-forge/core`. */
export type AnyPixelForgeError =
  | ProviderRateLimited
  | ProviderAuthFailed
  | ProviderCapabilityMismatch
  | ProviderTimeout
  | ProviderNetworkError
  | SchemaValidationFailed
  | KilnCodeValidationFailed
  | KilnExecutionFailed
  | KilnRenderError
  | PipelineInputInvalid
  | PipelineStepFailed
  | PipelineError;
