/**
 * Pre-execution workflow validation
 * 
 * Validates workflows before execution to catch errors early.
 * Checks for disconnected inputs, cycles, type compatibility, and structural issues.
 */

import type { Node, Edge } from '@xyflow/react';
import type { NodeDataUnion, NodeTypeName } from '../types/nodes';
import { getNodeIOSpec } from '../types/nodes';

export interface ValidationError {
  nodeId: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: { nodeId: string; message: string }[];
  warnings: { nodeId: string; message: string }[];
}

/**
 * Node types that don't require inputs (input nodes)
 */
const INPUT_NODE_TYPES: Set<NodeTypeName> = new Set([
  'textPrompt',
  'imageUpload',
  'number',
  'styleReference',
  'seedControl',
  'batchGen', // batchGen generates from its own subjects list
]);

/**
 * Node types that are output nodes
 */
const OUTPUT_NODE_TYPES: Set<NodeTypeName> = new Set([
  'preview',
  'save',
  'exportGLB',
  'exportSheet',
]);

/**
 * Node types that generate data (input or generation nodes)
 */
const GENERATOR_NODE_TYPES: Set<NodeTypeName> = new Set([
  'textPrompt',
  'imageUpload',
  'number',
  'styleReference',
  'seedControl',
  'imageGen',
  'isometricTile',
  'spriteSheet',
  'model3DGen',
  'kilnGen',
  'batchGen',
]);

/**
 * Check if a node has cycles in the dependency graph using DFS
 * We follow edges in the direction of data flow (source -> target)
 * to detect if we can reach a node we're currently processing (cycle)
 * Returns the cycle nodes if a cycle is found, null otherwise
 */
function findCycle(
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
  visited: Set<string>,
  recStack: Set<string>,
  cycleNodes: Set<string>
): boolean {
  visited.add(nodeId);
  recStack.add(nodeId);

  // Find all nodes this node connects to (outgoing edges - where data flows to)
  const outgoingEdges = edges.filter((e) => e.source === nodeId);
  for (const edge of outgoingEdges) {
    const targetId = edge.target;
    
    // If not visited, recurse
    if (!visited.has(targetId)) {
      if (findCycle(targetId, nodes, edges, visited, recStack, cycleNodes)) {
        // If a cycle was found downstream, this node is part of it
        cycleNodes.add(nodeId);
        return true;
      }
    } 
    // If in recursion stack, we found a cycle (we can reach a node we're currently processing)
    else if (recStack.has(targetId)) {
      // All nodes currently in recStack are part of the cycle
      recStack.forEach((id) => cycleNodes.add(id));
      cycleNodes.add(targetId);
      return true;
    }
  }

  recStack.delete(nodeId);
  return false;
}

/**
 * Detect cycles in the workflow graph
 */
function detectCycles(nodes: Node[], edges: Edge[]): string[] {
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const cycleNodes = new Set<string>();

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      findCycle(node.id, nodes, edges, visited, recStack, cycleNodes);
    }
  }

  return Array.from(cycleNodes);
}

/**
 * Check if a node has required inputs connected
 */
function hasRequiredInputsConnected(
  node: Node,
  edges: Edge[],
  nodeType: NodeTypeName
): { hasInputs: boolean; missingTypes: string[] } {
  // Input nodes don't need inputs
  if (INPUT_NODE_TYPES.has(nodeType)) {
    return { hasInputs: true, missingTypes: [] };
  }

  const ioSpec = getNodeIOSpec(nodeType);
  if (!ioSpec || ioSpec.inputs.length === 0) {
    return { hasInputs: true, missingTypes: [] };
  }

  // Get incoming edges
  const incomingEdges = edges.filter((e) => e.target === node.id);
  
  if (incomingEdges.length === 0) {
    return { hasInputs: false, missingTypes: ioSpec.inputs };
  }

  // For nodes that accept multiple inputs (like combine), check if at least one is connected
  if (ioSpec.multiInput) {
    return { hasInputs: incomingEdges.length > 0, missingTypes: [] };
  }

  // For single-input nodes, check if we have at least one connection
  return { hasInputs: incomingEdges.length > 0, missingTypes: [] };
}

/**
 * Check type compatibility between connected nodes
 */
function checkTypeCompatibility(
  sourceNode: Node,
  targetNode: Node,
  edges: Edge[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const sourceData = sourceNode.data as NodeDataUnion;
  const targetData = targetNode.data as NodeDataUnion;
  const sourceType = sourceData.nodeType;
  const targetType = targetData.nodeType;

  const sourceIO = getNodeIOSpec(sourceType);
  const targetIO = getNodeIOSpec(targetType);

  if (!sourceIO || !targetIO) {
    return errors;
  }

  // Find edges between these nodes
  const connectingEdges = edges.filter(
    (e) => e.source === sourceNode.id && e.target === targetNode.id
  );

  if (connectingEdges.length > 0) {
    // Check if source has output
    if (!sourceIO.output) {
      errors.push({
        nodeId: targetNode.id,
        message: `Node "${sourceNode.data.label}" has no output to connect`,
        severity: 'error',
      });
      return errors;
    }

    // Check if target accepts this input type
    if (!targetIO.inputs.includes(sourceIO.output)) {
      errors.push({
        nodeId: targetNode.id,
        message: `Type mismatch: "${sourceNode.data.label}" outputs ${sourceIO.output}, but "${targetNode.data.label}" expects ${targetIO.inputs.join(' or ')}`,
        severity: 'error',
      });
    }
  }

  return errors;
}

/**
 * Validate a workflow before execution
 * Returns a structured result with errors and warnings separated
 */
export function validateWorkflow(nodes: Node[], edges: Edge[]): WorkflowValidationResult {
  const validationErrors: ValidationError[] = [];

  // Edge case: empty workflow
  if (nodes.length === 0) {
    return {
      valid: false,
      errors: [],
      warnings: [{ nodeId: '', message: 'Workflow is empty' }],
    };
  }

  // 1. Check for cycles
  const cycleNodes = detectCycles(nodes, edges);
  if (cycleNodes.length > 0) {
    const cycleNodeIds = Array.from(new Set(cycleNodes));
    for (const nodeId of cycleNodeIds) {
      const node = nodes.find((n) => n.id === nodeId);
      validationErrors.push({
        nodeId,
        message: `Node is part of a cycle: "${node?.data.label || nodeId}"`,
        severity: 'error',
      });
    }
  }

  // 2. Check for disconnected required inputs
  for (const node of nodes) {
    const nodeData = node.data as NodeDataUnion;
    const nodeType = nodeData.nodeType;

    const { hasInputs, missingTypes } = hasRequiredInputsConnected(node, edges, nodeType);
    
    if (!hasInputs) {
      const missingTypesStr = missingTypes.length > 0 ? ` (${missingTypes.join(', ')})` : '';
      const nodeLabel = node.data.label || node.id;
      validationErrors.push({
        nodeId: node.id,
        message: `Node "${nodeLabel}" is missing required input${missingTypesStr}`,
        severity: 'error',
      });
    }
  }

  // 3. Check type compatibility
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  for (const edge of edges) {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    if (!sourceNode || !targetNode) {
      // Edge references non-existent node - this is a data integrity issue
      validationErrors.push({
        nodeId: edge.target || edge.source || '',
        message: `Edge references non-existent node`,
        severity: 'error',
      });
      continue;
    }

    const typeErrors = checkTypeCompatibility(sourceNode, targetNode, edges);
    validationErrors.push(...typeErrors);
  }

  // 4. Check for at least one output node
  const hasOutputNode = nodes.some((node) => {
    const nodeData = node.data as NodeDataUnion;
    return OUTPUT_NODE_TYPES.has(nodeData.nodeType);
  });

  if (!hasOutputNode) {
    validationErrors.push({
      nodeId: '',
      message: 'Workflow has no output nodes (preview, save, export, etc.)',
      severity: 'warning',
    });
  }

  // 5. Check for at least one generator node
  const hasGeneratorNode = nodes.some((node) => {
    const nodeData = node.data as NodeDataUnion;
    return GENERATOR_NODE_TYPES.has(nodeData.nodeType);
  });

  if (!hasGeneratorNode) {
    validationErrors.push({
      nodeId: '',
      message: 'Workflow has no input or generation nodes',
      severity: 'error',
    });
  }

  // 6. Check for disconnected nodes (nodes with no connections at all)
  const connectedNodeIds = new Set<string>();
  edges.forEach((edge) => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  const disconnectedNodes = nodes.filter((node) => {
    const nodeData = node.data as NodeDataUnion;
    const nodeType = nodeData.nodeType;
    // Input and output nodes can be disconnected (they're endpoints)
    return (
      !connectedNodeIds.has(node.id) &&
      !INPUT_NODE_TYPES.has(nodeType) &&
      !OUTPUT_NODE_TYPES.has(nodeType)
    );
  });

  for (const node of disconnectedNodes) {
    validationErrors.push({
      nodeId: node.id,
      message: `Node "${node.data.label}" is disconnected from the workflow`,
      severity: 'warning',
    });
  }

  // 7. Check for orphaned output nodes (output nodes with no input)
  for (const node of nodes) {
    const nodeData = node.data as NodeDataUnion;
    const nodeType = nodeData.nodeType;
    
    if (OUTPUT_NODE_TYPES.has(nodeType)) {
      const incomingEdges = edges.filter((e) => e.target === node.id);
      if (incomingEdges.length === 0) {
        validationErrors.push({
          nodeId: node.id,
          message: `Output node "${node.data.label}" has no connected input`,
          severity: 'warning',
        });
      }
    }
  }

  // Separate errors and warnings
  const errors = validationErrors
    .filter((e) => e.severity === 'error')
    .map((e) => ({ nodeId: e.nodeId, message: e.message }));
  const warnings = validationErrors
    .filter((e) => e.severity === 'warning')
    .map((e) => ({ nodeId: e.nodeId, message: e.message }));

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get validation errors for a specific node
 * Returns the old ValidationError[] format for backwards compatibility
 */
export function getNodeValidationErrors(
  nodeId: string,
  nodes: Node[],
  edges: Edge[]
): ValidationError[] {
  const result = validateWorkflow(nodes, edges);
  const allErrors: ValidationError[] = [
    ...result.errors.map((e) => ({ ...e, severity: 'error' as const })),
    ...result.warnings.map((e) => ({ ...e, severity: 'warning' as const })),
  ];
  return allErrors.filter((error) => error.nodeId === nodeId);
}

/**
 * Check if workflow has any blocking errors (errors that prevent execution)
 * Works with both old ValidationError[] and new WorkflowValidationResult
 */
export function hasBlockingErrors(
  errorsOrResult: ValidationError[] | WorkflowValidationResult
): boolean {
  if ('valid' in errorsOrResult) {
    // New format: WorkflowValidationResult
    return !errorsOrResult.valid;
  }
  // Old format: ValidationError[]
  return errorsOrResult.some((error) => error.severity === 'error');
}
