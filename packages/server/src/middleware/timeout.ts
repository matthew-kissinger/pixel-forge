import { createMiddleware } from 'hono/factory';
import { ServiceUnavailableError } from '../lib/errors';

export function requestTimeout(ms: number) {
  return createMiddleware(async (c, next) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);

    try {
      await Promise.race([
        next(),
        new Promise((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new ServiceUnavailableError(`Request timed out after ${ms}ms`));
          });
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  });
}
