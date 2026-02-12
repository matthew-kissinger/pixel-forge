import type { Context, Next } from 'hono';
import { TooManyRequestsError } from '../lib/errors';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

const globalStore = new Map<string, RequestRecord>();

// Clean up old entries every 5 minutes
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of globalStore.entries()) {
    if (now > record.resetTime) {
      globalStore.delete(key);
    }
  }
}, 5 * 60 * 1000);
cleanupInterval.unref();

export function rateLimit(config: RateLimitConfig, store = globalStore) {
  return async (c: Context, next: Next) => {
    const forwarded = c.req.header('x-forwarded-for');
    const first = forwarded?.split(',')[0];
    const ip = (typeof first === 'string' && first.trim() !== '') ? first.trim() : c.req.header('x-real-ip') || 'unknown';
    const key = `${ip}:${c.req.path}`;
    const now = Date.now();

    let record = store.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      store.set(key, record);
    }

    record.count++;

    if (record.count > config.maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      c.header('Retry-After', String(retryAfter));
      throw new TooManyRequestsError('Rate limit exceeded', retryAfter);
    }

    await next();
  };
}
