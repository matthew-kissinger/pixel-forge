import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Node } from '@xyflow/react';
import type { NodeHandlerContext } from '../../../src/lib/handlers';

vi.mock('../../../src/lib/api');
vi.mock('../../../src/lib/image-utils');

import { sliceSheet, compressImage } from '../../../src/lib/api';
import { extractDominantColors, getImageDimensions, loadImage } from '../../../src/lib/image-utils';
import {
  handleAnalyze,
  handleIterate,
  handleSliceSheet,
  handleCompress,
  handleQualityCheck,
} from '../../../src/lib/handlers/analysis';

const TEST_IMAGE = 'data:image/png;base64,iVBORw0KGgo=';

function createMockContext(
  overrides: Partial<NodeHandlerContext> = {}
): NodeHandlerContext {
  const mockNode: Node = {
    id: 'test-node',
    type: 'analyze',
    position: { x: 0, y: 0 },
    data: { nodeType: 'analyze', label: 'Test' },
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

describe('Analysis Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleAnalyze', () => {
    it('should extract dimensions, palette, and stats when all flags true', async () => {
      vi.mocked(getImageDimensions).mockResolvedValue({ width: 256, height: 128 });
      vi.mocked(extractDominantColors).mockResolvedValue([[255, 0, 0], [0, 255, 0]]);

      const context = createMockContext({
        node: {
          id: 'analyze-1',
          type: 'analyze',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'analyze',
            extractDimensions: true,
            extractPalette: true,
            extractStats: true,
            label: 'Analyze',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await handleAnalyze(context);

      expect(getImageDimensions).toHaveBeenCalledWith(TEST_IMAGE);
      expect(extractDominantColors).toHaveBeenCalledWith(TEST_IMAGE, 8);
      const call = vi.mocked(context.setNodeOutput).mock.calls[0];
      expect(call[0]).toBe('analyze-1');
      const result = JSON.parse(call[1].data);
      expect(result.dimensions).toEqual({ width: 256, height: 128 });
      expect(result.palette).toEqual(['#ff0000', '#00ff00']);
      expect(result.stats).toEqual({
        aspectRatio: '2:1',
        totalPixels: 32768,
        isPowerOf2: true,
      });
    });

    it('should skip dimensions when extractDimensions is false', async () => {
      vi.mocked(extractDominantColors).mockResolvedValue([[0, 0, 0]]);

      const context = createMockContext({
        node: {
          id: 'analyze-2',
          type: 'analyze',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'analyze',
            extractDimensions: false,
            extractPalette: true,
            extractStats: true,
            label: 'Analyze',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await handleAnalyze(context);

      expect(getImageDimensions).not.toHaveBeenCalled();
      const result = JSON.parse(vi.mocked(context.setNodeOutput).mock.calls[0][1].data);
      expect(result.dimensions).toBeUndefined();
      // stats requires dimensions, so should also be undefined
      expect(result.stats).toBeUndefined();
    });

    it('should skip palette when extractPalette is false', async () => {
      vi.mocked(getImageDimensions).mockResolvedValue({ width: 64, height: 64 });

      const context = createMockContext({
        node: {
          id: 'analyze-3',
          type: 'analyze',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'analyze',
            extractDimensions: true,
            extractPalette: false,
            extractStats: false,
            label: 'Analyze',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await handleAnalyze(context);

      expect(extractDominantColors).not.toHaveBeenCalled();
      const result = JSON.parse(vi.mocked(context.setNodeOutput).mock.calls[0][1].data);
      expect(result.palette).toBeUndefined();
    });

    it('should throw on missing image input', async () => {
      const context = createMockContext({
        node: {
          id: 'analyze-4',
          type: 'analyze',
          position: { x: 0, y: 0 },
          data: { nodeType: 'analyze', label: 'Analyze' },
        },
      });

      await expect(handleAnalyze(context)).rejects.toThrow('Missing image input');
    });

    it('should use default flag values (all true)', async () => {
      vi.mocked(getImageDimensions).mockResolvedValue({ width: 512, height: 512 });
      vi.mocked(extractDominantColors).mockResolvedValue([[128, 128, 128]]);

      const context = createMockContext({
        node: {
          id: 'analyze-5',
          type: 'analyze',
          position: { x: 0, y: 0 },
          data: { nodeType: 'analyze', label: 'Analyze' },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await handleAnalyze(context);

      expect(getImageDimensions).toHaveBeenCalled();
      expect(extractDominantColors).toHaveBeenCalled();
      const result = JSON.parse(vi.mocked(context.setNodeOutput).mock.calls[0][1].data);
      expect(result.dimensions).toBeDefined();
      expect(result.palette).toBeDefined();
      expect(result.stats).toBeDefined();
    });

    it('should output type metadata', async () => {
      vi.mocked(getImageDimensions).mockResolvedValue({ width: 32, height: 32 });
      vi.mocked(extractDominantColors).mockResolvedValue([]);

      const context = createMockContext({
        node: {
          id: 'analyze-6',
          type: 'analyze',
          position: { x: 0, y: 0 },
          data: { nodeType: 'analyze', label: 'Analyze' },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await handleAnalyze(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('analyze-6', {
        type: 'metadata',
        data: expect.any(String),
        timestamp: expect.any(Number),
      });
    });

    it('should detect non-power-of-2 dimensions', async () => {
      vi.mocked(getImageDimensions).mockResolvedValue({ width: 300, height: 200 });
      vi.mocked(extractDominantColors).mockResolvedValue([]);

      const context = createMockContext({
        node: {
          id: 'analyze-7',
          type: 'analyze',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'analyze',
            extractDimensions: true,
            extractPalette: true,
            extractStats: true,
            label: 'Analyze',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await handleAnalyze(context);

      const result = JSON.parse(vi.mocked(context.setNodeOutput).mock.calls[0][1].data);
      expect(result.stats.isPowerOf2).toBe(false);
      expect(result.stats.aspectRatio).toBe('3:2');
    });
  });

  describe('handleIterate', () => {
    it('should output image once for single iteration', async () => {
      const context = createMockContext({
        node: {
          id: 'iter-1',
          type: 'iterate',
          position: { x: 0, y: 0 },
          data: { nodeType: 'iterate', iterations: 1, label: 'Iterate' },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await handleIterate(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
      expect(context.setNodeOutput).toHaveBeenCalledWith('iter-1', {
        type: 'image',
        data: TEST_IMAGE,
        timestamp: expect.any(Number),
      });
    });

    it('should output image multiple times for multiple iterations', async () => {
      const context = createMockContext({
        node: {
          id: 'iter-2',
          type: 'iterate',
          position: { x: 0, y: 0 },
          data: { nodeType: 'iterate', iterations: 5, label: 'Iterate' },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await handleIterate(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(5);
    });

    it('should stop on cancellation', async () => {
      let callCount = 0;
      const context = createMockContext({
        node: {
          id: 'iter-3',
          type: 'iterate',
          position: { x: 0, y: 0 },
          data: { nodeType: 'iterate', iterations: 10, label: 'Iterate' },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
        ctx: {
          getCancelled: () => {
            callCount++;
            return callCount > 3;
          },
        },
      });

      await expect(handleIterate(context)).rejects.toThrow('Execution cancelled');
      expect(context.setNodeOutput).toHaveBeenCalledTimes(3);
    });

    it('should throw on missing image input', async () => {
      const context = createMockContext({
        node: {
          id: 'iter-4',
          type: 'iterate',
          position: { x: 0, y: 0 },
          data: { nodeType: 'iterate', iterations: 1, label: 'Iterate' },
        },
      });

      await expect(handleIterate(context)).rejects.toThrow('Missing image input');
    });

    it('should default to 1 iteration', async () => {
      const context = createMockContext({
        node: {
          id: 'iter-5',
          type: 'iterate',
          position: { x: 0, y: 0 },
          data: { nodeType: 'iterate', label: 'Iterate' },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await handleIterate(context);

      expect(context.setNodeOutput).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleSliceSheet', () => {
    it('should call sliceSheet API and output first sprite', async () => {
      vi.mocked(sliceSheet).mockResolvedValue({
        sprites: ['data:image/png;base64,sprite1', 'data:image/png;base64,sprite2'],
      } as any);

      const context = createMockContext({
        node: {
          id: 'slice-1',
          type: 'sliceSheet',
          position: { x: 0, y: 0 },
          data: { nodeType: 'sliceSheet', rows: 4, cols: 3, label: 'Slice' },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await handleSliceSheet(context);

      expect(sliceSheet).toHaveBeenCalledWith(TEST_IMAGE, 4, 3);
      expect(context.setNodeOutput).toHaveBeenCalledWith('slice-1', {
        type: 'image',
        data: 'data:image/png;base64,sprite1',
        timestamp: expect.any(Number),
      });
    });

    it('should use default rows=6 cols=5', async () => {
      vi.mocked(sliceSheet).mockResolvedValue({ sprites: ['sprite-data'] } as any);

      const context = createMockContext({
        node: {
          id: 'slice-2',
          type: 'sliceSheet',
          position: { x: 0, y: 0 },
          data: { nodeType: 'sliceSheet', label: 'Slice' },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await handleSliceSheet(context);

      expect(sliceSheet).toHaveBeenCalledWith(TEST_IMAGE, 6, 5);
    });

    it('should not set output when no sprites returned', async () => {
      vi.mocked(sliceSheet).mockResolvedValue({ sprites: [] } as any);

      const context = createMockContext({
        node: {
          id: 'slice-3',
          type: 'sliceSheet',
          position: { x: 0, y: 0 },
          data: { nodeType: 'sliceSheet', rows: 2, cols: 2, label: 'Slice' },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await handleSliceSheet(context);

      expect(context.setNodeOutput).not.toHaveBeenCalled();
    });

    it('should throw on missing image input', async () => {
      const context = createMockContext({
        node: {
          id: 'slice-4',
          type: 'sliceSheet',
          position: { x: 0, y: 0 },
          data: { nodeType: 'sliceSheet', label: 'Slice' },
        },
      });

      await expect(handleSliceSheet(context)).rejects.toThrow('Missing image input');
    });
  });

  describe('handleCompress', () => {
    it('should call compressImage with all options', async () => {
      vi.mocked(compressImage).mockResolvedValue({ image: 'compressed-data' } as any);

      const context = createMockContext({
        node: {
          id: 'compress-1',
          type: 'compress',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'compress',
            format: 'jpeg',
            quality: 60,
            maxWidth: 800,
            maxHeight: 600,
            label: 'Compress',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await handleCompress(context);

      expect(compressImage).toHaveBeenCalledWith(TEST_IMAGE, 'jpeg', 60, 800, 600);
      expect(context.setNodeOutput).toHaveBeenCalledWith('compress-1', {
        type: 'image',
        data: 'compressed-data',
        timestamp: expect.any(Number),
      });
    });

    it('should use default format=webp and quality=80', async () => {
      vi.mocked(compressImage).mockResolvedValue({ image: 'compressed-default' } as any);

      const context = createMockContext({
        node: {
          id: 'compress-2',
          type: 'compress',
          position: { x: 0, y: 0 },
          data: { nodeType: 'compress', label: 'Compress' },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await handleCompress(context);

      expect(compressImage).toHaveBeenCalledWith(TEST_IMAGE, 'webp', 80, undefined, undefined);
    });

    it('should throw on missing image input', async () => {
      const context = createMockContext({
        node: {
          id: 'compress-3',
          type: 'compress',
          position: { x: 0, y: 0 },
          data: { nodeType: 'compress', label: 'Compress' },
        },
      });

      await expect(handleCompress(context)).rejects.toThrow('Missing image input');
    });
  });

  describe('handleQualityCheck', () => {
    beforeEach(() => {
      vi.mocked(getImageDimensions).mockResolvedValue({ width: 256, height: 256 });
      vi.mocked(loadImage).mockResolvedValue({} as HTMLImageElement);
    });

    it('should pass with valid power-of-2 PNG image', async () => {
      const context = createMockContext({
        node: {
          id: 'qc-1',
          type: 'qualityCheck',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'qualityCheck',
            requirePowerOf2: true,
            requireTransparency: false,
            allowedFormats: ['png'],
            maxFileSize: 100000,
            label: 'QC',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await handleQualityCheck(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('qc-1', {
        type: 'image',
        data: TEST_IMAGE,
        timestamp: expect.any(Number),
      });
    });

    it('should fail on dimension out of range', async () => {
      vi.mocked(getImageDimensions).mockResolvedValue({ width: 8192, height: 8192 });

      const context = createMockContext({
        node: {
          id: 'qc-2',
          type: 'qualityCheck',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'qualityCheck',
            maxWidth: 4096,
            maxHeight: 4096,
            requirePowerOf2: false,
            label: 'QC',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await expect(handleQualityCheck(context)).rejects.toThrow(
        'Dimensions 8192x8192 outside allowed range'
      );
    });

    it('should fail on non-power-of-2 dimensions', async () => {
      vi.mocked(getImageDimensions).mockResolvedValue({ width: 300, height: 300 });

      const context = createMockContext({
        node: {
          id: 'qc-3',
          type: 'qualityCheck',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'qualityCheck',
            requirePowerOf2: true,
            label: 'QC',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await expect(handleQualityCheck(context)).rejects.toThrow(
        'Dimensions must be power of 2'
      );
    });

    it('should fail on file size exceeding maximum', async () => {
      const largeBase64 = 'A'.repeat(200000);
      const largeImage = `data:image/png;base64,${largeBase64}`;

      const context = createMockContext({
        node: {
          id: 'qc-4',
          type: 'qualityCheck',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'qualityCheck',
            maxFileSize: 1000,
            requirePowerOf2: false,
            label: 'QC',
          },
        },
        inputs: [{ type: 'image', data: largeImage, timestamp: Date.now() }],
      });

      await expect(handleQualityCheck(context)).rejects.toThrow('File size');
    });

    it('should fail on disallowed format', async () => {
      const jpegImage = 'data:image/jpeg;base64,iVBORw0KGgo=';

      const context = createMockContext({
        node: {
          id: 'qc-5',
          type: 'qualityCheck',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'qualityCheck',
            allowedFormats: ['png', 'webp'],
            requirePowerOf2: false,
            label: 'QC',
          },
        },
        inputs: [{ type: 'image', data: jpegImage, timestamp: Date.now() }],
      });

      await expect(handleQualityCheck(context)).rejects.toThrow(
        'Format jpeg not in allowed list'
      );
    });

    it('should fail when transparency required but not present', async () => {
      // Override canvas mock to return opaque pixels (alpha = 255)
      const mockCtx = {
        drawImage: vi.fn(),
        getImageData: vi.fn().mockReturnValue({
          data: new Uint8ClampedArray([255, 255, 255, 255, 255, 255, 255, 255]),
          width: 2,
          height: 1,
        }),
      };
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue(mockCtx),
      };

      const savedCreateElement = document.createElement;
      document.createElement = vi.fn().mockImplementation((tag: string) => {
        if (tag === 'canvas') return mockCanvas;
        return savedCreateElement.call(document, tag);
      }) as any;

      try {
        const context = createMockContext({
          node: {
            id: 'qc-6',
            type: 'qualityCheck',
            position: { x: 0, y: 0 },
            data: {
              nodeType: 'qualityCheck',
              requireTransparency: true,
              requirePowerOf2: false,
              label: 'QC',
            },
          },
          inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
        });

        await expect(handleQualityCheck(context)).rejects.toThrow(
          'Transparency required'
        );
      } finally {
        document.createElement = savedCreateElement;
      }
    });

    it('should pass transparency check when image has alpha', async () => {
      // Default mock canvas returns all zeros (alpha=0), so hasTransparency=true
      const context = createMockContext({
        node: {
          id: 'qc-7',
          type: 'qualityCheck',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'qualityCheck',
            requireTransparency: true,
            requirePowerOf2: false,
            label: 'QC',
          },
        },
        inputs: [{ type: 'image', data: TEST_IMAGE, timestamp: Date.now() }],
      });

      await handleQualityCheck(context);

      expect(context.setNodeOutput).toHaveBeenCalled();
    });

    it('should throw on missing image input', async () => {
      const context = createMockContext({
        node: {
          id: 'qc-8',
          type: 'qualityCheck',
          position: { x: 0, y: 0 },
          data: { nodeType: 'qualityCheck', label: 'QC' },
        },
      });

      await expect(handleQualityCheck(context)).rejects.toThrow('Missing image input');
    });
  });
});
