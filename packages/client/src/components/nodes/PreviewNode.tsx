import { type NodeProps, useEdges } from '@xyflow/react';
import { Eye, Link, Loader2 } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore, type PreviewData } from '../../stores/workflow';

export function PreviewNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as PreviewData;
  const { getInputsForNode, nodeStatus } = useWorkflowStore();
  const edges = useEdges();
  const inputs = getInputsForNode(id);
  const latestInput = inputs[inputs.length - 1];

  // Check if this node has any incoming edges
  const hasConnection = edges.some((e) => e.target === id);
  // Check if any connected source node is running
  const connectedSources = edges.filter((e) => e.target === id).map((e) => e.source);
  const isSourceRunning = connectedSources.some((sourceId) => nodeStatus[sourceId] === 'running');

  const renderContent = () => {
    // No connection at all
    if (!hasConnection) {
      return (
        <div className="flex h-32 flex-col items-center justify-center gap-2 rounded border border-dashed border-[var(--border-color)] text-sm text-[var(--text-secondary)]">
          <Link className="h-5 w-5 opacity-50" />
          <span>No input connected</span>
        </div>
      );
    }

    // Connected but waiting for data
    if (!latestInput) {
      return (
        <div className="flex h-32 flex-col items-center justify-center gap-2 rounded border border-dashed border-[var(--accent)] text-sm text-[var(--text-secondary)]">
          {isSourceRunning ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Eye className="h-5 w-5 opacity-50" />
              <span>Connected - waiting for data</span>
            </>
          )}
        </div>
      );
    }

    switch (latestInput.type) {
      case 'text':
        return (
          <div className="max-h-40 overflow-auto rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-2 text-sm text-[var(--text-primary)]">
            {latestInput.data || '(empty)'}
          </div>
        );

      case 'image':
        return (
          <div className="overflow-hidden rounded border border-[var(--border-color)]">
            <img
              src={latestInput.data}
              alt="Generated"
              className="h-auto max-h-64 w-full object-contain"
            />
          </div>
        );

      case 'model':
        return (
          <div className="flex flex-col gap-2 rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-2">
            <span className="text-sm text-[var(--text-secondary)]">3D Model</span>
            <a
              href={latestInput.data}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--accent)] hover:underline"
            >
              View/Download GLB
            </a>
          </div>
        );

      default:
        return (
          <div className="text-sm text-[var(--text-secondary)]">
            Unknown input type
          </div>
        );
    }
  };

  return (
    <BaseNode {...props} data={nodeData} hasInput inputLabel="Any">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <Eye className="h-4 w-4" />
          <span>Preview</span>
        </div>
        <div className="min-w-[180px]">{renderContent()}</div>
      </div>
    </BaseNode>
  );
}
