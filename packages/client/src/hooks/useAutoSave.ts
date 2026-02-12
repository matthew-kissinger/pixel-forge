import { useEffect, useRef, useCallback, useState } from 'react';
import { useWorkflowStore, type WorkflowData } from '../stores/workflow';
import { toast } from '../components/ui/Toast';
import { logger } from '@pixel-forge/shared/logger';

const AUTOSAVE_KEY = 'pixel-forge-autosave';
const DEBOUNCE_MS = 2000;

interface AutoSaveOptions {
  allowRecovery?: boolean;
}

export interface UseAutoSaveReturn {
  pendingRecovery: WorkflowData | null;
  confirmRecovery: () => void;
  discardRecovery: () => void;
}

export function useAutoSave(options: AutoSaveOptions = {}): UseAutoSaveReturn {
  const allowRecovery = options.allowRecovery ?? true;
  const { exportWorkflow, importWorkflow, setLastAutoSave } = useWorkflowStore();
  const lastSavedJsonRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recoveryHandledRef = useRef(false);
  const [pendingRecovery, setPendingRecovery] = useState<WorkflowData | null>(null);

  const saveToLocalStorage = useCallback(() => {
    try {
      const workflow = exportWorkflow();
      const json = JSON.stringify(workflow);
      
      // Only save if changed
      if (json === lastSavedJsonRef.current) return;

      // Check for localStorage quota (roughly)
      // localStorage usually has 5MB limit. 
      // If our workflow is > 4MB, maybe we should warn or stop autosaving.
      if (json.length > 4 * 1024 * 1024) {
        logger.warn('Workflow too large for auto-save');
        return;
      }

      localStorage.setItem(AUTOSAVE_KEY, json);
      lastSavedJsonRef.current = json;
      const now = Date.now();
      setLastAutoSave(now);
      logger.debug('Workflow auto-saved at', new Date(now).toLocaleTimeString());
    } catch (error) {
      logger.error('Failed to auto-save workflow:', error);
    }
  }, [exportWorkflow, setLastAutoSave]);

  const confirmRecovery = useCallback(() => {
    if (!pendingRecovery) return;
    try {
      importWorkflow(pendingRecovery);
      lastSavedJsonRef.current = JSON.stringify(pendingRecovery);
      setLastAutoSave(Date.now());
      toast.success('Workflow recovered');
    } finally {
      setPendingRecovery(null);
    }
  }, [pendingRecovery, importWorkflow, setLastAutoSave]);

  const discardRecovery = useCallback(() => {
    localStorage.removeItem(AUTOSAVE_KEY);
    setPendingRecovery(null);
  }, []);

  // Handle recovery on mount: show banner instead of window.confirm
  useEffect(() => {
    if (!allowRecovery || recoveryHandledRef.current) return;
    recoveryHandledRef.current = true;
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (saved) {
      try {
        const workflow = JSON.parse(saved) as WorkflowData;
        if (workflow.nodes && workflow.nodes.length > 0) {
          setPendingRecovery(workflow);
        }
      } catch (error) {
        logger.error('Failed to parse auto-saved workflow:', error);
        localStorage.removeItem(AUTOSAVE_KEY);
      }
    }
  }, [allowRecovery]);

  // Subscribe to changes
  useEffect(() => {
    // We want to subscribe to nodes and edges specifically for "structural" changes
    const unsub = useWorkflowStore.subscribe(
      (state) => ({ nodes: state.nodes, edges: state.edges }),
      () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(saveToLocalStorage, DEBOUNCE_MS);
      },
      {
        equalityFn: (a, b) => 
          JSON.stringify(a.nodes) === JSON.stringify(b.nodes) && 
          JSON.stringify(a.edges) === JSON.stringify(b.edges)
      }
    );

    return () => {
      unsub();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [saveToLocalStorage]);

  return { pendingRecovery, confirmRecovery, discardRecovery };
}
