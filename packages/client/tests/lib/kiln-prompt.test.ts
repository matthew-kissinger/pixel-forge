import { describe, it, expect } from 'vitest';
import {
  GLB_SYSTEM_PROMPT,
  TSL_SYSTEM_PROMPT,
  COMPUTE_SYSTEM_PROMPT,
  COMPACT_PROMPT,
  getSystemPrompt,
  createUserPrompt,
  createEditPrompt,
  type RenderMode,
} from '../../src/lib/kiln/prompt';

describe('Kiln Prompt Builders', () => {
  describe('System Prompts', () => {
    describe('GLB_SYSTEM_PROMPT', () => {
      it('should be defined and non-empty', () => {
        expect(GLB_SYSTEM_PROMPT).toBeDefined();
        expect(GLB_SYSTEM_PROMPT.length).toBeGreaterThan(0);
      });

      it('should mention GLB export', () => {
        expect(GLB_SYSTEM_PROMPT).toContain('GLB');
      });

      it('should include output format requirements', () => {
        expect(GLB_SYSTEM_PROMPT).toContain('meta');
        expect(GLB_SYSTEM_PROMPT).toContain('build()');
        expect(GLB_SYSTEM_PROMPT).toContain('animate(root)');
      });

      it('should list available primitives', () => {
        expect(GLB_SYSTEM_PROMPT).toContain('createRoot');
        expect(GLB_SYSTEM_PROMPT).toContain('createPivot');
        expect(GLB_SYSTEM_PROMPT).toContain('createPart');
      });

      it('should list geometry functions', () => {
        expect(GLB_SYSTEM_PROMPT).toContain('boxGeo');
        expect(GLB_SYSTEM_PROMPT).toContain('sphereGeo');
        expect(GLB_SYSTEM_PROMPT).toContain('cylinderGeo');
        expect(GLB_SYSTEM_PROMPT).toContain('capsuleGeo');
        expect(GLB_SYSTEM_PROMPT).toContain('coneGeo');
        expect(GLB_SYSTEM_PROMPT).toContain('torusGeo');
      });

      it('should list GLB-compatible materials', () => {
        expect(GLB_SYSTEM_PROMPT).toContain('gameMaterial');
        expect(GLB_SYSTEM_PROMPT).toContain('lambertMaterial');
        expect(GLB_SYSTEM_PROMPT).toContain('basicMaterial');
      });

      it('should include animation functions', () => {
        expect(GLB_SYSTEM_PROMPT).toContain('rotationTrack');
        expect(GLB_SYSTEM_PROMPT).toContain('positionTrack');
        expect(GLB_SYSTEM_PROMPT).toContain('createClip');
        expect(GLB_SYSTEM_PROMPT).toContain('idleBreathing');
        expect(GLB_SYSTEM_PROMPT).toContain('bobbingAnimation');
        expect(GLB_SYSTEM_PROMPT).toContain('spinAnimation');
      });

      it('should include constraints', () => {
        expect(GLB_SYSTEM_PROMPT).toContain('5000 tris');
        expect(GLB_SYSTEM_PROMPT).toContain('2000 tris');
        expect(GLB_SYSTEM_PROMPT).toContain('1000 tris');
      });

      it('should include rules', () => {
        expect(GLB_SYSTEM_PROMPT).toContain('Ground at y=0');
        expect(GLB_SYSTEM_PROMPT).toContain('hex');
        expect(GLB_SYSTEM_PROMPT).toContain('0xff0000');
      });

      it('should include example code', () => {
        expect(GLB_SYSTEM_PROMPT).toContain('const meta =');
        expect(GLB_SYSTEM_PROMPT).toContain('function build()');
        expect(GLB_SYSTEM_PROMPT).toContain('function animate(root)');
      });
    });

    describe('TSL_SYSTEM_PROMPT', () => {
      it('should be defined and non-empty', () => {
        expect(TSL_SYSTEM_PROMPT).toBeDefined();
        expect(TSL_SYSTEM_PROMPT.length).toBeGreaterThan(0);
      });

      it('should mention TSL and WebGPU', () => {
        expect(TSL_SYSTEM_PROMPT).toContain('TSL');
        expect(TSL_SYSTEM_PROMPT).toContain('WebGPU');
      });

      it('should mention not exportable to GLB', () => {
        expect(TSL_SYSTEM_PROMPT).toContain('NOT exportable');
      });

      it('should include output format requirements', () => {
        expect(TSL_SYSTEM_PROMPT).toContain('meta');
        expect(TSL_SYSTEM_PROMPT).toContain('build()');
        expect(TSL_SYSTEM_PROMPT).toContain('update(delta)');
      });

      it('should list TSL imports', () => {
        expect(TSL_SYSTEM_PROMPT).toContain('MeshBasicNodeMaterial');
        expect(TSL_SYSTEM_PROMPT).toContain('MeshStandardNodeMaterial');
        expect(TSL_SYSTEM_PROMPT).toContain('uniform');
        expect(TSL_SYSTEM_PROMPT).toContain('texture');
        expect(TSL_SYSTEM_PROMPT).toContain('time');
      });

      it('should include TSL patterns', () => {
        expect(TSL_SYSTEM_PROMPT).toContain('Custom Color');
        expect(TSL_SYSTEM_PROMPT).toContain('UV Distortion');
        expect(TSL_SYSTEM_PROMPT).toContain('Fresnel');
        expect(TSL_SYSTEM_PROMPT).toContain('Pulsing');
      });

      it('should include example code', () => {
        expect(TSL_SYSTEM_PROMPT).toContain('const meta =');
        expect(TSL_SYSTEM_PROMPT).toContain('function build()');
        expect(TSL_SYSTEM_PROMPT).toContain('PulseOrb');
      });
    });

    describe('COMPUTE_SYSTEM_PROMPT', () => {
      it('should be defined and non-empty', () => {
        expect(COMPUTE_SYSTEM_PROMPT).toBeDefined();
        expect(COMPUTE_SYSTEM_PROMPT.length).toBeGreaterThan(0);
      });

      it('should mention compute shaders and GPU', () => {
        expect(COMPUTE_SYSTEM_PROMPT).toContain('compute');
        expect(COMPUTE_SYSTEM_PROMPT).toContain('GPU');
      });

      it('should mention particles and simulation', () => {
        expect(COMPUTE_SYSTEM_PROMPT).toContain('particle');
        expect(COMPUTE_SYSTEM_PROMPT).toContain('simulation');
      });

      it('should list compute-specific imports', () => {
        expect(COMPUTE_SYSTEM_PROMPT).toContain('storage');
        expect(COMPUTE_SYSTEM_PROMPT).toContain('instanceIndex');
        expect(COMPUTE_SYSTEM_PROMPT).toContain('StorageBufferAttribute');
      });

      it('should include compute pattern', () => {
        expect(COMPUTE_SYSTEM_PROMPT).toContain('positionBuffer');
        expect(COMPUTE_SYSTEM_PROMPT).toContain('velocityBuffer');
        expect(COMPUTE_SYSTEM_PROMPT).toContain('.compute(');
      });

      it('should include rules', () => {
        expect(COMPUTE_SYSTEM_PROMPT).toContain('instanceIndex');
        expect(COMPUTE_SYSTEM_PROMPT).toContain('storage()');
        expect(COMPUTE_SYSTEM_PROMPT).toContain('atomic');
      });
    });

    describe('COMPACT_PROMPT', () => {
      it('should be defined and non-empty', () => {
        expect(COMPACT_PROMPT).toBeDefined();
        expect(COMPACT_PROMPT.length).toBeGreaterThan(0);
      });

      it('should mention removing comments', () => {
        expect(COMPACT_PROMPT).toContain('remove comments');
      });

      it('should mention line limit', () => {
        expect(COMPACT_PROMPT).toContain('150 lines');
      });

      it('should mention code-only output', () => {
        expect(COMPACT_PROMPT).toContain('only code');
      });
    });
  });

  describe('getSystemPrompt()', () => {
    it('should return GLB prompt for "glb" mode', () => {
      const prompt = getSystemPrompt('glb');
      expect(prompt).toBe(GLB_SYSTEM_PROMPT);
    });

    it('should return TSL prompt for "tsl" mode', () => {
      const prompt = getSystemPrompt('tsl');
      expect(prompt).toBe(TSL_SYSTEM_PROMPT);
    });

    it('should return GLB prompt for "both" mode', () => {
      const prompt = getSystemPrompt('both');
      expect(prompt).toBe(GLB_SYSTEM_PROMPT);
    });

    it('should default to GLB prompt for invalid mode', () => {
      const prompt = getSystemPrompt('invalid' as RenderMode);
      expect(prompt).toBe(GLB_SYSTEM_PROMPT);
    });

    it('should default to GLB prompt when mode is undefined', () => {
      const prompt = getSystemPrompt(undefined as unknown as RenderMode);
      expect(prompt).toBe(GLB_SYSTEM_PROMPT);
    });
  });

  describe('createUserPrompt()', () => {
    describe('Basic Prompts', () => {
      it('should create simple prompt with just description', () => {
        const prompt = createUserPrompt('a glowing crystal');
        expect(prompt).toContain('a glowing crystal');
        expect(prompt).toContain('Output ONLY TypeScript code');
      });

      it('should include default category "prop" when not specified', () => {
        const prompt = createUserPrompt('a treasure chest');
        expect(prompt).toContain('prop');
        expect(prompt).toContain('a treasure chest');
      });

      it('should use "Create" prefix for GLB mode (default)', () => {
        const prompt = createUserPrompt('a sword');
        expect(prompt).toContain('Create');
      });

      it('should always end with TypeScript code instruction', () => {
        const prompt = createUserPrompt('test');
        expect(prompt).toContain('Output ONLY TypeScript code, no markdown');
      });
    });

    describe('Category Support', () => {
      it('should include character category', () => {
        const prompt = createUserPrompt('a warrior', { category: 'character' });
        expect(prompt).toContain('character');
      });

      it('should include prop category', () => {
        const prompt = createUserPrompt('a barrel', { category: 'prop' });
        expect(prompt).toContain('prop');
      });

      it('should include vfx category', () => {
        const prompt = createUserPrompt('an explosion', { category: 'vfx' });
        expect(prompt).toContain('vfx');
      });

      it('should include environment category', () => {
        const prompt = createUserPrompt('a forest', { category: 'environment' });
        expect(prompt).toContain('environment');
      });
    });

    describe('Mode Support', () => {
      it('should use "Create" prefix for GLB mode', () => {
        const prompt = createUserPrompt('a gem', { mode: 'glb' });
        expect(prompt).toContain('Create');
        expect(prompt).not.toContain('VFX');
      });

      it('should use "Create VFX" prefix for TSL mode', () => {
        const prompt = createUserPrompt('a portal', { mode: 'tsl' });
        expect(prompt).toContain('Create VFX');
      });

      it('should use compute shader prefix for compute mode', () => {
        const prompt = createUserPrompt('particles', { mode: 'both' });
        expect(prompt).toContain('Create compute shader');
      });
    });

    describe('Style Support', () => {
      it('should include low-poly style', () => {
        const prompt = createUserPrompt('a tree', { style: 'low-poly' });
        expect(prompt).toContain('Style: low-poly');
      });

      it('should include stylized style', () => {
        const prompt = createUserPrompt('a rock', { style: 'stylized' });
        expect(prompt).toContain('Style: stylized');
      });

      it('should include voxel style', () => {
        const prompt = createUserPrompt('a house', { style: 'voxel' });
        expect(prompt).toContain('Style: voxel');
      });

      it('should not include style line when style is undefined', () => {
        const prompt = createUserPrompt('a coin');
        expect(prompt).not.toContain('Style:');
      });
    });

    describe('Existing Code Editing', () => {
      it('should use edit format when existingCode is provided', () => {
        const existingCode = 'const meta = { name: "Test" };';
        const prompt = createUserPrompt('make it bigger', { existingCode });
        expect(prompt).toContain('Current code:');
        expect(prompt).toContain(existingCode);
        expect(prompt).toContain('Edit: make it bigger');
      });

      it('should not use "Create" prefix when editing', () => {
        const prompt = createUserPrompt('add glow', {
          existingCode: 'const meta = {};'
        });
        expect(prompt).toContain('Edit:');
      });

      it('should include code instruction when editing', () => {
        const prompt = createUserPrompt('change color', {
          existingCode: 'const meta = {};'
        });
        expect(prompt).toContain('Output ONLY TypeScript code');
      });
    });

    describe('Combined Options', () => {
      it('should combine category and style', () => {
        const prompt = createUserPrompt('a knight', {
          category: 'character',
          style: 'low-poly'
        });
        expect(prompt).toContain('character');
        expect(prompt).toContain('Style: low-poly');
      });

      it('should combine mode, category, and style', () => {
        const prompt = createUserPrompt('a magic effect', {
          mode: 'tsl',
          category: 'vfx',
          style: 'stylized'
        });
        expect(prompt).toContain('Create VFX');
        expect(prompt).toContain('vfx');
        expect(prompt).toContain('Style: stylized');
      });

      it('should ignore category/style when editing existing code', () => {
        const prompt = createUserPrompt('make taller', {
          existingCode: 'const meta = {};',
          category: 'character',
          style: 'low-poly'
        });
        expect(prompt).toContain('Current code:');
        expect(prompt).toContain('Edit: make taller');
        expect(prompt).not.toContain('character');
        expect(prompt).not.toContain('Style:');
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty description', () => {
        const prompt = createUserPrompt('');
        expect(prompt).toContain('Output ONLY TypeScript code');
      });

      it('should handle description with special characters', () => {
        const description = 'a "crystal" <glowing> {gem}';
        const prompt = createUserPrompt(description);
        expect(prompt).toContain(description);
      });

      it('should handle description with newlines', () => {
        const description = 'a crystal\nwith multiple\nlines';
        const prompt = createUserPrompt(description);
        expect(prompt).toContain(description);
      });

      it('should handle empty options object', () => {
        const prompt = createUserPrompt('a coin', {});
        expect(prompt).toContain('a coin');
        expect(prompt).toContain('prop');
      });

      it('should handle undefined options', () => {
        const prompt = createUserPrompt('a shield');
        expect(prompt).toContain('a shield');
        expect(prompt).toContain('Output ONLY TypeScript code');
      });

      it('should treat empty existing code as no code (create mode)', () => {
        const prompt = createUserPrompt('test', { existingCode: '' });
        expect(prompt).toContain('Create');
        expect(prompt).not.toContain('Current code:');
      });

      it('should handle whitespace-only description', () => {
        const prompt = createUserPrompt('   ', {});
        expect(prompt).toContain('Output ONLY TypeScript code');
      });
    });
  });

  describe('createEditPrompt()', () => {
    it('should format edit request with current code', () => {
      const currentCode = 'const meta = { name: "Gem" };';
      const editRequest = 'change color to blue';
      const prompt = createEditPrompt(currentCode, editRequest);

      expect(prompt).toContain('Current code:');
      expect(prompt).toContain(currentCode);
      expect(prompt).toContain('Edit: change color to blue');
    });

    it('should include complete modified code instruction', () => {
      const prompt = createEditPrompt('const x = 1;', 'make x = 2');
      expect(prompt).toContain('Output complete modified code only');
    });

    it('should accept mode parameter (for API compatibility)', () => {
      const prompt = createEditPrompt('code', 'edit', 'glb');
      expect(prompt).toContain('Current code:');
      expect(prompt).toContain('Edit: edit');
    });

    it('should work with all render modes', () => {
      const modes: RenderMode[] = ['glb', 'tsl', 'both'];
      modes.forEach(mode => {
        const prompt = createEditPrompt('code', 'edit', mode);
        expect(prompt).toContain('Current code:');
        expect(prompt).toContain('code');
      });
    });

    it('should handle empty current code', () => {
      const prompt = createEditPrompt('', 'add something');
      expect(prompt).toContain('Current code:');
      expect(prompt).toContain('Edit: add something');
    });

    it('should handle empty edit request', () => {
      const prompt = createEditPrompt('const x = 1;', '');
      expect(prompt).toContain('const x = 1;');
      expect(prompt).toContain('Edit:');
    });

    it('should handle multiline code', () => {
      const code = `const meta = {
  name: 'Test',
  category: 'prop'
};
function build() {
  return createRoot('Test');
}`;
      const prompt = createEditPrompt(code, 'add animation');
      expect(prompt).toContain(code);
      expect(prompt).toContain('Edit: add animation');
    });

    it('should handle special characters in code', () => {
      const code = 'const color = 0xff0000; // red';
      const prompt = createEditPrompt(code, 'change to <blue>');
      expect(prompt).toContain(code);
      expect(prompt).toContain('change to <blue>');
    });

    it('should preserve code formatting', () => {
      const code = '  const x = 1;\n    const y = 2;';
      const prompt = createEditPrompt(code, 'test');
      expect(prompt).toContain(code);
    });

    it('should handle code with template literals', () => {
      const code = 'const str = `value: ${x}`;';
      const prompt = createEditPrompt(code, 'edit');
      expect(prompt).toContain(code);
    });

    it('should work without mode parameter (default behavior)', () => {
      const prompt = createEditPrompt('code', 'edit');
      expect(prompt).toContain('Current code:');
      expect(prompt).toContain('Edit: edit');
      expect(prompt).toContain('Output complete modified code only');
    });
  });

  describe('Type Safety', () => {
    it('should accept valid RenderMode values', () => {
      const modes: RenderMode[] = ['glb', 'tsl', 'both'];
      modes.forEach(mode => {
        expect(() => getSystemPrompt(mode)).not.toThrow();
        expect(() => createUserPrompt('test', { mode })).not.toThrow();
      });
    });

    it('should accept valid category values', () => {
      const categories = ['character', 'prop', 'vfx', 'environment'] as const;
      categories.forEach(category => {
        expect(() => createUserPrompt('test', { category })).not.toThrow();
      });
    });

    it('should accept valid style values', () => {
      const styles = ['low-poly', 'stylized', 'voxel'] as const;
      styles.forEach(style => {
        expect(() => createUserPrompt('test', { style })).not.toThrow();
      });
    });
  });

  describe('Prompt Structure', () => {
    it('should create prompts without markdown code blocks', () => {
      const prompt = createUserPrompt('a gem');
      expect(prompt).not.toContain('```');
    });

    it('should use newlines for readability', () => {
      const prompt = createUserPrompt('test', {
        category: 'prop',
        style: 'low-poly'
      });
      expect(prompt).toContain('\n');
    });

    it('should not include extra whitespace', () => {
      const prompt = createUserPrompt('test');
      expect(prompt).not.toMatch(/\n\n\n+/);
    });
  });

  describe('Prompt Content Validation', () => {
    it('GLB prompt should mention all primitive categories', () => {
      expect(GLB_SYSTEM_PROMPT).toContain('Geometry:');
      expect(GLB_SYSTEM_PROMPT).toContain('Shapes:');
      expect(GLB_SYSTEM_PROMPT).toContain('Materials');
      expect(GLB_SYSTEM_PROMPT).toContain('Animation:');
    });

    it('GLB prompt should include constraints for all categories', () => {
      expect(GLB_SYSTEM_PROMPT).toContain('Characters:');
      expect(GLB_SYSTEM_PROMPT).toContain('Props:');
      expect(GLB_SYSTEM_PROMPT).toContain('VFX:');
    });

    it('TSL prompt should include all required patterns', () => {
      expect(TSL_SYSTEM_PROMPT).toContain('Custom Color:');
      expect(TSL_SYSTEM_PROMPT).toContain('UV Distortion:');
      expect(TSL_SYSTEM_PROMPT).toContain('Fresnel Glow:');
      expect(TSL_SYSTEM_PROMPT).toContain('Pulsing:');
    });

    it('Compute prompt should include buffer management', () => {
      expect(COMPUTE_SYSTEM_PROMPT).toContain('storage');
      expect(COMPUTE_SYSTEM_PROMPT).toContain('instanceIndex');
      expect(COMPUTE_SYSTEM_PROMPT).toContain('compute');
    });
  });

  describe('Integration Scenarios', () => {
    it('should create complete GLB workflow prompt', () => {
      const system = getSystemPrompt('glb');
      const user = createUserPrompt('a glowing sword', {
        category: 'prop',
        style: 'low-poly'
      });

      expect(system).toContain('GLB');
      expect(user).toContain('glowing sword');
      expect(user).toContain('prop');
      expect(user).toContain('low-poly');
    });

    it('should create complete TSL workflow prompt', () => {
      const system = getSystemPrompt('tsl');
      const user = createUserPrompt('a magic portal', {
        mode: 'tsl',
        category: 'vfx'
      });

      expect(system).toContain('TSL');
      expect(user).toContain('VFX');
      expect(user).toContain('magic portal');
    });

    it('should create edit workflow', () => {
      const system = getSystemPrompt('glb');
      const edit = createEditPrompt(
        'const meta = { name: "Gem" };',
        'add spinning animation'
      );

      expect(system).toContain('GLB');
      expect(edit).toContain('Current code:');
      expect(edit).toContain('spinning animation');
    });

    it('should support iterative refinement', () => {
      const user1 = createUserPrompt('a crystal');
      const edit1 = createEditPrompt('code v1', 'make it glow');
      const edit2 = createEditPrompt('code v2', 'add rotation');

      expect(user1).toContain('a crystal');
      expect(edit1).toContain('make it glow');
      expect(edit2).toContain('add rotation');
    });
  });
});
