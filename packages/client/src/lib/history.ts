/**
 * Operation-based undo/redo records (Round 4 / C2).
 *
 * Pattern adapted from chili3d's IHistoryRecord (AGPL — patterns only,
 * implementation original): each record stores enough state to drive its
 * own apply / revert step. Compared to the legacy snapshot-stack approach
 * (every change deep-clones the entire workflow), records:
 *
 * - cost O(change) memory instead of O(workflow), and
 * - keep the surface explicit — looking at a record tells you what changed.
 *
 * Edge mutations and bulk imports still go through `SnapshotRecord` for
 * now; that's a deliberate scope cut. Parameter-change recording is
 * defined here but not auto-wired into `updateNodeData` (the editor calls
 * that method per keystroke, which would flood the stack — coalescing is
 * a follow-up).
 */

import type { Node, Edge } from '@xyflow/react';

import type { NodeData } from '../stores/workflow';

export interface WorkflowSnapshot {
  nodes: Node<NodeData>[];
  edges: Edge[];
}

export interface AddNodeRecord {
  kind: 'addNode';
  node: Node<NodeData>;
}

export interface DeleteNodeRecord {
  kind: 'deleteNode';
  /** Nodes that were removed. Restore order = original array order. */
  nodes: Node<NodeData>[];
  /** Edges that were attached to any of the removed nodes. */
  edges: Edge[];
}

export interface ParameterChangeRecord {
  kind: 'paramChange';
  nodeId: string;
  before: Partial<NodeData>;
  after: Partial<NodeData>;
}

/**
 * Catch-all for mutations we haven't yet broken into typed records — edge
 * connect/remove, full-graph reset, workflow import. Stores both before
 * and after snapshots so undo/redo is symmetric.
 */
export interface SnapshotRecord {
  kind: 'snapshot';
  before: WorkflowSnapshot;
  after: WorkflowSnapshot;
}

export type HistoryRecord =
  | AddNodeRecord
  | DeleteNodeRecord
  | ParameterChangeRecord
  | SnapshotRecord;

/**
 * Deep-clone a workflow snapshot so the record is immune to subsequent
 * mutations of the live store state.
 */
export function cloneSnapshot(snapshot: WorkflowSnapshot): WorkflowSnapshot {
  return {
    nodes: snapshot.nodes.map((n) => ({
      ...n,
      data: { ...n.data },
      position: { ...n.position },
    })),
    edges: snapshot.edges.map((e) => ({ ...e })),
  };
}

export function snapshotOf(
  nodes: Node<NodeData>[],
  edges: Edge[]
): WorkflowSnapshot {
  return cloneSnapshot({ nodes, edges });
}
