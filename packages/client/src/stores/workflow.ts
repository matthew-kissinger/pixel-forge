import { create } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';
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
import {
  type HistoryRecord,
  type WorkflowSnapshot,
  snapshotOf,
} from '../lib/history';

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

  // Undo/Redo state — operation-based records (Round 4 / C2). The legacy
  // shape was `WorkflowSnapshot[]` (deep clones of the whole graph per
  // step); each entry now describes the specific change that was made,
  // and snapshot-based fallback is captured by `SnapshotRecord` for
  // mutations we haven't broken into typed records yet (edge ops, full
  // resets, imports). Public API (undo/redo/canUndo/canRedo) is unchanged.
  undoStack: HistoryRecord[];
  redoStack: HistoryRecord[];

  // Demo mode
  demoMode: boolean;
  setDemoMode: (enabled: boolean) => void;

  // Theme
  theme: 'dark' | 'light' | 'system';
  setTheme: (theme: 'dark' | 'light' | 'system') => void;

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

  // Retry
  retryNode: (nodeId: string) => Promise<void>;

  // Persistence
  exportWorkflow: () => WorkflowData;
  importWorkflow: (data: WorkflowData) => void;
  lastAutoSave: number | null;
  setLastAutoSave: (timestamp: number | null) => void;
}

const initialNodes: Node<NodeData>[] = [];
const initialEdges: Edge[] = [];
const MAX_HISTORY_SIZE = 50;

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
  persist(
    subscribeWithSelector((set, get) => {
    // Push a typed history record onto the undo stack. Clears the redo
    // stack by default — pass `skipRedoClear` from the undo/redo paths
    // themselves so they can re-shuffle records without dropping their
    // counterpart.
    const pushRecord = (record: HistoryRecord, skipRedoClear = false) => {
    const state = get();
    const undoStack = [record, ...state.undoStack].slice(0, MAX_HISTORY_SIZE);
    set({
      undoStack,
      redoStack: skipRedoClear ? state.redoStack : [],
    });
  };

  /**
   * Snapshot wrapper: captures BEFORE state, runs `mutate`, captures AFTER,
   * pushes a SnapshotRecord. Used for mutations we haven't converted to
   * typed records yet — edge ops, reset, importWorkflow.
   */
  const recordSnapshot = (mutate: () => void) => {
    const before = snapshotOf(get().nodes, get().edges);
    mutate();
    const after = snapshotOf(get().nodes, get().edges);
    pushRecord({ kind: 'snapshot', before, after });
  };

  /**
   * Apply a HistoryRecord in either direction. Centralises the reversal
   * logic so undo() and redo() share one switch — every record subtype
   * is symmetric, but the per-kind behavior differs (snapshot restores
   * a frozen state; addNode toggles existence; etc.).
   */
  const applyRecord = (record: HistoryRecord, direction: 'undo' | 'redo') => {
    switch (record.kind) {
      case 'snapshot': {
        const target = direction === 'undo' ? record.before : record.after;
        const restored = restoreSnapshot(target);
        const restoredIds = new Set(restored.nodes.map((n) => n.id));
        const cur = get();
        const nodeStatus: Record<string, NodeStatus> = {};
        restored.nodes.forEach((n) => {
          nodeStatus[n.id] = cur.nodeStatus[n.id] || 'idle';
        });
        set({
          nodes: restored.nodes,
          edges: restored.edges,
          nodeStatus,
          nodeOutputs: Object.fromEntries(
            Object.entries(cur.nodeOutputs).filter(([id]) => restoredIds.has(id))
          ),
          nodeErrors: Object.fromEntries(
            Object.entries(cur.nodeErrors).filter(([id]) => restoredIds.has(id))
          ),
        });
        break;
      }
      case 'addNode': {
        if (direction === 'undo') {
          // Remove the added node + its adjacent edges + side state.
          const cur = get();
          const id = record.node.id;
          const nodeStatus = { ...cur.nodeStatus };
          delete nodeStatus[id];
          const nodeOutputs = { ...cur.nodeOutputs };
          delete nodeOutputs[id];
          const nodeErrors = { ...cur.nodeErrors };
          delete nodeErrors[id];
          const batchProgress = { ...cur.batchProgress };
          delete batchProgress[id];
          set({
            nodes: cur.nodes.filter((n) => n.id !== id),
            edges: cur.edges.filter((e) => e.source !== id && e.target !== id),
            nodeStatus,
            nodeOutputs,
            nodeErrors,
            batchProgress,
          });
        } else {
          const cur = get();
          set({
            nodes: [...cur.nodes, record.node],
            nodeStatus: { ...cur.nodeStatus, [record.node.id]: 'idle' },
          });
        }
        break;
      }
      case 'deleteNode': {
        if (direction === 'undo') {
          // Restore the deleted nodes + their adjacent edges. Drop any
          // ids that already exist in the current state to stay safe in
          // pathological cases (e.g. record stale after a reset).
          const cur = get();
          const haveIds = new Set(cur.nodes.map((n) => n.id));
          const newNodes = [
            ...cur.nodes,
            ...record.nodes.filter((n) => !haveIds.has(n.id)),
          ];
          const haveEdgeIds = new Set(cur.edges.map((e) => e.id));
          const newEdges = [
            ...cur.edges,
            ...record.edges.filter((e) => !haveEdgeIds.has(e.id)),
          ];
          const nodeStatus = { ...cur.nodeStatus };
          for (const n of record.nodes) {
            if (!nodeStatus[n.id]) nodeStatus[n.id] = 'idle';
          }
          set({ nodes: newNodes, edges: newEdges, nodeStatus });
        } else {
          // Re-delete: drop those node ids again.
          const cur = get();
          const dropIds = new Set(record.nodes.map((n) => n.id));
          const dropEdgeIds = new Set(record.edges.map((e) => e.id));
          const nodeStatus = { ...cur.nodeStatus };
          const nodeOutputs = { ...cur.nodeOutputs };
          const nodeErrors = { ...cur.nodeErrors };
          const batchProgress = { ...cur.batchProgress };
          for (const id of dropIds) {
            delete nodeStatus[id];
            delete nodeOutputs[id];
            delete nodeErrors[id];
            delete batchProgress[id];
          }
          set({
            nodes: cur.nodes.filter((n) => !dropIds.has(n.id)),
            edges: cur.edges.filter(
              (e) =>
                !dropEdgeIds.has(e.id) &&
                !dropIds.has(e.source) &&
                !dropIds.has(e.target)
            ),
            nodeStatus,
            nodeOutputs,
            nodeErrors,
            batchProgress,
          });
        }
        break;
      }
      case 'paramChange': {
        const target = direction === 'undo' ? record.before : record.after;
        const cur = get();
        set({
          nodes: cur.nodes.map((n) =>
            n.id === record.nodeId
              ? { ...n, data: { ...n.data, ...target } }
              : n
          ),
        });
        break;
      }
    }
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

    theme: 'system',
    setTheme: (theme) => set({ theme }),

    onNodesChange: (changes) => {
      const state = get();

      const removedIds = changes
        .filter((change) => change.type === 'remove')
        .map((change) => change.id);
      const hasRemove = removedIds.length > 0;

      // Capture removed nodes + their adjacent edges BEFORE applying so the
      // DeleteNodeRecord has enough state to undo.
      const removedNodes = hasRemove
        ? state.nodes.filter((n) => removedIds.includes(n.id))
        : [];
      const removedEdges = hasRemove
        ? state.edges.filter(
            (e) => removedIds.includes(e.source) || removedIds.includes(e.target)
          )
        : [];

      // Apply changes
      const newNodes = applyNodeChanges(changes, state.nodes);
      set({ nodes: newNodes });

      if (hasRemove) {
        // React Flow emits separate edge-remove changes for adjacent edges,
        // so we don't drop them here — onEdgesChange will get its own
        // SnapshotRecord. We DO capture them in this DeleteNodeRecord so
        // an undo can also resurrect the edges in lockstep with the node.
        const currentState = get();
        const nodeOutputs = { ...currentState.nodeOutputs };
        const nodeStatus = { ...currentState.nodeStatus };
        const nodeErrors = { ...currentState.nodeErrors };
        const batchProgress = { ...currentState.batchProgress };

        removedIds.forEach((id) => {
          delete nodeOutputs[id];
          delete nodeStatus[id];
          delete nodeErrors[id];
          delete batchProgress[id];
        });

        set({ nodeOutputs, nodeStatus, nodeErrors, batchProgress });

        pushRecord({
          kind: 'deleteNode',
          nodes: removedNodes,
          edges: removedEdges,
        });
      }
    },

    onEdgesChange: (changes) => {
      const state = get();

      const hasStructuralChange = changes.some((change) => change.type === 'remove');

      if (hasStructuralChange) {
        recordSnapshot(() => {
          set({ edges: applyEdgeChanges(changes, state.edges) });
        });
      } else {
        set({ edges: applyEdgeChanges(changes, state.edges) });
      }
    },

    onConnect: (connection) => {
      recordSnapshot(() => {
        const state = get();
        set({ edges: addEdge(connection, state.edges) });
      });
    },

    addNode: (node) => {
      const state = get();
      set({
        nodes: [...state.nodes, node],
        nodeStatus: { ...state.nodeStatus, [node.id]: 'idle' },
      });
      pushRecord({ kind: 'addNode', node });
    },

    setNodes: (nodes) => {
      recordSnapshot(() => {
        set({ nodes });
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
    recordSnapshot(() => {
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

    recordSnapshot(() => {
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
    });
  },

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return;

    const record = state.undoStack[0]!;
    const undoStack = state.undoStack.slice(1);
    const redoStack = [record, ...state.redoStack].slice(0, MAX_HISTORY_SIZE);

    applyRecord(record, 'undo');
    set({ undoStack, redoStack });
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return;

    const record = state.redoStack[0]!;
    const redoStack = state.redoStack.slice(1);
    const undoStack = [record, ...state.undoStack].slice(0, MAX_HISTORY_SIZE);

    applyRecord(record, 'redo');
    set({ undoStack, redoStack });
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

  retryNode: async (nodeId) => {
    const state = get();
    const node = state.nodes.find((n) => n.id === nodeId);
    
    if (!node) {
      console.error(`Node ${nodeId} not found`);
      return;
    }

    // Check if upstream outputs are available
    const currentOutputs = state.nodeOutputs;
    const incomingEdges = state.edges.filter((e) => e.target === nodeId);
    const missingInputs = incomingEdges.filter((e) => !currentOutputs[e.source]);
    
    if (missingInputs.length > 0) {
      set({
        nodeErrors: {
          ...state.nodeErrors,
          [nodeId]: 'Upstream node outputs are no longer available. Re-run the pipeline.',
        },
      });
      return;
    }

    // Clear error state and set to idle
    const nodeErrors = { ...state.nodeErrors };
    delete nodeErrors[nodeId];
    
    set({
      nodeStatus: { ...state.nodeStatus, [nodeId]: 'idle' },
      nodeErrors,
    });

    // Execute the node
    const { executeSingleNode } = await import('../lib/executor');
    await executeSingleNode(node, state.nodes, state.edges, state);
  },
  };
  }),
  {
    name: 'pixelforge-theme',
    partialize: (state) => ({ theme: state.theme }),
  }
  )
);
