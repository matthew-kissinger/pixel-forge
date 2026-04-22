import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Node } from '@xyflow/react';
import type { NodeHandlerContext } from '../../../../src/lib/handlers';

import { handleTile } from '../../../../src/lib/handlers/canvas/tile';

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

describe('handleTile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    await handleTile(context);

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

    await handleTile(context);

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

    await handleTile(context);

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

    await handleTile(context);

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

    await expect(handleTile(context)).rejects.toThrow('Missing image input');
  });
});
