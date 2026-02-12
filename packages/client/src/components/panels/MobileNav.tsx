import { LayoutGrid, Zap, Clock, Menu } from 'lucide-react';

export type MobilePanel = 'none' | 'palette' | 'generate' | 'history' | 'menu';

interface MobileNavProps {
  activePanel: MobilePanel;
  onToggle: (panel: MobilePanel) => void;
}

export function MobileNav({ activePanel, onToggle }: MobileNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-center justify-around border-t border-[var(--border-color)] bg-[var(--bg-secondary)] py-2 safe-area-pb">
      <button
        onClick={() => onToggle(activePanel === 'palette' ? 'none' : 'palette')}
        className={`flex flex-col items-center gap-1 rounded-lg px-4 py-1.5 transition-colors ${
          activePanel === 'palette'
            ? 'bg-[var(--accent)] text-white'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
        }`}
        title="Node Palette"
      >
        <LayoutGrid className="h-5 w-5" />
        <span className="text-[10px] font-medium">Palette</span>
      </button>

      <button
        onClick={() => onToggle(activePanel === 'generate' ? 'none' : 'generate')}
        className={`flex flex-col items-center gap-1 rounded-lg px-4 py-1.5 transition-colors ${
          activePanel === 'generate'
            ? 'bg-[var(--accent)] text-white'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
        }`}
        title="Quick Generate"
      >
        <Zap className="h-5 w-5" />
        <span className="text-[10px] font-medium">Generate</span>
      </button>

      <button
        onClick={() => onToggle(activePanel === 'history' ? 'none' : 'history')}
        className={`flex flex-col items-center gap-1 rounded-lg px-4 py-1.5 transition-colors ${
          activePanel === 'history'
            ? 'bg-[var(--accent)] text-white'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
        }`}
        title="Execution History"
      >
        <Clock className="h-5 w-5" />
        <span className="text-[10px] font-medium">History</span>
      </button>

      <button
        onClick={() => onToggle(activePanel === 'menu' ? 'none' : 'menu')}
        className={`flex flex-col items-center gap-1 rounded-lg px-4 py-1.5 transition-colors ${
          activePanel === 'menu'
            ? 'bg-[var(--accent)] text-white'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
        }`}
        title="Menu"
      >
        <Menu className="h-5 w-5" />
        <span className="text-[10px] font-medium">Menu</span>
      </button>
    </div>
  );
}
