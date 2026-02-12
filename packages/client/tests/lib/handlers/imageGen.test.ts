import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Node } from '@xyflow/react';
import type { NodeHandlerContext } from '../../../src/lib/handlers';
import * as imageGenHandlers from '../../../src/lib/handlers/imageGen';
import * as api from '../../../src/lib/api';

vi.mock('../../../src/lib/api');

function createMockContext(
  overrides: Partial<NodeHandlerContext> = {}
): NodeHandlerContext {
  const mockNode: Node = {
    id: 'test-node',
    type: 'imageGen',
    position: { x: 0, y: 0 },
    data: { nodeType: 'imageGen', label: 'Test' },
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
    },
    ...overrides,
  };
}

describe('Image Generation Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleImageGen', () => {
    it('should generate image with API call', async () => {
      const mockGenerateImage = vi.mocked(api.generateImage);
      mockGenerateImage.mockResolvedValue({ image: 'https://example.com/image.png' });

      const context = createMockContext({
        node: {
          id: 'img-1',
          type: 'imageGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'imageGen', style: 'pixel-art', label: 'Image' },
        },
        inputs: [{ type: 'text', data: 'a pixel sword', timestamp: Date.now() }],
      });

      await imageGenHandlers.handleImageGen(context);

      expect(mockGenerateImage).toHaveBeenCalledWith({
        prompt: 'a pixel sword',
        style: 'pixel-art',
        aspectRatio: undefined,
        removeBackground: undefined,
        presetId: undefined,
      });
      expect(context.setNodeOutput).toHaveBeenCalledWith('img-1', {
        type: 'image',
        data: 'https://example.com/image.png',
        timestamp: expect.any(Number),
      });
    });

    it('should return sample image in demo mode', async () => {
      const context = createMockContext({
        node: {
          id: 'img-2',
          type: 'imageGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'imageGen', label: 'Image' },
        },
        inputs: [{ type: 'text', data: 'test prompt', timestamp: Date.now() }],
        ctx: { getCancelled: () => false, demoMode: true },
      });

      await imageGenHandlers.handleImageGen(context);

      expect(api.generateImage).not.toHaveBeenCalled();
      expect(context.setNodeOutput).toHaveBeenCalledWith('img-2', {
        type: 'image',
        data: expect.stringMatching(/^\/demo\//),
        timestamp: expect.any(Number),
      });
    });

    it('should map pixel-art style in demo mode', async () => {
      const context = createMockContext({
        node: {
          id: 'img-3',
          type: 'imageGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'imageGen', style: 'pixel-art', label: 'Image' },
        },
        inputs: [{ type: 'text', data: 'test', timestamp: Date.now() }],
        ctx: { getCancelled: () => false, demoMode: true },
      });

      await imageGenHandlers.handleImageGen(context);

      const call = (context.setNodeOutput as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[1].data).toBe('/demo/pixel-char.png');
    });

    it('should throw error when text prompt is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'img-4',
          type: 'imageGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'imageGen', label: 'Image' },
        },
        inputs: [],
      });

      await expect(imageGenHandlers.handleImageGen(context)).rejects.toThrow(
        'Missing text prompt input'
      );
    });

    it('should pass options correctly', async () => {
      const mockGenerateImage = vi.mocked(api.generateImage);
      mockGenerateImage.mockResolvedValue({ image: 'https://example.com/image.png' });

      const context = createMockContext({
        node: {
          id: 'img-5',
          type: 'imageGen',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'imageGen',
            style: 'isometric',
            aspectRatio: '16:9',
            autoRemoveBg: true,
            presetId: 'preset-123',
            label: 'Image',
          },
        },
        inputs: [{ type: 'text', data: 'test prompt', timestamp: Date.now() }],
      });

      await imageGenHandlers.handleImageGen(context);

      expect(mockGenerateImage).toHaveBeenCalledWith({
        prompt: 'test prompt',
        style: 'isometric',
        aspectRatio: '16:9',
        removeBackground: true,
        presetId: 'preset-123',
      });
    });
  });

  describe('handleIsometricTile', () => {
    it('should generate isometric tile with style', async () => {
      const mockGenerateImage = vi.mocked(api.generateImage);
      mockGenerateImage.mockResolvedValue({ image: 'https://example.com/tile.png' });

      const context = createMockContext({
        node: {
          id: 'iso-1',
          type: 'isometricTile',
          position: { x: 0, y: 0 },
          data: { nodeType: 'isometricTile', label: 'Tile' },
        },
        inputs: [{ type: 'text', data: 'grass tile', timestamp: Date.now() }],
      });

      await imageGenHandlers.handleIsometricTile(context);

      expect(mockGenerateImage).toHaveBeenCalledWith({
        prompt: 'grass tile',
        style: 'isometric',
      });
      expect(context.setNodeOutput).toHaveBeenCalledWith('iso-1', {
        type: 'image',
        data: 'https://example.com/tile.png',
        timestamp: expect.any(Number),
      });
    });

    it('should return demo image in demo mode', async () => {
      const context = createMockContext({
        node: {
          id: 'iso-2',
          type: 'isometricTile',
          position: { x: 0, y: 0 },
          data: { nodeType: 'isometricTile', label: 'Tile' },
        },
        inputs: [{ type: 'text', data: 'test', timestamp: Date.now() }],
        ctx: { getCancelled: () => false, demoMode: true },
      });

      await imageGenHandlers.handleIsometricTile(context);

      expect(api.generateImage).not.toHaveBeenCalled();
      expect(context.setNodeOutput).toHaveBeenCalledWith('iso-2', {
        type: 'image',
        data: '/demo/pixel-char.png',
        timestamp: expect.any(Number),
      });
    });

    it('should throw error when prompt is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'iso-3',
          type: 'isometricTile',
          position: { x: 0, y: 0 },
          data: { nodeType: 'isometricTile', label: 'Tile' },
        },
        inputs: [],
      });

      await expect(imageGenHandlers.handleIsometricTile(context)).rejects.toThrow(
        'Missing text prompt input'
      );
    });
  });

  describe('handleSpriteSheet', () => {
    it('should generate sprite sheet', async () => {
      const mockGenerateImage = vi.mocked(api.generateImage);
      mockGenerateImage.mockResolvedValue({ image: 'https://example.com/sheet.png' });

      const context = createMockContext({
        node: {
          id: 'sprite-1',
          type: 'spriteSheet',
          position: { x: 0, y: 0 },
          data: { nodeType: 'spriteSheet', label: 'Sheet' },
        },
        inputs: [{ type: 'text', data: 'character walk cycle', timestamp: Date.now() }],
      });

      await imageGenHandlers.handleSpriteSheet(context);

      expect(mockGenerateImage).toHaveBeenCalledWith({
        prompt: 'character walk cycle',
        style: 'isometric',
      });
      expect(context.setNodeOutput).toHaveBeenCalledWith('sprite-1', {
        type: 'image',
        data: 'https://example.com/sheet.png',
        timestamp: expect.any(Number),
      });
    });

    it('should return effect-strip in demo mode', async () => {
      const context = createMockContext({
        node: {
          id: 'sprite-2',
          type: 'spriteSheet',
          position: { x: 0, y: 0 },
          data: { nodeType: 'spriteSheet', label: 'Sheet' },
        },
        inputs: [{ type: 'text', data: 'test', timestamp: Date.now() }],
        ctx: { getCancelled: () => false, demoMode: true },
      });

      await imageGenHandlers.handleSpriteSheet(context);

      expect(api.generateImage).not.toHaveBeenCalled();
      expect(context.setNodeOutput).toHaveBeenCalledWith('sprite-2', {
        type: 'image',
        data: '/demo/effect-strip.png',
        timestamp: expect.any(Number),
      });
    });

    it('should throw error when prompt is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'sprite-3',
          type: 'spriteSheet',
          position: { x: 0, y: 0 },
          data: { nodeType: 'spriteSheet', label: 'Sheet' },
        },
        inputs: [],
      });

      await expect(imageGenHandlers.handleSpriteSheet(context)).rejects.toThrow(
        'Missing text prompt input'
      );
    });
  });
});
