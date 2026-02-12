import { useState } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react';
import { useWorkflowStore, type ExecutionRecord } from '../../stores/workflow';

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function getStatusIcon(status: ExecutionRecord['status']) {
  switch (status) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'partial':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'cancelled':
      return <XCircle className="h-4 w-4 text-gray-500" />;
  }
}

interface ExecutionHistoryEntryProps {
  record: ExecutionRecord;
}

function ExecutionHistoryEntry({ record }: ExecutionHistoryEntryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-b border-[var(--border-color)] last:border-b-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-[var(--bg-tertiary)] transition-colors"
      >
        <div className="flex-shrink-0 mt-0.5">{getStatusIcon(record.status)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-1">
            <span>{formatRelativeTime(record.completedAt)}</span>
            <span>•</span>
            <span>{formatDuration(record.duration)}</span>
          </div>
          <div className="text-sm text-[var(--text-primary)]">
            {record.executedNodes}/{record.totalNodes} nodes executed
            {record.failedNodes > 0 && (
              <span className="text-[var(--error)] ml-1">
                ({record.failedNodes} failed)
              </span>
            )}
          </div>
        </div>
        {record.errors.length > 0 && (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 text-[var(--text-secondary)] flex-shrink-0 mt-0.5" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[var(--text-secondary)] flex-shrink-0 mt-0.5" />
          )
        )}
      </button>

      {isExpanded && record.errors.length > 0 && (
        <div className="px-3 pb-2 space-y-1">
          {record.errors.map((error, idx) => (
            <div
              key={idx}
              className="rounded bg-red-900/20 border border-red-900/40 px-2 py-1.5 text-xs"
            >
              <div className="font-medium text-red-400 mb-0.5">{error.nodeLabel}</div>
              <div className="text-red-300 break-words">{error.error}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ExecutionHistoryProps {
  isVisible: boolean;
  onToggle: () => void;
  isMobileOverlay?: boolean;
}

export function ExecutionHistory({ isVisible, onToggle, isMobileOverlay }: ExecutionHistoryProps) {
  const { executionHistory, clearExecutionHistory } = useWorkflowStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const focusTrapRef = useFocusTrap(isMobileOverlay ?? false);

  if (!isVisible) {
    return null;
  }

  // Collapsed view - just show icon (hidden on mobile overlay)
  if (isCollapsed && !isMobileOverlay) {
    return (
      <div className="absolute right-4 top-20 z-10 hidden md:flex flex-col overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-xl">
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center justify-center p-2 hover:bg-[var(--bg-tertiary)]"
          title="Expand history"
        >
          <ChevronLeft className="h-5 w-5 text-[var(--text-secondary)]" />
        </button>
        <div className="flex items-center justify-center border-t border-[var(--border-color)] p-2">
          <Clock className="h-4 w-4 text-[var(--text-secondary)]" />
        </div>
      </div>
    );
  }

  const containerClasses = isMobileOverlay
    ? 'fixed right-4 left-4 top-20 z-40 flex max-h-[80vh] w-auto flex-col overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-xl md:absolute md:right-4 md:left-auto md:top-20 md:w-[300px] md:max-h-[calc(100vh-120px)]'
    : 'absolute right-4 top-20 z-10 flex max-h-[calc(100vh-120px)] w-[300px] flex-col overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-xl';

  return (
    <>
      {isMobileOverlay && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onToggle}
          aria-hidden
        />
      )}
      <div
        ref={isMobileOverlay ? focusTrapRef : undefined}
        className={containerClasses}
        role={isMobileOverlay ? 'dialog' : undefined}
        aria-modal={isMobileOverlay ? 'true' : undefined}
        aria-labelledby={isMobileOverlay ? 'execution-history-title' : undefined}
      >
      <div className="flex items-center justify-between border-b border-[var(--border-color)] px-3 py-2">
        <div>
          <h3 id="execution-history-title" className="text-sm font-semibold text-[var(--text-primary)]">Execution History</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            {executionHistory.length} run{executionHistory.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {isMobileOverlay && (
            <button
              onClick={onToggle}
              className="rounded p-1 hover:bg-[var(--bg-tertiary)] md:hidden"
              title="Close"
            >
              <X className="h-4 w-4 text-[var(--text-secondary)]" />
            </button>
          )}
          {executionHistory.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Clear all execution history?')) {
                  clearExecutionHistory();
                }
              }}
              className="rounded p-1 hover:bg-[var(--bg-tertiary)]"
              title="Clear history"
            >
              <Trash2 className="h-4 w-4 text-[var(--text-secondary)]" />
            </button>
          )}
          {!isMobileOverlay && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="rounded p-1 hover:bg-[var(--bg-tertiary)]"
              title="Collapse history"
            >
              <ChevronRight className="h-4 w-4 text-[var(--text-secondary)]" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {executionHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <Clock className="h-8 w-8 text-[var(--text-secondary)] mb-2 opacity-50" />
            <p className="text-sm text-[var(--text-secondary)]">
              No execution history yet.
              <br />
              Run a workflow to see results here.
            </p>
          </div>
        ) : (
          executionHistory.map((record) => (
            <ExecutionHistoryEntry key={record.id} record={record} />
          ))
        )}
      </div>
    </div>
    </>
  );
}
