import { expect, test, describe } from 'bun:test';
import { Hono } from 'hono';
import {
  AppError,
  NotFoundError,
  BadRequestError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  TooManyRequestsError,
  InternalServerError,
  ServiceUnavailableError,
  isAppError,
  getErrorMessage,
} from '../src/lib/errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    test('sets statusCode, message, and isOperational', () => {
      const err = new AppError('test error', 418);
      expect(err.message).toBe('test error');
      expect(err.statusCode).toBe(418);
      expect(err.isOperational).toBe(true);
    });

    test('isOperational defaults to true', () => {
      const err = new AppError('op', 400);
      expect(err.isOperational).toBe(true);
    });

    test('isOperational can be set to false', () => {
      const err = new AppError('fatal', 500, false);
      expect(err.isOperational).toBe(false);
    });

    test('is instance of Error', () => {
      const err = new AppError('test', 400);
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(AppError);
    });
  });

  describe('NotFoundError', () => {
    test('statusCode 404 with default message', () => {
      const err = new NotFoundError();
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe('Resource not found');
      expect(err.isOperational).toBe(true);
    });

    test('accepts custom message', () => {
      const err = new NotFoundError('User not found');
      expect(err.message).toBe('User not found');
      expect(err.statusCode).toBe(404);
    });
  });

  describe('BadRequestError', () => {
    test('statusCode 400 with default message', () => {
      const err = new BadRequestError();
      expect(err.statusCode).toBe(400);
      expect(err.message).toBe('Bad request');
    });
  });

  describe('ValidationError', () => {
    test('statusCode 400 with default message', () => {
      const err = new ValidationError();
      expect(err.statusCode).toBe(400);
      expect(err.message).toBe('Validation failed');
    });

    test('stores field and details', () => {
      const err = new ValidationError('Invalid email', 'email', { min: 5 });
      expect(err.field).toBe('email');
      expect(err.details).toEqual({ min: 5 });
      expect(err.statusCode).toBe(400);
    });

    test('field and details are optional', () => {
      const err = new ValidationError('bad');
      expect(err.field).toBeUndefined();
      expect(err.details).toBeUndefined();
    });
  });

  describe('UnauthorizedError', () => {
    test('statusCode 401 with default message', () => {
      const err = new UnauthorizedError();
      expect(err.statusCode).toBe(401);
      expect(err.message).toBe('Unauthorized');
    });
  });

  describe('ForbiddenError', () => {
    test('statusCode 403 with default message', () => {
      const err = new ForbiddenError();
      expect(err.statusCode).toBe(403);
      expect(err.message).toBe('Forbidden');
    });
  });

  describe('ConflictError', () => {
    test('statusCode 409 with default message', () => {
      const err = new ConflictError();
      expect(err.statusCode).toBe(409);
      expect(err.message).toBe('Conflict');
    });
  });

  describe('TooManyRequestsError', () => {
    test('statusCode 429 with default message', () => {
      const err = new TooManyRequestsError();
      expect(err.statusCode).toBe(429);
      expect(err.message).toBe('Too many requests');
    });

    test('stores retryAfter', () => {
      const err = new TooManyRequestsError('slow down', 60);
      expect(err.retryAfter).toBe(60);
      expect(err.statusCode).toBe(429);
    });

    test('retryAfter is optional', () => {
      const err = new TooManyRequestsError();
      expect(err.retryAfter).toBeUndefined();
    });
  });

  describe('InternalServerError', () => {
    test('statusCode 500 with isOperational false', () => {
      const err = new InternalServerError();
      expect(err.statusCode).toBe(500);
      expect(err.message).toBe('Internal server error');
      expect(err.isOperational).toBe(false);
    });
  });

  describe('ServiceUnavailableError', () => {
    test('statusCode 503 with default message', () => {
      const err = new ServiceUnavailableError();
      expect(err.statusCode).toBe(503);
      expect(err.message).toBe('Service unavailable');
      expect(err.isOperational).toBe(true);
    });
  });
});

describe('Utility Functions', () => {
  describe('isAppError', () => {
    test('returns true for AppError instances', () => {
      expect(isAppError(new AppError('test', 400))).toBe(true);
      expect(isAppError(new NotFoundError())).toBe(true);
      expect(isAppError(new InternalServerError())).toBe(true);
    });

    test('returns false for regular Error', () => {
      expect(isAppError(new Error('regular'))).toBe(false);
    });

    test('returns false for non-Error values', () => {
      expect(isAppError('string')).toBe(false);
      expect(isAppError(null)).toBe(false);
      expect(isAppError(undefined)).toBe(false);
      expect(isAppError(42)).toBe(false);
      expect(isAppError({})).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    test('extracts message from Error', () => {
      expect(getErrorMessage(new Error('hello'))).toBe('hello');
    });

    test('extracts message from AppError', () => {
      expect(getErrorMessage(new NotFoundError('gone'))).toBe('gone');
    });

    test('stringifies non-Error values', () => {
      expect(getErrorMessage('oops')).toBe('oops');
      expect(getErrorMessage(42)).toBe('42');
      expect(getErrorMessage(null)).toBe('null');
      expect(getErrorMessage(undefined)).toBe('undefined');
    });
  });
});

describe('Error Handler Integration', () => {
  function createTestApp() {
    const testApp = new Hono();

    testApp.get('/throw-app-error', () => {
      throw new NotFoundError('item missing');
    });

    testApp.get('/throw-bad-request', () => {
      throw new BadRequestError('invalid input');
    });

    testApp.get('/throw-zod-error', () => {
      const err = new Error('validation');
      err.name = 'ZodError';
      (err as any).issues = [{ path: ['field'], message: 'required' }];
      throw err;
    });

    testApp.get('/throw-unknown', () => {
      throw new Error('something broke');
    });

    // Mirror the error handler from src/index.ts
    testApp.onError((err: Error, c: any) => {
      if (isAppError(err)) {
        return c.json({ error: err.message, code: err.statusCode }, err.statusCode);
      }
      if (err.name === 'ZodError') {
        return c.json({ error: 'Validation failed', details: (err as any).issues }, 400);
      }
      return c.json({ error: getErrorMessage(err) }, 500);
    });

    return testApp;
  }

  const testApp = createTestApp();
  const base = 'http://localhost';

  test('AppError returns correct status and JSON body', async () => {
    const res = await testApp.fetch(new Request(`${base}/throw-app-error`));
    expect(res.status).toBe(404);
    const data = (await res.json()) as { error: string; code: number };
    expect(data.error).toBe('item missing');
    expect(data.code).toBe(404);
  });

  test('BadRequestError returns 400', async () => {
    const res = await testApp.fetch(new Request(`${base}/throw-bad-request`));
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string; code: number };
    expect(data.error).toBe('invalid input');
    expect(data.code).toBe(400);
  });

  test('ZodError returns 400 with validation details', async () => {
    const res = await testApp.fetch(new Request(`${base}/throw-zod-error`));
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string; details: unknown[] };
    expect(data.error).toBe('Validation failed');
    expect(data.details).toEqual([{ path: ['field'], message: 'required' }]);
  });

  test('unknown error returns 500', async () => {
    const res = await testApp.fetch(new Request(`${base}/throw-unknown`));
    expect(res.status).toBe(500);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe('something broke');
  });
});
