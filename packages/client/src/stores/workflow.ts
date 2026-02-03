import { create } from 'zustand';
import {
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';
import { WorkflowData } from '../types/workflow';

// Re-export types from the new type system for backwards compatibility
export type {
  NodeDataUnion,
  BaseNodeData,
  TextPromptNodeData,
  ImageGenNodeData,
  PreviewNodeData,
  NodeTypeName,
} from '../types/nodes';

// Import types we need
import type {
  BaseNodeData,
  TextPromptNodeData as TextPromptData,
  ImageGenNodeData as ImageGenData,
  PreviewNodeData as PreviewData,
} from '../types/nodes';

// Re-export legacy aliases
export type { TextPromptData, ImageGenData, PreviewData };
export type { WorkflowData };

export type NodeStatus = 'idle' | 'running' | 'success' | 'error';

export interface NodeOutput {
  type: 'text' | 'image' | 'model' | 'metadata';
  data: string; // text content, base64 image, model URL, or JSON metadata
  timestamp: number;
}

// Use BaseNodeData as the flexible node data type for the store
// This maintains backwards compatibility with existing code
export type NodeData = BaseNodeData;

export const WORKFLOW_VERSION = 1;

interface WorkflowState {
  nodes: Node<NodeData>[];
  edges: Edge[];
  nodeOutputs: Record<string, NodeOutput>;
  nodeStatus: Record<string, NodeStatus>;

  // React Flow callbacks
  onNodesChange: (changes: NodeChange<Node<NodeData>>[]) => void;
  onEdgesChange: (changes: EdgeChange<Edge>[]) => void;
  onConnect: (connection: Connection) => void;

  // Actions
  addNode: (node: Node<NodeData>) => void;
  updateNodeData: <T extends BaseNodeData>(nodeId: string, data: Partial<T>) => void;
  setNodeOutput: (nodeId: string, output: NodeOutput) => void;
  setNodeStatus: (nodeId: string, status: NodeStatus) => void;
  clearNodeOutput: (nodeId: string) => void;
  getInputsForNode: (nodeId: string) => NodeOutput[];
  reset: () => void;

  // Persistence
  exportWorkflow: () => WorkflowData;
  importWorkflow: (data: WorkflowData) => void;
}

const initialNodes: Node<NodeData>[] = [];
const initialEdges: Edge[] = [];

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  nodeOutputs: {},
  nodeStatus: {},

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },

  addNode: (node) => {
    set({
      nodes: [...get().nodes, node],
      nodeStatus: { ...get().nodeStatus, [node.id]: 'idle' },
    });
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
    });
  },

  setNodeOutput: (nodeId, output) => {
    set({
      nodeOutputs: { ...get().nodeOutputs, [nodeId]: output },
    });
  },

  setNodeStatus: (nodeId, status) => {
    set({
      nodeStatus: { ...get().nodeStatus, [nodeId]: status },
    });
  },

  clearNodeOutput: (nodeId) => {
    const nodeOutputs = { ...get().nodeOutputs };
    delete nodeOutputs[nodeId];
    set({ nodeOutputs });
  },

  getInputsForNode: (nodeId) => {
    const { edges, nodeOutputs } = get();
    const incomingEdges = edges.filter((e) => e.target === nodeId);
    return incomingEdges
      .map((e) => nodeOutputs[e.source])
      .filter((output): output is NodeOutput => output !== undefined);
  },

  reset: () => {
    set({
      nodes: initialNodes,
      edges: initialEdges,
      nodeOutputs: {},
      nodeStatus: {},
    });
  },

  exportWorkflow: () => {
    const { nodes, edges } = get();
    return {
      version: WORKFLOW_VERSION,
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      })),
    };
  },

  importWorkflow: (data) => {
    if (!data.version || !data.nodes || !data.edges) {
      throw new Error('Invalid workflow format');
    }

    if (data.version > WORKFLOW_VERSION) {
      throw new Error(`Workflow version ${data.version} is not supported (max ${WORKFLOW_VERSION})`);
    }

    // Reset current state
    set({
      nodes: data.nodes.map(n => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
      })),
      edges: data.edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || null,
        targetHandle: e.targetHandle || null,
      })),
      nodeOutputs: {},
      nodeStatus: data.nodes.reduce((acc, n) => ({ ...acc, [n.id]: 'idle' }), {}),
    });
  },
}));

