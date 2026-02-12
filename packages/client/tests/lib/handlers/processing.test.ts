import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Node } from '@xyflow/react';
import type { NodeHandlerContext } from '../../../src/lib/handlers';

// Mock API functions before importing handlers
vi.mock('../../../src/lib/api', () => ({
  removeBackground: vi.fn(),
}));

import * as processingHandlers from '../../../src/lib/handlers/processing';
import { removeBackground } from '../../../src/lib/api';

const TEST_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

function createMockContext(
  overrides: Partial<NodeHandlerContext> = {}
): NodeHandlerContext {
  const mockNode: Node = {
    id: 'test-node',
    type: 'removeBg',
    position: { x: 0, y: 0 },
    data: { nodeType: 'removeBg', label: 'Test' },
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

describe('Processing Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleRemoveBg', () => {
    it('should call removeBackground API with input image', async () => {
      const resultImage = 'data:image/png;base64,removedBgResult';
      (removeBackground as ReturnType<typeof vi.fn>).mockResolvedValue({
        image: resultImage,
      });

      const context = createMockContext({
        node: {
          id: 'removebg-1',
          type: 'removeBg',
          position: { x: 0, y: 0 },
          data: { nodeType: 'removeBg', label: 'Remove BG' },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await processingHandlers.handleRemoveBg(context);

      expect(removeBackground).toHaveBeenCalledWith(TEST_IMAGE);
      expect(context.setNodeOutput).toHaveBeenCalledWith('removebg-1', {
        type: 'image',
        data: resultImage,
        timestamp: expect.any(Number),
      });
    });

    it('should throw error when image input is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'removebg-2',
          type: 'removeBg',
          position: { x: 0, y: 0 },
          data: { nodeType: 'removeBg', label: 'Remove BG' },
        },
        inputs: [],
      });

      await expect(processingHandlers.handleRemoveBg(context)).rejects.toThrow(
        'Missing image input'
      );
    });

    it('should ignore non-image inputs', async () => {
      const context = createMockContext({
        node: {
          id: 'removebg-3',
          type: 'removeBg',
          position: { x: 0, y: 0 },
          data: { nodeType: 'removeBg', label: 'Remove BG' },
        },
        inputs: [{ type: 'text', data: 'not an image', timestamp: Date.now() }],
      });

      await expect(processingHandlers.handleRemoveBg(context)).rejects.toThrow(
        'Missing image input'
      );
    });
  });

  describe('handleResize', () => {
    it('should resize image with contain mode', async () => {
      const context = createMockContext({
        node: {
          id: 'resize-1',
          type: 'resize',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'resize',
            width: 256,
            height: 256,
            mode: 'contain',
            lockAspect: true,
            pixelPerfect: false,
            label: 'Resize',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await processingHandlers.handleResize(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('resize-1', {
        type: 'image',
        data: expect.stringContaining('data:image/png'),
        timestamp: expect.any(Number),
      });
    });

    it('should resize with cover mode', async () => {
      const context = createMockContext({
        node: {
          id: 'resize-2',
          type: 'resize',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'resize',
            width: 128,
            height: 128,
            mode: 'cover',
            lockAspect: true,
            pixelPerfect: false,
            label: 'Resize',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await processingHandlers.handleResize(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
      const call = (context.setNodeOutput as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[1].type).toBe('image');
    });

    it('should resize with stretch mode (default fill)', async () => {
      const context = createMockContext({
        node: {
          id: 'resize-3',
          type: 'resize',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'resize',
            width: 512,
            height: 256,
            mode: 'stretch',
            lockAspect: false,
            pixelPerfect: false,
            label: 'Resize',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await processingHandlers.handleResize(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should use default dimensions when width/height are undefined', async () => {
      const context = createMockContext({
        node: {
          id: 'resize-4',
          type: 'resize',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'resize',
            mode: 'contain',
            lockAspect: true,
            pixelPerfect: false,
            label: 'Resize',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await processingHandlers.handleResize(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should throw error when image input is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'resize-5',
          type: 'resize',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'resize',
            width: 256,
            height: 256,
            mode: 'contain',
            lockAspect: true,
            pixelPerfect: false,
            label: 'Resize',
          },
        },
        inputs: [],
      });

      await expect(processingHandlers.handleResize(context)).rejects.toThrow(
        'Missing image input'
      );
    });

    it('should use default mode when mode is undefined', async () => {
      const context = createMockContext({
        node: {
          id: 'resize-6',
          type: 'resize',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'resize',
            width: 64,
            height: 64,
            lockAspect: true,
            pixelPerfect: false,
            label: 'Resize',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await processingHandlers.handleResize(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleCrop', () => {
    it('should crop image with specified dimensions', async () => {
      const context = createMockContext({
        node: {
          id: 'crop-1',
          type: 'crop',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'crop',
            x: 10,
            y: 20,
            width: 50,
            height: 50,
            preset: 'custom',
            label: 'Crop',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await processingHandlers.handleCrop(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('crop-1', {
        type: 'image',
        data: expect.stringContaining('data:image/png'),
        timestamp: expect.any(Number),
      });
    });

    it('should use default crop bounds when values are undefined', async () => {
      const context = createMockContext({
        node: {
          id: 'crop-2',
          type: 'crop',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'crop',
            preset: 'custom',
            label: 'Crop',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await processingHandlers.handleCrop(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should throw error when image input is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'crop-3',
          type: 'crop',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'crop',
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            preset: 'custom',
            label: 'Crop',
          },
        },
        inputs: [],
      });

      await expect(processingHandlers.handleCrop(context)).rejects.toThrow(
        'Missing image input'
      );
    });

    it('should crop with zero offset', async () => {
      const context = createMockContext({
        node: {
          id: 'crop-4',
          type: 'crop',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'crop',
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            preset: 'custom',
            label: 'Crop',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await processingHandlers.handleCrop(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });
  });

  describe('handlePixelate', () => {
    it('should pixelate with specified pixel size parameter', async () => {
      const context = createMockContext({
        node: {
          id: 'pix-1',
          type: 'pixelate',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'pixelate',
            pixelSize: 8,
            colorLevels: 16,
            label: 'Pixelate',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await processingHandlers.handlePixelate(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('pix-1', {
        type: 'image',
        data: expect.stringContaining('data:image/png'),
        timestamp: expect.any(Number),
      });
    });

    it('should use default values when pixelSize/colorLevels undefined', async () => {
      const context = createMockContext({
        node: {
          id: 'pix-2',
          type: 'pixelate',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'pixelate',
            label: 'Pixelate',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await processingHandlers.handlePixelate(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should throw error when image input is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'pix-3',
          type: 'pixelate',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'pixelate',
            pixelSize: 4,
            colorLevels: 8,
            label: 'Pixelate',
          },
        },
        inputs: [],
      });

      await expect(processingHandlers.handlePixelate(context)).rejects.toThrow(
        'Missing image input'
      );
    });

    it('should handle large pixel size', async () => {
      const context = createMockContext({
        node: {
          id: 'pix-4',
          type: 'pixelate',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'pixelate',
            pixelSize: 32,
            colorLevels: 4,
            label: 'Pixelate',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await processingHandlers.handlePixelate(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });
  });
});
