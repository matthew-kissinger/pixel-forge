import { useState } from 'react';
import {
  LayoutTemplate,
  ChevronDown,
  Sparkles,
  Grid3X3,
  Box,
  RefreshCw,
  Layers,
  X,
} from 'lucide-react';
import {
  templates,
  templateCategories,
  templateToFlow,
  type WorkflowTemplate,
} from '../../lib/templates';
import { useWorkflowStore } from '../../stores/workflow';
import { toast } from '../ui/Toast';
import { cn } from '../../lib/utils';

const categoryIcons = {
  sprite: Sparkles,
  tile: Grid3X3,
  '3d': Box,
  conversion: RefreshCw,
  composite: Layers,
};

export function TemplateLoader() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { reset, addNode, onConnect } = useWorkflowStore();

  const handleLoadTemplate = (template: WorkflowTemplate) => {
    // Clear existing workflow
    reset();

    // Convert template to nodes and edges
    const { nodes, edges } = templateToFlow(template);

    // Add nodes
    for (const node of nodes) {
      addNode(node);
    }

    // Add edges (connections)
    for (const edge of edges) {
      onConnect({
        source: edge.source,
        target: edge.target,
        sourceHandle: null,
        targetHandle: null,
      });
    }

    toast.success(`Loaded "${template.name}" template`);
    setIsOpen(false);
  };

  const filteredTemplates = selectedCategory
    ? templates.filter((t) => t.category === selectedCategory)
    : templates;

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded border px-3 py-1.5 text-sm transition-colors',
          'border-[var(--border-color)] bg-[var(--bg-secondary)]',
          'hover:border-[var(--accent)] hover:bg-[var(--bg-tertiary)]',
          isOpen && 'border-[var(--accent)]'
        )}
      >
        <LayoutTemplate className="h-4 w-4" />
        <span>Templates</span>
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
          <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-color)] px-3 py-2">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Workflow Templates
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded p-1 hover:bg-[var(--bg-tertiary)]"
              >
                <X className="h-4 w-4 text-[var(--text-secondary)]" />
              </button>
            </div>

            {/* Category filters */}
            <div className="flex flex-wrap gap-1 border-b border-[var(--border-color)] p-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  'rounded px-2 py-1 text-xs transition-colors',
                  selectedCategory === null
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
                )}
              >
                All
              </button>
              {Object.entries(templateCategories).map(([key, cat]) => {
                const Icon = categoryIcons[key as keyof typeof categoryIcons];
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    className={cn(
                      'flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors',
                      selectedCategory === key
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Template list */}
            <div className="max-h-64 overflow-y-auto">
              {filteredTemplates.map((template) => {
                const Icon = categoryIcons[template.category];
                return (
                  <button
                    key={template.id}
                    onClick={() => handleLoadTemplate(template)}
                    className="flex w-full items-start gap-3 border-b border-[var(--border-color)] p-3 text-left transition-colors last:border-b-0 hover:bg-[var(--bg-tertiary)]"
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-[var(--bg-tertiary)]">
                      <Icon className="h-4 w-4 text-[var(--accent)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-[var(--text-primary)]">
                        {template.name}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        {template.description}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <span>{template.nodes.length} nodes</span>
                        <span className="opacity-50">|</span>
                        <span>{template.connections.length} connections</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--border-color)] px-3 py-2">
              <p className="text-xs text-[var(--text-secondary)]">
                Loading a template will replace your current workflow
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
