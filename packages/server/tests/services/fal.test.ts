import { describe, it, expect, mock, beforeEach, afterAll } from 'bun:test';

type SubscribeImpl = (...args: any[]) => Promise<any>;
let subscribeImpl: SubscribeImpl = async () => ({});
const subscribeCalls: any[] = [];
const configCalls: any[] = [];
const mockSubscribe = (...args: any[]) => {
  subscribeCalls.push(args);
  return subscribeImpl(...args);
};
const mockConfig = (...args: any[]) => {
  configCalls.push(args);
};

mock.module('@fal-ai/serverless-client', () => ({
  config: mockConfig,
  subscribe: mockSubscribe,
}));

mock.module('@pixel-forge/shared/logger', () => ({
  logger: {
    debug: () => {},
    info: () => {},
    error: () => {},
  },
}));

let cleanupFn: (() => void) | null = null;
const originalSetInterval = globalThis.setInterval;
globalThis.setInterval = ((fn: () => void) => {
  cleanupFn = fn;
  return 0 as any;
}) as typeof setInterval;

let moduleCounter = 0;
const importFal = async () => {
  moduleCounter += 1;
  return await import(`../../src/services/fal?test=${moduleCounter}`);
};

const originalFetch = globalThis.fetch;

beforeEach(() => {
  process.env.FAL_KEY = 'test-key';
  subscribeImpl = async () => ({});
  subscribeCalls.length = 0;
  configCalls.length = 0;
  cleanupFn = null;
  globalThis.fetch = originalFetch;
});

afterAll(() => {
  globalThis.setInterval = originalSetInterval;
  globalThis.fetch = originalFetch;
});

describe('fal service', () => {
  it('generateModel returns a requestId and starts generation', async () => {
    subscribeImpl = async (_model: string, options: any) => {
      options.onQueueUpdate?.({
        status: 'IN_PROGRESS',
        logs: [{ message: '50% complete' }],
      });
      return { model_url: 'https://example.com/model.glb', thumbnail_url: 'https://example.com/thumb.png' };
    };

    const fal = await importFal();
    const result = await fal.generateModel('robot');
    expect(result.requestId).toStartWith('meshy_');

    await new Promise((resolve) => setTimeout(resolve, 0));
    const status = fal.getModelStatus(result.requestId);
    expect(status.status).toBe('completed');
    expect(status.modelUrl).toBe('https://example.com/model.glb');
  });

  it('generateModel records failure when subscribe throws', async () => {
    subscribeImpl = async () => {
      throw new Error('FAL down');
    };

    const fal = await importFal();
    const result = await fal.generateModel('robot');
    await new Promise((resolve) => setTimeout(resolve, 0));
    const status = fal.getModelStatus(result.requestId);
    expect(status.status).toBe('failed');
    expect(status.error).toBe('FAL down');
  });

  it('getModelStatus returns not found for unknown request', async () => {
    const fal = await importFal();
    const status = fal.getModelStatus('missing-id');
    expect(status.status).toBe('failed');
    expect(status.error).toBe('Request not found');
  });

  it('removeBackground returns base64 image data', async () => {
    subscribeImpl = async () => ({ image: { url: 'https://example.com/output.png' } });
    globalThis.fetch = (async () => ({
      ok: true,
      statusText: 'OK',
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    })) as any;

    const fal = await importFal();
    const result = await fal.removeBackground('data:image/png;base64,abc123');
    expect(result.image).toStartWith('data:image/png;base64,');
  });

  it('removeBackground throws when no image URL is returned', async () => {
    subscribeImpl = async () => ({ image: {} });
    const fal = await importFal();
    await expect(fal.removeBackground('data:image/png;base64,abc123')).rejects.toThrow(
      'No image in BiRefNet response'
    );
  });

  it('cleanup removes expired request entries after TTL', async () => {
    let now = 0;
    const originalDateNow = Date.now;
    Date.now = () => now;

    subscribeImpl = async () => new Promise(() => {});
    const fal = await importFal();
    const result = await fal.generateModel('robot');

    now = 60 * 60 * 1000 + 1;
    cleanupFn?.();
    const status = fal.getModelStatus(result.requestId);
    expect(status.status).toBe('failed');
    expect(status.error).toBe('Request not found');

    Date.now = originalDateNow;
  });
});
