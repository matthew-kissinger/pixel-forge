import { beforeEach, describe, expect, mock, test } from 'bun:test';

let subscribeImpl: (endpoint: string, opts: Record<string, unknown>) => Promise<unknown>;
let lastSubscribe:
  | {
      endpoint: string;
      opts: Record<string, unknown>;
    }
  | undefined;

const falMock = {
  config: mock(() => undefined),
  subscribe: mock((endpoint: string, opts: Record<string, unknown>) => {
    lastSubscribe = { endpoint, opts };
    return subscribeImpl(endpoint, opts);
  }),
};

mock.module('@fal-ai/client', () => ({
  fal: falMock,
}));

const { createFalTextTo3dProvider } = await import('..');
const {
  ProviderNetworkError,
  ProviderRateLimited,
  SchemaValidationFailed,
} = await import('../../errors');

describe('createFalTextTo3dProvider', () => {
  beforeEach(() => {
    lastSubscribe = undefined;
    falMock.config.mockClear();
    falMock.subscribe.mockClear();
    subscribeImpl = async (_endpoint, opts) => {
      const onQueueUpdate = opts['onQueueUpdate'] as
        | ((update: { status?: string; logs?: Array<{ message?: string }> }) => void)
        | undefined;
      onQueueUpdate?.({
        status: 'IN_PROGRESS',
        logs: [{ message: 'processing 42%' }],
      });
      return {
        data: {
          model_url: 'https://example.com/model.glb',
          thumbnail_url: 'https://example.com/thumb.png',
          status: 'COMPLETED',
        },
        requestId: 'fal-123',
      };
    };
  });

  test('wraps Meshy text-to-3D with structured output and queue updates', async () => {
    const provider = createFalTextTo3dProvider('test-key', { timeoutMs: 1000 });
    const updates: Array<{ status?: string; message?: string; progress?: number }> = [];

    const result = await provider.generate(
      { prompt: 'low-poly jungle radio tower' },
      { onQueueUpdate: (update) => updates.push(update) },
    );

    expect(provider.capabilities.kind).toBe('model-3d');
    expect(lastSubscribe?.endpoint).toBe('fal-ai/meshy/text-to-3d');
    expect(lastSubscribe?.opts['input']).toEqual({
      prompt: 'low-poly jungle radio tower',
      art_style: 'low-poly',
      negative_prompt: 'blurry, low quality',
    });
    expect(updates[0]).toMatchObject({
      status: 'IN_PROGRESS',
      message: 'processing 42%',
      progress: 42,
    });
    expect(result.modelUrl).toBe('https://example.com/model.glb');
    expect(result.thumbnailUrl).toBe('https://example.com/thumb.png');
    expect(result.meta.model).toBe('fal-ai/meshy/text-to-3d');
    expect(result.meta.requestId).toBe('fal-123');
  });

  test('translates rate limits to ProviderRateLimited', async () => {
    subscribeImpl = async () => {
      throw new Error('429 rate limit');
    };

    const provider = createFalTextTo3dProvider('test-key', { timeoutMs: 1000 });
    await expect(provider.generate({ prompt: 'hut' })).rejects.toBeInstanceOf(
      ProviderRateLimited,
    );
  });

  test('rejects malformed provider output with structured validation error', async () => {
    subscribeImpl = async () => ({
      data: {
        model_url: 'not-a-url',
      },
    });

    const provider = createFalTextTo3dProvider('test-key', { timeoutMs: 1000 });
    await expect(provider.generate({ prompt: 'hut' })).rejects.toBeInstanceOf(
      SchemaValidationFailed,
    );
  });

  test('rejects missing model URL as a provider network error', async () => {
    subscribeImpl = async () => ({
      data: {
        thumbnail_url: 'https://example.com/thumb.png',
      },
    });

    const provider = createFalTextTo3dProvider('test-key', { timeoutMs: 1000 });
    await expect(provider.generate({ prompt: 'hut' })).rejects.toBeInstanceOf(
      ProviderNetworkError,
    );
  });
});
