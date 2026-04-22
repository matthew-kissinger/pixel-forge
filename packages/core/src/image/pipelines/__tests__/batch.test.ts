/**
 * Batch pipeline tests.
 */

import { describe, expect, test } from 'bun:test';

import {
  PipelineStepFailed,
  ProviderRateLimited,
} from '../../../errors';
import { createBatchPipeline } from '../batch';
import type { BatchFs } from '../batch';
import type { Pipeline } from '../types';

interface FakeIn {
  name: string;
  shouldThrowOnce?: Error;
  shouldThrowAlways?: Error;
}
interface FakeOut {
  name: string;
  image: Buffer;
}

function createFsMem(initialFiles: string[] = []) {
  const written = new Map<string, Buffer>();
  for (const f of initialFiles) written.set(f, Buffer.alloc(0));
  const fs: BatchFs = {
    existsSync: (p) => written.has(p),
    writeFile: async (p, d) => {
      written.set(p, d);
    },
  };
  return { fs, written };
}

interface CountedPipeline extends Pipeline<FakeIn, FakeOut> {
  callCount: number;
}

function createInnerPipeline(): CountedPipeline {
  const state = { callCount: 0 };
  const inner: CountedPipeline = {
    id: 'fake',
    description: 'test',
    callCount: 0,
    async run(input: FakeIn): Promise<FakeOut> {
      state.callCount++;
      inner.callCount = state.callCount;
      if (input.shouldThrowAlways) throw input.shouldThrowAlways;
      if (input.shouldThrowOnce) {
        const e = input.shouldThrowOnce;
        input.shouldThrowOnce = undefined;
        throw e;
      }
      return { name: input.name, image: Buffer.from(`hi-${input.name}`) };
    },
  };
  return inner;
}

const sleepNoop = async () => {};

describe('batch pipeline — skip behavior', () => {
  test('shouldSkip returns true when output exists', async () => {
    const { fs } = createFsMem(['/out/a.png']);
    const inner = createInnerPipeline();
    const batch = createBatchPipeline({
      pipeline: inner,
      getOutputPath: (i) => `/out/${i.name}.png`,
      fs,
      sleep: sleepNoop,
    });
    expect(await batch.shouldSkip({ name: 'a' })).toBe(true);
    expect(await batch.shouldSkip({ name: 'b' })).toBe(false);
  });

  test('run skips inputs whose output already exists', async () => {
    const { fs, written } = createFsMem(['/out/a.png']);
    const inner = createInnerPipeline();
    const batch = createBatchPipeline({
      pipeline: inner,
      getOutputPath: (i) => `/out/${i.name}.png`,
      fs,
      sleep: sleepNoop,
    });
    const results = await batch.run([{ name: 'a' }, { name: 'b' }, { name: 'c' }]);
    // Only b and c were generated.
    expect(written.get('/out/b.png')?.toString()).toBe('hi-b');
    expect(written.get('/out/c.png')?.toString()).toBe('hi-c');
    // a slot is undefined (skipped).
    expect(results[0]).toBeUndefined();
    expect(results[1]?.name).toBe('b');
    expect(results[2]?.name).toBe('c');
  });
});

describe('batch pipeline — concurrency', () => {
  test('processes inputs across N workers', async () => {
    const { fs, written } = createFsMem();
    const order: string[] = [];
    const slow: Pipeline<FakeIn, FakeOut> = {
      id: 'slow',
      description: 't',
      async run(input) {
        order.push(`start:${input.name}`);
        await new Promise((r) => setTimeout(r, 30));
        order.push(`end:${input.name}`);
        return { name: input.name, image: Buffer.from(input.name) };
      },
    };
    const batch = createBatchPipeline({
      pipeline: slow,
      getOutputPath: (i) => `/o/${i.name}`,
      fs,
      concurrency: 3,
      sleep: sleepNoop,
    });
    await batch.run([
      { name: 'a' },
      { name: 'b' },
      { name: 'c' },
    ]);
    // First 3 starts must occur before any end with concurrency=3.
    const firstEnd = order.findIndex((s) => s.startsWith('end:'));
    const firstThree = order.slice(0, firstEnd);
    expect(firstThree.filter((s) => s.startsWith('start:')).length).toBe(3);
    expect(written.size).toBe(3);
  });

  test('progress callback fires per completed item', async () => {
    const { fs } = createFsMem();
    const inner = createInnerPipeline();
    const progress: Array<[number, number]> = [];
    const batch = createBatchPipeline({
      pipeline: inner,
      getOutputPath: (i) => `/o/${i.name}`,
      fs,
      onProgress: (c, t) => progress.push([c, t]),
      sleep: sleepNoop,
    });
    await batch.run([{ name: 'a' }, { name: 'b' }]);
    expect(progress).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });
});

describe('batch pipeline — retry on retryable errors', () => {
  test('retries on ProviderRateLimited up to maxRetries', async () => {
    const { fs } = createFsMem();
    const inner = createInnerPipeline();
    const batch = createBatchPipeline({
      pipeline: inner,
      getOutputPath: (i) => `/o/${i.name}`,
      fs,
      maxRetries: 3,
      sleep: sleepNoop,
    });
    await batch.run([
      {
        name: 'a',
        shouldThrowOnce: new ProviderRateLimited({
          provider: 'gemini',
          message: 'rl',
        }),
      },
    ]);
    // Should have called twice: first rate-limit, second success.
    expect(inner.callCount).toBe(2);
  });

  test('does not retry on non-retryable errors', async () => {
    const { fs } = createFsMem();
    const inner = createInnerPipeline();
    const batch = createBatchPipeline({
      pipeline: inner,
      getOutputPath: (i) => `/o/${i.name}`,
      fs,
      sleep: sleepNoop,
    });
    await expect(
      batch.run([
        {
          name: 'a',
          shouldThrowAlways: new Error('plain error'),
        },
      ])
    ).rejects.toBeInstanceOf(PipelineStepFailed);
    expect(inner.callCount).toBe(1);
  });

  test('gives up after maxRetries on persistent retryable errors', async () => {
    const { fs } = createFsMem();
    const inner = createInnerPipeline();
    const batch = createBatchPipeline({
      pipeline: inner,
      getOutputPath: (i) => `/o/${i.name}`,
      fs,
      maxRetries: 2,
      sleep: sleepNoop,
    });
    await expect(
      batch.run([
        {
          name: 'a',
          shouldThrowAlways: new ProviderRateLimited({
            provider: 'gemini',
            message: 'rl forever',
          }),
        },
      ])
    ).rejects.toBeInstanceOf(PipelineStepFailed);
    expect(inner.callCount).toBe(2);
  });
});

describe('batch pipeline — output buffer extraction', () => {
  test('default extractor pulls .image from outputs', async () => {
    const { fs, written } = createFsMem();
    const inner = createInnerPipeline();
    const batch = createBatchPipeline({
      pipeline: inner,
      getOutputPath: (i) => `/o/${i.name}`,
      fs,
      sleep: sleepNoop,
    });
    await batch.run([{ name: 'x' }]);
    expect(written.get('/o/x')?.toString()).toBe('hi-x');
  });

  test('custom extractor used when provided', async () => {
    const { fs, written } = createFsMem();
    const inner: Pipeline<FakeIn, { name: string; payload: Buffer }> = {
      id: 'glb-like',
      description: '',
      async run(i) {
        return { name: i.name, payload: Buffer.from(`raw-${i.name}`) };
      },
    };
    const batch = createBatchPipeline({
      pipeline: inner,
      getOutputPath: (i) => `/o/${i.name}`,
      getOutputBuffer: (o) => o.payload,
      fs,
      sleep: sleepNoop,
    });
    await batch.run([{ name: 'a' }]);
    expect(written.get('/o/a')?.toString()).toBe('raw-a');
  });

  test('default extractor falls back to .glb if .image absent', async () => {
    const { fs, written } = createFsMem();
    const inner: Pipeline<FakeIn, { name: string; glb: Buffer }> = {
      id: 'glb',
      description: '',
      async run(i) {
        return { name: i.name, glb: Buffer.from(`glb-${i.name}`) };
      },
    };
    const batch = createBatchPipeline({
      pipeline: inner,
      getOutputPath: (i) => `/o/${i.name}`,
      fs,
      sleep: sleepNoop,
    });
    await batch.run([{ name: 'truck' }]);
    expect(written.get('/o/truck')?.toString()).toBe('glb-truck');
  });
});
