import { describe, it, expect } from 'vitest';
import { validateWorkflow, hasBlockingErrors, getNodeValidationErrors } from '../../src/lib/validate';
import type { Node, Edge } from '@xyflow/react';
import type { NodeDataUnion } from '../../src/types/nodes';

// Helper to create a test node
function createNode(
  id: string,
  nodeType: NodeDataUnion['nodeType'],
  label?: string
): Node {
  return {
    id,
    type: nodeType,
    position: { x: 0, y: 0 },
    data: {
      nodeType,
      label: label || id,
    } as NodeDataUnion,
  };
}

// Helper to create a test edge
function createEdge(sourceId: string, targetId: string): Edge {
  return {
    id: `edge-${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
  };
}

describe('Workflow Validation', () => {
  describe('Empty workflow', () => {
    it('should return warning for empty workflow', () => {
      const result = validateWorkflow([], []);
      expect(result.valid).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toContain('empty');
      expect(result.errors.length).toBe(0);
    });
  });

  describe('Valid simple workflow', () => {
    it('should return no errors for valid linear workflow', () => {
      const nodes = [
        createNode('text1', 'textPrompt', 'Prompt'),
        createNode('gen1', 'imageGen', 'Generate'),
        createNode('preview1', 'preview', 'Preview'),
      ];
      const edges = [
        createEdge('text1', 'gen1'),
        createEdge('gen1', 'preview1'),
      ];

      const result = validateWorkflow(nodes, edges);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should return no errors for valid workflow with input node', () => {
      const nodes = [
        createNode('upload1', 'imageUpload', 'Upload'),
        createNode('resize1', 'resize', 'Resize'),
        createNode('preview1', 'preview', 'Preview'),
      ];
      const edges = [
        createEdge('upload1', 'resize1'),
        createEdge('resize1', 'preview1'),
      ];

      const result = validateWorkflow(nodes, edges);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('Cycle detection', () => {
    it('should detect simple cycle A -> B -> A', () => {
      const nodes = [
        createNode('a', 'textPrompt', 'A'),
        createNode('b', 'imageGen', 'B'),
      ];
      const edges = [
        createEdge('a', 'b'),
        createEdge('b', 'a'), // Cycle!
      ];

      const result = validateWorkflow(nodes, edges);
      const cycleErrors = result.errors.filter((e) => e.message.includes('cycle'));
      expect(cycleErrors.length).toBeGreaterThan(0);
      expect(result.valid).toBe(false);
      expect(hasBlockingErrors(result)).toBe(true);
    });

    it('should detect longer cycle A -> B -> C -> A', () => {
      const nodes = [
        createNode('a', 'textPrompt', 'A'),
        createNode('b', 'imageGen', 'B'),
        createNode('c', 'resize', 'C'),
      ];
      const edges = [
        createEdge('a', 'b'),
        createEdge('b', 'c'),
        createEdge('c', 'a'), // Cycle!
      ];

      const result = validateWorkflow(nodes, edges);
      const cycleErrors = result.errors.filter((e) => e.message.includes('cycle'));
      expect(cycleErrors.length).toBeGreaterThan(0);
      expect(result.valid).toBe(false);
      expect(hasBlockingErrors(result)).toBe(true);
    });

    it('should not flag non-cyclic graphs', () => {
      const nodes = [
        createNode('a', 'textPrompt', 'A'),
        createNode('b', 'imageGen', 'B'),
        createNode('c', 'resize', 'C'),
      ];
      const edges = [
        createEdge('a', 'b'),
        createEdge('b', 'c'),
        // No cycle
      ];

      const result = validateWorkflow(nodes, edges);
      const cycleErrors = result.errors.filter((e) => e.message.includes('cycle'));
      expect(cycleErrors.length).toBe(0);
    });
  });

  describe('Missing required inputs', () => {
    it('should detect missing input for generation node', () => {
      const nodes = [
        createNode('gen1', 'imageGen', 'Generate'),
        createNode('preview1', 'preview', 'Preview'),
      ];
      const edges = [
        createEdge('gen1', 'preview1'),
      ];

      const result = validateWorkflow(nodes, edges);
      const missingInputErrors = result.errors.filter((e) =>
        e.message.includes('is missing required input') && e.nodeId === 'gen1'
      );
      expect(missingInputErrors.length).toBeGreaterThan(0);
      expect(result.valid).toBe(false);
      expect(hasBlockingErrors(result)).toBe(true);
    });

    it('should detect missing input for processing node', () => {
      const nodes = [
        createNode('resize1', 'resize', 'Resize'),
      ];
      const edges = [];

      const result = validateWorkflow(nodes, edges);
      const missingInputErrors = result.errors.filter((e) =>
        e.message.includes('is missing required input') && e.nodeId === 'resize1'
      );
      expect(missingInputErrors.length).toBeGreaterThan(0);
      expect(result.valid).toBe(false);
      expect(hasBlockingErrors(result)).toBe(true);
    });

    it('should not require inputs for input nodes', () => {
      const nodes = [
        createNode('text1', 'textPrompt', 'Prompt'),
        createNode('upload1', 'imageUpload', 'Upload'),
        createNode('num1', 'number', 'Number'),
      ];
      const edges = [];

      const result = validateWorkflow(nodes, edges);
      const missingInputErrors = result.errors.filter((e) =>
        e.message.includes('is missing required input') &&
        (e.nodeId === 'text1' || e.nodeId === 'upload1' || e.nodeId === 'num1')
      );
      expect(missingInputErrors.length).toBe(0);
    });
  });

  describe('Type compatibility', () => {
    it('should detect type mismatch', () => {
      const nodes = [
        createNode('text1', 'textPrompt', 'Prompt'),
        createNode('resize1', 'resize', 'Resize'),
      ];
      const edges = [
        createEdge('text1', 'resize1'), // text -> image processing (invalid)
      ];

      const result = validateWorkflow(nodes, edges);
      const typeErrors = result.errors.filter((e) => e.message.includes('Type mismatch'));
      expect(typeErrors.length).toBeGreaterThan(0);
      expect(result.valid).toBe(false);
      expect(hasBlockingErrors(result)).toBe(true);
    });

    it('should allow valid type connections', () => {
      const nodes = [
        createNode('text1', 'textPrompt', 'Prompt'),
        createNode('gen1', 'imageGen', 'Generate'),
        createNode('resize1', 'resize', 'Resize'),
      ];
      const edges = [
        createEdge('text1', 'gen1'), // text -> image gen (valid)
        createEdge('gen1', 'resize1'), // image -> resize (valid)
      ];

      const result = validateWorkflow(nodes, edges);
      const typeErrors = result.errors.filter((e) => e.message.includes('Type mismatch'));
      expect(typeErrors.length).toBe(0);
    });
  });

  describe('Output node requirement', () => {
    it('should warn if no output nodes', () => {
      const nodes = [
        createNode('text1', 'textPrompt', 'Prompt'),
        createNode('gen1', 'imageGen', 'Generate'),
      ];
      const edges = [
        createEdge('text1', 'gen1'),
      ];

      const result = validateWorkflow(nodes, edges);
      const outputWarnings = result.warnings.filter((e) => 
        e.message.includes('no output nodes')
      );
      expect(outputWarnings.length).toBeGreaterThan(0);
    });

    it('should not warn if output node exists', () => {
      const nodes = [
        createNode('text1', 'textPrompt', 'Prompt'),
        createNode('gen1', 'imageGen', 'Generate'),
        createNode('preview1', 'preview', 'Preview'),
      ];
      const edges = [
        createEdge('text1', 'gen1'),
        createEdge('gen1', 'preview1'),
      ];

      const result = validateWorkflow(nodes, edges);
      const outputWarnings = result.warnings.filter((e) => 
        e.message.includes('no output nodes')
      );
      expect(outputWarnings.length).toBe(0);
    });
  });

  describe('Generator node requirement', () => {
    it('should error if no generator nodes', () => {
      const nodes = [
        createNode('resize1', 'resize', 'Resize'),
        createNode('preview1', 'preview', 'Preview'),
      ];
      const edges = [
        createEdge('resize1', 'preview1'),
      ];

      const result = validateWorkflow(nodes, edges);
      const generatorErrors = result.errors.filter((e) => 
        e.message.includes('no input or generation nodes')
      );
      expect(generatorErrors.length).toBeGreaterThan(0);
      expect(result.valid).toBe(false);
      expect(hasBlockingErrors(result)).toBe(true);
    });

    it('should not error if generator node exists', () => {
      const nodes = [
        createNode('text1', 'textPrompt', 'Prompt'),
        createNode('gen1', 'imageGen', 'Generate'),
      ];
      const edges = [
        createEdge('text1', 'gen1'),
      ];

      const result = validateWorkflow(nodes, edges);
      const generatorErrors = result.errors.filter((e) => 
        e.message.includes('no input or generation nodes')
      );
      expect(generatorErrors.length).toBe(0);
    });
  });

  describe('Disconnected nodes', () => {
    it('should warn about disconnected processing nodes', () => {
      const nodes = [
        createNode('text1', 'textPrompt', 'Prompt'),
        createNode('resize1', 'resize', 'Resize'), // Disconnected
      ];
      const edges = [];

      const result = validateWorkflow(nodes, edges);
      const disconnectedWarnings = result.warnings.filter((e) => 
        e.message.includes('disconnected') && e.nodeId === 'resize1'
      );
      expect(disconnectedWarnings.length).toBeGreaterThan(0);
    });

    it('should not warn about disconnected input nodes', () => {
      const nodes = [
        createNode('text1', 'textPrompt', 'Prompt'), // Input node, can be disconnected
      ];
      const edges = [];

      const result = validateWorkflow(nodes, edges);
      const disconnectedWarnings = result.warnings.filter((e) => 
        e.message.includes('disconnected') && e.nodeId === 'text1'
      );
      expect(disconnectedWarnings.length).toBe(0);
    });

    it('should not warn about disconnected output nodes', () => {
      const nodes = [
        createNode('preview1', 'preview', 'Preview'), // Output node, can be disconnected
      ];
      const edges = [];

      const result = validateWorkflow(nodes, edges);
      const disconnectedWarnings = result.warnings.filter((e) => 
        e.message.includes('disconnected') && e.nodeId === 'preview1'
      );
      expect(disconnectedWarnings.length).toBe(0);
    });
  });

  describe('hasBlockingErrors', () => {
    it('should return true if errors exist (new format)', () => {
      const result = {
        valid: false,
        errors: [{ nodeId: 'node1', message: 'Error' }],
        warnings: [{ nodeId: 'node2', message: 'Warning' }],
      };
      expect(hasBlockingErrors(result)).toBe(true);
    });

    it('should return false if only warnings exist (new format)', () => {
      const result = {
        valid: true,
        errors: [],
        warnings: [
          { nodeId: 'node1', message: 'Warning 1' },
          { nodeId: 'node2', message: 'Warning 2' },
        ],
      };
      expect(hasBlockingErrors(result)).toBe(false);
    });

    it('should return false if valid (new format)', () => {
      const result = {
        valid: true,
        errors: [],
        warnings: [],
      };
      expect(hasBlockingErrors(result)).toBe(false);
    });

    it('should work with old ValidationError[] format for backwards compatibility', () => {
      const errors = [
        { nodeId: 'node1', message: 'Error', severity: 'error' as const },
        { nodeId: 'node2', message: 'Warning', severity: 'warning' as const },
      ];
      expect(hasBlockingErrors(errors)).toBe(true);
    });
  });

  describe('getNodeValidationErrors', () => {
    it('should return errors for specific node', () => {
      const nodes = [
        createNode('gen1', 'imageGen', 'Generate'),
      ];
      const edges = [];

      const errors = getNodeValidationErrors('gen1', nodes, edges);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.every((e) => e.nodeId === 'gen1')).toBe(true);
    });

    it('should return empty array for node with no errors', () => {
      const nodes = [
        createNode('text1', 'textPrompt', 'Prompt'),
        createNode('gen1', 'imageGen', 'Generate'),
      ];
      const edges = [
        createEdge('text1', 'gen1'),
      ];

      const errors = getNodeValidationErrors('gen1', nodes, edges);
      // gen1 should have no errors since it has input
      const nodeErrors = errors.filter((e) => e.nodeId === 'gen1' && e.severity === 'error');
      expect(nodeErrors.length).toBe(0);
    });
  });

  describe('Complex workflow scenarios', () => {
    it('should validate diamond dependency graph', () => {
      const nodes = [
        createNode('text1', 'textPrompt', 'Prompt'),
        createNode('gen1', 'imageGen', 'Generate'),
        createNode('resize1', 'resize', 'Resize 1'),
        createNode('resize2', 'resize', 'Resize 2'),
        createNode('combine1', 'combine', 'Combine'),
        createNode('preview1', 'preview', 'Preview'),
      ];
      const edges = [
        createEdge('text1', 'gen1'),
        createEdge('gen1', 'resize1'),
        createEdge('gen1', 'resize2'),
        createEdge('resize1', 'combine1'),
        createEdge('resize2', 'combine1'),
        createEdge('combine1', 'preview1'),
      ];

      const result = validateWorkflow(nodes, edges);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should detect multiple issues in complex workflow', () => {
      const nodes = [
        createNode('gen1', 'imageGen', 'Generate'), // Missing input
        createNode('resize1', 'resize', 'Resize'), // Missing input
        createNode('text1', 'textPrompt', 'Prompt'), // Disconnected
      ];
      const edges = [
        createEdge('gen1', 'resize1'), // Valid connection but both missing inputs
      ];

      const result = validateWorkflow(nodes, edges);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      // Should have errors for missing inputs
      const missingInputErrors = result.errors.filter((e) =>
        e.message.includes('is missing required input')
      );
      expect(missingInputErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Orphaned output nodes', () => {
    it('should warn about output node with no input', () => {
      const nodes = [
        createNode('preview1', 'preview', 'Preview'), // Output node with no input
      ];
      const edges = [];

      const result = validateWorkflow(nodes, edges);
      const orphanedWarnings = result.warnings.filter((e) => 
        e.message.includes('has no connected input') && e.nodeId === 'preview1'
      );
      expect(orphanedWarnings.length).toBeGreaterThan(0);
    });

    it('should not warn if output node has input', () => {
      const nodes = [
        createNode('text1', 'textPrompt', 'Prompt'),
        createNode('gen1', 'imageGen', 'Generate'),
        createNode('preview1', 'preview', 'Preview'),
      ];
      const edges = [
        createEdge('text1', 'gen1'),
        createEdge('gen1', 'preview1'),
      ];

      const result = validateWorkflow(nodes, edges);
      const orphanedWarnings = result.warnings.filter((e) => 
        e.message.includes('has no connected input') && e.nodeId === 'preview1'
      );
      expect(orphanedWarnings.length).toBe(0);
    });
  });
});
