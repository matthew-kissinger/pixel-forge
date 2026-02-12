import { useCallback } from 'react';
import { Trash2, FileJson, Clock, Rocket, Zap, HelpCircle } from 'lucide-react';
import { useWorkflowStore } from '../../../stores/workflow';
import { toast } from '../../ui/Toast';

interface AdditionalActionsProps {
  onToggleHistory?: () => void;
  isHistoryVisible?: boolean;
  onTogglePresetLauncher?: () => void;
  isPresetLauncherVisible?: boolean;
}

export function AdditionalActions({
  onToggleHistory,
  isHistoryVisible,
  onTogglePresetLauncher,
  isPresetLauncherVisible,
}: AdditionalActionsProps) {
  const { nodes, nodeOutputs, reset, demoMode, setDemoMode } = useWorkflowStore();

  const handleExportOutputs = useCallback(() => {
    const outputs = Object.entries(nodeOutputs);
    if (outputs.length === 0) {
      toast.info('No outputs to export');
      return;
    }

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

  return (
    <>
      <button
        onClick={handleExportOutputs}
        className="flex items-center gap-1.5 rounded p-1.5 lg:p-1.5 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:px-2 lg:py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] touch-manipulation"
        title="Export all outputs"
      >
        <FileJson className="h-5 w-5 md:h-4 md:w-4" />
        <span className="hidden sm:inline">Export</span>
      </button>

      <div className="mx-1 h-6 w-px bg-[var(--border-color)]" />

      {onTogglePresetLauncher && (
        <>
          <button
            onClick={onTogglePresetLauncher}
            className={`flex items-center gap-1.5 rounded p-1.5 lg:p-1.5 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:px-2 lg:py-1.5 text-sm transition-colors touch-manipulation ${
              isPresetLauncherVisible
                ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
            }`}
            title="Toggle preset launcher"
          >
            <Rocket className="h-5 w-5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Presets</span>
          </button>
          <div className="h-6 w-px bg-[var(--border-color)]" />
        </>
      )}

      <button
        onClick={() => setDemoMode(!demoMode)}
        className={`flex items-center gap-1.5 rounded p-1.5 lg:p-1.5 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:px-2 lg:py-1.5 text-sm transition-colors touch-manipulation ${
          demoMode
            ? 'bg-yellow-500 text-black font-bold hover:bg-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.5)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
        }`}
        title={demoMode ? 'Disable Demo Mode' : 'Enable Demo Mode (Offline)'}
      >
        <Zap className={`h-5 w-5 md:h-4 md:w-4 ${demoMode ? 'fill-black' : ''}`} />
        <span className="hidden sm:inline">{demoMode ? 'DEMO MODE' : 'Demo'}</span>
      </button>

      <div className="h-6 w-px bg-[var(--border-color)]" />

      {onToggleHistory && (
        <>
          <button
            onClick={onToggleHistory}
            className={`flex items-center gap-1.5 rounded p-1.5 lg:p-1.5 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:px-2 lg:py-1.5 text-sm transition-colors touch-manipulation ${
              isHistoryVisible
                ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
            }`}
            title="Toggle execution history"
          >
            <Clock className="h-5 w-5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">History</span>
          </button>
          <div className="h-6 w-px bg-[var(--border-color)]" />
        </>
      )}

      <div className="relative group">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded p-1.5 lg:p-1.5 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:px-2 lg:py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] touch-manipulation"
          title="Keyboard shortcuts"
        >
          <HelpCircle className="h-5 w-5 md:h-4 md:w-4" />
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

      <div className="h-6 w-px bg-[var(--border-color)]" />

      <button
        onClick={handleClear}
        className="flex items-center gap-1.5 rounded p-1.5 lg:p-1.5 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:px-2 lg:py-1.5 text-sm text-[var(--error)] transition-colors hover:bg-red-900/30 touch-manipulation"
        title="Clear canvas"
      >
        <Trash2 className="h-5 w-5 md:h-4 md:w-4" />
        <span className="hidden sm:inline">Clear</span>
      </button>
    </>
  );
}
