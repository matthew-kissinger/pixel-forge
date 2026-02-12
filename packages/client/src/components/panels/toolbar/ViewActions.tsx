import { useCallback } from 'react';
import { Maximize2, LayoutGrid, Eye, EyeOff, Sun, Moon, Monitor } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useWorkflowStore } from '../../../stores/workflow';
import { toast } from '../../ui/Toast';
import { autoLayoutNodes } from '../../../lib/autoLayout';

interface ViewActionsProps {
  onToggleMiniMap?: () => void;
  isMiniMapVisible?: boolean;
}

export function ViewActions({ onToggleMiniMap, isMiniMapVisible }: ViewActionsProps) {
  const { nodes, edges, setNodes, theme, setTheme } = useWorkflowStore();
  const reactFlow = useReactFlow();

  const handleFitView = useCallback(() => {
    reactFlow.fitView({ padding: 0.2 });
  }, [reactFlow]);

  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0) {
      toast.info('No nodes to layout');
      return;
    }

    const layoutNodes = autoLayoutNodes(nodes, edges);
    setNodes(layoutNodes);

    requestAnimationFrame(() => {
      reactFlow.fitView({ padding: 0.2, duration: 300 });
    });
  }, [nodes, edges, reactFlow, setNodes]);

  const handleThemeToggle = useCallback(() => {
    const nextTheme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    setTheme(nextTheme);
  }, [theme, setTheme]);

  const themeIcon = theme === 'system' ? Monitor : theme === 'light' ? Sun : Moon;
  const ThemeIcon = themeIcon;

  return (
    <>
      <button
        onClick={handleFitView}
        className="flex items-center gap-1.5 rounded p-1.5 lg:p-1.5 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:px-2 lg:py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] touch-manipulation"
        title="Fit view"
      >
        <Maximize2 className="h-5 w-5 md:h-4 md:w-4" />
        <span className="hidden sm:inline">Fit View</span>
      </button>

      <button
        onClick={handleAutoLayout}
        className="flex items-center gap-1.5 rounded p-1.5 lg:p-1.5 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:px-2 lg:py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] touch-manipulation"
        title="Auto layout"
      >
        <LayoutGrid className="h-5 w-5 md:h-4 md:w-4" />
        <span className="hidden sm:inline">Auto Layout</span>
      </button>

      <button
        onClick={handleThemeToggle}
        className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        title={`Theme: ${theme}`}
      >
        <ThemeIcon className="h-4 w-4" />
        <span className="hidden sm:inline capitalize">{theme}</span>
      </button>

      {onToggleMiniMap && (
        <button
          onClick={onToggleMiniMap}
          className={`flex items-center gap-1.5 rounded p-1.5 lg:p-1.5 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:px-2 lg:py-1.5 text-sm transition-colors touch-manipulation ${
            isMiniMapVisible
              ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
          }`}
          title={isMiniMapVisible ? 'Hide minimap' : 'Show minimap'}
        >
          {isMiniMapVisible ? (
            <Eye className="h-5 w-5 md:h-4 md:w-4" />
          ) : (
            <EyeOff className="h-5 w-5 md:h-4 md:w-4" />
          )}
          <span className="hidden sm:inline">MiniMap</span>
        </button>
      )}
    </>
  );
}
