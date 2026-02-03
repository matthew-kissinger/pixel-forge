import { type ReactNode } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useWorkflowStore, type NodeStatus } from '../../stores/workflow';

interface BaseNodeProps<T extends { label: string }> extends NodeProps {
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

export function BaseNode<T extends { label: string }>({
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
  const error = useWorkflowStore((s) => s.nodeErrors[id]);

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
        {status === 'error' && (
          <AlertCircle className="h-4 w-4 text-[var(--error)]" />
        )}
      </div>

      {/* Error Message */}
      {status === 'error' && error && (
        <div 
          className="bg-[var(--error)] px-3 py-1 text-[10px] text-white"
          title={error}
        >
          <div className="line-clamp-2 leading-tight">
            {error}
          </div>
        </div>
      )}

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
