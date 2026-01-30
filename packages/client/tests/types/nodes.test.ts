import { describe, it, expect } from 'vitest';
import {
  getNodeDefinition,
  getNodeIOSpec,
  isValidConnectionType,
  getValidTargets,
  getValidSources,
  nodeDefinitions,
} from '../../src/types/nodes';

describe('Node Type System', () => {
  describe('getNodeDefinition', () => {
    it('should return definition for valid node types', () => {
      const textPrompt = getNodeDefinition('textPrompt');
      expect(textPrompt).toBeDefined();
      expect(textPrompt?.label).toBe('Text Prompt');

      const imageGen = getNodeDefinition('imageGen');
      expect(imageGen).toBeDefined();
      expect(imageGen?.label).toBe('Image Gen');
    });

    it('should return undefined for invalid node types', () => {
      const result = getNodeDefinition('invalidType' as any);
      expect(result).toBeUndefined();
    });
  });

  describe('getNodeIOSpec', () => {
    it('should return IO spec for input nodes', () => {
      const textPromptIO = getNodeIOSpec('textPrompt');
      expect(textPromptIO).toBeDefined();
      expect(textPromptIO?.inputs).toHaveLength(0);
      expect(textPromptIO?.output).toBe('text');
    });

    it('should return IO spec for generation nodes', () => {
      const imageGenIO = getNodeIOSpec('imageGen');
      expect(imageGenIO).toBeDefined();
      expect(imageGenIO?.inputs).toContain('text');
      expect(imageGenIO?.output).toBe('image');
    });

    it('should return IO spec for processing nodes', () => {
      const resizeIO = getNodeIOSpec('resize');
      expect(resizeIO).toBeDefined();
      expect(resizeIO?.inputs).toContain('image');
      expect(resizeIO?.output).toBe('image');
    });

    it('should return IO spec for output nodes', () => {
      const previewIO = getNodeIOSpec('preview');
      expect(previewIO).toBeDefined();
      expect(previewIO?.inputs.length).toBeGreaterThan(0);
      expect(previewIO?.output).toBeNull();
    });
  });

  describe('isValidConnectionType', () => {
    it('should allow text -> imageGen connection', () => {
      expect(isValidConnectionType('textPrompt', 'imageGen')).toBe(true);
    });

    it('should allow image -> resize connection', () => {
      expect(isValidConnectionType('imageGen', 'resize')).toBe(true);
    });

    it('should allow image -> preview connection', () => {
      expect(isValidConnectionType('imageGen', 'preview')).toBe(true);
    });

    it('should NOT allow image -> imageGen connection', () => {
      expect(isValidConnectionType('imageUpload', 'imageGen')).toBe(false);
    });

    it('should NOT allow text -> resize connection', () => {
      expect(isValidConnectionType('textPrompt', 'resize')).toBe(false);
    });

    it('should NOT allow connections FROM output nodes', () => {
      expect(isValidConnectionType('preview', 'imageGen')).toBe(false);
    });

    it('should NOT allow connections TO input nodes', () => {
      expect(isValidConnectionType('imageGen', 'textPrompt')).toBe(false);
    });
  });

  describe('getValidTargets', () => {
    it('should return valid targets for textPrompt', () => {
      const targets = getValidTargets('textPrompt');
      expect(targets).toContain('imageGen');
      expect(targets).toContain('model3DGen');
      expect(targets).toContain('preview');
      expect(targets).not.toContain('resize'); // resize needs image
    });

    it('should return valid targets for imageGen', () => {
      const targets = getValidTargets('imageGen');
      expect(targets).toContain('resize');
      expect(targets).toContain('removeBg');
      expect(targets).toContain('preview');
      expect(targets).not.toContain('imageGen'); // imageGen needs text
    });

    it('should return empty array for output nodes', () => {
      const targets = getValidTargets('preview');
      expect(targets).toHaveLength(0);
    });
  });

  describe('getValidSources', () => {
    it('should return valid sources for imageGen', () => {
      const sources = getValidSources('imageGen');
      expect(sources).toContain('textPrompt');
      expect(sources).not.toContain('imageUpload');
    });

    it('should return valid sources for preview', () => {
      const sources = getValidSources('preview');
      expect(sources.length).toBeGreaterThan(0);
      expect(sources).toContain('textPrompt');
      expect(sources).toContain('imageGen');
    });

    it('should return empty array for input nodes', () => {
      const sources = getValidSources('textPrompt');
      expect(sources).toHaveLength(0);
    });
  });

  describe('nodeDefinitions', () => {
    it('should have all expected categories', () => {
      const categories = new Set(nodeDefinitions.map((d) => d.category));
      expect(categories).toContain('input');
      expect(categories).toContain('generate');
      expect(categories).toContain('process');
      expect(categories).toContain('output');
    });

    it('should have defaultData for all nodes', () => {
      nodeDefinitions.forEach((def) => {
        expect(def.defaultData).toBeDefined();
        expect(def.defaultData.label).toBeDefined();
      });
    });

    it('should have IO specs for all nodes', () => {
      nodeDefinitions.forEach((def) => {
        expect(def.io).toBeDefined();
        expect(def.io.inputs).toBeDefined();
        expect(Array.isArray(def.io.inputs)).toBe(true);
      });
    });
  });
});
