import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Node, Edge } from '@xyflow/react';
import type { NodeHandlerContext } from '../../../src/lib/handlers';

import * as canvasHandlers from '../../../src/lib/handlers/canvas';

const TEST_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

function createMockContext(
  overrides: Partial<NodeHandlerContext> = {}
): NodeHandlerContext {
  const mockNode: Node = {
    id: 'test-node',
    type: 'tile',
    position: { x: 0, y: 0 },
    data: { nodeType: 'tile', label: 'Test' },
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

describe('Canvas Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleTile', () => {
    it('should create tiled pattern in seamless mode', async () => {
      const context = createMockContext({
        node: {
          id: 'tile-1',
          type: 'tile',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'tile',
            mode: 'seamless',
            repeatX: 2,
            repeatY: 2,
            blendAmount: 0.25,
            label: 'Tile',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await canvasHandlers.handleTile(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('tile-1', {
        type: 'image',
        data: expect.stringContaining('data:image/png'),
        timestamp: expect.any(Number),
      });
    });

    it('should create tiled pattern in repeat mode', async () => {
      const context = createMockContext({
        node: {
          id: 'tile-2',
          type: 'tile',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'tile',
            mode: 'repeat',
            repeatX: 3,
            repeatY: 2,
            blendAmount: 0,
            label: 'Tile',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await canvasHandlers.handleTile(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should create tiled pattern in mirror mode', async () => {
      const context = createMockContext({
        node: {
          id: 'tile-3',
          type: 'tile',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'tile',
            mode: 'mirror',
            repeatX: 2,
            repeatY: 2,
            blendAmount: 0,
            label: 'Tile',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await canvasHandlers.handleTile(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should use default mode (seamless) when mode is undefined', async () => {
      const context = createMockContext({
        node: {
          id: 'tile-4',
          type: 'tile',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'tile',
            label: 'Tile',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await canvasHandlers.handleTile(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should throw error when image input is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'tile-5',
          type: 'tile',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'tile',
            mode: 'repeat',
            repeatX: 2,
            repeatY: 2,
            blendAmount: 0,
            label: 'Tile',
          },
        },
        inputs: [],
      });

      await expect(canvasHandlers.handleTile(context)).rejects.toThrow(
        'Missing image input'
      );
    });
  });

  describe('handleFilter', () => {
    it('should apply grayscale filter', async () => {
      const context = createMockContext({
        node: {
          id: 'filter-1',
          type: 'filter',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'filter',
            filter: 'grayscale',
            intensity: 100,
            label: 'Filter',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await canvasHandlers.handleFilter(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('filter-1', {
        type: 'image',
        data: expect.stringContaining('data:image/png'),
        timestamp: expect.any(Number),
      });
    });

    it('should apply sepia filter', async () => {
      const context = createMockContext({
        node: {
          id: 'filter-2',
          type: 'filter',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'filter',
            filter: 'sepia',
            intensity: 75,
            label: 'Filter',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await canvasHandlers.handleFilter(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should apply brightness filter', async () => {
      const context = createMockContext({
        node: {
          id: 'filter-3',
          type: 'filter',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'filter',
            filter: 'brightness',
            intensity: 150,
            label: 'Filter',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await canvasHandlers.handleFilter(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should apply contrast filter', async () => {
      const context = createMockContext({
        node: {
          id: 'filter-4',
          type: 'filter',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'filter',
            filter: 'contrast',
            intensity: 120,
            label: 'Filter',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await canvasHandlers.handleFilter(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should apply saturate filter', async () => {
      const context = createMockContext({
        node: {
          id: 'filter-5',
          type: 'filter',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'filter',
            filter: 'saturate',
            intensity: 200,
            label: 'Filter',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await canvasHandlers.handleFilter(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should apply blur filter', async () => {
      const context = createMockContext({
        node: {
          id: 'filter-6',
          type: 'filter',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'filter',
            filter: 'blur',
            intensity: 50,
            label: 'Filter',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await canvasHandlers.handleFilter(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should apply invert filter with pixel manipulation', async () => {
      const context = createMockContext({
        node: {
          id: 'filter-7',
          type: 'filter',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'filter',
            filter: 'invert',
            intensity: 100,
            label: 'Filter',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await canvasHandlers.handleFilter(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should apply sharpen filter with kernel convolution', async () => {
      const context = createMockContext({
        node: {
          id: 'filter-8',
          type: 'filter',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'filter',
            filter: 'sharpen',
            intensity: 80,
            label: 'Filter',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await canvasHandlers.handleFilter(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should default to grayscale when filter is undefined', async () => {
      const context = createMockContext({
        node: {
          id: 'filter-9',
          type: 'filter',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'filter',
            intensity: 100,
            label: 'Filter',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await canvasHandlers.handleFilter(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should throw error when image input is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'filter-10',
          type: 'filter',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'filter',
            filter: 'grayscale',
            intensity: 100,
            label: 'Filter',
          },
        },
        inputs: [],
      });

      await expect(canvasHandlers.handleFilter(context)).rejects.toThrow(
        'Missing image input'
      );
    });
  });

  describe('handleRotate', () => {
    it('should rotate image with 4 directions', async () => {
      const context = createMockContext({
        node: {
          id: 'rotate-1',
          type: 'rotate',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'rotate',
            directions: 4,
            maintainStyle: true,
            label: 'Rotate',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await canvasHandlers.handleRotate(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('rotate-1', {
        type: 'image',
        data: expect.stringContaining('data:image/png'),
        timestamp: expect.any(Number),
      });
    });

    it('should rotate image with 8 directions', async () => {
      const context = createMockContext({
        node: {
          id: 'rotate-2',
          type: 'rotate',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'rotate',
            directions: 8,
            maintainStyle: true,
            label: 'Rotate',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await canvasHandlers.handleRotate(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should use default 4 directions when undefined', async () => {
      const context = createMockContext({
        node: {
          id: 'rotate-3',
          type: 'rotate',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'rotate',
            maintainStyle: true,
            label: 'Rotate',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await canvasHandlers.handleRotate(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should throw error when image input is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'rotate-4',
          type: 'rotate',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'rotate',
            directions: 4,
            maintainStyle: true,
            label: 'Rotate',
          },
        },
        inputs: [],
      });

      await expect(canvasHandlers.handleRotate(context)).rejects.toThrow(
        'Missing image input'
      );
    });
  });

  describe('handleColorPalette', () => {
    it('should apply pico8 palette to image', async () => {
      const context = createMockContext({
        node: {
          id: 'palette-1',
          type: 'colorPalette',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'colorPalette',
            palette: 'pico8',
            dithering: false,
            label: 'Palette',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await canvasHandlers.handleColorPalette(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('palette-1', {
        type: 'image',
        data: expect.stringContaining('data:image/png'),
        timestamp: expect.any(Number),
      });
    });

    it('should apply gameboy palette', async () => {
      const context = createMockContext({
        node: {
          id: 'palette-2',
          type: 'colorPalette',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'colorPalette',
            palette: 'gameboy',
            dithering: false,
            label: 'Palette',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await canvasHandlers.handleColorPalette(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should apply palette with dithering enabled', async () => {
      const context = createMockContext({
        node: {
          id: 'palette-3',
          type: 'colorPalette',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'colorPalette',
            palette: 'cga',
            dithering: true,
            label: 'Palette',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await canvasHandlers.handleColorPalette(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should apply grayscale palette', async () => {
      const context = createMockContext({
        node: {
          id: 'palette-4',
          type: 'colorPalette',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'colorPalette',
            palette: 'grayscale',
            dithering: false,
            label: 'Palette',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await canvasHandlers.handleColorPalette(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should apply neon palette', async () => {
      const context = createMockContext({
        node: {
          id: 'palette-5',
          type: 'colorPalette',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'colorPalette',
            palette: 'neon',
            dithering: false,
            label: 'Palette',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await canvasHandlers.handleColorPalette(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should default to pico8 when palette is undefined', async () => {
      const context = createMockContext({
        node: {
          id: 'palette-6',
          type: 'colorPalette',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'colorPalette',
            dithering: false,
            label: 'Palette',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await canvasHandlers.handleColorPalette(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should fall back to pico8 for unknown palette name', async () => {
      const context = createMockContext({
        node: {
          id: 'palette-7',
          type: 'colorPalette',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'colorPalette',
            palette: 'nonexistent',
            dithering: false,
            label: 'Palette',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await canvasHandlers.handleColorPalette(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should throw error when image input is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'palette-8',
          type: 'colorPalette',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'colorPalette',
            palette: 'pico8',
            dithering: false,
            label: 'Palette',
          },
        },
        inputs: [],
      });

      await expect(canvasHandlers.handleColorPalette(context)).rejects.toThrow(
        'Missing image input'
      );
    });
  });

  describe('handleCombine', () => {
    function createCombineContext(
      mode: string,
      opts: {
        alignment?: string;
        spacing?: number;
        imageCount?: number;
      } = {}
    ) {
      const imageCount = opts.imageCount ?? 2;
      const edges: Edge[] = [];
      const nodeOutputs: Record<string, any> = {};

      for (let i = 0; i < imageCount; i++) {
        const sourceId = `source-${i}`;
        edges.push({
          id: `edge-${i}`,
          source: sourceId,
          target: 'combine-1',
          sourceHandle: null,
          targetHandle: null,
        } as Edge);
        nodeOutputs[sourceId] = {
          type: 'image',
          data: TEST_IMAGE,
          timestamp: Date.now(),
        };
      }

      return createMockContext({
        node: {
          id: 'combine-1',
          type: 'combine',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'combine',
            mode,
            alignment: opts.alignment ?? 'center',
            spacing: opts.spacing ?? 0,
            label: 'Combine',
          },
        },
        edges,
        nodeOutputs,
      });
    }

    it('should merge multiple images in overlay mode', async () => {
      const context = createCombineContext('overlay');

      await canvasHandlers.handleCombine(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('combine-1', {
        type: 'image',
        data: expect.stringContaining('data:image/png'),
        timestamp: expect.any(Number),
      });
    });

    it('should combine images side-by-side', async () => {
      const context = createCombineContext('side-by-side', { spacing: 10 });

      await canvasHandlers.handleCombine(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should combine images in grid mode', async () => {
      const context = createCombineContext('grid', { imageCount: 4 });

      await canvasHandlers.handleCombine(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should combine images vertically (stack)', async () => {
      const context = createCombineContext('vertical', { spacing: 5 });

      await canvasHandlers.handleCombine(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should combine images in stack mode', async () => {
      const context = createCombineContext('stack');

      await canvasHandlers.handleCombine(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should respect alignment for overlay mode', async () => {
      for (const alignment of ['center', 'top-right', 'bottom-left', 'bottom-right']) {
        const context = createCombineContext('overlay', { alignment });

        await canvasHandlers.handleCombine(context);

        expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
      }
    });

    it('should respect spacing in side-by-side mode', async () => {
      const context = createCombineContext('side-by-side', { spacing: 20 });

      await canvasHandlers.handleCombine(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should throw error with fewer than 2 image inputs', async () => {
      const context = createCombineContext('overlay', { imageCount: 1 });

      await expect(canvasHandlers.handleCombine(context)).rejects.toThrow(
        'Combine node needs at least 2 image inputs'
      );
    });

    it('should throw error with zero image inputs', async () => {
      const context = createMockContext({
        node: {
          id: 'combine-1',
          type: 'combine',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'combine',
            mode: 'overlay',
            alignment: 'center',
            spacing: 0,
            label: 'Combine',
          },
        },
        edges: [],
        nodeOutputs: {},
      });

      await expect(canvasHandlers.handleCombine(context)).rejects.toThrow(
        'Combine node needs at least 2 image inputs'
      );
    });

    it('should handle 3+ images in grid mode', async () => {
      const context = createCombineContext('grid', { imageCount: 3 });

      await canvasHandlers.handleCombine(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });

    it('should use overlay as default mode', async () => {
      const edges: Edge[] = [];
      const nodeOutputs: Record<string, any> = {};
      for (let i = 0; i < 2; i++) {
        const sourceId = `src-${i}`;
        edges.push({
          id: `e-${i}`,
          source: sourceId,
          target: 'combine-default',
          sourceHandle: null,
          targetHandle: null,
        } as Edge);
        nodeOutputs[sourceId] = {
          type: 'image',
          data: TEST_IMAGE,
          timestamp: Date.now(),
        };
      }

      const context = createMockContext({
        node: {
          id: 'combine-default',
          type: 'combine',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'combine',
            alignment: 'center',
            spacing: 0,
            label: 'Combine',
          },
        },
        edges,
        nodeOutputs,
      });

      await canvasHandlers.handleCombine(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });
  });
});
