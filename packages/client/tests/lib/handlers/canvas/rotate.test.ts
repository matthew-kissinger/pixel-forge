import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Node } from '@xyflow/react';
import type { NodeHandlerContext } from '../../../../src/lib/handlers';

import { handleRotate } from '../../../../src/lib/handlers/canvas/rotate';

const TEST_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

function createMockContext(
  overrides: Partial<NodeHandlerContext> = {}
): NodeHandlerContext {
  const mockNode: Node = {
    id: 'test-node',
    type: 'rotate',
    position: { x: 0, y: 0 },
    data: { nodeType: 'rotate', label: 'Test' },
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

describe('handleRotate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    await handleRotate(context);

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

    await handleRotate(context);

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

    await handleRotate(context);

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

    await expect(handleRotate(context)).rejects.toThrow('Missing image input');
  });
});
