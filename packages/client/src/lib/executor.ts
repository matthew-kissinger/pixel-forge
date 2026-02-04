/**
 * Workflow Execution Engine
 * 
 * Executes node graphs topologically, respecting dependencies.
 * Supports parallel execution of independent branches and cancellation.
 */

import type { Node, Edge } from '@xyflow/react';
import type { NodeDataUnion, NodeTypeName } from '../types/nodes';
import { getNodeDefinition } from '../types/nodes';
import type { NodeOutput, ExecutionRecord } from '../stores/workflow';
import { useWorkflowStore } from '../stores/workflow';
import { handlers, type NodeHandlerContext, type ExecutionContext } from './handlers';
import { validateWorkflow } from './validate';
import { logger } from '@pixel-forge/shared/logger';

type WorkflowStore = ReturnType<typeof useWorkflowStore.getState>;

export interface ExecutionResult {
  success: boolean;
  errors: Array<{ nodeId: string; error: string }>;
  executed: number;
  total: number;
}

// Re-export ExecutionContext for backwards compatibility
export type { ExecutionContext };

/**
 * Timeout values per node type category
 */
const NODE_TIMEOUTS: Partial<Record<NodeTypeName, number>> = {
  // Generation nodes: 120s
  imageGen: 120000,
  batchGen: 120000,
  isometricTile: 120000,
  spriteSheet: 120000,
  model3DGen: 120000,
  kilnGen: 120000,

  // Processing nodes: 60s
  removeBg: 60000,

  // Canvas processing nodes: 30s
  resize: 30000,
  crop: 30000,
  pixelate: 30000,
  tile: 30000,
  filter: 30000,
  combine: 30000,
  rotate: 30000,
  colorPalette: 30000,
  compress: 30000,
  sliceSheet: 30000,
  analyze: 30000,
  iterate: 30000,
};

const DEFAULT_TIMEOUT = 60000;

/**
 * Wraps any async operation with a timeout using AbortController.
 */
async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    const result = await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error(`${label} timed out after ${ms / 1000}s - the API may be overloaded. Try re-running this node.`));
        });
      }),
    ]);
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Group nodes into execution waves based on dependency depth.
 * All nodes in the same wave can execute in parallel.
 * Returns array of waves, where each wave is an array of nodes.
 */
function getExecutionWaves(nodes: Node[], edges: Edge[]): Node[][] {
  // Build dependency graph
  const dependents = new Map<string, Set<string>>();
  const dependencies = new Map<string, Set<string>>();
  const nodeMap = new Map<string, Node>();

  nodes.forEach((node) => {
    nodeMap.set(node.id, node);
    dependents.set(node.id, new Set());
    dependencies.set(node.id, new Set());
  });

  edges.forEach((edge) => {
    // edge.source -> edge.target means target depends on source
    const sourceDeps = dependencies.get(edge.target);
    const targetDeps = dependents.get(edge.source);
    if (sourceDeps) sourceDeps.add(edge.source);
    if (targetDeps) targetDeps.add(edge.target);
  });

  // Kahn's algorithm but collect nodes at each BFS level
  const waves: Node[][] = [];
  const queue: Node[] = [];
  const inDegree = new Map<string, number>();

  // Initialize in-degree counts
  nodes.forEach((node) => {
    const deps = dependencies.get(node.id);
    const degree = deps ? deps.size : 0;
    inDegree.set(node.id, degree);
    if (degree === 0) {
      queue.push(node);
    }
  });

  // Process nodes level by level
  while (queue.length > 0) {
    // Process all nodes at current level (wave)
    const currentWave: Node[] = [];
    const waveSize = queue.length;

    for (let i = 0; i < waveSize; i++) {
      const node = queue.shift()!;
      currentWave.push(node);

      // Decrement in-degree of dependents
      const deps = dependents.get(node.id);
      if (deps) {
        deps.forEach((dependentId) => {
          const currentDegree = inDegree.get(dependentId) ?? 0;
          const newDegree = currentDegree - 1;
          inDegree.set(dependentId, newDegree);
          if (newDegree === 0) {
            const dependentNode = nodeMap.get(dependentId);
            if (dependentNode) queue.push(dependentNode);
          }
        });
      }
    }

    if (currentWave.length > 0) {
      waves.push(currentWave);
    }
  }

  // Add nodes with no connections (they weren't in the graph)
  const processedIds = new Set(waves.flat().map((n) => n.id));
  const orphanNodes = nodes.filter((node) => !processedIds.has(node.id));
  if (orphanNodes.length > 0) {
    waves.push(orphanNodes);
  }

  return waves;
}

/**
 * Check if a node has all required inputs available
 */
function hasRequiredInputs(
  node: Node,
  edges: Edge[],
  nodeOutputs: Record<string, NodeOutput>
): boolean {
  const incomingEdges = edges.filter((e) => e.target === node.id);
  if (incomingEdges.length === 0) {
    // Input nodes don't need inputs
    const nodeType = (node.data as NodeDataUnion).nodeType;
    return ['textPrompt', 'imageUpload', 'number', 'styleReference', 'seedControl', 'batchGen'].includes(
      nodeType
    );
  }

  // Check all dependencies have outputs
  return incomingEdges.every((edge) => nodeOutputs[edge.source] !== undefined);
}

/**
 * Execute a single node based on its type
 */
async function executeNode(
  node: Node,
  store: WorkflowStore,
  edges: Edge[],
  ctx: ExecutionContext
): Promise<void> {
  if (ctx.getCancelled()) {
    throw new Error('Execution cancelled');
  }

  const nodeData = node.data as NodeDataUnion;
  const nodeType = nodeData.nodeType;
  const { getInputsForNode, setNodeOutput, nodeOutputs } = store;

  // Get inputs
  const inputs = getInputsForNode(node.id);

  // Get handler from registry
  const handlerLoader = handlers[nodeType];
  if (!handlerLoader) {
    throw new Error(`Unknown node type: ${nodeType}`);
  }

  const handler = await handlerLoader();
  if (!handler) {
    throw new Error(`Failed to load handler for: ${nodeType}`);
  }

  // Create handler context
  const handlerContext: NodeHandlerContext = {
    node,
    nodeData,
    inputs,
    nodeOutputs,
    edges,
    setNodeOutput,
    setBatchProgress: store.setBatchProgress,
    ctx,
  };

  // Determine timeout and label
  const timeoutMs = NODE_TIMEOUTS[nodeType] || DEFAULT_TIMEOUT;
  const label = getNodeDefinition(nodeType)?.label || nodeType;

  // Execute handler with timeout
  await withTimeout(handler(handlerContext), timeoutMs, label);
}

/**
 * Execute entire workflow with parallel branch execution
 */
export async function executeWorkflow(
  nodes: Node[],
  edges: Edge[],
  store: WorkflowStore,
  ctx: ExecutionContext = { getCancelled: () => false }
): Promise<ExecutionResult> {
  const startedAt = Date.now();
  const errors: Array<{ nodeId: string; error: string }> = [];
  const { setNodeStatus, setNodeError, addExecutionRecord } = store;

  // Pre-execution validation
  const validationResult = validateWorkflow(nodes, edges);
  
  // Clear previous validation errors
  nodes.forEach((node) => {
    setNodeError(node.id, null);
  });

  // Set validation errors on nodes
  for (const error of validationResult.errors) {
    if (error.nodeId) {
      setNodeError(error.nodeId, error.message);
    }
  }

  // Log warnings but don't block execution
  if (validationResult.warnings.length > 0) {
    logger.warn('Workflow validation warnings:', validationResult.warnings);
  }

  // If there are blocking errors, abort execution
  if (!validationResult.valid) {
    return {
      success: false,
      errors: validationResult.errors.map((e) => ({
        nodeId: e.nodeId,
        error: e.message,
      })),
      executed: 0,
      total: nodes.length,
    };
  }

  // Get execution waves (nodes grouped by dependency depth)
  const waves = getExecutionWaves(nodes, edges);

  // Filter to only executable nodes (skip output-only nodes for now)
  const executableWaves = waves.map((wave) =>
    wave.filter((node) => {
      const nodeType = (node.data as NodeDataUnion).nodeType;
      return !['preview', 'save', 'exportGLB', 'exportSheet'].includes(nodeType);
    })
  ).filter((wave) => wave.length > 0);

  // Calculate total for progress tracking
  const total = executableWaves.reduce((sum, wave) => sum + wave.length, 0);
  let executed = 0;

  // Helper function to execute a single node with error handling
  const executeNodeWithTracking = async (node: Node): Promise<void> => {
    if (ctx.getCancelled()) {
      throw new Error('Execution cancelled');
    }

    // Read nodeOutputs fresh from store (important for parallel execution)
    const currentOutputs = useWorkflowStore.getState().nodeOutputs;

    // Check if node has required inputs
    if (!hasRequiredInputs(node, edges, currentOutputs)) {
      const nodeType = (node.data as NodeDataUnion).nodeType;
      // Input nodes don't need inputs, so skip them if they're not ready
      if (!['textPrompt', 'imageUpload', 'number', 'styleReference', 'seedControl', 'batchGen'].includes(nodeType)) {
        throw new Error('Missing required inputs');
      }
    }

    setNodeError(node.id, null);
    setNodeStatus(node.id, 'running');
    await executeNode(node, store, edges, ctx);
    setNodeStatus(node.id, 'success');
  };

  // Execute waves sequentially, but nodes within each wave in parallel
  for (const wave of executableWaves) {
    if (ctx.getCancelled()) {
      break;
    }

    // Update progress before wave
    ctx.onProgress?.(executed, total);

    // Execute all nodes in this wave in parallel
    const results = await Promise.allSettled(
      wave.map((node) => executeNodeWithTracking(node))
    );

    // Process results and update progress
    results.forEach((result, index) => {
      const node = wave[index];
      executed++;

      if (result.status === 'rejected') {
        const errorMessage = result.reason instanceof Error ? result.reason.message : 'Unknown error';
        // Skip cancellation errors (they're handled by the outer loop)
        if (errorMessage !== 'Execution cancelled') {
          errors.push({
            nodeId: node.id,
            error: errorMessage,
          });
          setNodeError(node.id, errorMessage);
          setNodeStatus(node.id, 'error');
        }
      }

      // Update progress after each node completes
      ctx.onProgress?.(executed, total);
    });
  }

  const completedAt = Date.now();
  const duration = completedAt - startedAt;
  const failedNodes = errors.length;
  const wasCancelled = ctx.getCancelled();

  // Determine status
  let status: 'success' | 'partial' | 'failed' | 'cancelled';
  if (wasCancelled) {
    status = 'cancelled';
  } else if (failedNodes === 0) {
    status = 'success';
  } else if (executed > failedNodes) {
    status = 'partial';
  } else {
    status = 'failed';
  }

  // Build execution record with node labels
  const record: ExecutionRecord = {
    id: crypto.randomUUID(),
    startedAt,
    completedAt,
    duration,
    totalNodes: total,
    executedNodes: executed,
    failedNodes,
    errors: errors.map(({ nodeId, error }) => {
      const node = nodes.find((n) => n.id === nodeId);
      const nodeType = node?.type as NodeTypeName | undefined;
      const nodeLabel =
        (node?.data as { label?: string })?.label ||
        getNodeDefinition(nodeType || ('unknown' as NodeTypeName))?.label ||
        nodeType ||
        'Unknown';
      return { nodeId, nodeLabel, error };
    }),
    status,
  };

  // Save to history
  addExecutionRecord(record);

  return {
    success: errors.length === 0,
    errors,
    executed,
    total,
  };
}

/**
 * Execute a single node manually
 */
export async function executeSingleNode(
  node: Node,
  _allNodes: Node[],
  edges: Edge[],
  store: WorkflowStore
): Promise<{ success: boolean; error?: string }> {
  const { setNodeStatus, setNodeError } = store;
  const ctx: ExecutionContext = { getCancelled: () => false };

  try {
    // Check if node has required inputs
    const currentOutputs = store.nodeOutputs;
    if (!hasRequiredInputs(node, edges, currentOutputs)) {
      const nodeType = (node.data as NodeDataUnion).nodeType;
      if (!['textPrompt', 'imageUpload', 'number', 'styleReference', 'seedControl', 'batchGen'].includes(nodeType)) {
        throw new Error('Missing required inputs. Connect and run upstream nodes first.');
      }
    }

    setNodeError(node.id, null);
    setNodeStatus(node.id, 'running');
    
    await executeNode(node, store, edges, ctx);
    
    setNodeStatus(node.id, 'success');
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    setNodeError(node.id, errorMessage);
    setNodeStatus(node.id, 'error');
    return { success: false, error: errorMessage };
  }
}
