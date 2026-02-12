import { Undo2, Redo2 } from 'lucide-react';
import { useWorkflowStore } from '../../../stores/workflow';

export function EditActions() {
  const { undo, redo, canUndo, canRedo } = useWorkflowStore();

  return (
    <>
      <button
        onClick={undo}
        disabled={!canUndo()}
        className="flex items-center gap-1.5 rounded p-1.5 lg:p-1.5 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:px-2 lg:py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
        title="Undo"
      >
        <Undo2 className="h-5 w-5 md:h-4 md:w-4" />
        <span className="hidden sm:inline">Undo</span>
      </button>

      <button
        onClick={redo}
        disabled={!canRedo()}
        className="flex items-center gap-1.5 rounded p-1.5 lg:p-1.5 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:px-2 lg:py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
        title="Redo"
      >
        <Redo2 className="h-5 w-5 md:h-4 md:w-4" />
        <span className="hidden sm:inline">Redo</span>
      </button>
    </>
  );
}
