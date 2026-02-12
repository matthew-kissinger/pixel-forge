import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (dialogRef.current && e.target === dialogRef.current) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div className="mx-4 w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <h2 id="shortcuts-title" className="text-lg font-semibold text-white">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4">
          <div className="space-y-4">
            <Section title="General">
              <Shortcut keys={['?']} description="Show this help" />
              <Shortcut keys={['Escape']} description="Close current panel or deselect" />
              <Shortcut keys={['Ctrl/Cmd', 'K']} description="Open command palette" />
            </Section>

            <Section title="File">
              <Shortcut keys={['Ctrl/Cmd', 'S']} description="Save workflow" />
              <Shortcut keys={['Ctrl/Cmd', 'O']} description="Open workflow" />
            </Section>

            <Section title="Edit">
              <Shortcut keys={['Ctrl/Cmd', 'Z']} description="Undo" />
              <Shortcut keys={['Ctrl/Cmd', 'Shift', 'Z']} description="Redo" />
              <Shortcut keys={['Ctrl/Cmd', 'C']} description="Copy selected nodes" />
              <Shortcut keys={['Ctrl/Cmd', 'V']} description="Paste nodes" />
              <Shortcut keys={['Ctrl/Cmd', 'A']} description="Select all nodes" />
              <Shortcut keys={['Delete']} description="Delete selected" />
              <Shortcut keys={['Backspace']} description="Delete selected" />
            </Section>

            <Section title="Execution">
              <Shortcut keys={['Ctrl/Cmd', 'Enter']} description="Execute workflow" />
            </Section>

            <Section title="Canvas">
              <Shortcut keys={['Mouse Wheel']} description="Zoom in/out" />
              <Shortcut keys={['Space', 'Drag']} description="Pan canvas" />
              <Shortcut keys={['Click', 'Drag']} description="Select multiple nodes" />
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-gray-400">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Shortcut({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-300">{description}</span>
      <div className="flex gap-1">
        {keys.map((key, i) => (
          <kbd
            key={i}
            className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-300"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}
