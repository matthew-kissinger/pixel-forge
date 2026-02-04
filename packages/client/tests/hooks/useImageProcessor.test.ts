import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useImageProcessor,
  useNodeOutput,
} from '../../src/hooks/useImageProcessor';
import type { NodeOutput } from '../../src/stores/workflow';
import { processImage } from '../../src/lib/image-utils';
import { logger } from '@pixel-forge/shared/logger';

const mockStore = {
  getInputsForNode: vi.fn(),
  setNodeOutput: vi.fn(),
  setNodeStatus: vi.fn(),
  nodeStatus: {} as Record<string, string>,
  nodeOutputs: {} as Record<string, unknown>,
};

vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: () => mockStore,
}));

vi.mock('../../src/lib/image-utils', () => ({
  processImage: vi.fn(),
}));

vi.mock('@pixel-forge/shared/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('useImageProcessor', () => {
  let inputs: NodeOutput[];

  beforeEach(() => {
    vi.clearAllMocks();
    inputs = [];
    mockStore.getInputsForNode = vi.fn(() => inputs);
    mockStore.nodeStatus = {};
    mockStore.nodeOutputs = {};
    mockStore.setNodeOutput = vi.fn((nodeId: string, output: NodeOutput) => {
      mockStore.nodeOutputs[nodeId] = output;
    });
    mockStore.setNodeStatus = vi.fn((nodeId: string, status: string) => {
      mockStore.nodeStatus[nodeId] = status;
    });
  });

  it('returns the expected interface shape', () => {
    const { result } = renderHook(() => useImageProcessor('node-1'));

    expect(result.current.process).toBeTypeOf('function');
    expect(result.current.processAsync).toBeTypeOf('function');
    expect(result.current.hasImageInput).toBeTypeOf('function');
    expect(result.current.getImageInput).toBeTypeOf('function');
    expect(result.current.getInputs).toBeTypeOf('function');
    expect(result.current.getTextInput).toBeTypeOf('function');
    expect(result.current.isProcessing).toBeTypeOf('boolean');
  });

  it('hasImageInput returns true when image inputs exist', () => {
    inputs = [
      { type: 'text', data: 'hello', timestamp: 1 },
      { type: 'image', data: 'img-data', timestamp: 2 },
    ];

    const { result } = renderHook(() => useImageProcessor('node-1'));

    expect(result.current.hasImageInput()).toBe(true);
  });

  it('hasImageInput returns false when no image inputs exist', () => {
    inputs = [{ type: 'text', data: 'hello', timestamp: 1 }];

    const { result } = renderHook(() => useImageProcessor('node-1'));

    expect(result.current.hasImageInput()).toBe(false);
  });

  it('getImageInput returns image data when available', () => {
    inputs = [
      { type: 'text', data: 'hello', timestamp: 1 },
      { type: 'image', data: 'img-data', timestamp: 2 },
    ];

    const { result } = renderHook(() => useImageProcessor('node-1'));

    expect(result.current.getImageInput()).toBe('img-data');
  });

  it('getImageInput returns null when no image input exists', () => {
    inputs = [{ type: 'text', data: 'hello', timestamp: 1 }];

    const { result } = renderHook(() => useImageProcessor('node-1'));

    expect(result.current.getImageInput()).toBeNull();
  });

  it('getTextInput returns text data when available', () => {
    inputs = [
      { type: 'image', data: 'img-data', timestamp: 1 },
      { type: 'text', data: 'hello', timestamp: 2 },
    ];

    const { result } = renderHook(() => useImageProcessor('node-1'));

    expect(result.current.getTextInput()).toBe('hello');
  });

  it('process calls processImage and updates status to running then success', async () => {
    const processImageMock = vi.mocked(processImage);
    processImageMock.mockResolvedValue('processed-image');

    const { result } = renderHook(() => useImageProcessor('node-1'));

    await act(async () => {
      await result.current.process('image-data', vi.fn());
    });

    expect(processImageMock).toHaveBeenCalledWith('image-data', expect.any(Function));
    expect(mockStore.setNodeStatus).toHaveBeenNthCalledWith(1, 'node-1', 'running');
    expect(mockStore.setNodeStatus).toHaveBeenNthCalledWith(2, 'node-1', 'success');
    expect(mockStore.setNodeOutput).toHaveBeenCalledWith('node-1', {
      type: 'image',
      data: 'processed-image',
      timestamp: expect.any(Number),
    });
  });

  it('process sets status to error on failure', async () => {
    const processImageMock = vi.mocked(processImage);
    processImageMock.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useImageProcessor('node-1'));

    await act(async () => {
      await result.current.process('image-data', vi.fn());
    });

    expect(logger.error).toHaveBeenCalled();
    expect(mockStore.setNodeStatus).toHaveBeenCalledWith('node-1', 'error');
    expect(mockStore.setNodeOutput).not.toHaveBeenCalled();
  });

  it('process prevents concurrent execution', async () => {
    const processImageMock = vi.mocked(processImage);
    let resolvePromise: (value: string) => void;
    const pending = new Promise<string>((resolve) => {
      resolvePromise = resolve;
    });
    processImageMock.mockReturnValue(pending);

    const { result } = renderHook(() => useImageProcessor('node-1'));

    let firstPromise: Promise<void>;
    let secondPromise: Promise<void>;
    await act(async () => {
      firstPromise = result.current.process('image-data', vi.fn());
      secondPromise = result.current.process('image-data', vi.fn());
    });

    expect(processImageMock).toHaveBeenCalledTimes(1);

    resolvePromise!('done');
    await act(async () => {
      await firstPromise!;
      await secondPromise!;
    });
  });

  it('process calls onStart and onSuccess callbacks', async () => {
    const processImageMock = vi.mocked(processImage);
    processImageMock.mockResolvedValue('processed-image');
    const onStart = vi.fn();
    const onSuccess = vi.fn();

    const { result } = renderHook(() =>
      useImageProcessor('node-1', { onStart, onSuccess })
    );

    await act(async () => {
      await result.current.process('image-data', vi.fn());
    });

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith('processed-image');
  });

  it('process calls onError callback on failure', async () => {
    const processImageMock = vi.mocked(processImage);
    processImageMock.mockRejectedValue(new Error('boom'));
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useImageProcessor('node-1', { onError })
    );

    await act(async () => {
      await result.current.process('image-data', vi.fn());
    });

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('processAsync calls async function and stores result', async () => {
    const asyncFn = vi.fn().mockResolvedValue('async-result');

    const { result } = renderHook(() => useImageProcessor('node-1'));

    await act(async () => {
      await result.current.processAsync('image-data', asyncFn);
    });

    expect(asyncFn).toHaveBeenCalledWith('image-data');
    expect(mockStore.setNodeOutput).toHaveBeenCalledWith('node-1', {
      type: 'image',
      data: 'async-result',
      timestamp: expect.any(Number),
    });
    expect(mockStore.setNodeStatus).toHaveBeenCalledWith('node-1', 'success');
  });

  it('processAsync handles errors correctly', async () => {
    const asyncFn = vi.fn().mockRejectedValue(new Error('boom'));
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useImageProcessor('node-1', { onError })
    );

    await act(async () => {
      await result.current.processAsync('image-data', asyncFn);
    });

    expect(logger.error).toHaveBeenCalled();
    expect(mockStore.setNodeStatus).toHaveBeenCalledWith('node-1', 'error');
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('isProcessing reflects node status', () => {
    mockStore.nodeStatus = { 'node-1': 'running' };

    const { result, rerender } = renderHook(() => useImageProcessor('node-1'));

    expect(result.current.isProcessing).toBe(true);

    mockStore.nodeStatus = { 'node-1': 'idle' };
    rerender();

    expect(result.current.isProcessing).toBe(false);
  });
});

describe('useNodeOutput', () => {
  let inputs: NodeOutput[];

  beforeEach(() => {
    vi.clearAllMocks();
    inputs = [];
    mockStore.getInputsForNode = vi.fn(() => inputs);
    mockStore.nodeStatus = {};
    mockStore.nodeOutputs = {};
    mockStore.setNodeOutput = vi.fn((nodeId: string, output: NodeOutput) => {
      mockStore.nodeOutputs[nodeId] = output;
    });
    mockStore.setNodeStatus = vi.fn((nodeId: string, status: string) => {
      mockStore.nodeStatus[nodeId] = status;
    });
  });

  it('returns the expected interface shape', () => {
    const { result } = renderHook(() => useNodeOutput('node-1'));

    expect(result.current.status).toBeDefined();
    expect(result.current.output).toBeUndefined();
    expect(result.current.getInputs).toBeTypeOf('function');
    expect(result.current.getTextInput).toBeTypeOf('function');
    expect(result.current.getImageInput).toBeTypeOf('function');
    expect(result.current.setOutput).toBeTypeOf('function');
    expect(result.current.setStatus).toBeTypeOf('function');
    expect(result.current.runAsync).toBeTypeOf('function');
    expect(result.current.isProcessing).toBeTypeOf('boolean');
  });

  it('defaults status to idle when none is set', () => {
    const { result } = renderHook(() => useNodeOutput('node-1'));

    expect(result.current.status).toBe('idle');
    expect(result.current.isProcessing).toBe(false);
  });

  it('setOutput calls setNodeOutput with correct format', () => {
    const { result } = renderHook(() => useNodeOutput('node-1'));

    act(() => {
      result.current.setOutput('text', 'hello');
    });

    expect(mockStore.setNodeOutput).toHaveBeenCalledWith('node-1', {
      type: 'text',
      data: 'hello',
      timestamp: expect.any(Number),
    });
  });

  it('setStatus updates node status', () => {
    const { result } = renderHook(() => useNodeOutput('node-1'));

    act(() => {
      result.current.setStatus('running');
    });

    expect(mockStore.setNodeStatus).toHaveBeenCalledWith('node-1', 'running');
  });

  it('runAsync runs async function, calls onResult, and stores output', async () => {
    const asyncFn = vi.fn().mockResolvedValue('result');
    const onResult = vi.fn().mockReturnValue({ type: 'text', data: 'out' });
    const { result } = renderHook(() => useNodeOutput('node-1'));

    await act(async () => {
      await result.current.runAsync(asyncFn, onResult);
    });

    expect(asyncFn).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith('result');
    expect(mockStore.setNodeStatus).toHaveBeenNthCalledWith(1, 'node-1', 'running');
    expect(mockStore.setNodeOutput).toHaveBeenCalledWith('node-1', {
      type: 'text',
      data: 'out',
      timestamp: expect.any(Number),
    });
    expect(mockStore.setNodeStatus).toHaveBeenNthCalledWith(2, 'node-1', 'success');
  });

  it('runAsync handles errors and sets error status', async () => {
    const asyncFn = vi.fn().mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useNodeOutput('node-1'));

    await act(async () => {
      await result.current.runAsync(asyncFn, () => ({ type: 'text', data: 'out' }));
    });

    expect(logger.error).toHaveBeenCalled();
    expect(mockStore.setNodeStatus).toHaveBeenCalledWith('node-1', 'error');
    expect(mockStore.setNodeOutput).not.toHaveBeenCalled();
  });

  it('runAsync prevents concurrent execution', async () => {
    let resolvePromise: (value: string) => void;
    const pending = new Promise<string>((resolve) => {
      resolvePromise = resolve;
    });
    const asyncFn = vi.fn().mockReturnValue(pending);

    const { result } = renderHook(() => useNodeOutput('node-1'));

    let firstPromise: Promise<void>;
    let secondPromise: Promise<void>;
    await act(async () => {
      firstPromise = result.current.runAsync(asyncFn, (value) => ({
        type: 'text',
        data: value,
      }));
      secondPromise = result.current.runAsync(asyncFn, (value) => ({
        type: 'text',
        data: value,
      }));
    });

    expect(asyncFn).toHaveBeenCalledTimes(1);

    resolvePromise!('done');
    await act(async () => {
      await firstPromise!;
      await secondPromise!;
    });
  });

  it('getTextInput and getImageInput return correct values', () => {
    inputs = [
      { type: 'text', data: 'hello', timestamp: 1 },
      { type: 'image', data: 'img-data', timestamp: 2 },
    ];

    const { result } = renderHook(() => useNodeOutput('node-1'));

    expect(result.current.getTextInput()).toBe('hello');
    expect(result.current.getImageInput()).toBe('img-data');
  });

  it('isProcessing reflects running status', () => {
    mockStore.nodeStatus = { 'node-1': 'running' };

    const { result, rerender } = renderHook(() => useNodeOutput('node-1'));

    expect(result.current.isProcessing).toBe(true);

    mockStore.nodeStatus = { 'node-1': 'success' };
    rerender();

    expect(result.current.isProcessing).toBe(false);
  });
});
