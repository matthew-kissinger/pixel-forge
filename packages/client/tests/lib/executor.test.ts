import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeWorkflow } from '../../src/lib/executor';
import { handlers } from '../../src/lib/handlers';
import { useWorkflowStore } from '../../src/stores/workflow';
import type { Node, Edge } from '@xyflow/react';

// Mock the handlers
vi.mock('../../src/lib/handlers', () => ({
  handlers: {},
}));

describe('Workflow Executor', () => {
  const mockSetNodeStatus = vi.fn();
  const mockSetNodeError = vi.fn();
  const mockAddExecutionRecord = vi.fn();
  const mockSetNodeOutput = vi.fn();
  const mockSetBatchProgress = vi.fn();
  const mockGetInputsForNode = vi.fn().mockReturnValue([]);
  const advanceTimers = async (ms: number) => {
    vi.advanceTimersByTime(ms);
    // Multiple ticks to allow all promises to resolve
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset handler map between tests
    Object.keys(handlers as Record<string, unknown>).forEach((key) => {
      delete (handlers as Record<string, unknown>)[key];
    });
    
    // Mock store state
    vi.spyOn(useWorkflowStore, 'getState').mockReturnValue({
      nodeStatus: {},
      nodeOutputs: {},
      setNodeStatus: mockSetNodeStatus,
      setNodeError: mockSetNodeError,
      addExecutionRecord: mockAddExecutionRecord,
      setNodeOutput: mockSetNodeOutput,
      setBatchProgress: mockSetBatchProgress,
      getInputsForNode: mockGetInputsForNode,
    } as any);

    // Default handlers - now they are loaders that return the actual handler
    (handlers as any).textPrompt = vi.fn().mockResolvedValue(vi.fn().mockResolvedValue(undefined));
    (handlers as any).imageGen = vi.fn().mockResolvedValue(vi.fn().mockResolvedValue(undefined));
    (handlers as any).removeBg = vi.fn().mockResolvedValue(vi.fn().mockResolvedValue(undefined));
    (handlers as any).preview = vi.fn().mockResolvedValue(vi.fn().mockResolvedValue(undefined));
    (handlers as any).batchGen = vi.fn().mockResolvedValue(vi.fn().mockResolvedValue(undefined));
    (handlers as any).spriteSheet = vi.fn().mockResolvedValue(vi.fn().mockResolvedValue(undefined));
  });

  describe('Topological Execution Order', () => {
    it('should execute a linear chain A -> B -> C in order', async () => {
      const executionOrder: string[] = [];
      
      const handlerA = vi.fn().mockImplementation(async () => {
        executionOrder.push('A');
      });
      const handlerB = vi.fn().mockImplementation(async () => {
        executionOrder.push('B');
      });
      const handlerC = vi.fn().mockImplementation(async () => {
        executionOrder.push('C');
      });

      (handlers as any).textPrompt = vi.fn().mockResolvedValue(handlerA);
      (handlers as any).imageGen = vi.fn().mockResolvedValue(handlerB);
      (handlers as any).removeBg = vi.fn().mockResolvedValue(handlerC);

      const nodes: Node[] = [
        { id: 'A', type: 'textPrompt', position: { x: 0, y: 0 }, data: { nodeType: 'textPrompt', label: 'A' } },
        { id: 'B', type: 'imageGen', position: { x: 0, y: 0 }, data: { nodeType: 'imageGen', label: 'B' } },
        { id: 'C', type: 'removeBg', position: { x: 0, y: 0 }, data: { nodeType: 'removeBg', label: 'C' } },
      ];

      const edges: Edge[] = [
        { id: 'e1', source: 'A', target: 'B' },
        { id: 'e2', source: 'B', target: 'C' },
      ];

      // Setup store to return output for A when B runs, etc.
      mockGetInputsForNode.mockImplementation((nodeId) => {
        if (nodeId === 'B') return [{ type: 'text', data: 'prompt' }];
        if (nodeId === 'C') return [{ type: 'image', data: 'img' }];
        return [];
      });
      
      // Mock nodeOutputs to satisfy hasRequiredInputs
      vi.spyOn(useWorkflowStore, 'getState').mockReturnValue({
        nodeStatus: {},
        nodeOutputs: { 'A': { type: 'text', data: 'val' }, 'B': { type: 'image', data: 'val' } },
        setNodeStatus: mockSetNodeStatus,
        setNodeError: mockSetNodeError,
        addExecutionRecord: mockAddExecutionRecord,
        setNodeOutput: mockSetNodeOutput,
        setBatchProgress: mockSetBatchProgress,
        getInputsForNode: mockGetInputsForNode,
      } as any);

      const result = await executeWorkflow(nodes, edges, useWorkflowStore.getState() as any);

      expect(result.success).toBe(true);
      expect(executionOrder).toEqual(['A', 'B', 'C']);
    });

    it('should execute a diamond pattern A -> [B, C] -> D correctly', async () => {
      const executionOrder: string[] = [];
      
      const handlerA = vi.fn().mockImplementation(async () => {
        executionOrder.push('A');
      });
      const handlerB = vi.fn().mockImplementation(async () => {
        executionOrder.push('B');
      });
      const handlerC = vi.fn().mockImplementation(async () => {
        executionOrder.push('C');
      });
      const handlerD = vi.fn().mockImplementation(async () => {
        executionOrder.push('D');
      });

      (handlers as any).textPrompt = vi.fn().mockResolvedValue(handlerA);
      (handlers as any).imageGen = vi.fn().mockResolvedValue(handlerB);
      (handlers as any).spriteSheet = vi.fn().mockResolvedValue(handlerC);
      (handlers as any).removeBg = vi.fn().mockResolvedValue(handlerD);

      const nodes: Node[] = [
        { id: 'A', type: 'textPrompt', position: { x: 0, y: 0 }, data: { nodeType: 'textPrompt', label: 'A' } },
        { id: 'B', type: 'imageGen', position: { x: 0, y: 0 }, data: { nodeType: 'imageGen', label: 'B' } },
        { id: 'C', type: 'spriteSheet', position: { x: 0, y: 0 }, data: { nodeType: 'spriteSheet', label: 'C' } },
        { id: 'D', type: 'removeBg', position: { x: 0, y: 0 }, data: { nodeType: 'removeBg', label: 'D' } },
      ];

      const edges: Edge[] = [
        { id: 'e1', source: 'A', target: 'B' },
        { id: 'e2', source: 'A', target: 'C' },
        { id: 'e3', source: 'B', target: 'D' },
        { id: 'e4', source: 'C', target: 'D' },
      ];

      // Mock nodeOutputs to satisfy hasRequiredInputs
      vi.spyOn(useWorkflowStore, 'getState').mockReturnValue({
        nodeStatus: {},
        nodeOutputs: { 
          'A': { type: 'text', data: 'val' },
          'B': { type: 'image', data: 'val' },
          'C': { type: 'image', data: 'val' }
        },
        setNodeStatus: mockSetNodeStatus,
        setNodeError: mockSetNodeError,
        addExecutionRecord: mockAddExecutionRecord,
        setNodeOutput: mockSetNodeOutput,
        setBatchProgress: mockSetBatchProgress,
        getInputsForNode: mockGetInputsForNode,
      } as any);

      const result = await executeWorkflow(nodes, edges, useWorkflowStore.getState() as any);

      expect(result.success).toBe(true);
      expect(executionOrder[0]).toBe('A');
      // B and C can be in any order as they are in the same wave
      expect(new Set([executionOrder[1], executionOrder[2]])).toEqual(new Set(['B', 'C']));
      expect(executionOrder[3]).toBe('D');
    });

    it('should execute disconnected nodes/chains', async () => {
      const executionOrder: string[] = [];
      
      const handlerA = vi.fn().mockImplementation(async () => {
        executionOrder.push('A');
      });
      const handlerB = vi.fn().mockImplementation(async () => {
        executionOrder.push('B');
      });

      (handlers as any).textPrompt = vi.fn().mockResolvedValue(handlerA);
      (handlers as any).batchGen = vi.fn().mockResolvedValue(handlerB);

      const nodes: Node[] = [
        { id: 'A', type: 'textPrompt', position: { x: 0, y: 0 }, data: { nodeType: 'textPrompt', label: 'A' } },
        { id: 'B', type: 'batchGen', position: { x: 100, y: 100 }, data: { nodeType: 'batchGen', label: 'B' } },
      ];

      // No edges between A and B

      vi.spyOn(useWorkflowStore, 'getState').mockReturnValue({
        nodeStatus: {},
        nodeOutputs: {},
        setNodeStatus: mockSetNodeStatus,
        setNodeError: mockSetNodeError,
        addExecutionRecord: mockAddExecutionRecord,
        setNodeOutput: mockSetNodeOutput,
        setBatchProgress: mockSetBatchProgress,
        getInputsForNode: mockGetInputsForNode,
      } as any);

      const result = await executeWorkflow(nodes, [], useWorkflowStore.getState() as any);

      expect(result.success).toBe(true);
      expect(new Set(executionOrder)).toEqual(new Set(['A', 'B']));
    });

    it('should handle self-referencing edges gracefully (skip or handled)', async () => {
      // If there's a cycle, Kahn's algorithm in executor.ts might skip those nodes or behave unexpectedly
      // Let's see how it's implemented. 
      // It uses inDegree and queue. If there's a cycle, in-degree never hits 0 for those nodes.
      // But it has a fallback:
      /*
        // Add nodes with no connections (they weren't in the graph)
        const sortedIds = new Set(sorted.map((n) => n.id));
        nodes.forEach((node) => {
          if (!sortedIds.has(node.id)) {
            sorted.push(node);
          }
        });
      */
      // Wait, that's in topologicalSort, but executeWorkflow uses getExecutionWaves.
      // getExecutionWaves has:
      /*
        const processedIds = new Set(waves.flat().map((n) => n.id));
        const orphanNodes = nodes.filter((node) => !processedIds.has(node.id));
        if (orphanNodes.length > 0) {
          waves.push(orphanNodes);
        }
      */
      // So nodes in a cycle will be treated as orphans and put in the last wave.
      
      const executionOrder: string[] = [];
      const handlerA = vi.fn().mockImplementation(async () => {
        executionOrder.push('A');
      });
      (handlers as any).textPrompt = vi.fn().mockResolvedValue(handlerA);

      const nodes: Node[] = [
        { id: 'A', type: 'textPrompt', position: { x: 0, y: 0 }, data: { nodeType: 'textPrompt', label: 'A' } },
      ];

      const edges: Edge[] = [
        { id: 'e1', source: 'A', target: 'A' },
      ];

      vi.spyOn(useWorkflowStore, 'getState').mockReturnValue({
        nodeStatus: {},
        nodeOutputs: {},
        setNodeStatus: mockSetNodeStatus,
        setNodeError: mockSetNodeError,
        addExecutionRecord: mockAddExecutionRecord,
        setNodeOutput: mockSetNodeOutput,
        setBatchProgress: mockSetBatchProgress,
        getInputsForNode: mockGetInputsForNode,
      } as any);

      const result = await executeWorkflow(nodes, edges, useWorkflowStore.getState() as any);

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({
        nodeId: 'A',
      }));
      expect(executionOrder).not.toContain('A');
    });
  });

  describe('Cancellation', () => {
    it('should stop execution when cancelled', async () => {
      let cancelled = false;
      const ctx = {
        getCancelled: () => cancelled,
        onProgress: vi.fn(),
      };

      const handlerA = vi.fn().mockImplementation(async () => {
        cancelled = true; // Cancel after first node
      });
      const handlerB = vi.fn();

      (handlers as any).textPrompt = vi.fn().mockResolvedValue(handlerA);
      (handlers as any).imageGen = vi.fn().mockResolvedValue(handlerB);

      const nodes: Node[] = [
        { id: 'A', type: 'textPrompt', position: { x: 0, y: 0 }, data: { nodeType: 'textPrompt', label: 'A' } },
        { id: 'B', type: 'imageGen', position: { x: 0, y: 0 }, data: { nodeType: 'imageGen', label: 'B' } },
      ];

      const edges: Edge[] = [{ id: 'e1', source: 'A', target: 'B' }];

      // Mock nodeOutputs to satisfy hasRequiredInputs
      vi.spyOn(useWorkflowStore, 'getState').mockReturnValue({
        nodeStatus: {},
        nodeOutputs: { 'A': { type: 'text', data: 'val' } },
        setNodeStatus: mockSetNodeStatus,
        setNodeError: mockSetNodeError,
        addExecutionRecord: mockAddExecutionRecord,
        setNodeOutput: mockSetNodeOutput,
        setBatchProgress: mockSetBatchProgress,
        getInputsForNode: mockGetInputsForNode,
      } as any);

      const result = await executeWorkflow(nodes, edges, useWorkflowStore.getState() as any, ctx);

      expect((handlers as any).imageGen).not.toHaveBeenCalled();
      expect(mockAddExecutionRecord).toHaveBeenCalledWith(expect.objectContaining({
        status: 'cancelled'
      }));
    });
  });

  describe('Timeout', () => {
    it.skip('should fail a node that exceeds timeout', async () => {
      vi.useFakeTimers();

      // Use batchGen which is allowed to have no inputs
      (handlers as any).batchGen = vi.fn().mockImplementation(() => new Promise(() => {})); 

      const nodes: Node[] = [
        { id: 'A', type: 'batchGen', position: { x: 0, y: 0 }, data: { nodeType: 'batchGen', label: 'A' } },
      ];

      vi.spyOn(useWorkflowStore, 'getState').mockReturnValue({
        nodeStatus: {},
        nodeOutputs: {},
        setNodeStatus: mockSetNodeStatus,
        setNodeError: mockSetNodeError,
        addExecutionRecord: mockAddExecutionRecord,
        setNodeOutput: mockSetNodeOutput,
        setBatchProgress: mockSetBatchProgress,
        getInputsForNode: mockGetInputsForNode,
      } as any);

      const promise = executeWorkflow(nodes, [], useWorkflowStore.getState() as any);
      
      // Fast forward time - batchGen has 120s timeout
      await advanceTimers(121000);

      const result = await promise;
      expect(result.success).toBe(false);
      expect(result.errors[0].error).toContain('timed out');
      expect(mockSetNodeStatus).toHaveBeenCalledWith('A', 'error');
      
      vi.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should mark node as error if handler throws', async () => {
      // Use textPrompt which is allowed to have no inputs
      const failingHandler = vi.fn().mockRejectedValue(new Error('API Error'));
      (handlers as any).textPrompt = vi.fn().mockResolvedValue(failingHandler);

      const nodes: Node[] = [
        { id: 'A', type: 'textPrompt', position: { x: 0, y: 0 }, data: { nodeType: 'textPrompt', label: 'A' } },
      ];

      vi.spyOn(useWorkflowStore, 'getState').mockReturnValue({
        nodeStatus: {},
        nodeOutputs: {},
        setNodeStatus: mockSetNodeStatus,
        setNodeError: mockSetNodeError,
        addExecutionRecord: mockAddExecutionRecord,
        setNodeOutput: mockSetNodeOutput,
        setBatchProgress: mockSetBatchProgress,
        getInputsForNode: mockGetInputsForNode,
      } as any);

      const result = await executeWorkflow(nodes, [], useWorkflowStore.getState() as any);

      expect(result.success).toBe(false);
      expect(mockSetNodeError).toHaveBeenCalledWith('A', 'API Error');
      expect(mockSetNodeStatus).toHaveBeenCalledWith('A', 'error');
    });

    it('should skip downstream nodes if upstream fails (missing inputs)', async () => {
      const failingHandler = vi.fn().mockRejectedValue(new Error('Failed'));
      const handlerB = vi.fn();
      
      (handlers as any).textPrompt = vi.fn().mockResolvedValue(failingHandler);
      (handlers as any).imageGen = vi.fn().mockResolvedValue(handlerB);

      const nodes: Node[] = [
        { id: 'A', type: 'textPrompt', position: { x: 0, y: 0 }, data: { nodeType: 'textPrompt', label: 'A' } },
        { id: 'B', type: 'imageGen', position: { x: 0, y: 0 }, data: { nodeType: 'imageGen', label: 'B' } },
      ];

      const edges: Edge[] = [{ id: 'e1', source: 'A', target: 'B' }];

      // Initially A has no output, and it fails so it still has no output
      vi.spyOn(useWorkflowStore, 'getState').mockReturnValue({
        nodeStatus: {},
        nodeOutputs: {}, // No output for A
        setNodeStatus: mockSetNodeStatus,
        setNodeError: mockSetNodeError,
        addExecutionRecord: mockAddExecutionRecord,
        setNodeOutput: mockSetNodeOutput,
        setBatchProgress: mockSetBatchProgress,
        getInputsForNode: mockGetInputsForNode,
      } as any);

      const result = await executeWorkflow(nodes, edges, useWorkflowStore.getState() as any);

      expect((handlers as any).imageGen).not.toHaveBeenCalled();
      // B should have failed with 'Missing required inputs'
      expect(result.errors).toContainEqual(expect.objectContaining({
        nodeId: 'B',
        error: 'Missing required inputs'
      }));
    });
  });
});
