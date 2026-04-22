import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Node } from '@xyflow/react';
import type { NodeHandlerContext } from '../../../../src/lib/handlers';

import { handleColorPalette } from '../../../../src/lib/handlers/canvas/colorPalette';

const TEST_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

function createMockContext(
  overrides: Partial<NodeHandlerContext> = {}
): NodeHandlerContext {
  const mockNode: Node = {
    id: 'test-node',
    type: 'colorPalette',
    position: { x: 0, y: 0 },
    data: { nodeType: 'colorPalette', label: 'Test' },
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

describe('handleColorPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    await handleColorPalette(context);

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

    await handleColorPalette(context);

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

    await handleColorPalette(context);

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

    await handleColorPalette(context);

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

    await handleColorPalette(context);

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

    await handleColorPalette(context);

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

    await handleColorPalette(context);

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

    await expect(handleColorPalette(context)).rejects.toThrow('Missing image input');
  });
});
