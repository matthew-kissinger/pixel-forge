import { useState } from 'react';
import { Zap, ChevronDown, Sparkles, X } from 'lucide-react';
import { PRESETS } from '@pixel-forge/shared/presets';
import { createWorkflowFromPreset } from '../../lib/templates';
import { useWorkflowStore } from '../../stores/workflow';
import { toast } from '../ui/Toast';
import { cn } from '../../lib/utils';

export function QuickGenerate() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState(PRESETS[0].id);
  const [subject, setSubject] = useState('');
  const { reset, addNode, onConnect } = useWorkflowStore();

  const handleGenerate = () => {
    if (!subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }

    const workflow = createWorkflowFromPreset(selectedPresetId, subject);
    if (!workflow) {
      toast.error('Failed to create workflow');
      return;
    }

    // Clear existing workflow
    reset();

    // Add nodes
    for (const node of workflow.nodes) {
      addNode(node);
    }

    // Add edges
    for (const edge of workflow.edges) {
      onConnect({
        source: edge.source,
        target: edge.target,
        sourceHandle: null,
        targetHandle: null,
      });
    }

    toast.success(`Generated workflow for "${subject}"`);
    setIsOpen(false);
    setSubject('');
  };

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded border px-3 py-1.5 text-sm transition-colors',
          'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--accent)] font-semibold',
          'hover:border-[var(--accent)] hover:bg-[var(--bg-tertiary)]',
          isOpen && 'border-[var(--accent)]'
        )}
      >
        <Zap className="h-4 w-4" />
        <span>Quick Generate</span>
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-xl p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                Quick Generation
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded p-1 hover:bg-[var(--bg-tertiary)]"
              >
                <X className="h-4 w-4 text-[var(--text-secondary)]" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Select Asset Type
                </label>
                <select
                  value={selectedPresetId}
                  onChange={(e) => setSelectedPresetId(e.target.value)}
                  className="w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                >
                  {PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
                {selectedPresetId && (
                   <p className="mt-1.5 text-[10px] text-[var(--text-secondary)]">
                     {PRESETS.find(p => p.id === selectedPresetId)?.description}
                   </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  What do you want to generate?
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. lava dragon, wooden chest..."
                  className="w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                  autoFocus
                />
              </div>

              <button
                onClick={handleGenerate}
                className="w-full flex items-center justify-center gap-2 rounded bg-[var(--accent)] py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
              >
                <Zap className="h-4 w-4" />
                Build Workflow
              </button>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-[var(--border-color)]">
              <p className="text-[10px] text-[var(--text-secondary)]">
                This will create a pre-configured node graph for the selected asset type.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
