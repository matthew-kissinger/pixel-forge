/**
 * Pipeline-internal helpers.
 *
 * Every concrete pipeline (sprite, icon, texture, soldier-set, glb,
 * batch) routes thrown errors through `wrapStep` so they consistently
 * surface as `PipelineStepFailed` with a structured `.underlying`.
 *
 * Providers SHOULD throw `PixelForgeError` subclasses. When they don't
 * (test mocks, third-party SDKs, anonymous Errors), `wrapStep` adapts
 * the throw into a {@link PipelineUnderlyingRaw} shell so the
 * `.underlying.message` chain still works.
 */

import {
  PixelForgeError,
  PipelineStepFailed,
  isPixelForgeError,
} from '../../errors';

/**
 * Minimal stand-in for "a raw Error a provider threw without converting
 * to a PixelForgeError". We use it as the `.underlying` so callers can
 * still read `.message` and `.cause` uniformly.
 */
export class PipelineUnderlyingRaw extends PixelForgeError {
  override readonly code = 'PIPELINE_UNDERLYING_RAW';

  constructor(init: { message: string; cause?: unknown }) {
    super({
      message: init.message,
      retryable: false,
      ...(init.cause !== undefined ? { cause: init.cause } : {}),
    });
  }
}

/** Wrap any thrown value into a `PipelineStepFailed`. */
export function wrapStep(
  pipeline: string,
  step: string,
  err: unknown
): PipelineStepFailed {
  if (isPixelForgeError(err)) {
    return new PipelineStepFailed({
      pipeline,
      step,
      message: `Pipeline '${pipeline}' step '${step}' failed: ${err.message}`,
      underlying: err,
    });
  }
  const message = err instanceof Error ? err.message : String(err);
  const underlying = new PipelineUnderlyingRaw({ message, cause: err });
  return new PipelineStepFailed({
    pipeline,
    step,
    message: `Pipeline '${pipeline}' step '${step}' failed: ${message}`,
    underlying,
  });
}
