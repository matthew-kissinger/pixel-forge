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

    it('should clean up orphaned node data when a node is removed', () => {
      const store = useWorkflowStore.getState();
      store.addNode({
        id: 'test-1',
        type: 'textPrompt',
        position: { x: 0, y: 0 },
        data: { label: 'Test Node', prompt: 'original' },
      });

      store.setNodeOutput('test-1', {
        type: 'text',
        data: 'hello world',
        timestamp: Date.now(),
      });
      store.setNodeStatus('test-1', 'error');
      store.setNodeError('test-1', 'failed');
      store.setBatchProgress('test-1', { current: 1, total: 2, label: 'halfway' });

      store.onNodesChange([{ id: 'test-1', type: 'remove' }]);

      const { nodes, nodeOutputs, nodeStatus, nodeErrors, batchProgress } = useWorkflowStore.getState();
      expect(nodes.find((node) => node.id === 'test-1')).toBeUndefined();
      expect(nodeOutputs['test-1']).toBeUndefined();
      expect(nodeStatus['test-1']).toBeUndefined();
      expect(nodeErrors['test-1']).toBeUndefined();
      expect(batchProgress['test-1']).toBeUndefined();
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

  describe('Persistence', () => {
    it('should export current workflow', () => {
      const store = useWorkflowStore.getState();

      store.addNode({
        id: 'node-1',
        type: 'textPrompt',
        position: { x: 10, y: 10 },
        data: { label: 'Prompt', prompt: 'test' },
      });

      store.addNode({
        id: 'node-2',
        type: 'preview',
        position: { x: 100, y: 100 },
        data: { label: 'Preview', inputType: 'any' },
      });

      store.onConnect({
        source: 'node-1',
        target: 'node-2',
        sourceHandle: 'out',
        targetHandle: 'in',
      });

      const workflow = store.exportWorkflow();

      expect(workflow.version).toBe(1);
      expect(workflow.nodes).toHaveLength(2);
      expect(workflow.edges).toHaveLength(1);
      expect(workflow.nodes[0].id).toBe('node-1');
      expect(workflow.nodes[0].data.prompt).toBe('test');
      expect(workflow.edges[0].source).toBe('node-1');
      expect(workflow.edges[0].target).toBe('node-2');
    });

    it('should import a workflow', () => {
      const store = useWorkflowStore.getState();

      const workflowData = {
        version: 1,
        nodes: [
          {
            id: 'n1',
            type: 'textPrompt',
            position: { x: 50, y: 50 },
            data: { label: 'Imported', prompt: 'hello' },
          },
        ],
        edges: [],
      };

      store.importWorkflow(workflowData);

      const { nodes } = useWorkflowStore.getState();
      expect(nodes).toHaveLength(1);
      expect(nodes[0].id).toBe('n1');
      expect(nodes[0].data.label).toBe('Imported');
      expect(nodes[0].data.prompt).toBe('hello');
      expect(useWorkflowStore.getState().nodeStatus['n1']).toBe('idle');
    });

    it('should throw error for invalid version', () => {
      const store = useWorkflowStore.getState();
      const invalidWorkflow = {
        version: 999,
        nodes: [],
        edges: [],
      };

      expect(() => store.importWorkflow(invalidWorkflow)).toThrow(/version/);
    });

    it('should throw error for missing fields', () => {
      const store = useWorkflowStore.getState();
      const invalidWorkflow = {
        version: 1,
        // missing nodes/edges
      } as any;

      expect(() => store.importWorkflow(invalidWorkflow)).toThrow(/Invalid workflow format/);
    });
  });

  // -----------------------------------------------------------------------
  // Op-based undo/redo records (Round 4 / C2)
  // -----------------------------------------------------------------------

  describe('Op-based undo/redo records', () => {
    it('AddNodeRecord — undo removes the node, redo restores it', () => {
      const store = useWorkflowStore.getState();
      store.addNode({
        id: 'n1',
        type: 'textPrompt',
        position: { x: 10, y: 20 },
        data: { label: 'A', prompt: 'p' },
      });

      // Record was pushed
      expect(useWorkflowStore.getState().undoStack[0]?.kind).toBe('addNode');
      expect(useWorkflowStore.getState().nodes).toHaveLength(1);

      store.undo();
      expect(useWorkflowStore.getState().nodes).toHaveLength(0);
      expect(useWorkflowStore.getState().nodeStatus['n1']).toBeUndefined();
      expect(useWorkflowStore.getState().redoStack[0]?.kind).toBe('addNode');

      store.redo();
      expect(useWorkflowStore.getState().nodes).toHaveLength(1);
      expect(useWorkflowStore.getState().nodes[0]!.id).toBe('n1');
      expect(useWorkflowStore.getState().nodeStatus['n1']).toBe('idle');
    });

    it('DeleteNodeRecord — undo restores the node and its adjacent edges', () => {
      const store = useWorkflowStore.getState();
      store.addNode({
        id: 'n1',
        type: 'textPrompt',
        position: { x: 0, y: 0 },
        data: { label: 'A', prompt: '' },
      });
      store.addNode({
        id: 'n2',
        type: 'textPrompt',
        position: { x: 100, y: 0 },
        data: { label: 'B', prompt: '' },
      });
      store.onConnect({ source: 'n1', target: 'n2', sourceHandle: null, targetHandle: null });

      expect(useWorkflowStore.getState().edges).toHaveLength(1);

      // Delete n1 — record captures the node + the edge
      store.onNodesChange([{ id: 'n1', type: 'remove' }]);
      const top = useWorkflowStore.getState().undoStack[0];
      expect(top?.kind).toBe('deleteNode');

      // Walk back: undo (deleteNode) then undo (snapshot of onConnect) — only
      // the deleteNode part should restore the node + edge.
      store.undo();
      const after = useWorkflowStore.getState();
      expect(after.nodes.find((n) => n.id === 'n1')).toBeDefined();
      expect(after.edges.find((e) => e.source === 'n1')).toBeDefined();

      // Redo deletes again
      store.redo();
      const after2 = useWorkflowStore.getState();
      expect(after2.nodes.find((n) => n.id === 'n1')).toBeUndefined();
    });

    it('SnapshotRecord — onConnect undo removes the edge, redo restores it', () => {
      const store = useWorkflowStore.getState();
      store.addNode({
        id: 'n1',
        type: 'textPrompt',
        position: { x: 0, y: 0 },
        data: { label: 'A', prompt: '' },
      });
      store.addNode({
        id: 'n2',
        type: 'textPrompt',
        position: { x: 100, y: 0 },
        data: { label: 'B', prompt: '' },
      });
      store.onConnect({ source: 'n1', target: 'n2', sourceHandle: null, targetHandle: null });

      expect(useWorkflowStore.getState().undoStack[0]?.kind).toBe('snapshot');
      expect(useWorkflowStore.getState().edges).toHaveLength(1);

      store.undo();
      expect(useWorkflowStore.getState().edges).toHaveLength(0);

      store.redo();
      expect(useWorkflowStore.getState().edges).toHaveLength(1);
    });

    it('record memory shape: a single addNode is O(1) records, not a full snapshot', () => {
      const store = useWorkflowStore.getState();
      store.addNode({
        id: 'n1',
        type: 'textPrompt',
        position: { x: 0, y: 0 },
        data: { label: 'A', prompt: '' },
      });
      const top = useWorkflowStore.getState().undoStack[0];
      expect(top?.kind).toBe('addNode');
      // A typed addNode record carries only the added node — not a deep
      // clone of the whole graph.
      if (top?.kind === 'addNode') {
        expect(top.node.id).toBe('n1');
        expect((top as { before?: unknown }).before).toBeUndefined();
        expect((top as { after?: unknown }).after).toBeUndefined();
      }
    });

    it('mixed sequence: addNode → onConnect → delete → undo×3 walks back to empty', () => {
      const store = useWorkflowStore.getState();
      // Clear pre-existing stacks (cross-test reset() chain pollutes them).
      useWorkflowStore.setState({ undoStack: [], redoStack: [] });

      store.addNode({
        id: 'n1',
        type: 'textPrompt',
        position: { x: 0, y: 0 },
        data: { label: 'A', prompt: '' },
      });
      store.addNode({
        id: 'n2',
        type: 'textPrompt',
        position: { x: 100, y: 0 },
        data: { label: 'B', prompt: '' },
      });
      store.onConnect({ source: 'n1', target: 'n2', sourceHandle: null, targetHandle: null });
      store.onNodesChange([{ id: 'n2', type: 'remove' }]);

      // 4 records on the undo stack now.
      expect(useWorkflowStore.getState().undoStack).toHaveLength(4);

      store.undo(); // undo delete → n2 back
      expect(useWorkflowStore.getState().nodes).toHaveLength(2);
      store.undo(); // undo connect → no edge
      expect(useWorkflowStore.getState().edges).toHaveLength(0);
      store.undo(); // undo addNode n2 → 1 node
      expect(useWorkflowStore.getState().nodes).toHaveLength(1);
      store.undo(); // undo addNode n1 → 0 nodes
      expect(useWorkflowStore.getState().nodes).toHaveLength(0);

      // Redo brings us right back through every record. The final
      // record was the delete, so state ends at 1 node, 0 (live) edges.
      store.redo();
      store.redo();
      store.redo();
      store.redo();
      expect(useWorkflowStore.getState().nodes).toHaveLength(1);
      expect(useWorkflowStore.getState().nodes[0]!.id).toBe('n1');
    });

    it('a fresh action clears the redo stack', () => {
      const store = useWorkflowStore.getState();
      store.addNode({
        id: 'n1',
        type: 'textPrompt',
        position: { x: 0, y: 0 },
        data: { label: 'A', prompt: '' },
      });
      store.undo();
      expect(useWorkflowStore.getState().redoStack).toHaveLength(1);

      // New action — redo stack should clear.
      store.addNode({
        id: 'n2',
        type: 'textPrompt',
        position: { x: 100, y: 0 },
        data: { label: 'B', prompt: '' },
      });
      expect(useWorkflowStore.getState().redoStack).toHaveLength(0);
    });
  });
});
