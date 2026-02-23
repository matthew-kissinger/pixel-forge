import { useCallback, useSyncExternalStore } from 'react';
import {
  BUILTIN_TEMPLATES,
  type PromptTemplate,
} from '@pixel-forge/shared/prompt-snippets';

const STORAGE_KEY = 'pixel-forge-templates';

// ---------------------------------------------------------------------------
// Tiny external store so every consumer re-renders on change
// ---------------------------------------------------------------------------

let userTemplatesCache: PromptTemplate[] | null = null;
const listeners = new Set<() => void>();

function readUserTemplates(): PromptTemplate[] {
  if (userTemplatesCache) return userTemplatesCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    userTemplatesCache = raw ? (JSON.parse(raw) as PromptTemplate[]) : [];
  } catch {
    userTemplatesCache = [];
  }
  return userTemplatesCache;
}

function writeUserTemplates(templates: PromptTemplate[]) {
  userTemplatesCache = templates;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function getSnapshot() {
  return readUserTemplates();
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePromptTemplates() {
  const userTemplates = useSyncExternalStore(subscribe, getSnapshot);

  const allTemplates = [...BUILTIN_TEMPLATES, ...userTemplates];

  const addTemplate = useCallback(
    (t: Omit<PromptTemplate, 'id' | 'builtIn'>) => {
      const next: PromptTemplate = {
        ...t,
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        builtIn: false,
      };
      writeUserTemplates([...readUserTemplates(), next]);
      return next;
    },
    [],
  );

  const removeTemplate = useCallback((id: string) => {
    writeUserTemplates(readUserTemplates().filter((t) => t.id !== id));
  }, []);

  const updateTemplate = useCallback(
    (id: string, patch: Partial<Pick<PromptTemplate, 'name' | 'text' | 'category' | 'tags'>>) => {
      writeUserTemplates(
        readUserTemplates().map((t) => (t.id === id ? { ...t, ...patch } : t)),
      );
    },
    [],
  );

  return { allTemplates, userTemplates, addTemplate, removeTemplate, updateTemplate } as const;
}
