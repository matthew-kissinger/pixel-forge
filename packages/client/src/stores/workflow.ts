import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
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
import type { WorkflowData } from '../types/workflow';

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

export interface ExecutionRecord {
  id: string;
  startedAt: number;
  completedAt: number;
  duration: number; // ms
  totalNodes: number;
  executedNodes: number;
  failedNodes: number;
  errors: Array<{ nodeId: string; nodeLabel: string; error: string }>;
  status: 'success' | 'partial' | 'failed' | 'cancelled';
}

// Use BaseNodeData as the flexible node data type for the store
// This maintains backwards compatibility with existing code
export type NodeData = BaseNodeData;

export const WORKFLOW_VERSION = 1;

type WorkflowSnapshot = { nodes: Node<NodeData>[]; edges: Edge[] };

export interface WorkflowState {
  nodes: Node<NodeData>[];
  edges: Edge[];
  nodeOutputs: Record<string, NodeOutput>;
  nodeStatus: Record<string, NodeStatus>;
  nodeErrors: Record<string, string>;
  batchProgress: Record<string, { current: number; total: number; label?: string }>;

  // Execution state
  isExecuting: boolean;
  executionProgress: { current: number; total: number };
  executionCancelled: boolean;
  executionHistory: ExecutionRecord[];

  // Undo/Redo state
  undoStack: WorkflowSnapshot[];
  redoStack: WorkflowSnapshot[];

  // Demo mode
  demoMode: boolean;
  setDemoMode: (enabled: boolean) => void;

  // React Flow callbacks
  onNodesChange: (changes: NodeChange<Node<NodeData>>[]) => void;
  onEdgesChange: (changes: EdgeChange<Edge>[]) => void;
  onConnect: (connection: Connection) => void;

  // Actions
  addNode: (node: Node<NodeData>) => void;
  setNodes: (nodes: Node<NodeData>[]) => void;
  updateNodeData: <T extends BaseNodeData>(nodeId: string, data: Partial<T>) => void;
  setNodeOutput: (nodeId: string, output: NodeOutput) => void;
  setNodeStatus: (nodeId: string, status: NodeStatus) => void;
  setNodeError: (nodeId: string, error: string | null) => void;
  setBatchProgress: (
    nodeId: string,
    progress: { current: number; total: number; label?: string } | null
  ) => void;
  clearNodeOutput: (nodeId: string) => void;
  getInputsForNode: (nodeId: string) => NodeOutput[];
  reset: () => void;

  // Execution actions
  setExecuting: (isExecuting: boolean) => void;
  setExecutionProgress: (current: number, total: number) => void;
  setExecutionCancelled: (cancelled: boolean) => void;
  addExecutionRecord: (record: ExecutionRecord) => void;
  clearExecutionHistory: () => void;

  // Undo/Redo actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Persistence
  exportWorkflow: () => WorkflowData;
  importWorkflow: (data: WorkflowData) => void;
  lastAutoSave: number | null;
  setLastAutoSave: (timestamp: number | null) => void;
}

const initialNodes: Node<NodeData>[] = [];
const initialEdges: Edge[] = [];
const MAX_HISTORY_SIZE = 50;

// Helper function to create a snapshot of current workflow state
const createSnapshot = (nodes: Node<NodeData>[], edges: Edge[]): WorkflowSnapshot => {
  // Deep clone nodes and edges to avoid reference issues
  return {
    nodes: nodes.map((n) => ({
      ...n,
      data: { ...n.data },
      position: { ...n.position },
    })),
    edges: edges.map((e) => ({ ...e })),
  };
};

// Helper function to restore state from snapshot
const restoreSnapshot = (snapshot: WorkflowSnapshot): { nodes: Node<NodeData>[]; edges: Edge[] } => {
  return {
    nodes: snapshot.nodes.map((n) => ({
      ...n,
      data: { ...n.data },
      position: { ...n.position },
    })),
    edges: snapshot.edges.map((e) => ({ ...e })),
  };
};

export const useWorkflowStore = create<WorkflowState>()(
  subscribeWithSelector((set, get) => {
    // Helper to push current state to undo stack
    const pushToHistory = (skipRedoClear = false) => {
    const state = get();
    const snapshot = createSnapshot(state.nodes, state.edges);
    const undoStack = [snapshot, ...state.undoStack].slice(0, MAX_HISTORY_SIZE);
    
    set({
      undoStack,
      // Clear redo stack when a new action is taken (not via undo/redo)
      redoStack: skipRedoClear ? state.redoStack : [],
    });
  };

  return {
    nodes: initialNodes,
    edges: initialEdges,
    nodeOutputs: {},
    nodeStatus: {},
    nodeErrors: {},
    batchProgress: {},
    isExecuting: false,
    executionProgress: { current: 0, total: 0 },
    executionCancelled: false,
    executionHistory: [],
    undoStack: [],
    redoStack: [],
    lastAutoSave: null,

    demoMode: typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('demo') === 'true' : false,
    setDemoMode: (enabled) => set({ demoMode: enabled }),

    onNodesChange: (changes) => {
      const state = get();
      
      // Check if this is a structural change (remove) that should be tracked
      const hasStructuralChange = changes.some(
        (change) => change.type === 'remove'
      );
      
      // Push to history BEFORE applying changes (save old state)
      if (hasStructuralChange) {
        pushToHistory();
      }
      
      // Apply changes
      const newNodes = applyNodeChanges(changes, state.nodes);
      set({ nodes: newNodes });
    },

    onEdgesChange: (changes) => {
      const state = get();
      
      // Check if this is a structural change (remove) that should be tracked
      const hasStructuralChange = changes.some(
        (change) => change.type === 'remove'
      );
      
      // Push to history BEFORE applying changes (save old state)
      if (hasStructuralChange) {
        pushToHistory();
      }
      
      // Apply changes
      const newEdges = applyEdgeChanges(changes, state.edges);
      set({ edges: newEdges });
    },

    onConnect: (connection) => {
      // Push to history BEFORE adding edge (save old state)
      pushToHistory();
      const state = get();
      const newEdges = addEdge(connection, state.edges);
      set({ edges: newEdges });
    },

    addNode: (node) => {
      // Push to history BEFORE adding node (save old state)
      pushToHistory();
      const state = get();
      set({
        nodes: [...state.nodes, node],
        nodeStatus: { ...state.nodeStatus, [node.id]: 'idle' },
      });
    },

    setNodes: (nodes) => {
      pushToHistory();
      set({ nodes });
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

  setNodeError: (nodeId, error) => {
    const nodeErrors = { ...get().nodeErrors };
    if (error === null) {
      delete nodeErrors[nodeId];
    } else {
      nodeErrors[nodeId] = error;
    }
    set({ nodeErrors });
  },

  setBatchProgress: (nodeId, progress) => {
    const batchProgress = { ...get().batchProgress };
    if (progress === null) {
      delete batchProgress[nodeId];
    } else {
      batchProgress[nodeId] = progress;
    }
    set({ batchProgress });
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
    // Save current state before resetting
    pushToHistory();
    set({
      nodes: initialNodes,
      edges: initialEdges,
      nodeOutputs: {},
      nodeStatus: {},
      nodeErrors: {},
      batchProgress: {},
      isExecuting: false,
      executionProgress: { current: 0, total: 0 },
      executionCancelled: false,
    });
  },

  setExecuting: (isExecuting) => {
    if (isExecuting) {
      const nodeStatus = { ...get().nodeStatus };
      Object.keys(nodeStatus).forEach((id) => {
        nodeStatus[id] = 'idle';
      });
      set({ isExecuting, nodeStatus, nodeErrors: {} });
    } else {
      set({ isExecuting });
    }
  },

  setExecutionProgress: (current, total) => {
    set({ executionProgress: { current, total } });
  },

  setExecutionCancelled: (cancelled) => {
    set({ executionCancelled: cancelled });
  },

  addExecutionRecord: (record) => {
    const history = get().executionHistory;
    const newHistory = [record, ...history].slice(0, 20); // Keep max 20 records
    set({ executionHistory: newHistory });
  },

  clearExecutionHistory: () => {
    set({ executionHistory: [] });
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

    // Save current state before importing
    pushToHistory();
    
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
      nodeErrors: {},
      batchProgress: {},
    });
  },

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return;

    // Save current state to redo stack
    const currentSnapshot = createSnapshot(state.nodes, state.edges);
    const redoStack = [currentSnapshot, ...state.redoStack].slice(0, MAX_HISTORY_SIZE);

    // Restore previous state from undo stack
    const previousSnapshot = state.undoStack[0];
    const restored = restoreSnapshot(previousSnapshot);
    const undoStack = state.undoStack.slice(1);

    // Update nodeStatus for nodes that exist in the restored state
    const restoredNodeIds = new Set(restored.nodes.map((n) => n.id));
    const nodeStatus: Record<string, NodeStatus> = {};
    restored.nodes.forEach((n) => {
      nodeStatus[n.id] = state.nodeStatus[n.id] || 'idle';
    });

    set({
      nodes: restored.nodes,
      edges: restored.edges,
      undoStack,
      redoStack,
      nodeStatus,
      // Clear outputs/errors for nodes that no longer exist
      nodeOutputs: Object.fromEntries(
        Object.entries(state.nodeOutputs).filter(([id]) => restoredNodeIds.has(id))
      ),
      nodeErrors: Object.fromEntries(
        Object.entries(state.nodeErrors).filter(([id]) => restoredNodeIds.has(id))
      ),
    });
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return;

    // Save current state to undo stack
    const currentSnapshot = createSnapshot(state.nodes, state.edges);
    const undoStack = [currentSnapshot, ...state.undoStack].slice(0, MAX_HISTORY_SIZE);

    // Restore next state from redo stack
    const nextSnapshot = state.redoStack[0];
    const restored = restoreSnapshot(nextSnapshot);
    const redoStack = state.redoStack.slice(1);

    // Update nodeStatus for nodes that exist in the restored state
    const restoredNodeIds = new Set(restored.nodes.map((n) => n.id));
    const nodeStatus: Record<string, NodeStatus> = {};
    restored.nodes.forEach((n) => {
      nodeStatus[n.id] = state.nodeStatus[n.id] || 'idle';
    });

    set({
      nodes: restored.nodes,
      edges: restored.edges,
      undoStack,
      redoStack,
      nodeStatus,
      // Clear outputs/errors for nodes that no longer exist
      nodeOutputs: Object.fromEntries(
        Object.entries(state.nodeOutputs).filter(([id]) => restoredNodeIds.has(id))
      ),
      nodeErrors: Object.fromEntries(
        Object.entries(state.nodeErrors).filter(([id]) => restoredNodeIds.has(id))
      ),
    });
  },

  canUndo: () => {
    return get().undoStack.length > 0;
  },

  canRedo: () => {
    return get().redoStack.length > 0;
  },

  setLastAutoSave: (timestamp) => {
    set({ lastAutoSave: timestamp });
  },
  };
  })
);
