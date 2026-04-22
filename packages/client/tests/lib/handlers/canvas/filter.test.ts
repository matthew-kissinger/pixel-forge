import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Node } from '@xyflow/react';
import type { NodeHandlerContext } from '../../../../src/lib/handlers';

import { handleFilter } from '../../../../src/lib/handlers/canvas/filter';

const TEST_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

function createMockContext(
  overrides: Partial<NodeHandlerContext> = {}
): NodeHandlerContext {
  const mockNode: Node = {
    id: 'test-node',
    type: 'filter',
    position: { x: 0, y: 0 },
    data: { nodeType: 'filter', label: 'Test' },
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

describe('handleFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    await handleFilter(context);

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

    await handleFilter(context);

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

    await handleFilter(context);

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

    await handleFilter(context);

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

    await handleFilter(context);

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

    await handleFilter(context);

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

    await handleFilter(context);

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

    await handleFilter(context);

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

    await handleFilter(context);

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

    await expect(handleFilter(context)).rejects.toThrow('Missing image input');
  });
});
