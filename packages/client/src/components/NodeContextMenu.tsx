import { useEffect, useRef } from 'react';
import { Play, Copy, Trash2, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface NodeContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  onClose: () => void;
  onRerun: (nodeId: string) => void;
  onDuplicate: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onClearOutput: (nodeId: string) => void;
  canRerun: boolean;
}

export function NodeContextMenu({
  x,
  y,
  nodeId,
  onClose,
  onRerun,
  onDuplicate,
  onDelete,
  onClearOutput,
  canRerun,
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] overflow-hidden rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] py-1 shadow-xl animate-in fade-in zoom-in duration-100"
      style={{ top: y, left: x }}
    >
      <button
        onClick={() => {
          onRerun(nodeId);
          onClose();
        }}
        disabled={!canRerun}
        className={cn(
          "flex w-full items-center px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        )}
      >
        <Play className="mr-2 h-4 w-4" />
        Re-run Node
      </button>

      <button
        onClick={() => {
          onDuplicate(nodeId);
          onClose();
        }}
        className="flex w-full items-center px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
      >
        <Copy className="mr-2 h-4 w-4" />
        Duplicate Node
      </button>

      <button
        onClick={() => {
          onDelete(nodeId);
          onClose();
        }}
        className="flex w-full items-center px-3 py-2 text-sm text-[var(--error)] hover:bg-[var(--bg-tertiary)] transition-colors"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete Node
      </button>

      <div className="my-1 h-px bg-[var(--border-color)]" />

      <button
        onClick={() => {
          onClearOutput(nodeId);
          onClose();
        }}
        className="flex w-full items-center px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
      >
        <XCircle className="mr-2 h-4 w-4" />
        Clear Output
      </button>
    </div>
  );
}
