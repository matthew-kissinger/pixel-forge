import { type Node, type Edge } from '@xyflow/react';

export interface WorkflowData {
  version: number;
  nodes: {
    id: string;
    type?: string;
    position: { x: number; y: number };
    data: any; // Using any for data to avoid circular dependency with store, or we can use NodeData if we move it
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }[];
}
