import { describe, it, expect } from 'vitest';
import {
  generatePhaserAtlas,
  generateUnityAtlas,
  generateGodotAtlas,
  generateAtlas,
  getAtlasFileExtension,
  type AtlasFormat,
} from '../../src/lib/atlas';

describe('Atlas Format Generators', () => {
  const baseOptions = {
    columns: 4,
    rows: 4,
    sheetWidth: 256,
    sheetHeight: 256,
    imageFileName: 'sprite-sheet.png',
  };

  describe('generatePhaserAtlas', () => {
    it('should generate valid Phaser 3 JSON Hash format', () => {
      const result = generatePhaserAtlas(baseOptions);
      const parsed = JSON.parse(result);

      expect(parsed).toHaveProperty('frames');
      expect(parsed).toHaveProperty('meta');
      expect(parsed.meta.image).toBe('sprite-sheet.png');
      expect(parsed.meta.size.w).toBe(256);
      expect(parsed.meta.size.h).toBe(256);
      expect(parsed.meta.format).toBe('RGBA8888');
    });

    it('should generate correct number of frames', () => {
      const result = generatePhaserAtlas(baseOptions);
      const parsed = JSON.parse(result);

      expect(Object.keys(parsed.frames)).toHaveLength(16); // 4x4 = 16 frames
    });

    it('should calculate correct frame positions', () => {
      const result = generatePhaserAtlas(baseOptions);
      const parsed = JSON.parse(result);

      // First frame (sprite_0) should be at (0, 0)
      expect(parsed.frames.sprite_0.frame).toEqual({
        x: 0,
        y: 0,
        w: 64,
        h: 64,
      });

      // Second frame (sprite_1) should be at (64, 0)
      expect(parsed.frames.sprite_1.frame).toEqual({
        x: 64,
        y: 0,
        w: 64,
        h: 64,
      });

      // Fifth frame (sprite_4) should be at (0, 64) - start of second row
      expect(parsed.frames.sprite_4.frame).toEqual({
        x: 0,
        y: 64,
        w: 64,
        h: 64,
      });
    });

    it('should set correct sourceSize for all frames', () => {
      const result = generatePhaserAtlas(baseOptions);
      const parsed = JSON.parse(result);

      Object.values(parsed.frames).forEach((frame: any) => {
        expect(frame.sourceSize.w).toBe(64);
        expect(frame.sourceSize.h).toBe(64);
      });
    });

    it('should handle non-square sheets', () => {
      const options = {
        ...baseOptions,
        sheetWidth: 512,
        sheetHeight: 256,
        columns: 8,
        rows: 4,
      };

      const result = generatePhaserAtlas(options);
      const parsed = JSON.parse(result);

      expect(parsed.frames.sprite_0.frame.w).toBe(64); // 512 / 8
      expect(parsed.frames.sprite_0.frame.h).toBe(64); // 256 / 4
    });
  });

  describe('generateUnityAtlas', () => {
    it('should generate valid Unity Sprite Atlas JSON format', () => {
      const result = generateUnityAtlas(baseOptions);
      const parsed = JSON.parse(result);

      expect(parsed).toHaveProperty('sprites');
      expect(parsed).toHaveProperty('texture');
      expect(parsed).toHaveProperty('width');
      expect(parsed).toHaveProperty('height');
      expect(parsed.texture).toBe('sprite-sheet.png');
      expect(parsed.width).toBe(256);
      expect(parsed.height).toBe(256);
    });

    it('should generate correct number of sprites', () => {
      const result = generateUnityAtlas(baseOptions);
      const parsed = JSON.parse(result);

      expect(parsed.sprites).toHaveLength(16); // 4x4 = 16 sprites
    });

    it('should calculate correct sprite rects', () => {
      const result = generateUnityAtlas(baseOptions);
      const parsed = JSON.parse(result);

      // First sprite should be at (0, 0)
      expect(parsed.sprites[0].rect).toEqual({
        x: 0,
        y: 0,
        width: 64,
        height: 64,
      });

      // Second sprite should be at (64, 0)
      expect(parsed.sprites[1].rect).toEqual({
        x: 64,
        y: 0,
        width: 64,
        height: 64,
      });

      // Fifth sprite should be at (0, 64) - start of second row
      expect(parsed.sprites[4].rect).toEqual({
        x: 0,
        y: 64,
        width: 64,
        height: 64,
      });
    });

    it('should set pivot to center (0.5, 0.5) for all sprites', () => {
      const result = generateUnityAtlas(baseOptions);
      const parsed = JSON.parse(result);

      parsed.sprites.forEach((sprite: any) => {
        expect(sprite.pivot).toEqual({ x: 0.5, y: 0.5 });
      });
    });
  });

  describe('generateGodotAtlas', () => {
    it('should generate valid Godot .tres format', () => {
      const result = generateGodotAtlas(baseOptions);

      expect(result).toContain('[gd_resource');
      expect(result).toContain('type="AtlasTexture"');
      expect(result).toContain('sprite-sheet.png');
    });

    it('should generate correct number of resources', () => {
      const result = generateGodotAtlas(baseOptions);
      const resources = result.split('---\n\n').filter((r) => r.trim());

      expect(resources).toHaveLength(16); // 4x4 = 16 sprites
    });

    it('should include correct region coordinates', () => {
      const result = generateGodotAtlas(baseOptions);
      const resources = result.split('---\n\n').filter((r) => r.trim());

      // First resource should have region starting at (0, 0)
      expect(resources[0]).toContain('region = Rect2(0, 0, 64, 64)');

      // Second resource should have region starting at (64, 0)
      expect(resources[1]).toContain('region = Rect2(64, 0, 64, 64)');

      // Fifth resource should have region starting at (0, 64)
      expect(resources[4]).toContain('region = Rect2(0, 64, 64, 64)');
    });

    it('should reference the image file correctly', () => {
      const result = generateGodotAtlas(baseOptions);
      const resources = result.split('---\n\n').filter((r) => r.trim());

      resources.forEach((resource) => {
        expect(resource).toContain('res://sprite-sheet.png');
      });
    });
  });

  describe('generateAtlas', () => {
    it('should generate Phaser atlas when format is phaser', () => {
      const result = generateAtlas('phaser', baseOptions);
      const parsed = JSON.parse(result);

      expect(parsed).toHaveProperty('frames');
      expect(parsed).toHaveProperty('meta');
    });

    it('should generate Unity atlas when format is unity', () => {
      const result = generateAtlas('unity', baseOptions);
      const parsed = JSON.parse(result);

      expect(parsed).toHaveProperty('sprites');
      expect(parsed).toHaveProperty('texture');
    });

    it('should generate Godot atlas when format is godot', () => {
      const result = generateAtlas('godot', baseOptions);

      expect(result).toContain('[gd_resource');
      expect(result).toContain('type="AtlasTexture"');
    });

    it('should throw error for unsupported format', () => {
      expect(() => {
        generateAtlas('invalid' as AtlasFormat, baseOptions);
      }).toThrow('Unsupported atlas format: invalid');
    });
  });

  describe('getAtlasFileExtension', () => {
    it('should return json for Phaser', () => {
      expect(getAtlasFileExtension('phaser')).toBe('json');
    });

    it('should return json for Unity', () => {
      expect(getAtlasFileExtension('unity')).toBe('json');
    });

    it('should return tres for Godot', () => {
      expect(getAtlasFileExtension('godot')).toBe('tres');
    });

    it('should throw error for unsupported format', () => {
      expect(() => {
        getAtlasFileExtension('invalid' as AtlasFormat);
      }).toThrow('Unsupported atlas format: invalid');
    });
  });
});
