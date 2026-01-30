import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkflowStore } from '../../src/stores/workflow';

describe('Workflow Store', () => {
  beforeEach(() => {
    // Reset the store before each test
    useWorkflowStore.getState().reset();
  });

  describe('Node Management', () => {
    it('should start with empty nodes and edges', () => {
      const { nodes, edges } = useWorkflowStore.getState();
      expect(nodes).toHaveLength(0);
      expect(edges).toHaveLength(0);
    });

    it('should add a node', () => {
      const store = useWorkflowStore.getState();
      store.addNode({
        id: 'test-1',
        type: 'textPrompt',
        position: { x: 0, y: 0 },
        data: { label: 'Test Node', prompt: '' },
      });

      const { nodes, nodeStatus } = useWorkflowStore.getState();
      expect(nodes).toHaveLength(1);
      expect(nodes[0].id).toBe('test-1');
      expect(nodeStatus['test-1']).toBe('idle');
    });

    it('should update node data', () => {
      const store = useWorkflowStore.getState();
      store.addNode({
        id: 'test-1',
        type: 'textPrompt',
        position: { x: 0, y: 0 },
        data: { label: 'Test Node', prompt: 'original' },
      });

      store.updateNodeData('test-1', { prompt: 'updated' });

      const { nodes } = useWorkflowStore.getState();
      expect(nodes[0].data.prompt).toBe('updated');
    });
  });

  describe('Node Status', () => {
    it('should set node status', () => {
      const store = useWorkflowStore.getState();
      store.addNode({
        id: 'test-1',
        type: 'imageGen',
        position: { x: 0, y: 0 },
        data: { label: 'Image Gen' },
      });

      store.setNodeStatus('test-1', 'running');
      expect(useWorkflowStore.getState().nodeStatus['test-1']).toBe('running');

      store.setNodeStatus('test-1', 'success');
      expect(useWorkflowStore.getState().nodeStatus['test-1']).toBe('success');

      store.setNodeStatus('test-1', 'error');
      expect(useWorkflowStore.getState().nodeStatus['test-1']).toBe('error');
    });
  });

  describe('Node Outputs', () => {
    it('should set and get node outputs', () => {
      const store = useWorkflowStore.getState();
      store.addNode({
        id: 'test-1',
        type: 'textPrompt',
        position: { x: 0, y: 0 },
        data: { label: 'Test', prompt: 'hello' },
      });

      store.setNodeOutput('test-1', {
        type: 'text',
        data: 'hello world',
        timestamp: Date.now(),
      });

      const { nodeOutputs } = useWorkflowStore.getState();
      expect(nodeOutputs['test-1']).toBeDefined();
      expect(nodeOutputs['test-1'].type).toBe('text');
      expect(nodeOutputs['test-1'].data).toBe('hello world');
    });

    it('should clear node output', () => {
      const store = useWorkflowStore.getState();
      store.addNode({
        id: 'test-1',
        type: 'textPrompt',
        position: { x: 0, y: 0 },
        data: { label: 'Test', prompt: '' },
      });

      store.setNodeOutput('test-1', {
        type: 'text',
        data: 'test data',
        timestamp: Date.now(),
      });

      store.clearNodeOutput('test-1');

      const { nodeOutputs } = useWorkflowStore.getState();
      expect(nodeOutputs['test-1']).toBeUndefined();
    });
  });

  describe('Connections', () => {
    it('should connect nodes', () => {
      const store = useWorkflowStore.getState();

      // Add two nodes
      store.addNode({
        id: 'source-1',
        type: 'textPrompt',
        position: { x: 0, y: 0 },
        data: { label: 'Source', prompt: '' },
      });
      store.addNode({
        id: 'target-1',
        type: 'imageGen',
        position: { x: 200, y: 0 },
        data: { label: 'Target' },
      });

      // Connect them
      store.onConnect({
        source: 'source-1',
        target: 'target-1',
        sourceHandle: null,
        targetHandle: null,
      });

      const { edges } = useWorkflowStore.getState();
      expect(edges).toHaveLength(1);
      expect(edges[0].source).toBe('source-1');
      expect(edges[0].target).toBe('target-1');
    });

    it('should get inputs for node', () => {
      const store = useWorkflowStore.getState();

      // Add nodes
      store.addNode({
        id: 'prompt-1',
        type: 'textPrompt',
        position: { x: 0, y: 0 },
        data: { label: 'Prompt', prompt: 'test' },
      });
      store.addNode({
        id: 'gen-1',
        type: 'imageGen',
        position: { x: 200, y: 0 },
        data: { label: 'Gen' },
      });

      // Set output on source
      store.setNodeOutput('prompt-1', {
        type: 'text',
        data: 'generate a cat',
        timestamp: Date.now(),
      });

      // Connect
      store.onConnect({
        source: 'prompt-1',
        target: 'gen-1',
        sourceHandle: null,
        targetHandle: null,
      });

      // Get inputs
      const inputs = useWorkflowStore.getState().getInputsForNode('gen-1');
      expect(inputs).toHaveLength(1);
      expect(inputs[0].type).toBe('text');
      expect(inputs[0].data).toBe('generate a cat');
    });
  });

  describe('Reset', () => {
    it('should reset all state', () => {
      const store = useWorkflowStore.getState();

      // Add some data
      store.addNode({
        id: 'test-1',
        type: 'textPrompt',
        position: { x: 0, y: 0 },
        data: { label: 'Test', prompt: '' },
      });
      store.setNodeOutput('test-1', {
        type: 'text',
        data: 'test',
        timestamp: Date.now(),
      });
      store.setNodeStatus('test-1', 'success');

      // Reset
      store.reset();

      const { nodes, edges, nodeOutputs, nodeStatus } = useWorkflowStore.getState();
      expect(nodes).toHaveLength(0);
      expect(edges).toHaveLength(0);
      expect(Object.keys(nodeOutputs)).toHaveLength(0);
      expect(Object.keys(nodeStatus)).toHaveLength(0);
    });
  });
});
