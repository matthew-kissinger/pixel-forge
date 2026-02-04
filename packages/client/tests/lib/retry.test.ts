import { describe, it, expect, vi, afterEach } from 'vitest';
import { retryWithBackoff } from '../../src/lib/retry';

const createError = (status: number, retryAfter?: number) => {
  const error = new Error('fail') as Error & { status?: number; retryAfter?: number };
  error.status = status;
  if (typeof retryAfter === 'number') {
    error.retryAfter = retryAfter;
  }
  return error;
};

const flushPromises = async () => {
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
};

const advanceTimers = async (ms: number) => {
  vi.advanceTimersByTime(ms);
  await flushPromises();
};

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('retryWithBackoff', () => {
  it('returns the result immediately when the call succeeds', async () => {
    const fn = vi.fn().mockResolvedValue('ok');

    const result = await retryWithBackoff(fn);

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it.each([429, 500, 502, 503, 504])(
    'retries on retryable status %s',
    async (status) => {
      vi.useFakeTimers();
      vi.spyOn(Math, 'random').mockReturnValue(0);

      const fn = vi
        .fn()
        .mockRejectedValueOnce(createError(status))
        .mockResolvedValue('ok');

      const promise = retryWithBackoff(fn, { baseDelay: 10, maxDelay: 100 });

      await flushPromises();
      await advanceTimers(10);

      await expect(promise).resolves.toBe('ok');
      expect(fn).toHaveBeenCalledTimes(2);
    }
  );

  it.each([400, 401, 403, 404])(
    'does not retry on non-retryable status %s',
    async (status) => {
      const error = createError(status);
      const fn = vi.fn().mockRejectedValue(error);

      await expect(retryWithBackoff(fn)).rejects.toBe(error);
      expect(fn).toHaveBeenCalledTimes(1);
    }
  );

  it('increases the backoff delay between retries', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

    const fn = vi
      .fn()
      .mockRejectedValueOnce(createError(500))
      .mockRejectedValueOnce(createError(500))
      .mockResolvedValue('ok');

    const promise = retryWithBackoff(fn, { baseDelay: 100, maxDelay: 1000, maxRetries: 2 });

    await flushPromises();
    const firstDelay = setTimeoutSpy.mock.calls[0]?.[1] as number;
    expect(firstDelay).toBe(100);

    await advanceTimers(100);
    const secondDelay = setTimeoutSpy.mock.calls[1]?.[1] as number;
    expect(secondDelay).toBe(200);

    await advanceTimers(200);
    await expect(promise).resolves.toBe('ok');
  });

  it('adds jitter to backoff delays', async () => {
    vi.useFakeTimers();
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
    const randomSpy = vi.spyOn(Math, 'random');

    const runOnce = async (randomValue: number) => {
      randomSpy.mockReturnValueOnce(randomValue);
      const startIndex = setTimeoutSpy.mock.calls.length;
      const fn = vi
        .fn()
        .mockRejectedValueOnce(createError(500))
        .mockResolvedValue('ok');
      const promise = retryWithBackoff(fn, { baseDelay: 100, maxDelay: 1000, maxRetries: 1 });

      await flushPromises();
      const delay = setTimeoutSpy.mock.calls[startIndex]?.[1] as number;
      await advanceTimers(delay);
      await expect(promise).resolves.toBe('ok');

      return delay;
    };

    const firstDelay = await runOnce(0);
    vi.clearAllTimers();
    const secondDelay = await runOnce(0.9);

    expect(firstDelay).toBe(100);
    expect(secondDelay).toBe(190);
    expect(firstDelay).not.toBe(secondDelay);
  });

  it('respects the max retries limit', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const error = createError(500);
    const fn = vi.fn().mockRejectedValue(error);

    const promise = retryWithBackoff(fn, { maxRetries: 2, baseDelay: 10, maxDelay: 50 });

    await flushPromises();
    await advanceTimers(10);
    await advanceTimers(20);

    await expect(promise).rejects.toBe(error);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('respects Retry-After when present on 429 responses', async () => {
    vi.useFakeTimers();
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

    const fn = vi
      .fn()
      .mockRejectedValueOnce(createError(429, 5))
      .mockResolvedValue('ok');

    const promise = retryWithBackoff(fn, { baseDelay: 100, maxDelay: 10000 });

    await flushPromises();
    const delay = setTimeoutSpy.mock.calls[0]?.[1] as number;
    expect(delay).toBe(5000);

    await advanceTimers(5000);
    await expect(promise).resolves.toBe('ok');
  });

  it('stops retrying when the AbortSignal is aborted', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const fn = vi.fn().mockRejectedValue(createError(500));

    const promise = retryWithBackoff(fn, {
      baseDelay: 1000,
      maxDelay: 1000,
      maxRetries: 3,
      signal: controller.signal,
    });

    await flushPromises();
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('allows custom retryable status configuration', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const fn = vi
      .fn()
      .mockRejectedValueOnce(createError(400))
      .mockResolvedValue('ok');

    const promise = retryWithBackoff(fn, {
      baseDelay: 10,
      maxDelay: 50,
      retryableStatuses: [400],
    });

    await flushPromises();
    await advanceTimers(10);

    await expect(promise).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
