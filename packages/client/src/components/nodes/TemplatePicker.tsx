import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Search, BookOpen, Puzzle, X, Trash2, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePromptTemplates } from '../../hooks/usePromptTemplates';
import {
  SNIPPET_CATEGORIES,
  PROMPT_CATEGORIES,
  CATEGORY_LABELS,
  type TemplateType,
  type SnippetCategory,
  type PromptCategory,
  type PromptTemplate,
} from '@pixel-forge/shared/prompt-snippets';

interface TemplatePickerProps {
  onInsert: (text: string, replace: boolean) => void;
  onClose: () => void;
  currentText: string;
}

type Tab = 'snippets' | 'prompts';

export function TemplatePicker({ onInsert, onClose, currentText }: TemplatePickerProps) {
  const { allTemplates, addTemplate, removeTemplate } = usePromptTemplates();
  const [tab, setTab] = useState<Tab>('prompts');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus search on open
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const categories = tab === 'snippets' ? SNIPPET_CATEGORIES : PROMPT_CATEGORIES;
  const type: TemplateType = tab === 'snippets' ? 'snippet' : 'prompt';

  const filtered = useMemo(() => {
    let list = allTemplates.filter((t) => t.type === type);
    if (category) list = list.filter((t) => t.category === category);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.text.toLowerCase().includes(q) ||
          t.tags?.some((tag: string) => tag.includes(q)),
      );
    }
    return list;
  }, [allTemplates, type, category, search]);

  const handleInsert = useCallback(
    (t: PromptTemplate) => {
      // Full prompts replace; snippets append
      onInsert(t.text, t.type === 'prompt');
    },
    [onInsert],
  );

  const handleSave = useCallback(() => {
    if (!saveName.trim() || !currentText.trim()) return;
    addTemplate({
      type: tab === 'snippets' ? 'snippet' : 'prompt',
      name: saveName.trim(),
      text: currentText,
      category: (tab === 'snippets' ? 'custom' : 'custom') as SnippetCategory | PromptCategory,
    });
    setSaveName('');
    setSaving(false);
  }, [saveName, currentText, tab, addTemplate]);

  return (
    <div className="nodrag nowheel flex max-h-[360px] w-[340px] flex-col overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] px-3 py-2">
        <span className="text-xs font-semibold text-[var(--text-primary)]">Templates</span>
        <button
          onClick={onClose}
          className="rounded p-0.5 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-color)]">
        <TabButton
          active={tab === 'prompts'}
          onClick={() => { setTab('prompts'); setCategory(null); }}
          icon={<BookOpen className="h-3.5 w-3.5" />}
          label="Prompts"
        />
        <TabButton
          active={tab === 'snippets'}
          onClick={() => { setTab('snippets'); setCategory(null); }}
          icon={<Puzzle className="h-3.5 w-3.5" />}
          label="Snippets"
        />
      </div>

      {/* Search */}
      <div className="relative border-b border-[var(--border-color)] px-3 py-1.5">
        <Search className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-secondary)]" />
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates..."
          className="w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] py-1 pl-7 pr-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--accent)] focus:outline-none"
        />
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-1 border-b border-[var(--border-color)] px-3 py-1.5">
        <Pill active={!category} onClick={() => setCategory(null)} label="All" />
        {categories.map((c) => (
          <Pill
            key={c}
            active={category === c}
            onClick={() => setCategory(category === c ? null : c)}
            label={CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS]}
          />
        ))}
      </div>

      {/* Template list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-[var(--text-secondary)]">
            No templates match your search.
          </div>
        ) : (
          filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => handleInsert(t)}
              className="group flex w-full items-start gap-2 border-b border-[var(--border-color)] px-3 py-2 text-left transition-colors hover:bg-[var(--bg-tertiary)]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-medium text-[var(--text-primary)]">
                    {t.name}
                  </span>
                  {!t.builtIn && (
                    <span className="shrink-0 rounded bg-[var(--accent)] px-1 py-px text-[9px] leading-tight text-white">
                      custom
                    </span>
                  )}
                </div>
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-[var(--text-secondary)]">
                  {t.text}
                </p>
              </div>
              {!t.builtIn && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTemplate(t.id);
                  }}
                  className="shrink-0 rounded p-1 text-[var(--text-secondary)] opacity-0 hover:bg-[var(--error)]/20 hover:text-[var(--error)] group-hover:opacity-100"
                  title="Delete custom template"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </button>
          ))
        )}
      </div>

      {/* Save current as template */}
      <div className="border-t border-[var(--border-color)] px-3 py-2">
        {saving ? (
          <div className="flex items-center gap-1.5">
            <input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setSaving(false); }}
              placeholder="Template name..."
              autoFocus
              className="flex-1 rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--accent)] focus:outline-none"
            />
            <button
              onClick={handleSave}
              disabled={!saveName.trim() || !currentText.trim()}
              className="rounded bg-[var(--accent)] px-2 py-1 text-xs font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-40"
            >
              Save
            </button>
            <button
              onClick={() => setSaving(false)}
              className="rounded px-1.5 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSaving(true)}
            disabled={!currentText.trim()}
            className="flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-[var(--border-color)] py-1 text-xs text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40 disabled:hover:border-[var(--border-color)] disabled:hover:text-[var(--text-secondary)]"
          >
            <Plus className="h-3 w-3" />
            Save Current as Template
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-b-2 border-[var(--accent)] text-[var(--accent)]'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function Pill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors',
        active
          ? 'bg-[var(--accent)] text-white'
          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border-color)] hover:text-[var(--text-primary)]',
      )}
    >
      {label}
    </button>
  );
}
