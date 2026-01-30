import { type ReactNode } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useWorkflowStore, type NodeStatus, type BaseNodeData } from '../../stores/workflow';

interface BaseNodeProps<T extends BaseNodeData> extends NodeProps {
  data: T;
  children: ReactNode;
  hasInput?: boolean;
  hasOutput?: boolean;
  inputLabel?: string;
  outputLabel?: string;
}

const statusColors: Record<NodeStatus, string> = {
  idle: 'border-[var(--border-color)]',
  running: 'border-[var(--accent)]',
  success: 'border-[var(--success)]',
  error: 'border-[var(--error)]',
};

export function BaseNode<T extends BaseNodeData>({
  id,
  data,
  children,
  selected,
  hasInput = false,
  hasOutput = false,
  inputLabel = 'Input',
  outputLabel = 'Output',
}: BaseNodeProps<T>) {
  const status = useWorkflowStore((s) => s.nodeStatus[id] ?? 'idle');

  return (
    <div
      className={cn(
        'min-w-[200px] rounded-lg border-2 bg-[var(--bg-secondary)] shadow-lg',
        statusColors[status],
        selected && 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-primary)]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] px-3 py-2">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {data.label}
        </span>
        {status === 'running' && (
          <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
        )}
      </div>

      {/* Content */}
      <div className="p-3">{children}</div>

      {/* Handles */}
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="!-left-[7px]"
          title={inputLabel}
        />
      )}
      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          className="!-right-[7px]"
          title={outputLabel}
        />
      )}
    </div>
  );
}
