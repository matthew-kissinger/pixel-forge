import { describe, it, expect } from 'vitest';
import * as guards from '../../src/types/guards';

describe('guards', () => {
  // Basic Type Guards - internal helpers not exported


  describe('isBaseNodeData', () => {
    it('returns true for valid base node data', () => {
      expect(guards.isBaseNodeData({ label: 'test' })).toBe(true);
      expect(guards.isBaseNodeData({ label: 'test', other: 123 })).toBe(true);
    });

    it('returns false for invalid data', () => {
      expect(guards.isBaseNodeData(null)).toBe(false);
      expect(guards.isBaseNodeData({})).toBe(false);
      expect(guards.isBaseNodeData({ label: 123 })).toBe(false);
    });
  });

  describe('isNodeDataUnion', () => {
    it('returns true for valid node data union', () => {
      expect(guards.isNodeDataUnion({ nodeType: 'textPrompt', label: 'test' })).toBe(true);
    });

    it('returns false for invalid data', () => {
      expect(guards.isNodeDataUnion(null)).toBe(false);
      expect(guards.isNodeDataUnion({})).toBe(false);
      expect(guards.isNodeDataUnion({ nodeType: 'textPrompt' })).toBe(false); // missing label
      expect(guards.isNodeDataUnion({ label: 'test' })).toBe(false); // missing nodeType
    });
  });

  describe('getNodeType', () => {
    it('returns nodeType for valid data', () => {
      expect(guards.getNodeType({ nodeType: 'textPrompt', label: 'test' })).toBe('textPrompt');
    });

    it('returns undefined for invalid data', () => {
      expect(guards.getNodeType({})).toBeUndefined();
      expect(guards.getNodeType(null)).toBeUndefined();
    });
  });

  describe('Input Nodes', () => {
    describe('isTextPromptNodeData', () => {
      it('validates correct data', () => {
        const data = { nodeType: 'textPrompt', label: 'L', prompt: 'p' };
        expect(guards.isTextPromptNodeData(data)).toBe(true);
      });
      it('rejects invalid data', () => {
        expect(guards.isTextPromptNodeData({ nodeType: 'other', label: 'L' })).toBe(false);
        expect(guards.isTextPromptNodeData({ nodeType: 'textPrompt', label: 'L' })).toBe(false); // missing prompt
        expect(guards.isTextPromptNodeData({ nodeType: 'textPrompt', label: 'L', prompt: 123 })).toBe(false);
      });
    });

    describe('isImageUploadNodeData', () => {
      it('validates correct data', () => {
        const data = { nodeType: 'imageUpload', label: 'L' };
        expect(guards.isImageUploadNodeData(data)).toBe(true);
      });
      it('rejects invalid data', () => {
        expect(guards.isImageUploadNodeData({ nodeType: 'other', label: 'L' })).toBe(false);
      });
    });

    describe('isNumberNodeData', () => {
      it('validates correct data', () => {
        const data = { nodeType: 'number', label: 'L', value: 1, min: 0, max: 10, step: 1 };
        expect(guards.isNumberNodeData(data)).toBe(true);
      });
      it('rejects invalid data', () => {
        expect(guards.isNumberNodeData({ nodeType: 'number', label: 'L', value: '1' })).toBe(false);
        expect(guards.isNumberNodeData({ nodeType: 'number', label: 'L', value: 1 })).toBe(false); // missing fields
      });
    });

    describe('isStyleReferenceNodeData', () => {
      it('validates correct data', () => {
        const data = { nodeType: 'styleReference', label: 'L', influence: 50 };
        expect(guards.isStyleReferenceNodeData(data)).toBe(true);
      });
      it('rejects invalid data', () => {
        expect(guards.isStyleReferenceNodeData({ nodeType: 'styleReference', label: 'L' })).toBe(false);
      });
    });

    describe('isSeedControlNodeData', () => {
      it('validates correct data', () => {
        const data = { nodeType: 'seedControl', label: 'L', seed: 123, randomize: true };
        expect(guards.isSeedControlNodeData(data)).toBe(true);
      });
      it('rejects invalid data', () => {
        expect(guards.isSeedControlNodeData({ nodeType: 'seedControl', label: 'L', seed: '123' })).toBe(false);
      });
    });
  });

  describe('Generation Nodes', () => {
    describe('isImageGenNodeData', () => {
      it('validates correct data', () => {
        const data = { 
          nodeType: 'imageGen', 
          label: 'L', 
          model: 'nano-banana', 
          style: 'pixel-art', 
          smartAspect: true, 
          autoRemoveBg: false 
        };
        expect(guards.isImageGenNodeData(data)).toBe(true);
      });
      it('rejects invalid data', () => {
        expect(guards.isImageGenNodeData({ nodeType: 'imageGen', label: 'L' })).toBe(false);
      });
    });

    describe('isIsometricTileNodeData', () => {
      it('validates correct data', () => {
        const data = { nodeType: 'isometricTile', label: 'L', tileSize: 32, groundBase: 10 };
        expect(guards.isIsometricTileNodeData(data)).toBe(true);
      });
      it('rejects invalid data', () => {
        expect(guards.isIsometricTileNodeData({ nodeType: 'isometricTile', label: 'L' })).toBe(false);
      });
    });

    describe('isSpriteSheetNodeData', () => {
      it('validates correct data', () => {
        const data = { nodeType: 'spriteSheet', label: 'L', frames: 4, columns: 2 };
        expect(guards.isSpriteSheetNodeData(data)).toBe(true);
      });
      it('rejects invalid data', () => {
        expect(guards.isSpriteSheetNodeData({ nodeType: 'spriteSheet', label: 'L' })).toBe(false);
      });
    });

    describe('isModel3DGenNodeData', () => {
      it('validates correct data', () => {
        const data = { nodeType: 'model3DGen', label: 'L', backend: 'meshy', style: 'low-poly' };
        expect(guards.isModel3DGenNodeData(data)).toBe(true);
      });
      it('rejects invalid data', () => {
        expect(guards.isModel3DGenNodeData({ nodeType: 'model3DGen', label: 'L' })).toBe(false);
      });
    });

    describe('isKilnGenNodeData', () => {
      it('validates correct data', () => {
        const data = { 
          nodeType: 'kilnGen', 
          label: 'L', 
          mode: 'glb', 
          category: 'prop', 
          errors: [] 
        };
        expect(guards.isKilnGenNodeData(data)).toBe(true);
      });
      it('rejects invalid data', () => {
        expect(guards.isKilnGenNodeData({ nodeType: 'kilnGen', label: 'L' })).toBe(false);
      });
    });
  });

  describe('Processing Nodes', () => {
    describe('isRemoveBgNodeData', () => {
      it('validates correct data', () => {
        expect(guards.isRemoveBgNodeData({ nodeType: 'removeBg', label: 'L' })).toBe(true);
      });
    });

    describe('isResizeNodeData', () => {
      it('validates correct data', () => {
        const data = { 
          nodeType: 'resize', 
          label: 'L', 
          width: 100, 
          height: 100, 
          lockAspect: true, 
          mode: 'contain' 
        };
        expect(guards.isResizeNodeData(data)).toBe(true);
      });
    });

    describe('isCompressNodeData', () => {
      it('validates correct data', () => {
        const data = { nodeType: 'compress', label: 'L', format: 'png', quality: 80 };
        expect(guards.isCompressNodeData(data)).toBe(true);
      });
    });

    describe('isCropNodeData', () => {
      it('validates correct data', () => {
        const data = { 
          nodeType: 'crop', 
          label: 'L', 
          x: 0, 
          y: 0, 
          width: 10, 
          height: 10, 
          preset: 'custom' 
        };
        expect(guards.isCropNodeData(data)).toBe(true);
      });
    });

    describe('isPixelateNodeData', () => {
      it('validates correct data', () => {
        const data = { nodeType: 'pixelate', label: 'L', pixelSize: 4, colorLevels: 16 };
        expect(guards.isPixelateNodeData(data)).toBe(true);
      });
    });

    describe('isTileNodeData', () => {
      it('validates correct data', () => {
        const data = { 
          nodeType: 'tile', 
          label: 'L', 
          mode: 'seamless', 
          repeatX: 2, 
          repeatY: 2, 
          blendAmount: 0.5 
        };
        expect(guards.isTileNodeData(data)).toBe(true);
      });
    });

    describe('isColorPaletteNodeData', () => {
      it('validates correct data', () => {
        const data = { nodeType: 'colorPalette', label: 'L', palette: 'pico8', dithering: true };
        expect(guards.isColorPaletteNodeData(data)).toBe(true);
      });
    });

    describe('isFilterNodeData', () => {
      it('validates correct data', () => {
        const data = { nodeType: 'filter', label: 'L', filter: 'blur', intensity: 50 };
        expect(guards.isFilterNodeData(data)).toBe(true);
      });
    });

    describe('isCombineNodeData', () => {
      it('validates correct data', () => {
        const data = { 
          nodeType: 'combine', 
          label: 'L', 
          mode: 'overlay', 
          alignment: 'center', 
          spacing: 10 
        };
        expect(guards.isCombineNodeData(data)).toBe(true);
      });
    });

    describe('isRotateNodeData', () => {
      it('validates correct data', () => {
        const data = { nodeType: 'rotate', label: 'L', directions: 4, maintainStyle: true };
        expect(guards.isRotateNodeData(data)).toBe(true);
      });
      it('rejects invalid directions', () => {
        const data = { nodeType: 'rotate', label: 'L', directions: 5, maintainStyle: true };
        expect(guards.isRotateNodeData(data)).toBe(false);
      });
    });

    describe('isIterateNodeData', () => {
      it('validates correct data', () => {
        const data = { nodeType: 'iterate', label: 'L', iterations: 3, currentIteration: 0 };
        expect(guards.isIterateNodeData(data)).toBe(true);
      });
    });

    describe('isAnalyzeNodeData', () => {
      it('validates correct data', () => {
        const data = { 
          nodeType: 'analyze', 
          label: 'L', 
          extractStats: true, 
          extractPalette: true, 
          extractDimensions: true 
        };
        expect(guards.isAnalyzeNodeData(data)).toBe(true);
      });
    });

    describe('isQualityCheckNodeData', () => {
      it('validates correct data', () => {
        const data = {
          nodeType: 'qualityCheck',
          label: 'QC',
          maxFileSize: 1024,
          allowedFormats: ['png'],
          requirePowerOf2: true,
          requireTransparency: false,
          minWidth: 0,
          maxWidth: 1000,
          minHeight: 0,
          maxHeight: 1000
        };
        expect(guards.isQualityCheckNodeData(data)).toBe(true);
      });
      it('rejects invalid data', () => {
        const data = {
          nodeType: 'qualityCheck',
          label: 'QC',
          maxFileSize: 1024,
          // missing allowedFormats
        };
        expect(guards.isQualityCheckNodeData(data)).toBe(false);
      });
    });
  });

  describe('Output Nodes', () => {
    describe('isPreviewNodeData', () => {
      it('validates correct data', () => {
        expect(guards.isPreviewNodeData({ nodeType: 'preview', label: 'L' })).toBe(true);
      });
    });

    describe('isSaveNodeData', () => {
      it('validates correct data', () => {
        const data = { nodeType: 'save', label: 'L', fileName: 'test', format: 'png', quality: 90 };
        expect(guards.isSaveNodeData(data)).toBe(true);
      });
    });

    describe('isExportGLBNodeData', () => {
      it('validates correct data', () => {
        const data = { 
          nodeType: 'exportGLB', 
          label: 'L', 
          includeAnimations: true, 
          embedTextures: true 
        };
        expect(guards.isExportGLBNodeData(data)).toBe(true);
      });
    });

    describe('isExportSheetNodeData', () => {
      it('validates correct data', () => {
        const data = {
          nodeType: 'exportSheet',
          label: 'Export Sheet',
          includeMetadata: true,
          format: 'png',
          atlasFormat: 'phaser',
          columns: 4,
          rows: 4
        };
        expect(guards.isExportSheetNodeData(data)).toBe(true);
      });

      it('validates with defaults', () => {
         const data = {
          nodeType: 'exportSheet',
          label: 'Export Sheet',
          includeMetadata: true,
          format: 'png'
          // optional fields missing or undefined is checked in guard?
          // Guard says: 
          // (d.atlasFormat === undefined || ['none', 'phaser', 'unity', 'godot'].includes(d.atlasFormat))
        };
        expect(guards.isExportSheetNodeData(data)).toBe(true);
      });

      it('rejects invalid atlas format', () => {
        const data = {
          nodeType: 'exportSheet',
          label: 'Export Sheet',
          includeMetadata: true,
          format: 'png',
          atlasFormat: 'invalid'
        };
        expect(guards.isExportSheetNodeData(data)).toBe(false);
      });
    });
  });

  describe('Utilities', () => {
    describe('assertTextPromptNodeData', () => {
      it('does not throw for valid data', () => {
        const data = { nodeType: 'textPrompt', label: 'L', prompt: 'p' };
        expect(() => guards.assertTextPromptNodeData(data)).not.toThrow();
      });

      it('throws for invalid data', () => {
        expect(() => guards.assertTextPromptNodeData({})).toThrow('Invalid TextPromptNodeData');
      });
    });

    describe('assertImageGenNodeData', () => {
      it('does not throw for valid data', () => {
        const data = { 
          nodeType: 'imageGen', 
          label: 'L', 
          model: 'nano-banana', 
          style: 'pixel-art', 
          smartAspect: true, 
          autoRemoveBg: false 
        };
        expect(() => guards.assertImageGenNodeData(data)).not.toThrow();
      });

      it('throws for invalid data', () => {
        expect(() => guards.assertImageGenNodeData({})).toThrow('Invalid ImageGenNodeData');
      });
    });

    describe('narrowNodeData', () => {
      it('returns data when type matches', () => {
        const data = { nodeType: 'textPrompt', label: 'L', prompt: 'p' };
        expect(guards.narrowNodeData(data, 'textPrompt')).toEqual(data);
      });

      it('returns undefined when type does not match', () => {
        const data = { nodeType: 'textPrompt', label: 'L', prompt: 'p' };
        expect(guards.narrowNodeData(data, 'imageGen')).toBeUndefined();
      });
      
      it('returns undefined for invalid object', () => {
         expect(guards.narrowNodeData({}, 'textPrompt')).toBeUndefined();
      });
    });

    describe('nodeTypeGuards map', () => {
      it('contains guard for textPrompt', () => {
        const data = { nodeType: 'textPrompt', label: 'L', prompt: 'p' };
        expect(guards.nodeTypeGuards.textPrompt(data)).toBe(true);
      });
      
       it('contains guard for qualityCheck', () => {
        const data = {
          nodeType: 'qualityCheck',
          label: 'QC',
          maxFileSize: 1024,
          allowedFormats: ['png'],
          requirePowerOf2: true,
          requireTransparency: false,
          minWidth: 0,
          maxWidth: 1000,
          minHeight: 0,
          maxHeight: 1000
        };
        expect(guards.nodeTypeGuards.qualityCheck(data)).toBe(true);
       });
    });
  });
});
