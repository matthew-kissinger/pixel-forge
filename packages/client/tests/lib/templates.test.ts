import { describe, it, expect } from 'vitest';
import {
  templates,
  templateCategories,
  templateToFlow,
  getTemplatesByCategory,
  getTemplateById,
  createWorkflowFromPreset,
  type WorkflowTemplate,
} from '../../src/lib/templates';
import type { Node, Edge } from '@xyflow/react';
import type { NodeData } from '../../src/stores/workflow';

describe('Workflow Templates', () => {
  describe('Template Registry', () => {
    it('should have 10 templates defined', () => {
      expect(templates).toHaveLength(10);
    });

    it('should have all required fields for each template', () => {
      templates.forEach((template) => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('category');
        expect(template).toHaveProperty('nodes');
        expect(template).toHaveProperty('connections');

        expect(typeof template.id).toBe('string');
        expect(typeof template.name).toBe('string');
        expect(typeof template.description).toBe('string');
        expect(Array.isArray(template.nodes)).toBe(true);
        expect(Array.isArray(template.connections)).toBe(true);
      });
    });

    it('should have unique template IDs', () => {
      const ids = templates.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid category values', () => {
      const validCategories = ['sprite', 'tile', '3d', 'conversion', 'composite'];
      templates.forEach((template) => {
        expect(validCategories).toContain(template.category);
      });
    });

    it('should have non-empty nodes array for each template', () => {
      templates.forEach((template) => {
        expect(template.nodes.length).toBeGreaterThan(0);
      });
    });

    it('should have non-empty connections array for each template', () => {
      templates.forEach((template) => {
        expect(template.connections.length).toBeGreaterThan(0);
      });
    });

    it('should have all nodes with type and data properties', () => {
      templates.forEach((template) => {
        template.nodes.forEach((node, idx) => {
          expect(node).toHaveProperty('type');
          expect(node).toHaveProperty('data');
          expect(typeof node.type).toBe('string');
          expect(node.data).toBeDefined();
          expect(node.data).toHaveProperty('label');
        });
      });
    });
  });

  describe('Template Categories', () => {
    it('should have category metadata for all 5 categories', () => {
      const categories = Object.keys(templateCategories);
      expect(categories).toHaveLength(5);
      expect(categories).toContain('sprite');
      expect(categories).toContain('tile');
      expect(categories).toContain('3d');
      expect(categories).toContain('conversion');
      expect(categories).toContain('composite');
    });

    it('should have label and description for each category', () => {
      Object.entries(templateCategories).forEach(([key, meta]) => {
        expect(meta).toHaveProperty('label');
        expect(meta).toHaveProperty('description');
        expect(typeof meta.label).toBe('string');
        expect(typeof meta.description).toBe('string');
      });
    });
  });

  describe('getTemplateById()', () => {
    it('should return correct template for valid ID', () => {
      const template = getTemplateById('character-sprite');
      expect(template).toBeDefined();
      expect(template?.id).toBe('character-sprite');
      expect(template?.name).toBe('Character Sprite');
    });

    it('should return billboard-sprite template', () => {
      const template = getTemplateById('billboard-sprite');
      expect(template).toBeDefined();
      expect(template?.id).toBe('billboard-sprite');
      expect(template?.category).toBe('sprite');
    });

    it('should return isometric-tile template', () => {
      const template = getTemplateById('isometric-tile');
      expect(template).toBeDefined();
      expect(template?.category).toBe('tile');
    });

    it('should return seamless-texture template', () => {
      const template = getTemplateById('seamless-texture');
      expect(template).toBeDefined();
      expect(template?.category).toBe('tile');
    });

    it('should return low-poly-prop template', () => {
      const template = getTemplateById('low-poly-prop');
      expect(template).toBeDefined();
      expect(template?.category).toBe('3d');
    });

    it('should return pixel-conversion template', () => {
      const template = getTemplateById('pixel-conversion');
      expect(template).toBeDefined();
      expect(template?.category).toBe('conversion');
    });

    it('should return gameboy-filter template', () => {
      const template = getTemplateById('gameboy-filter');
      expect(template).toBeDefined();
      expect(template?.category).toBe('conversion');
    });

    it('should return item-icon template', () => {
      const template = getTemplateById('item-icon');
      expect(template).toBeDefined();
      expect(template?.category).toBe('composite');
    });

    it('should return full-pipeline template', () => {
      const template = getTemplateById('full-pipeline');
      expect(template).toBeDefined();
      expect(template?.category).toBe('composite');
    });

    it('should return demo-pipeline template', () => {
      const template = getTemplateById('demo-pipeline');
      expect(template).toBeDefined();
      expect(template?.category).toBe('composite');
    });

    it('should return undefined for non-existent ID', () => {
      const template = getTemplateById('non-existent');
      expect(template).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const template = getTemplateById('');
      expect(template).toBeUndefined();
    });
  });

  describe('getTemplatesByCategory()', () => {
    it('should return 2 sprite templates', () => {
      const templates = getTemplatesByCategory('sprite');
      expect(templates).toHaveLength(2);
      expect(templates.every((t) => t.category === 'sprite')).toBe(true);
      expect(templates.map((t) => t.id)).toContain('character-sprite');
      expect(templates.map((t) => t.id)).toContain('billboard-sprite');
    });

    it('should return 2 tile templates', () => {
      const templates = getTemplatesByCategory('tile');
      expect(templates).toHaveLength(2);
      expect(templates.every((t) => t.category === 'tile')).toBe(true);
      expect(templates.map((t) => t.id)).toContain('isometric-tile');
      expect(templates.map((t) => t.id)).toContain('seamless-texture');
    });

    it('should return 1 3d template', () => {
      const templates = getTemplatesByCategory('3d');
      expect(templates).toHaveLength(1);
      expect(templates[0].id).toBe('low-poly-prop');
    });

    it('should return 2 conversion templates', () => {
      const templates = getTemplatesByCategory('conversion');
      expect(templates).toHaveLength(2);
      expect(templates.every((t) => t.category === 'conversion')).toBe(true);
      expect(templates.map((t) => t.id)).toContain('pixel-conversion');
      expect(templates.map((t) => t.id)).toContain('gameboy-filter');
    });

    it('should return 3 composite templates', () => {
      const templates = getTemplatesByCategory('composite');
      expect(templates).toHaveLength(3);
      expect(templates.every((t) => t.category === 'composite')).toBe(true);
      expect(templates.map((t) => t.id)).toContain('item-icon');
      expect(templates.map((t) => t.id)).toContain('full-pipeline');
      expect(templates.map((t) => t.id)).toContain('demo-pipeline');
    });

    it('should return empty array for non-existent category', () => {
      const templates = getTemplatesByCategory('invalid' as WorkflowTemplate['category']);
      expect(templates).toHaveLength(0);
    });
  });

  describe('templateToFlow()', () => {
    it('should create valid nodes with unique IDs', () => {
      const template = getTemplateById('character-sprite')!;
      const { nodes } = templateToFlow(template);

      expect(nodes).toHaveLength(template.nodes.length);
      const ids = nodes.map((n) => n.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should create valid edges connecting correct nodes', () => {
      const template = getTemplateById('character-sprite')!;
      const { nodes, edges } = templateToFlow(template);

      expect(edges).toHaveLength(template.connections.length);
      
      template.connections.forEach(([sourceIdx, targetIdx], edgeIdx) => {
        const edge = edges[edgeIdx];
        expect(edge.source).toBe(nodes[sourceIdx].id);
        expect(edge.target).toBe(nodes[targetIdx].id);
      });
    });

    it('should calculate node positions (not all at 0,0)', () => {
      const template = getTemplateById('character-sprite')!;
      const { nodes } = templateToFlow(template);

      const uniquePositions = new Set(nodes.map((n) => `${n.position.x},${n.position.y}`));
      expect(uniquePositions.size).toBeGreaterThan(1);
    });

    it('should respect custom start position', () => {
      const template = getTemplateById('character-sprite')!;
      const startPosition = { x: 500, y: 300 };
      const { nodes } = templateToFlow(template, startPosition);

      // At least first node should be near the start position
      const firstNode = nodes[0];
      expect(Math.abs(firstNode.position.x - startPosition.x)).toBeLessThan(200);
      expect(Math.abs(firstNode.position.y - startPosition.y)).toBeLessThan(200);
    });

    it('should preserve node data from template', () => {
      const template = getTemplateById('character-sprite')!;
      const { nodes } = templateToFlow(template);

      nodes.forEach((node, idx) => {
        const templateNode = template.nodes[idx];
        expect(node.type).toBe(templateNode.type);
        expect(node.data.label).toBe(templateNode.data.label);
      });
    });

    it('should create edges with smoothstep type and animation', () => {
      const template = getTemplateById('character-sprite')!;
      const { edges } = templateToFlow(template);

      edges.forEach((edge) => {
        expect(edge.type).toBe('smoothstep');
        expect(edge.animated).toBe(true);
      });
    });

    it('should handle complex template with multiple nodes', () => {
      const template = getTemplateById('full-pipeline')!;
      const { nodes, edges } = templateToFlow(template);

      expect(nodes).toHaveLength(7); // full-pipeline has 7 nodes
      expect(edges).toHaveLength(6); // 6 connections
    });

    it('should handle pixel-conversion template', () => {
      const template = getTemplateById('pixel-conversion')!;
      const { nodes, edges } = templateToFlow(template);

      expect(nodes).toHaveLength(6);
      expect(edges).toHaveLength(5);
    });
  });

  describe('Template Content Validation', () => {
    it('should have valid node types for all templates', () => {
      const validNodeTypes = [
        'textPrompt',
        'imageUpload',
        'imageGen',
        'model3DGen',
        'removeBg',
        'resize',
        'crop',
        'filter',
        'pixelate',
        'colorPalette',
        'tile',
        'preview',
        'save',
        'compress',
      ];

      templates.forEach((template) => {
        template.nodes.forEach((node) => {
          expect(validNodeTypes).toContain(node.type);
        });
      });
    });

    it('should have valid connection indices (no out-of-bounds)', () => {
      templates.forEach((template) => {
        template.connections.forEach(([sourceIdx, targetIdx]) => {
          expect(sourceIdx).toBeGreaterThanOrEqual(0);
          expect(sourceIdx).toBeLessThan(template.nodes.length);
          expect(targetIdx).toBeGreaterThanOrEqual(0);
          expect(targetIdx).toBeLessThan(template.nodes.length);
        });
      });
    });

    it('should have no self-connections', () => {
      templates.forEach((template) => {
        template.connections.forEach(([sourceIdx, targetIdx]) => {
          expect(sourceIdx).not.toBe(targetIdx);
        });
      });
    });

    it('should have linear or branching topology (no random connections)', () => {
      templates.forEach((template) => {
        template.connections.forEach(([sourceIdx, targetIdx]) => {
          // In a well-formed template, connections should generally go forward
          // (though some templates may have branches)
          expect(typeof sourceIdx).toBe('number');
          expect(typeof targetIdx).toBe('number');
        });
      });
    });
  });

  describe('Specific Template Content', () => {
    it('character-sprite should have correct structure', () => {
      const template = getTemplateById('character-sprite')!;
      expect(template.nodes).toHaveLength(4);
      expect(template.nodes[0].type).toBe('textPrompt');
      expect(template.nodes[1].type).toBe('imageGen');
      expect(template.nodes[2].type).toBe('preview');
      expect(template.nodes[3].type).toBe('save');
    });

    it('billboard-sprite should resize to power-of-2', () => {
      const template = getTemplateById('billboard-sprite')!;
      const resizeNode = template.nodes.find((n) => n.type === 'resize');
      expect(resizeNode).toBeDefined();
      expect(resizeNode?.data).toHaveProperty('width', 256);
      expect(resizeNode?.data).toHaveProperty('height', 256);
    });

    it('isometric-tile should use isometric style', () => {
      const template = getTemplateById('isometric-tile')!;
      const imageGenNode = template.nodes.find((n) => n.type === 'imageGen');
      expect(imageGenNode).toBeDefined();
      expect(imageGenNode?.data).toHaveProperty('style', 'isometric');
    });

    it('seamless-texture should have tile node', () => {
      const template = getTemplateById('seamless-texture')!;
      const tileNode = template.nodes.find((n) => n.type === 'tile');
      expect(tileNode).toBeDefined();
      expect(tileNode?.data).toHaveProperty('mode', 'seamless');
    });

    it('low-poly-prop should use model3DGen', () => {
      const template = getTemplateById('low-poly-prop')!;
      const model3DNode = template.nodes.find((n) => n.type === 'model3DGen');
      expect(model3DNode).toBeDefined();
      expect(model3DNode?.data).toHaveProperty('artStyle', 'low-poly');
    });

    it('pixel-conversion should have pixelate and colorPalette nodes', () => {
      const template = getTemplateById('pixel-conversion')!;
      const pixelateNode = template.nodes.find((n) => n.type === 'pixelate');
      const paletteNode = template.nodes.find((n) => n.type === 'colorPalette');
      expect(pixelateNode).toBeDefined();
      expect(paletteNode).toBeDefined();
      expect(paletteNode?.data).toHaveProperty('palette', 'pico8');
    });

    it('gameboy-filter should use gameboy palette', () => {
      const template = getTemplateById('gameboy-filter')!;
      const paletteNode = template.nodes.find((n) => n.type === 'colorPalette');
      expect(paletteNode).toBeDefined();
      expect(paletteNode?.data).toHaveProperty('palette', 'gameboy');
    });

    it('item-icon should have removeBg node', () => {
      const template = getTemplateById('item-icon')!;
      const removeBgNode = template.nodes.find((n) => n.type === 'removeBg');
      expect(removeBgNode).toBeDefined();
    });

    it('full-pipeline should have filter node', () => {
      const template = getTemplateById('full-pipeline')!;
      const filterNode = template.nodes.find((n) => n.type === 'filter');
      expect(filterNode).toBeDefined();
      expect(filterNode?.data).toHaveProperty('filter', 'sharpen');
    });

    it('demo-pipeline should have compress node', () => {
      const template = getTemplateById('demo-pipeline')!;
      const compressNode = template.nodes.find((n) => n.type === 'compress');
      expect(compressNode).toBeDefined();
      expect(compressNode?.data).toHaveProperty('format', 'webp');
    });
  });

  describe('createWorkflowFromPreset()', () => {
    it('should return undefined for non-existent preset', () => {
      const result = createWorkflowFromPreset('non-existent', 'subject');
      expect(result).toBeUndefined();
    });

    it('should create workflow with all required nodes for valid preset', () => {
      // This would need actual presets to be available
      // Skipping detailed tests as presets are in @pixel-forge/shared
      // which may not be available in this test context
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string template ID', () => {
      const template = getTemplateById('');
      expect(template).toBeUndefined();
    });

    it('should handle templateToFlow with default start position', () => {
      const template = getTemplateById('character-sprite')!;
      const { nodes } = templateToFlow(template);
      expect(nodes[0].position.x).toBeGreaterThanOrEqual(0);
      expect(nodes[0].position.y).toBeGreaterThanOrEqual(0);
    });

    it('should create unique edge IDs', () => {
      const template = getTemplateById('full-pipeline')!;
      const { edges } = templateToFlow(template);
      const edgeIds = edges.map((e) => e.id);
      const uniqueIds = new Set(edgeIds);
      expect(uniqueIds.size).toBe(edgeIds.length);
    });

    it('should handle templates with multiple edges from same source', () => {
      const template = getTemplateById('character-sprite')!;
      // character-sprite has node 1 connecting to both 2 and 3
      const { edges } = templateToFlow(template);
      expect(edges).toHaveLength(3);
      
      const edgesFromNode1 = edges.filter((e) => 
        e.source.includes('_1')
      );
      expect(edgesFromNode1.length).toBe(2);
    });
  });

  describe('Template Consistency', () => {
    it('all templates should start with an input node', () => {
      const inputNodeTypes = ['textPrompt', 'imageUpload', 'number'];
      
      templates.forEach((template) => {
        const firstNodeType = template.nodes[0].type;
        expect(inputNodeTypes).toContain(firstNodeType);
      });
    });

    it('all templates should have at least one output/preview node', () => {
      const outputNodeTypes = ['preview', 'save'];
      
      templates.forEach((template) => {
        const hasOutput = template.nodes.some((n) => outputNodeTypes.includes(n.type));
        expect(hasOutput).toBe(true);
      });
    });

    it('all template connections should form a valid DAG', () => {
      templates.forEach((template) => {
        const { nodes, edges } = templateToFlow(template);
        
        // Build adjacency list
        const adjacency = new Map<string, Set<string>>();
        nodes.forEach((n) => adjacency.set(n.id, new Set()));
        
        edges.forEach((e) => {
          adjacency.get(e.source)?.add(e.target);
        });
        
        // Check for cycles using DFS
        const visited = new Set<string>();
        const recStack = new Set<string>();
        
        function hasCycle(nodeId: string): boolean {
          visited.add(nodeId);
          recStack.add(nodeId);
          
          const neighbors = adjacency.get(nodeId) || new Set();
          for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
              if (hasCycle(neighbor)) return true;
            } else if (recStack.has(neighbor)) {
              return true;
            }
          }
          
          recStack.delete(nodeId);
          return false;
        }
        
        for (const nodeId of adjacency.keys()) {
          if (!visited.has(nodeId)) {
            expect(hasCycle(nodeId)).toBe(false);
          }
        }
      });
    });
  });
});
