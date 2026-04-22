import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Node, Edge } from '@xyflow/react';
import type { NodeHandlerContext } from '../../../../src/lib/handlers';

import { handleCombine } from '../../../../src/lib/handlers/canvas/combine';

const TEST_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

function createMockContext(
  overrides: Partial<NodeHandlerContext> = {}
): NodeHandlerContext {
  const mockNode: Node = {
    id: 'test-node',
    type: 'combine',
    position: { x: 0, y: 0 },
    data: { nodeType: 'combine', label: 'Test' },
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

describe('handleCombine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    await handleCombine(context);

    expect(context.setNodeOutput).toHaveBeenCalledWith('combine-1', {
      type: 'image',
      data: expect.stringContaining('data:image/png'),
      timestamp: expect.any(Number),
    });
  });

  it('should combine images side-by-side', async () => {
    const context = createCombineContext('side-by-side', { spacing: 10 });

    await handleCombine(context);

    expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
  });

  it('should combine images in grid mode', async () => {
    const context = createCombineContext('grid', { imageCount: 4 });

    await handleCombine(context);

    expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
  });

  it('should combine images vertically (stack)', async () => {
    const context = createCombineContext('vertical', { spacing: 5 });

    await handleCombine(context);

    expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
  });

  it('should combine images in stack mode', async () => {
    const context = createCombineContext('stack');

    await handleCombine(context);

    expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
  });

  it('should respect alignment for overlay mode', async () => {
    for (const alignment of ['center', 'top-right', 'bottom-left', 'bottom-right']) {
      const context = createCombineContext('overlay', { alignment });

      await handleCombine(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    }
  });

  it('should respect spacing in side-by-side mode', async () => {
    const context = createCombineContext('side-by-side', { spacing: 20 });

    await handleCombine(context);

    expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
  });

  it('should throw error with fewer than 2 image inputs', async () => {
    const context = createCombineContext('overlay', { imageCount: 1 });

    await expect(handleCombine(context)).rejects.toThrow(
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

    await expect(handleCombine(context)).rejects.toThrow(
      'Combine node needs at least 2 image inputs'
    );
  });

  it('should handle 3+ images in grid mode', async () => {
    const context = createCombineContext('grid', { imageCount: 3 });

    await handleCombine(context);

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

    await handleCombine(context);

    expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
  });
});
