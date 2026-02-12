import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { compress } from 'hono/compress';
import { bodyLimit } from 'hono/body-limit';
import { imageRouter } from './routes/image';
import { modelRouter } from './routes/model';
import { kilnRouter } from './routes/kiln';
import { exportRouter } from './routes/export';
import { isAppError, getErrorMessage } from './lib/errors';
import { logger as pixelLogger } from '@pixel-forge/shared/logger';
import { rateLimit } from './middleware/rateLimit';
import { requestTimeout } from './middleware/timeout';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: (origin) => {
      // Allow requests from any localhost or 192.168.x.x address
      if (!origin) return origin;
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) return origin;
      if (origin.match(/^https?:\/\/192\.168\.\d+\.\d+/)) return origin;
      return null;
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    maxAge: 86400, // Cache preflight for 24 hours
  })
);
app.use('*', compress());
app.use('*', bodyLimit({ maxSize: 10 * 1024 * 1024 })); // 10MB default

// Health check
app.get('/health', requestTimeout(5000), (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes with rate limiting and timeouts
app.route(
  '/api/image',
  imageRouter
    .use('*', requestTimeout(180000))
    .use('*', rateLimit({ windowMs: 60000, maxRequests: 10 }))
);
app.route(
  '/api/model',
  modelRouter
    .use('*', requestTimeout(180000))
    .use('*', rateLimit({ windowMs: 60000, maxRequests: 10 }))
);
app.route(
  '/api/kiln',
  kilnRouter
    .use('*', requestTimeout(180000))
    .use('*', rateLimit({ windowMs: 60000, maxRequests: 10 }))
);
app.route(
  '/api/export',
  exportRouter
    .use('*', requestTimeout(60000))
    .use('*', rateLimit({ windowMs: 60000, maxRequests: 30 }))
);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found', path: c.req.path }, 404);
});

// Error handler with proper status codes
app.onError((err, c) => {
  pixelLogger.error('Server error:', err);

  // Handle custom AppError types
  if (isAppError(err)) {
    return c.json(
      {
        error: err.message,
        code: err.statusCode,
      },
      err.statusCode as 400 | 401 | 403 | 404 | 409 | 429 | 500 | 503
    );
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    return c.json(
      {
        error: 'Validation failed',
        details: (err as { issues?: unknown[] }).issues,
      },
      400
    );
  }

  // Default to 500 for unknown errors
  return c.json({ error: getErrorMessage(err) }, 500);
});

// Validate required environment variables
const requiredEnvVars = ['GEMINI_API_KEY', 'FAL_KEY'] as const;
const missing = requiredEnvVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  pixelLogger.warn(
    `Missing environment variables: ${missing.join(', ')}. Some features may not work. See .env.example for setup.`
  );
}

const port = parseInt(process.env.PORT || '3000', 10);

pixelLogger.info(`Starting server on port ${port}...`);

export default {
  port,
  fetch: app.fetch,
};
