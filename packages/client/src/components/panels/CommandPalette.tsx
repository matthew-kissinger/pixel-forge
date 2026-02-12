import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  type KeyboardEvent,
} from 'react';
import {
  Undo2,
  Redo2,
  Save,
  FolderOpen,
  Play,
  CheckCircle2,
  Maximize2,
  LayoutGrid,
  Trash2,
  FileJson,
  Command,
} from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useWorkflowStore } from '../../stores/workflow';
import { toast } from '../ui/Toast';
import { validateWorkflow } from '../../lib/validate';
import { autoLayoutNodes } from '../../lib/autoLayout';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  /** Show keyboard shortcuts in the list (desktop). Hide on mobile. */
  showShortcuts?: boolean;
}

interface CommandItem {
  id: string;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  disabled?: boolean;
  run: () => void;
  keywords: string[];
}

export function CommandPalette({
  isOpen,
  onClose,
  showShortcuts = true,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
    nodes,
    edges,
    setNodes,
    setNodeError,
    nodeOutputs,
    isExecuting,
    setExecuting,
    setExecutionCancelled,
    setExecutionProgress,
  } = useWorkflowStore();
  const reactFlow = useReactFlow();

  const handleValidate = useCallback(() => {
    if (nodes.length === 0) {
      toast.info('No nodes to validate');
      return;
    }
    nodes.forEach((node) => setNodeError(node.id, null));
    const result = validateWorkflow(nodes, edges);
    for (const error of result.errors) {
      if (error.nodeId) setNodeError(error.nodeId, error.message);
    }
    if (!result.valid) {
      toast.error(
        `Validation failed: ${result.errors.length} error(s), ${result.warnings.length} warning(s)`
      );
    } else if (result.warnings.length > 0) {
      toast.info(`Validation passed with ${result.warnings.length} warning(s)`);
    } else {
      toast.success('Validation passed - workflow is ready to execute');
    }
  }, [nodes, edges, setNodeError]);

  const handleExecute = useCallback(async () => {
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
      const { executeWorkflow } = await import('../../lib/executor');
      const store = useWorkflowStore.getState();
      const result = await executeWorkflow(nodes, edges, store, {
        getCancelled: () => useWorkflowStore.getState().executionCancelled,
        onProgress: (current, total) => setExecutionProgress(current, total),
      });
      if (result.errors.length > 0) {
        toast.error(
          `Execution completed with ${result.errors.length} error(s). ${result.executed}/${result.total} nodes executed.`
        );
      } else {
        toast.success(
          `Execution completed. ${result.executed}/${result.total} nodes executed.`
        );
      }
    } catch (error) {
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
    setExecutionCancelled,
    setExecutionProgress,
  ]);

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
  }, [nodes, edges, setNodes, reactFlow]);

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

  const handleExport = useCallback(() => {
    const outputs = Object.entries(nodeOutputs);
    if (outputs.length === 0) {
      toast.info('No outputs to export');
      return;
    }
    outputs.forEach(([, output], i) => {
      if (output.type === 'image') {
        const link = document.createElement('a');
        link.href = output.data;
        link.download = `output-${i}.png`;
        link.click();
      }
    });
    toast.success(`Exported ${outputs.length} output(s)`);
  }, [nodeOutputs]);

  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: 'undo',
        label: 'Undo',
        shortcut: 'Ctrl+Z',
        icon: <Undo2 className="h-5 w-5 shrink-0" />,
        disabled: !canUndo(),
        run: undo,
        keywords: ['undo'],
      },
      {
        id: 'redo',
        label: 'Redo',
        shortcut: 'Ctrl+Shift+Z',
        icon: <Redo2 className="h-5 w-5 shrink-0" />,
        disabled: !canRedo(),
        run: redo,
        keywords: ['redo'],
      },
      {
        id: 'save',
        label: 'Save',
        shortcut: 'Ctrl+S',
        icon: <Save className="h-5 w-5 shrink-0" />,
        run: () => window.dispatchEvent(new Event('workflow:save')),
        keywords: ['save', 'export', 'json'],
      },
      {
        id: 'load',
        label: 'Load',
        shortcut: 'Ctrl+O',
        icon: <FolderOpen className="h-5 w-5 shrink-0" />,
        run: () => window.dispatchEvent(new Event('workflow:load')),
        keywords: ['load', 'open', 'import'],
      },
      {
        id: 'execute',
        label: isExecuting ? 'Stop execution' : 'Execute',
        shortcut: 'Ctrl+Enter',
        icon: <Play className="h-5 w-5 shrink-0" />,
        disabled: nodes.length === 0,
        run: handleExecute,
        keywords: ['execute', 'run', 'play', 'stop'],
      },
      {
        id: 'validate',
        label: 'Validate',
        icon: <CheckCircle2 className="h-5 w-5 shrink-0" />,
        run: handleValidate,
        keywords: ['validate', 'check'],
      },
      {
        id: 'fit-view',
        label: 'Fit View',
        icon: <Maximize2 className="h-5 w-5 shrink-0" />,
        run: () => reactFlow.fitView({ padding: 0.2 }),
        keywords: ['fit', 'view', 'zoom'],
      },
      {
        id: 'auto-layout',
        label: 'Auto Layout',
        icon: <LayoutGrid className="h-5 w-5 shrink-0" />,
        run: handleAutoLayout,
        keywords: ['auto', 'layout', 'arrange'],
      },
      {
        id: 'clear',
        label: 'Clear',
        icon: <Trash2 className="h-5 w-5 shrink-0" />,
        run: handleClear,
        keywords: ['clear', 'reset', 'delete'],
      },
      {
        id: 'export',
        label: 'Export outputs',
        icon: <FileJson className="h-5 w-5 shrink-0" />,
        run: handleExport,
        keywords: ['export', 'output', 'download'],
      },
    ],
    [
      canUndo,
      canRedo,
      undo,
      redo,
      isExecuting,
      nodes.length,
      handleExecute,
      handleValidate,
      handleAutoLayout,
      handleClear,
      handleExport,
      reactFlow,
    ]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.keywords.some((k) => k.includes(q))
    );
  }, [commands, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      id="command-palette-root"
      role="dialog"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] transition-opacity duration-200"
      onKeyDown={onKeyDown}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 transition-opacity duration-200"
        onClick={onClose}
        aria-label="Close"
      />
      <div
        className="relative z-10 w-full max-w-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-xl transition-transform duration-200 sm:max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[var(--border-color)] p-3">
          <Command className="h-5 w-5 shrink-0 text-[var(--text-secondary)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actions..."
            className="min-h-[44px] flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            aria-label="Search commands"
          />
        </div>
        <ul
          className="max-h-[60vh] overflow-y-auto p-2"
          role="listbox"
          aria-label="Commands"
        >
          {filtered.length === 0 ? (
            <li className="py-4 text-center text-sm text-[var(--text-secondary)]">
              No matching actions
            </li>
          ) : (
            filtered.map((cmd) => (
              <li key={cmd.id}>
                <button
                  type="button"
                  className="flex min-h-[44px] w-full touch-manipulation items-center gap-3 rounded-lg px-3 py-2 text-left text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-tertiary)] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={cmd.disabled}
                  onClick={() => {
                    cmd.run();
                    onClose();
                  }}
                  role="option"
                >
                  {cmd.icon}
                  <span className="flex-1">{cmd.label}</span>
                  {showShortcuts && cmd.shortcut && (
                    <kbd className="rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
                      {cmd.shortcut}
                    </kbd>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
