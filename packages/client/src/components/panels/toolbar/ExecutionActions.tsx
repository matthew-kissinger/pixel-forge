import { useCallback, useEffect } from 'react';
import { Play, Square, CheckCircle2 } from 'lucide-react';
import { useWorkflowStore } from '../../../stores/workflow';
import { toast } from '../../ui/Toast';
import { executeWorkflow } from '../../../lib/executor';
import { validateWorkflow } from '../../../lib/validate';
import { logger } from '@pixel-forge/shared/logger';

export function ExecutionActions() {
  const {
    nodes,
    edges,
    isExecuting,
    executionProgress,
    setExecuting,
    setExecutionProgress,
    setExecutionCancelled,
  } = useWorkflowStore();

  const handleValidate = useCallback(() => {
    if (nodes.length === 0) {
      toast.info('No nodes to validate');
      return;
    }

    const { setNodeError } = useWorkflowStore.getState();

    nodes.forEach((node) => {
      setNodeError(node.id, null);
    });

    const validationResult = validateWorkflow(nodes, edges);

    for (const error of validationResult.errors) {
      if (error.nodeId) {
        setNodeError(error.nodeId, error.message);
      }
    }

    if (!validationResult.valid) {
      toast.error(`Validation failed: ${validationResult.errors.length} error(s), ${validationResult.warnings.length} warning(s)`);
    } else if (validationResult.warnings.length > 0) {
      toast.info(`Validation passed with ${validationResult.warnings.length} warning(s)`);
    } else {
      toast.success('Validation passed - workflow is ready to execute');
    }
  }, [nodes, edges]);

  const handleExecuteAll = useCallback(async () => {
    if (nodes.length === 0) {
      toast.info('No nodes to execute');
      return;
    }

    if (isExecuting) {
      setExecutionCancelled(true);
      setExecuting(false);
      toast.info('Execution cancelled');
      return;
    }

    setExecutionCancelled(false);
    setExecuting(true);
    setExecutionProgress(0, nodes.length);

    try {
      const store = useWorkflowStore.getState();
      const result = await executeWorkflow(nodes, edges, store, {
        getCancelled: () => useWorkflowStore.getState().executionCancelled,
        onProgress: (current, total) => {
          setExecutionProgress(current, total);
        },
      });

      if (result.errors.length > 0) {
        toast.error(
          `Execution completed with ${result.errors.length} error(s). ${result.executed}/${result.total} nodes executed.`
        );
      } else {
        toast.success(`Execution completed successfully. ${result.executed}/${result.total} nodes executed.`);
      }
    } catch (error) {
      logger.error('Workflow execution failed:', error);
      toast.error(error instanceof Error ? error.message : 'Execution failed');
    } finally {
      setExecuting(false);
      setExecutionProgress(0, 0);
    }
  }, [
    nodes,
    edges,
    isExecuting,
    setExecuting,
    setExecutionProgress,
    setExecutionCancelled,
  ]);

  useEffect(() => {
    const handleExecuteShortcut = () => handleExecuteAll();
    window.addEventListener('workflow:execute', handleExecuteShortcut);
    return () => window.removeEventListener('workflow:execute', handleExecuteShortcut);
  }, [handleExecuteAll]);

  return (
    <>
      <button
        onClick={handleValidate}
        disabled={nodes.length === 0}
        className="flex items-center gap-1.5 rounded p-1.5 lg:p-1.5 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:px-2 lg:py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
        title="Validate workflow"
      >
        <CheckCircle2 className="h-5 w-5 md:h-4 md:w-4" />
        <span className="hidden sm:inline">Validate</span>
      </button>

      <button
        onClick={handleExecuteAll}
        disabled={nodes.length === 0}
        className={`flex items-center gap-1.5 rounded p-1.5 lg:p-1.5 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:px-2 lg:py-1.5 text-sm font-medium transition-colors touch-manipulation ${
          isExecuting
            ? 'bg-[var(--error)] text-white hover:bg-red-600'
            : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
        } disabled:cursor-not-allowed disabled:opacity-50`}
        title={isExecuting ? 'Stop execution' : 'Execute all nodes'}
      >
        {isExecuting ? (
          <>
            <Square className="h-5 w-5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Stop</span>
          </>
        ) : (
          <>
            <Play className="h-5 w-5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Execute</span>
          </>
        )}
      </button>

      {isExecuting && executionProgress.total > 0 && (
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span>
            {executionProgress.current}/{executionProgress.total}
          </span>
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-300"
              style={{
                width: `${(executionProgress.current / executionProgress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
