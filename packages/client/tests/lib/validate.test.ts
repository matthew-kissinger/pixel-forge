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
      const errors = validateWorkflow([], []);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].severity).toBe('warning');
      expect(errors[0].message).toContain('empty');
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

      const errors = validateWorkflow(nodes, edges);
      const blocking = errors.filter((e) => e.severity === 'error');
      expect(blocking.length).toBe(0);
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

      const errors = validateWorkflow(nodes, edges);
      const blocking = errors.filter((e) => e.severity === 'error');
      expect(blocking.length).toBe(0);
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

      const errors = validateWorkflow(nodes, edges);
      const cycleErrors = errors.filter((e) => e.message.includes('cycle'));
      expect(cycleErrors.length).toBeGreaterThan(0);
      expect(hasBlockingErrors(errors)).toBe(true);
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

      const errors = validateWorkflow(nodes, edges);
      const cycleErrors = errors.filter((e) => e.message.includes('cycle'));
      expect(cycleErrors.length).toBeGreaterThan(0);
      expect(hasBlockingErrors(errors)).toBe(true);
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

      const errors = validateWorkflow(nodes, edges);
      const cycleErrors = errors.filter((e) => e.message.includes('cycle'));
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

      const errors = validateWorkflow(nodes, edges);
      const missingInputErrors = errors.filter((e) => 
        e.message.includes('Missing required input') && e.nodeId === 'gen1'
      );
      expect(missingInputErrors.length).toBeGreaterThan(0);
      expect(hasBlockingErrors(errors)).toBe(true);
    });

    it('should detect missing input for processing node', () => {
      const nodes = [
        createNode('resize1', 'resize', 'Resize'),
      ];
      const edges = [];

      const errors = validateWorkflow(nodes, edges);
      const missingInputErrors = errors.filter((e) => 
        e.message.includes('Missing required input') && e.nodeId === 'resize1'
      );
      expect(missingInputErrors.length).toBeGreaterThan(0);
      expect(hasBlockingErrors(errors)).toBe(true);
    });

    it('should not require inputs for input nodes', () => {
      const nodes = [
        createNode('text1', 'textPrompt', 'Prompt'),
        createNode('upload1', 'imageUpload', 'Upload'),
        createNode('num1', 'number', 'Number'),
      ];
      const edges = [];

      const errors = validateWorkflow(nodes, edges);
      const missingInputErrors = errors.filter((e) => 
        e.message.includes('Missing required input') &&
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

      const errors = validateWorkflow(nodes, edges);
      const typeErrors = errors.filter((e) => e.message.includes('Type mismatch'));
      expect(typeErrors.length).toBeGreaterThan(0);
      expect(hasBlockingErrors(errors)).toBe(true);
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

      const errors = validateWorkflow(nodes, edges);
      const typeErrors = errors.filter((e) => e.message.includes('Type mismatch'));
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

      const errors = validateWorkflow(nodes, edges);
      const outputErrors = errors.filter((e) => 
        e.message.includes('no output nodes')
      );
      expect(outputErrors.length).toBeGreaterThan(0);
      expect(outputErrors[0].severity).toBe('warning');
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

      const errors = validateWorkflow(nodes, edges);
      const outputErrors = errors.filter((e) => 
        e.message.includes('no output nodes')
      );
      expect(outputErrors.length).toBe(0);
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

      const errors = validateWorkflow(nodes, edges);
      const generatorErrors = errors.filter((e) => 
        e.message.includes('no input or generation nodes')
      );
      expect(generatorErrors.length).toBeGreaterThan(0);
      expect(generatorErrors[0].severity).toBe('error');
      expect(hasBlockingErrors(errors)).toBe(true);
    });

    it('should not error if generator node exists', () => {
      const nodes = [
        createNode('text1', 'textPrompt', 'Prompt'),
        createNode('gen1', 'imageGen', 'Generate'),
      ];
      const edges = [
        createEdge('text1', 'gen1'),
      ];

      const errors = validateWorkflow(nodes, edges);
      const generatorErrors = errors.filter((e) => 
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

      const errors = validateWorkflow(nodes, edges);
      const disconnectedErrors = errors.filter((e) => 
        e.message.includes('disconnected') && e.nodeId === 'resize1'
      );
      expect(disconnectedErrors.length).toBeGreaterThan(0);
      expect(disconnectedErrors[0].severity).toBe('warning');
    });

    it('should not warn about disconnected input nodes', () => {
      const nodes = [
        createNode('text1', 'textPrompt', 'Prompt'), // Input node, can be disconnected
      ];
      const edges = [];

      const errors = validateWorkflow(nodes, edges);
      const disconnectedErrors = errors.filter((e) => 
        e.message.includes('disconnected') && e.nodeId === 'text1'
      );
      expect(disconnectedErrors.length).toBe(0);
    });

    it('should not warn about disconnected output nodes', () => {
      const nodes = [
        createNode('preview1', 'preview', 'Preview'), // Output node, can be disconnected
      ];
      const edges = [];

      const errors = validateWorkflow(nodes, edges);
      const disconnectedErrors = errors.filter((e) => 
        e.message.includes('disconnected') && e.nodeId === 'preview1'
      );
      expect(disconnectedErrors.length).toBe(0);
    });
  });

  describe('hasBlockingErrors', () => {
    it('should return true if errors exist', () => {
      const errors = [
        { nodeId: 'node1', message: 'Error', severity: 'error' as const },
        { nodeId: 'node2', message: 'Warning', severity: 'warning' as const },
      ];
      expect(hasBlockingErrors(errors)).toBe(true);
    });

    it('should return false if only warnings exist', () => {
      const errors = [
        { nodeId: 'node1', message: 'Warning 1', severity: 'warning' as const },
        { nodeId: 'node2', message: 'Warning 2', severity: 'warning' as const },
      ];
      expect(hasBlockingErrors(errors)).toBe(false);
    });

    it('should return false if no errors', () => {
      expect(hasBlockingErrors([])).toBe(false);
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

      const errors = validateWorkflow(nodes, edges);
      const blocking = errors.filter((e) => e.severity === 'error');
      expect(blocking.length).toBe(0);
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

      const errors = validateWorkflow(nodes, edges);
      const blocking = errors.filter((e) => e.severity === 'error');
      expect(blocking.length).toBeGreaterThan(0);
      
      // Should have errors for missing inputs
      const missingInputErrors = errors.filter((e) => 
        e.message.includes('Missing required input')
      );
      expect(missingInputErrors.length).toBeGreaterThan(0);
    });
  });
});
