export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryableStatuses?: number[];
  signal?: AbortSignal;
}

const DEFAULT_RETRYABLE_STATUSES = [429, 500, 502, 503, 504];

function createAbortError(): Error {
  const error = new Error('The operation was aborted.');
  error.name = 'AbortError';
  return error;
}

function isAbortError(error: unknown): boolean {
  return Boolean(error instanceof Error && error.name === 'AbortError');
}

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const maybeStatus = (error as { status?: unknown }).status;
  if (typeof maybeStatus === 'number') return maybeStatus;
  const maybeStatusCode = (error as { statusCode?: unknown }).statusCode;
  if (typeof maybeStatusCode === 'number') return maybeStatusCode;
  return undefined;
}

function getRetryAfterSeconds(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const retryAfter = (error as { retryAfter?: unknown }).retryAfter;
  if (typeof retryAfter === 'number' && Number.isFinite(retryAfter) && retryAfter > 0) {
    return retryAfter;
  }
  return undefined;
}

function getBackoffDelayMs(attempt: number, baseDelay: number, maxDelay: number): number {
  const jitter = Math.random() * baseDelay;
  const delay = baseDelay * 2 ** attempt + jitter;
  return Math.min(delay, maxDelay);
}

async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return;
  if (signal?.aborted) throw createAbortError();

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const onAbort = () => {
      cleanup();
      reject(createAbortError());
    };

    const cleanup = () => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
    };

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    retryableStatuses = DEFAULT_RETRYABLE_STATUSES,
    signal,
  } = options;

  let attempt = 0;

  while (true) {
    if (signal?.aborted) {
      throw createAbortError();
    }

    try {
      return await fn();
    } catch (error) {
      if (signal?.aborted || isAbortError(error)) {
        throw error;
      }

      const status = getErrorStatus(error);
      const shouldRetry =
        typeof status === 'number' ? retryableStatuses.includes(status) : true;

      if (!shouldRetry || attempt >= maxRetries) {
        throw error;
      }

      const retryAfterSeconds = status === 429 ? getRetryAfterSeconds(error) : undefined;
      const delayMs = retryAfterSeconds
        ? Math.min(retryAfterSeconds * 1000, maxDelay)
        : getBackoffDelayMs(attempt, baseDelay, maxDelay);

      attempt += 1;
      await sleep(delayMs, signal);
    }
  }
}
