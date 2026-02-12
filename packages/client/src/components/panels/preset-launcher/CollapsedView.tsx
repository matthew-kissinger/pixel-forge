/**
 * Collapsed view of PresetLauncher - shows only expand button and icon
 */
import { ChevronLeft, Rocket } from 'lucide-react';

interface CollapsedViewProps {
  onExpand: () => void;
}

export function CollapsedView({ onExpand }: CollapsedViewProps) {
  return (
    <div className="absolute right-4 top-20 z-10 flex flex-col overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-xl">
      <button
        onClick={onExpand}
        className="flex items-center justify-center p-2 hover:bg-[var(--bg-tertiary)]"
        title="Expand preset launcher"
      >
        <ChevronLeft className="h-5 w-5 text-[var(--text-secondary)]" />
      </button>
      <div className="border-t border-[var(--border-color)]">
        <div className="flex items-center justify-center p-2" title="Preset Launcher">
          <Rocket className="h-4 w-4 text-[var(--accent)]" />
        </div>
      </div>
    </div>
  );
}
