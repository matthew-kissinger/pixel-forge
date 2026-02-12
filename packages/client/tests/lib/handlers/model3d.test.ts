import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Node } from '@xyflow/react';
import type { NodeHandlerContext } from '../../../src/lib/handlers';
import * as model3dHandlers from '../../../src/lib/handlers/model3d';
import * as api from '../../../src/lib/api';

vi.mock('../../../src/lib/api');

function createMockContext(
  overrides: Partial<NodeHandlerContext> = {}
): NodeHandlerContext {
  const mockNode: Node = {
    id: 'test-node',
    type: 'model3DGen',
    position: { x: 0, y: 0 },
    data: { nodeType: 'model3DGen', label: 'Test' },
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
      demoMode: false,
      signal: undefined,
    },
    ...overrides,
  };
}

describe('3D Model Generation Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleModel3DGen', () => {
    it('should generate model with polling', async () => {
      const mockGenerateModel = vi.mocked(api.generateModel);
      const mockPollModelStatus = vi.mocked(api.pollModelStatus);

      mockGenerateModel.mockResolvedValue({ requestId: 'req-123' });
      mockPollModelStatus.mockResolvedValue({
        status: 'completed',
        modelUrl: 'https://example.com/model.glb',
      });

      const context = createMockContext({
        node: {
          id: 'model-1',
          type: 'model3DGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'model3DGen', label: 'Model' },
        },
        inputs: [{ type: 'text', data: 'a low poly tree', timestamp: Date.now() }],
      });

      await model3dHandlers.handleModel3DGen(context);

      expect(mockGenerateModel).toHaveBeenCalledWith('a low poly tree');
      expect(mockPollModelStatus).toHaveBeenCalledWith('req-123', undefined, 5000, 300000, undefined);
      expect(context.setNodeOutput).toHaveBeenCalledWith('model-1', {
        type: 'model',
        data: 'https://example.com/model.glb',
        timestamp: expect.any(Number),
      });
    });

    it('should return Box.glb URL in demo mode', async () => {
      const context = createMockContext({
        node: {
          id: 'model-2',
          type: 'model3DGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'model3DGen', label: 'Model' },
        },
        inputs: [{ type: 'text', data: 'test', timestamp: Date.now() }],
        ctx: { getCancelled: () => false, demoMode: true },
      });

      await model3dHandlers.handleModel3DGen(context);

      expect(api.generateModel).not.toHaveBeenCalled();
      expect(context.setNodeOutput).toHaveBeenCalledWith('model-2', {
        type: 'model',
        data: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb',
        timestamp: expect.any(Number),
      });
    });

    it('should throw error when cancelled before generation', async () => {
      const context = createMockContext({
        node: {
          id: 'model-3',
          type: 'model3DGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'model3DGen', label: 'Model' },
        },
        inputs: [{ type: 'text', data: 'test', timestamp: Date.now() }],
        ctx: { getCancelled: () => true, demoMode: false },
      });

      await expect(model3dHandlers.handleModel3DGen(context)).rejects.toThrow(
        'Execution cancelled'
      );
      expect(api.generateModel).not.toHaveBeenCalled();
    });

    it('should throw error when cancelled after generation before poll', async () => {
      const mockGenerateModel = vi.mocked(api.generateModel);
      mockGenerateModel.mockResolvedValue({ requestId: 'req-123' });

      let callCount = 0;
      const context = createMockContext({
        node: {
          id: 'model-4',
          type: 'model3DGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'model3DGen', label: 'Model' },
        },
        inputs: [{ type: 'text', data: 'test', timestamp: Date.now() }],
        ctx: {
          getCancelled: () => {
            callCount++;
            return callCount > 1;
          },
          demoMode: false,
        },
      });

      await expect(model3dHandlers.handleModel3DGen(context)).rejects.toThrow(
        'Execution cancelled'
      );
      expect(mockGenerateModel).toHaveBeenCalled();
      expect(api.pollModelStatus).not.toHaveBeenCalled();
    });

    it('should throw error when cancelled after poll', async () => {
      const mockGenerateModel = vi.mocked(api.generateModel);
      const mockPollModelStatus = vi.mocked(api.pollModelStatus);

      mockGenerateModel.mockResolvedValue({ requestId: 'req-123' });
      mockPollModelStatus.mockResolvedValue({
        status: 'completed',
        modelUrl: 'https://example.com/model.glb',
      });

      let callCount = 0;
      const context = createMockContext({
        node: {
          id: 'model-5',
          type: 'model3DGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'model3DGen', label: 'Model' },
        },
        inputs: [{ type: 'text', data: 'test', timestamp: Date.now() }],
        ctx: {
          getCancelled: () => {
            callCount++;
            return callCount > 2;
          },
          demoMode: false,
        },
      });

      await expect(model3dHandlers.handleModel3DGen(context)).rejects.toThrow(
        'Execution cancelled'
      );
      expect(mockPollModelStatus).toHaveBeenCalled();
    });

    it('should throw error when poll returns failed status', async () => {
      const mockGenerateModel = vi.mocked(api.generateModel);
      const mockPollModelStatus = vi.mocked(api.pollModelStatus);

      mockGenerateModel.mockResolvedValue({ requestId: 'req-123' });
      mockPollModelStatus.mockResolvedValue({
        status: 'failed',
        error: 'Generation failed',
      });

      const context = createMockContext({
        node: {
          id: 'model-6',
          type: 'model3DGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'model3DGen', label: 'Model' },
        },
        inputs: [{ type: 'text', data: 'test', timestamp: Date.now() }],
      });

      await expect(model3dHandlers.handleModel3DGen(context)).rejects.toThrow(
        'Generation failed'
      );
    });

    it('should throw error when poll returns no modelUrl', async () => {
      const mockGenerateModel = vi.mocked(api.generateModel);
      const mockPollModelStatus = vi.mocked(api.pollModelStatus);

      mockGenerateModel.mockResolvedValue({ requestId: 'req-123' });
      mockPollModelStatus.mockResolvedValue({
        status: 'completed',
      });

      const context = createMockContext({
        node: {
          id: 'model-7',
          type: 'model3DGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'model3DGen', label: 'Model' },
        },
        inputs: [{ type: 'text', data: 'test', timestamp: Date.now() }],
      });

      await expect(model3dHandlers.handleModel3DGen(context)).rejects.toThrow(
        'Model generation failed'
      );
    });

    it('should throw error when prompt is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'model-8',
          type: 'model3DGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'model3DGen', label: 'Model' },
        },
        inputs: [],
      });

      await expect(model3dHandlers.handleModel3DGen(context)).rejects.toThrow(
        'Missing text prompt input'
      );
    });

    it('should pass ctx.signal to pollModelStatus', async () => {
      const mockGenerateModel = vi.mocked(api.generateModel);
      const mockPollModelStatus = vi.mocked(api.pollModelStatus);

      mockGenerateModel.mockResolvedValue({ requestId: 'req-123' });
      mockPollModelStatus.mockResolvedValue({
        status: 'completed',
        modelUrl: 'https://example.com/model.glb',
      });

      const mockSignal = new AbortController().signal;
      const context = createMockContext({
        node: {
          id: 'model-9',
          type: 'model3DGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'model3DGen', label: 'Model' },
        },
        inputs: [{ type: 'text', data: 'test', timestamp: Date.now() }],
        ctx: { getCancelled: () => false, demoMode: false, signal: mockSignal },
      });

      await model3dHandlers.handleModel3DGen(context);

      expect(mockPollModelStatus).toHaveBeenCalledWith('req-123', undefined, 5000, 300000, mockSignal);
    });
  });

  describe('handleKilnGen', () => {
    it('should generate code from text input', async () => {
      const mockGenerateKilnCode = vi.mocked(api.generateKilnCode);
      mockGenerateKilnCode.mockResolvedValue({
        success: true,
        code: '// Generated code\nexport function createModel() {}',
      });

      const context = createMockContext({
        node: {
          id: 'kiln-1',
          type: 'kilnGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'kilnGen', label: 'Kiln' },
        },
        inputs: [{ type: 'text', data: 'create a cube', timestamp: Date.now() }],
      });

      await model3dHandlers.handleKilnGen(context);

      expect(mockGenerateKilnCode).toHaveBeenCalledWith({
        prompt: 'create a cube',
        mode: undefined,
        category: undefined,
        style: 'low-poly',
        includeAnimation: true,
      });
      expect(context.setNodeOutput).toHaveBeenCalledWith('kiln-1', {
        type: 'text',
        data: '// Generated code\nexport function createModel() {}',
        timestamp: expect.any(Number),
      });
    });

    it('should use prompt from node data when no input', async () => {
      const mockGenerateKilnCode = vi.mocked(api.generateKilnCode);
      mockGenerateKilnCode.mockResolvedValue({
        success: true,
        code: '// Code',
      });

      const context = createMockContext({
        node: {
          id: 'kiln-2',
          type: 'kilnGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'kilnGen', prompt: 'sphere model', label: 'Kiln' },
        },
        inputs: [],
      });

      await model3dHandlers.handleKilnGen(context);

      expect(mockGenerateKilnCode).toHaveBeenCalledWith({
        prompt: 'sphere model',
        mode: undefined,
        category: undefined,
        style: 'low-poly',
        includeAnimation: true,
      });
    });

    it('should throw error when prompt is empty', async () => {
      const context = createMockContext({
        node: {
          id: 'kiln-3',
          type: 'kilnGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'kilnGen', label: 'Kiln' },
        },
        inputs: [],
      });

      await expect(model3dHandlers.handleKilnGen(context)).rejects.toThrow(
        'Missing prompt - connect a text input or enter a prompt'
      );
    });

    it('should return demo code in demo mode', async () => {
      const context = createMockContext({
        node: {
          id: 'kiln-4',
          type: 'kilnGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'kilnGen', label: 'Kiln' },
        },
        inputs: [{ type: 'text', data: 'test', timestamp: Date.now() }],
        ctx: { getCancelled: () => false, demoMode: true },
      });

      await model3dHandlers.handleKilnGen(context);

      expect(api.generateKilnCode).not.toHaveBeenCalled();
      expect(context.setNodeOutput).toHaveBeenCalledWith('kiln-4', {
        type: 'text',
        data: expect.stringContaining('Demo Mode Kiln Code'),
        timestamp: expect.any(Number),
      });
    });

    it('should check cancellation before generation', async () => {
      const context = createMockContext({
        node: {
          id: 'kiln-5',
          type: 'kilnGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'kilnGen', label: 'Kiln' },
        },
        inputs: [{ type: 'text', data: 'test', timestamp: Date.now() }],
        ctx: { getCancelled: () => true, demoMode: false },
      });

      await expect(model3dHandlers.handleKilnGen(context)).rejects.toThrow(
        'Execution cancelled'
      );
      expect(api.generateKilnCode).not.toHaveBeenCalled();
    });

    it('should check cancellation after generation', async () => {
      const mockGenerateKilnCode = vi.mocked(api.generateKilnCode);
      mockGenerateKilnCode.mockResolvedValue({
        success: true,
        code: '// Code',
      });

      let callCount = 0;
      const context = createMockContext({
        node: {
          id: 'kiln-6',
          type: 'kilnGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'kilnGen', label: 'Kiln' },
        },
        inputs: [{ type: 'text', data: 'test', timestamp: Date.now() }],
        ctx: {
          getCancelled: () => {
            callCount++;
            return callCount > 1;
          },
          demoMode: false,
        },
      });

      await expect(model3dHandlers.handleKilnGen(context)).rejects.toThrow(
        'Execution cancelled'
      );
      expect(mockGenerateKilnCode).toHaveBeenCalled();
    });

    it('should throw error when generation fails', async () => {
      const mockGenerateKilnCode = vi.mocked(api.generateKilnCode);
      mockGenerateKilnCode.mockResolvedValue({
        success: false,
        error: 'API error',
      });

      const context = createMockContext({
        node: {
          id: 'kiln-7',
          type: 'kilnGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'kilnGen', label: 'Kiln' },
        },
        inputs: [{ type: 'text', data: 'test', timestamp: Date.now() }],
      });

      await expect(model3dHandlers.handleKilnGen(context)).rejects.toThrow('API error');
    });

    it('should pass options correctly', async () => {
      const mockGenerateKilnCode = vi.mocked(api.generateKilnCode);
      mockGenerateKilnCode.mockResolvedValue({
        success: true,
        code: '// Code',
      });

      const context = createMockContext({
        node: {
          id: 'kiln-8',
          type: 'kilnGen',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'kilnGen',
            mode: 'advanced',
            category: 'character',
            includeAnimation: false,
            label: 'Kiln',
          },
        },
        inputs: [{ type: 'text', data: 'test prompt', timestamp: Date.now() }],
      });

      await model3dHandlers.handleKilnGen(context);

      expect(mockGenerateKilnCode).toHaveBeenCalledWith({
        prompt: 'test prompt',
        mode: 'advanced',
        category: 'character',
        style: 'low-poly',
        includeAnimation: false,
      });
    });
  });
});
