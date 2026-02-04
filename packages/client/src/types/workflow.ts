export interface WorkflowData {
  version: number;
  nodes: {
    id: string;
    type?: string;
    position: { x: number; y: number };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Using any for data to avoid circular dependency with store
    data: any;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }[];
}
