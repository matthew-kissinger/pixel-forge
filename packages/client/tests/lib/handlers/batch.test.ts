import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Node } from '@xyflow/react';
import type { NodeHandlerContext } from '../../../src/lib/handlers';

vi.mock('../../../src/lib/api');
vi.mock('@pixel-forge/shared/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { generateImage } from '../../../src/lib/api';
import { handleBatchGen } from '../../../src/lib/handlers/batch';

const MOCK_IMAGE_DATA = 'data:image/png;base64,iVBORw0KGgo=';

function createMockContext(
  overrides: Partial<NodeHandlerContext> = {}
): NodeHandlerContext {
  const mockNode: Node = {
    id: 'test-node',
    type: 'batchGen',
    position: { x: 0, y: 0 },
    data: { nodeType: 'batchGen', label: 'Test' },
    ...overrides.node,
  };

  return {
    node: mockNode,
    nodeData: mockNode.data,
    inputs: [],
    nodeOutputs: {},
    edges: [],
    setNodeOutput: vi.fn(),
    setBatchProgress: vi.fn(),
    ctx: {
      getCancelled: () => false,
    },
    ...overrides,
  };
}

describe('Batch Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleBatchGen', () => {
    it('should generate images for each subject', async () => {
      vi.mocked(generateImage).mockResolvedValue({ image: MOCK_IMAGE_DATA } as any);

      const context = createMockContext({
        node: {
          id: 'batch-1',
          type: 'batchGen',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'batchGen',
            subjects: 'cat\ndog',
            label: 'Batch',
          },
        },
      });

      await handleBatchGen(context);

      expect(generateImage).toHaveBeenCalledTimes(2);
      expect(generateImage).toHaveBeenCalledWith({ prompt: 'cat', presetId: undefined });
      expect(generateImage).toHaveBeenCalledWith({ prompt: 'dog', presetId: undefined });
      expect(context.setNodeOutput).toHaveBeenCalledWith('batch-1', {
        type: 'image',
        data: expect.any(String),
        timestamp: expect.any(Number),
      });
    });

    it('should throw on empty subjects', async () => {
      const context = createMockContext({
        node: {
          id: 'batch-2',
          type: 'batchGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'batchGen', subjects: '', label: 'Batch' },
        },
      });

      await expect(handleBatchGen(context)).rejects.toThrow('No subjects provided');
    });

    it('should throw on undefined subjects', async () => {
      const context = createMockContext({
        node: {
          id: 'batch-3',
          type: 'batchGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'batchGen', label: 'Batch' },
        },
      });

      await expect(handleBatchGen(context)).rejects.toThrow('No subjects provided');
    });

    it('should cancel before starting generation', async () => {
      const context = createMockContext({
        node: {
          id: 'batch-4',
          type: 'batchGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'batchGen', subjects: 'cat\ndog', label: 'Batch' },
        },
        ctx: { getCancelled: () => true },
      });

      await expect(handleBatchGen(context)).rejects.toThrow('Execution cancelled');
      expect(generateImage).not.toHaveBeenCalled();
    });

    it('should cancel mid-batch', async () => {
      let genCount = 0;
      vi.mocked(generateImage).mockImplementation(async () => {
        genCount++;
        return { image: MOCK_IMAGE_DATA } as any;
      });

      let callCount = 0;
      const context = createMockContext({
        node: {
          id: 'batch-5',
          type: 'batchGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'batchGen', subjects: 'cat\ndog\nbird', label: 'Batch' },
        },
        ctx: {
          getCancelled: () => {
            callCount++;
            // Call 1: initial check before loop (false)
            // Call 2: loop iteration 0 (false) → generates
            // Call 3: loop iteration 1 (true) → cancel
            return callCount >= 3;
          },
        },
      });

      await expect(handleBatchGen(context)).rejects.toThrow('Execution cancelled');
      expect(genCount).toBe(1);
    });

    it('should handle partial failures gracefully', async () => {
      let callIndex = 0;
      vi.mocked(generateImage).mockImplementation(async () => {
        callIndex++;
        if (callIndex === 2) throw new Error('API failure');
        return { image: MOCK_IMAGE_DATA } as any;
      });

      const context = createMockContext({
        node: {
          id: 'batch-6',
          type: 'batchGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'batchGen', subjects: 'cat\ndog\nbird', label: 'Batch' },
        },
      });

      await handleBatchGen(context);

      expect(generateImage).toHaveBeenCalledTimes(3);
      expect(context.setNodeOutput).toHaveBeenCalled();
    });

    it('should throw when all generations fail', async () => {
      vi.mocked(generateImage).mockRejectedValue(new Error('API down'));

      const context = createMockContext({
        node: {
          id: 'batch-7',
          type: 'batchGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'batchGen', subjects: 'cat\ndog', label: 'Batch' },
        },
      });

      await expect(handleBatchGen(context)).rejects.toThrow();
    });

    it('should track progress via setBatchProgress', async () => {
      vi.mocked(generateImage).mockResolvedValue({ image: MOCK_IMAGE_DATA } as any);

      const context = createMockContext({
        node: {
          id: 'batch-8',
          type: 'batchGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'batchGen', subjects: 'cat\ndog', label: 'Batch' },
        },
      });

      await handleBatchGen(context);

      expect(context.setBatchProgress).toHaveBeenCalledWith('batch-8', {
        current: 0,
        total: 2,
        label: 'cat',
      });
      expect(context.setBatchProgress).toHaveBeenCalledWith('batch-8', {
        current: 1,
        total: 2,
        label: 'cat',
      });
      expect(context.setBatchProgress).toHaveBeenCalledWith('batch-8', {
        current: 2,
        total: 2,
        label: 'dog',
      });
      expect(context.setBatchProgress).toHaveBeenCalledWith('batch-8', null);
    });

    it('should prepend consistency phrase to prompts', async () => {
      vi.mocked(generateImage).mockResolvedValue({ image: MOCK_IMAGE_DATA } as any);

      const context = createMockContext({
        node: {
          id: 'batch-9',
          type: 'batchGen',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'batchGen',
            subjects: 'cat\ndog',
            consistencyPhrase: 'pixel art style',
            label: 'Batch',
          },
        },
      });

      await handleBatchGen(context);

      expect(generateImage).toHaveBeenCalledWith({
        prompt: 'pixel art style. cat',
        presetId: undefined,
      });
      expect(generateImage).toHaveBeenCalledWith({
        prompt: 'pixel art style. dog',
        presetId: undefined,
      });
    });

    it('should compose grid and output PNG', async () => {
      vi.mocked(generateImage).mockResolvedValue({ image: MOCK_IMAGE_DATA } as any);

      const context = createMockContext({
        node: {
          id: 'batch-10',
          type: 'batchGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'batchGen', subjects: 'cat', label: 'Batch' },
        },
      });

      await handleBatchGen(context);

      const output = vi.mocked(context.setNodeOutput).mock.calls[0][1];
      expect(output.type).toBe('image');
      expect(output.data).toContain('data:image/png');
    });

    it('should filter out blank lines from subjects', async () => {
      vi.mocked(generateImage).mockResolvedValue({ image: MOCK_IMAGE_DATA } as any);

      const context = createMockContext({
        node: {
          id: 'batch-11',
          type: 'batchGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'batchGen', subjects: 'cat\n\n  \ndog\n', label: 'Batch' },
        },
      });

      await handleBatchGen(context);

      expect(generateImage).toHaveBeenCalledTimes(2);
    });

    it('should reset progress even on total failure', async () => {
      vi.mocked(generateImage).mockRejectedValue(new Error('fail'));

      const context = createMockContext({
        node: {
          id: 'batch-12',
          type: 'batchGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'batchGen', subjects: 'cat', label: 'Batch' },
        },
      });

      await expect(handleBatchGen(context)).rejects.toThrow();

      // Progress should still be reset via finally block
      expect(context.setBatchProgress).toHaveBeenCalledWith('batch-12', null);
    });

    it('should include error details when all generations fail', async () => {
      vi.mocked(generateImage).mockRejectedValue(new Error('API down'));

      const context = createMockContext({
        node: {
          id: 'batch-13',
          type: 'batchGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'batchGen', subjects: 'cat\ndog', label: 'Batch' },
        },
      });

      await expect(handleBatchGen(context)).rejects.toThrow('API down');
    });
  });
});
