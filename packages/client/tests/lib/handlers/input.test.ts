import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Node } from '@xyflow/react';
import type { NodeHandlerContext } from '../../../src/lib/handlers';

import * as inputHandlers from '../../../src/lib/handlers/input';

function createMockContext(
  overrides: Partial<NodeHandlerContext> = {}
): NodeHandlerContext {
  const mockNode: Node = {
    id: 'test-node',
    type: 'textPrompt',
    position: { x: 0, y: 0 },
    data: { nodeType: 'textPrompt', label: 'Test' },
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

describe('Input Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleTextPrompt', () => {
    it('should extract text from node data and set as output', async () => {
      const context = createMockContext({
        node: {
          id: 'text-1',
          type: 'textPrompt',
          position: { x: 0, y: 0 },
          data: { nodeType: 'textPrompt', prompt: 'a pixel art sword', label: 'Prompt' },
        },
      });

      await inputHandlers.handleTextPrompt(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('text-1', {
        type: 'text',
        data: 'a pixel art sword',
        timestamp: expect.any(Number),
      });
    });

    it('should handle empty prompt as empty string', async () => {
      const context = createMockContext({
        node: {
          id: 'text-2',
          type: 'textPrompt',
          position: { x: 0, y: 0 },
          data: { nodeType: 'textPrompt', prompt: '', label: 'Prompt' },
        },
      });

      await inputHandlers.handleTextPrompt(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('text-2', {
        type: 'text',
        data: '',
        timestamp: expect.any(Number),
      });
    });

    it('should handle undefined prompt as empty string', async () => {
      const context = createMockContext({
        node: {
          id: 'text-3',
          type: 'textPrompt',
          position: { x: 0, y: 0 },
          data: { nodeType: 'textPrompt', label: 'Prompt' },
        },
      });

      await inputHandlers.handleTextPrompt(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('text-3', {
        type: 'text',
        data: '',
        timestamp: expect.any(Number),
      });
    });

    it('should set output type as text', async () => {
      const context = createMockContext({
        node: {
          id: 'text-4',
          type: 'textPrompt',
          position: { x: 0, y: 0 },
          data: { nodeType: 'textPrompt', prompt: 'test', label: 'Test' },
        },
      });

      await inputHandlers.handleTextPrompt(context);

      const call = (context.setNodeOutput as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[1].type).toBe('text');
    });

    it('should include a timestamp', async () => {
      const before = Date.now();
      const context = createMockContext({
        node: {
          id: 'text-5',
          type: 'textPrompt',
          position: { x: 0, y: 0 },
          data: { nodeType: 'textPrompt', prompt: 'test', label: 'Test' },
        },
      });

      await inputHandlers.handleTextPrompt(context);

      const after = Date.now();
      const call = (context.setNodeOutput as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[1].timestamp).toBeGreaterThanOrEqual(before);
      expect(call[1].timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('handleImageUpload', () => {
    it('should pass through existing uploaded image data', async () => {
      const testImage = 'data:image/png;base64,iVBORw0KGgo=';
      const context = createMockContext({
        node: {
          id: 'img-1',
          type: 'imageUpload',
          position: { x: 0, y: 0 },
          data: { nodeType: 'imageUpload', label: 'Upload' },
        },
        nodeOutputs: {
          'img-1': {
            type: 'image',
            data: testImage,
            timestamp: Date.now(),
          },
        },
      });

      await inputHandlers.handleImageUpload(context);

      // Should not call setNodeOutput since output already exists
      expect(context.setNodeOutput).not.toHaveBeenCalled();
    });

    it('should throw when no image is uploaded', async () => {
      const context = createMockContext({
        node: {
          id: 'img-2',
          type: 'imageUpload',
          position: { x: 0, y: 0 },
          data: { nodeType: 'imageUpload', label: 'Upload' },
        },
      });

      await expect(inputHandlers.handleImageUpload(context)).rejects.toThrow(
        'No image uploaded'
      );
    });

    it('should throw when existing output is not image type', async () => {
      const context = createMockContext({
        node: {
          id: 'img-3',
          type: 'imageUpload',
          position: { x: 0, y: 0 },
          data: { nodeType: 'imageUpload', label: 'Upload' },
        },
        nodeOutputs: {
          'img-3': {
            type: 'text',
            data: 'not an image',
            timestamp: Date.now(),
          },
        },
      });

      await expect(inputHandlers.handleImageUpload(context)).rejects.toThrow(
        'No image uploaded'
      );
    });
  });

  describe('handleNumber', () => {
    it('should extract numeric value and set as text output', async () => {
      const context = createMockContext({
        node: {
          id: 'num-1',
          type: 'number',
          position: { x: 0, y: 0 },
          data: { nodeType: 'number', value: 42, min: 0, max: 100, step: 1, label: 'Number' },
        },
      });

      await inputHandlers.handleNumber(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('num-1', {
        type: 'text',
        data: '42',
        timestamp: expect.any(Number),
      });
    });

    it('should handle zero value', async () => {
      const context = createMockContext({
        node: {
          id: 'num-2',
          type: 'number',
          position: { x: 0, y: 0 },
          data: { nodeType: 'number', value: 0, min: 0, max: 100, step: 1, label: 'Number' },
        },
      });

      await inputHandlers.handleNumber(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('num-2', {
        type: 'text',
        data: '0',
        timestamp: expect.any(Number),
      });
    });

    it('should default to 0 when value is undefined', async () => {
      const context = createMockContext({
        node: {
          id: 'num-3',
          type: 'number',
          position: { x: 0, y: 0 },
          data: { nodeType: 'number', label: 'Number' },
        },
      });

      await inputHandlers.handleNumber(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('num-3', {
        type: 'text',
        data: '0',
        timestamp: expect.any(Number),
      });
    });

    it('should handle negative values', async () => {
      const context = createMockContext({
        node: {
          id: 'num-4',
          type: 'number',
          position: { x: 0, y: 0 },
          data: { nodeType: 'number', value: -5, min: -10, max: 10, step: 1, label: 'Number' },
        },
      });

      await inputHandlers.handleNumber(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('num-4', {
        type: 'text',
        data: '-5',
        timestamp: expect.any(Number),
      });
    });

    it('should handle decimal values', async () => {
      const context = createMockContext({
        node: {
          id: 'num-5',
          type: 'number',
          position: { x: 0, y: 0 },
          data: { nodeType: 'number', value: 3.14, min: 0, max: 10, step: 0.01, label: 'Number' },
        },
      });

      await inputHandlers.handleNumber(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('num-5', {
        type: 'text',
        data: '3.14',
        timestamp: expect.any(Number),
      });
    });
  });

  describe('handleStyleReference', () => {
    it('should pass through style reference image when already set', async () => {
      const testImage = 'data:image/png;base64,styleRefData';
      const context = createMockContext({
        node: {
          id: 'style-1',
          type: 'styleReference',
          position: { x: 0, y: 0 },
          data: { nodeType: 'styleReference', influence: 50, label: 'Style' },
        },
        nodeOutputs: {
          'style-1': {
            type: 'image',
            data: testImage,
            timestamp: Date.now(),
          },
        },
      });

      await inputHandlers.handleStyleReference(context);

      expect(context.setNodeOutput).not.toHaveBeenCalled();
    });

    it('should throw when no style reference image uploaded', async () => {
      const context = createMockContext({
        node: {
          id: 'style-2',
          type: 'styleReference',
          position: { x: 0, y: 0 },
          data: { nodeType: 'styleReference', influence: 50, label: 'Style' },
        },
      });

      await expect(inputHandlers.handleStyleReference(context)).rejects.toThrow(
        'No style reference image uploaded'
      );
    });

    it('should throw when existing output is not image type', async () => {
      const context = createMockContext({
        node: {
          id: 'style-3',
          type: 'styleReference',
          position: { x: 0, y: 0 },
          data: { nodeType: 'styleReference', influence: 50, label: 'Style' },
        },
        nodeOutputs: {
          'style-3': {
            type: 'text',
            data: 'not an image',
            timestamp: Date.now(),
          },
        },
      });

      await expect(inputHandlers.handleStyleReference(context)).rejects.toThrow(
        'No style reference image uploaded'
      );
    });
  });

  describe('handleSeedControl', () => {
    it('should extract seed value when randomize is false', async () => {
      const context = createMockContext({
        node: {
          id: 'seed-1',
          type: 'seedControl',
          position: { x: 0, y: 0 },
          data: { nodeType: 'seedControl', seed: 12345, randomize: false, label: 'Seed' },
        },
      });

      await inputHandlers.handleSeedControl(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('seed-1', {
        type: 'text',
        data: '12345',
        timestamp: expect.any(Number),
      });
    });

    it('should generate random seed when randomize is true', async () => {
      const context = createMockContext({
        node: {
          id: 'seed-2',
          type: 'seedControl',
          position: { x: 0, y: 0 },
          data: { nodeType: 'seedControl', seed: 12345, randomize: true, label: 'Seed' },
        },
      });

      await inputHandlers.handleSeedControl(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
      const call = (context.setNodeOutput as ReturnType<typeof vi.fn>).mock.calls[0];
      const seedValue = parseInt(call[1].data, 10);
      expect(seedValue).toBeGreaterThanOrEqual(0);
      expect(seedValue).toBeLessThan(1000000);
    });

    it('should produce different seeds on multiple randomized calls', async () => {
      const seeds: number[] = [];
      for (let i = 0; i < 5; i++) {
        const context = createMockContext({
          node: {
            id: `seed-rand-${i}`,
            type: 'seedControl',
            position: { x: 0, y: 0 },
            data: { nodeType: 'seedControl', seed: 0, randomize: true, label: 'Seed' },
          },
        });
        await inputHandlers.handleSeedControl(context);
        const call = (context.setNodeOutput as ReturnType<typeof vi.fn>).mock.calls[0];
        seeds.push(parseInt(call[1].data, 10));
      }
      // At least some should differ (probabilistically almost certain)
      const unique = new Set(seeds);
      expect(unique.size).toBeGreaterThan(1);
    });

    it('should default to seed 42 when seed is undefined and randomize is false', async () => {
      const context = createMockContext({
        node: {
          id: 'seed-3',
          type: 'seedControl',
          position: { x: 0, y: 0 },
          data: { nodeType: 'seedControl', randomize: false, label: 'Seed' },
        },
      });

      await inputHandlers.handleSeedControl(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('seed-3', {
        type: 'text',
        data: '42',
        timestamp: expect.any(Number),
      });
    });

    it('should output seed as text type', async () => {
      const context = createMockContext({
        node: {
          id: 'seed-4',
          type: 'seedControl',
          position: { x: 0, y: 0 },
          data: { nodeType: 'seedControl', seed: 99, randomize: false, label: 'Seed' },
        },
      });

      await inputHandlers.handleSeedControl(context);

      const call = (context.setNodeOutput as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[1].type).toBe('text');
    });
  });
});
