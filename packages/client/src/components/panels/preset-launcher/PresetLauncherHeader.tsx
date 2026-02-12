/**
 * Header for PresetLauncher - title, collapse, and close buttons
 */
import { Rocket, ChevronRight, X } from 'lucide-react';

interface PresetLauncherHeaderProps {
  onCollapse: () => void;
  onClose: () => void;
}

export function PresetLauncherHeader({
  onCollapse,
  onClose,
}: PresetLauncherHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border-color)] px-3 py-2">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Rocket className="h-4 w-4 text-[var(--accent)]" />
          Preset Launcher
        </h3>
        <p className="text-xs text-[var(--text-secondary)]">
          Quick-start workflows
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onCollapse}
          className="rounded p-1 hover:bg-[var(--bg-tertiary)]"
          title="Collapse panel"
        >
          <ChevronRight className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>
        <button
          onClick={onClose}
          className="rounded p-1 hover:bg-[var(--bg-tertiary)]"
          title="Close panel"
        >
          <X className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>
      </div>
    </div>
  );
}
