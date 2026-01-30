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
  NodeDataUnion,
  BaseNodeData,
  TextPromptNodeData as TextPromptData,
  ImageGenNodeData as ImageGenData,
  PreviewNodeData as PreviewData,
} from '../types/nodes';

// Re-export legacy aliases
export type { TextPromptData, ImageGenData, PreviewData };

export type NodeStatus = 'idle' | 'running' | 'success' | 'error';

export interface NodeOutput {
  type: 'text' | 'image' | 'model' | 'metadata';
  data: string; // text content, base64 image, model URL, or JSON metadata
  timestamp: number;
}

// Use BaseNodeData as the flexible node data type for the store
// This maintains backwards compatibility with existing code
export type NodeData = BaseNodeData;

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
    const { [nodeId]: _, ...rest } = get().nodeOutputs;
    set({ nodeOutputs: rest });
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
}));
