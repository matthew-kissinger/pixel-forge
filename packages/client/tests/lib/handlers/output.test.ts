import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Node } from '@xyflow/react';
import type { NodeHandlerContext } from '../../../src/lib/handlers';

// Mock API functions before importing handlers
vi.mock('../../../src/lib/api', () => ({
  exportToFile: vi.fn(),
}));

import * as outputHandlers from '../../../src/lib/handlers/output';
import { exportToFile } from '../../../src/lib/api';

const TEST_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

function createMockContext(
  overrides: Partial<NodeHandlerContext> = {}
): NodeHandlerContext {
  const mockNode: Node = {
    id: 'test-node',
    type: 'preview',
    position: { x: 0, y: 0 },
    data: { nodeType: 'preview', label: 'Test' },
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
      onProgress: vi.fn(),
    },
    ...overrides,
  };
}

describe('Output Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handlePreview', () => {
    it('should be a no-op that completes without error', async () => {
      const context = createMockContext({
        node: {
          id: 'preview-1',
          type: 'preview',
          position: { x: 0, y: 0 },
          data: { nodeType: 'preview', inputType: 'any', label: 'Preview' },
        },
      });

      await outputHandlers.handlePreview(context);

      expect(context.setNodeOutput).not.toHaveBeenCalled();
    });

    it('should not modify inputs or produce outputs', async () => {
      const context = createMockContext({
        node: {
          id: 'preview-2',
          type: 'preview',
          position: { x: 0, y: 0 },
          data: { nodeType: 'preview', inputType: 'any', label: 'Preview' },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await outputHandlers.handlePreview(context);

      expect(context.setNodeOutput).not.toHaveBeenCalled();
    });
  });

  describe('handleSave', () => {
    it('should return early when outputPath is not set', async () => {
      const context = createMockContext({
        node: {
          id: 'save-1',
          type: 'save',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'save',
            fileName: 'test.png',
            format: 'png',
            quality: 90,
            label: 'Save',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await outputHandlers.handleSave(context);

      expect(exportToFile).not.toHaveBeenCalled();
    });

    it('should call exportToFile with correct arguments', async () => {
      (exportToFile as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      const context = createMockContext({
        node: {
          id: 'save-2',
          type: 'save',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'save',
            fileName: 'sprite.png',
            format: 'png',
            quality: 90,
            outputPath: '/output/sprite.png',
            label: 'Save',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await outputHandlers.handleSave(context);

      expect(exportToFile).toHaveBeenCalledWith(
        TEST_IMAGE,
        '/output/sprite.png',
        'png',
        90
      );
    });

    it('should throw error when no inputs are connected', async () => {
      const context = createMockContext({
        node: {
          id: 'save-3',
          type: 'save',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'save',
            fileName: 'test.png',
            format: 'png',
            quality: 90,
            outputPath: '/output/test.png',
            label: 'Save',
          },
        },
        inputs: [],
      });

      await expect(outputHandlers.handleSave(context)).rejects.toThrow(
        'No input connected to Save node'
      );
    });

    it('should throw error when input is not an image type', async () => {
      const context = createMockContext({
        node: {
          id: 'save-4',
          type: 'save',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'save',
            fileName: 'test.png',
            format: 'png',
            quality: 90,
            outputPath: '/output/test.png',
            label: 'Save',
          },
        },
        inputs: [{ type: 'text', data: 'not an image', timestamp: Date.now() }],
      });

      await expect(outputHandlers.handleSave(context)).rejects.toThrow(
        'Cannot export text to file yet - only images supported'
      );
    });

    it('should handle jpg format option (converts to jpeg)', async () => {
      (exportToFile as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      const context = createMockContext({
        node: {
          id: 'save-5',
          type: 'save',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'save',
            fileName: 'sprite.jpg',
            format: 'jpg',
            quality: 85,
            outputPath: '/output/sprite.jpg',
            label: 'Save',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await outputHandlers.handleSave(context);

      expect(exportToFile).toHaveBeenCalledWith(
        TEST_IMAGE,
        '/output/sprite.jpg',
        'jpeg',
        85
      );
    });

    it('should handle webp format option', async () => {
      (exportToFile as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      const context = createMockContext({
        node: {
          id: 'save-6',
          type: 'save',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'save',
            fileName: 'sprite.webp',
            format: 'webp',
            quality: 80,
            outputPath: '/output/sprite.webp',
            label: 'Save',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await outputHandlers.handleSave(context);

      expect(exportToFile).toHaveBeenCalledWith(
        TEST_IMAGE,
        '/output/sprite.webp',
        'webp',
        80
      );
    });

    it('should handle png format option (default)', async () => {
      (exportToFile as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      const context = createMockContext({
        node: {
          id: 'save-7',
          type: 'save',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'save',
            fileName: 'sprite.png',
            format: 'png',
            quality: 100,
            outputPath: '/output/sprite.png',
            label: 'Save',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await outputHandlers.handleSave(context);

      expect(exportToFile).toHaveBeenCalledWith(
        TEST_IMAGE,
        '/output/sprite.png',
        'png',
        100
      );
    });

    it('should report progress after save', async () => {
      (exportToFile as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      const onProgress = vi.fn();
      const context = createMockContext({
        node: {
          id: 'save-8',
          type: 'save',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'save',
            fileName: 'test.png',
            format: 'png',
            quality: 90,
            outputPath: '/output/test.png',
            label: 'Save',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
        ctx: {
          getCancelled: () => false,
          onProgress,
        },
      });

      await outputHandlers.handleSave(context);

      expect(onProgress).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('handleExportGLB', () => {
    it('should be a no-op that completes without error', async () => {
      const context = createMockContext({
        node: {
          id: 'glb-1',
          type: 'exportGLB',
          position: { x: 0, y: 0 },
          data: { nodeType: 'exportGLB', fileName: 'model.glb', label: 'Export GLB' },
        },
      });

      await outputHandlers.handleExportGLB(context);

      expect(context.setNodeOutput).not.toHaveBeenCalled();
    });
  });

  describe('handleExportSheet', () => {
    it('should be a no-op that completes without error', async () => {
      const context = createMockContext({
        node: {
          id: 'sheet-1',
          type: 'exportSheet',
          position: { x: 0, y: 0 },
          data: { nodeType: 'exportSheet', fileName: 'sheet.png', label: 'Export Sheet' },
        },
      });

      await outputHandlers.handleExportSheet(context);

      expect(context.setNodeOutput).not.toHaveBeenCalled();
    });
  });
});
