import { useCallback, useEffect, useRef } from 'react';
import {
  Save,
  FolderOpen,
  Trash2,
  FileJson,
  Play,
  Square,
  Clock,
  Undo2,
  Redo2,
  HelpCircle,
} from 'lucide-react';
import { useWorkflowStore } from '../../stores/workflow';
import { toast } from '../ui/Toast';
import { TemplateLoader } from './TemplateLoader';
import { QuickGenerate } from './QuickGenerate';
import { executeWorkflow } from '../../lib/executor';

interface ToolbarProps {
  onToggleHistory?: () => void;
  isHistoryVisible?: boolean;
}

export function Toolbar({ onToggleHistory, isHistoryVisible }: ToolbarProps) {
  const {
    nodes,
    edges,
    nodeOutputs,
    reset,
    exportWorkflow,
    importWorkflow,
    isExecuting,
    executionProgress,
    setExecuting,
    setExecutionProgress,
    setExecutionCancelled,
    undo,
    redo,
    canUndo,
    canRedo,
    lastAutoSave,
  } = useWorkflowStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formatter for "last saved" time
  const [lastSavedText, setLastSavedText] = useState<string>('');
  
  useEffect(() => {
    if (!lastAutoSave) {
      setLastSavedText('');
      return;
    }
    
    const update = () => {
      const seconds = Math.floor((Date.now() - lastAutoSave) / 1000);
      if (seconds < 10) return 'Just now';
      if (seconds < 60) return `${seconds}s ago`;
      const minutes = Math.floor(seconds / 60);
      return `${minutes}m ago`;
    };

    setLastSavedText(update());
    const interval = setInterval(() => setLastSavedText(update()), 10000);
    return () => clearInterval(interval);
  }, [lastAutoSave]);

  const handleSave = useCallback(() => {
    const workflow = exportWorkflow();

    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pixel-forge-workflow-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Workflow saved');
  }, [exportWorkflow]);

  const handleLoad = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const workflow = JSON.parse(event.target?.result as string);
          importWorkflow(workflow);
          toast.success('Workflow loaded');
        } catch (error) {
          console.error('Failed to load workflow:', error);
          toast.error(error instanceof Error ? error.message : 'Failed to load workflow file');
        }
      };
      reader.readAsText(file);

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [importWorkflow]
  );

  const handleClear = useCallback(() => {
    if (nodes.length === 0) {
      toast.info('Canvas is already empty');
      return;
    }

    if (window.confirm('Clear all nodes? This cannot be undone.')) {
      reset();
      toast.success('Canvas cleared');
    }
  }, [nodes.length, reset]);

  const handleExportOutputs = useCallback(() => {
    const outputs = Object.entries(nodeOutputs);
    if (outputs.length === 0) {
      toast.info('No outputs to export');
      return;
    }

    // For images, create a zip-like download of all
    outputs.forEach(([nodeId, output], i) => {
      if (output.type === 'image') {
        const link = document.createElement('a');
        link.href = output.data;
        link.download = `output-${nodeId}-${i}.png`;
        link.click();
      }
    });

    toast.success(`Exported ${outputs.length} output(s)`);
  }, [nodeOutputs]);

  const handleExecuteAll = useCallback(async () => {
    if (nodes.length === 0) {
      toast.info('No nodes to execute');
      return;
    }

    if (isExecuting) {
      // Stop execution
      setExecutionCancelled(true);
      setExecuting(false);
      toast.info('Execution cancelled');
      return;
    }

    // Reset cancellation flag
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
      console.error('Workflow execution failed:', error);
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
    const handleSaveShortcut = () => handleSave();
    const handleLoadShortcut = () => handleLoad();
    const handleExecuteShortcut = () => handleExecuteAll();

    window.addEventListener('workflow:save', handleSaveShortcut);
    window.addEventListener('workflow:load', handleLoadShortcut);
    window.addEventListener('workflow:execute', handleExecuteShortcut);

    return () => {
      window.removeEventListener('workflow:save', handleSaveShortcut);
      window.removeEventListener('workflow:load', handleLoadShortcut);
      window.removeEventListener('workflow:execute', handleExecuteShortcut);
    };
  }, [handleExecuteAll, handleLoad, handleSave]);

  return (
    <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1.5 shadow-lg">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Quick Generate */}
      <QuickGenerate />

      <div className="h-6 w-px bg-[var(--border-color)]" />

      {/* Template Loader */}
      <TemplateLoader />

      <div className="h-6 w-px bg-[var(--border-color)]" />

      {/* Undo/Redo Buttons */}
      <button
        onClick={undo}
        disabled={!canUndo()}
        className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
        title="Undo"
      >
        <Undo2 className="h-4 w-4" />
        <span className="hidden sm:inline">Undo</span>
      </button>

      <button
        onClick={redo}
        disabled={!canRedo()}
        className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
        title="Redo"
      >
        <Redo2 className="h-4 w-4" />
        <span className="hidden sm:inline">Redo</span>
      </button>

      <div className="h-6 w-px bg-[var(--border-color)]" />

      {/* Execute All Button */}
      <button
        onClick={handleExecuteAll}
        disabled={nodes.length === 0}
        className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-sm font-medium transition-colors ${
          isExecuting
            ? 'bg-[var(--error)] text-white hover:bg-red-600'
            : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
        } disabled:cursor-not-allowed disabled:opacity-50`}
        title={isExecuting ? 'Stop execution' : 'Execute all nodes'}
      >
        {isExecuting ? (
          <>
            <Square className="h-4 w-4" />
            <span className="hidden sm:inline">Stop</span>
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            <span className="hidden sm:inline">Execute</span>
          </>
        )}
      </button>

      {/* Progress indicator */}
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

      <div className="h-6 w-px bg-[var(--border-color)]" />

      {lastSavedText && (
        <span className="px-2 text-[10px] text-[var(--text-secondary)] opacity-70">
          Last saved: {lastSavedText}
        </span>
      )}

      <button
        onClick={handleSave}
        className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        title="Save workflow (JSON)"
      >
        <Save className="h-4 w-4" />
        <span className="hidden sm:inline">Save</span>
      </button>

      <button
        onClick={handleLoad}
        className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        title="Load workflow"
      >
        <FolderOpen className="h-4 w-4" />
        <span className="hidden sm:inline">Load</span>
      </button>

      <div className="relative group">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          title="Keyboard shortcuts"
        >
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Shortcuts</span>
        </button>
        <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-64 rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 text-xs text-[var(--text-secondary)] opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          <div className="mb-2 text-[var(--text-primary)]">Keyboard shortcuts</div>
          <div className="grid gap-1">
            <div>
              <span className="font-mono text-[var(--text-primary)]">Ctrl/Cmd + S</span> Save
            </div>
            <div>
              <span className="font-mono text-[var(--text-primary)]">Ctrl/Cmd + O</span> Load
            </div>
            <div>
              <span className="font-mono text-[var(--text-primary)]">Ctrl/Cmd + Z</span> Undo
            </div>
            <div>
              <span className="font-mono text-[var(--text-primary)]">Ctrl/Cmd + Shift + Z</span> Redo
            </div>
            <div>
              <span className="font-mono text-[var(--text-primary)]">Ctrl/Cmd + Enter</span>{' '}
              Execute
            </div>
            <div>
              <span className="font-mono text-[var(--text-primary)]">Ctrl/Cmd + A</span> Select
              all
            </div>
            <div>
              <span className="font-mono text-[var(--text-primary)]">Delete / Backspace</span>{' '}
              Delete selected
            </div>
            <div>
              <span className="font-mono text-[var(--text-primary)]">Esc</span> Cancel or
              deselect
            </div>
          </div>
        </div>
      </div>

      <div className="mx-1 h-6 w-px bg-[var(--border-color)]" />

      <button
        onClick={handleExportOutputs}
        className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        title="Export all outputs"
      >
        <FileJson className="h-4 w-4" />
        <span className="hidden sm:inline">Export</span>
      </button>

      <div className="mx-1 h-6 w-px bg-[var(--border-color)]" />

      {onToggleHistory && (
        <>
          <button
            onClick={onToggleHistory}
            className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-sm transition-colors ${
              isHistoryVisible
                ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
            }`}
            title="Toggle execution history"
          >
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </button>
          <div className="h-6 w-px bg-[var(--border-color)]" />
        </>
      )}

      <button
        onClick={handleClear}
        className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm text-[var(--error)] transition-colors hover:bg-red-900/30"
        title="Clear canvas"
      >
        <Trash2 className="h-4 w-4" />
        <span className="hidden sm:inline">Clear</span>
      </button>
    </div>
  );
}
