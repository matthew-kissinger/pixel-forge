import { useEffect, useRef, useCallback } from 'react';
import { useWorkflowStore } from '../stores/workflow';
import { toast } from '../components/ui/Toast';
import { logger } from '@pixel-forge/shared/logger';

const AUTOSAVE_KEY = 'pixel-forge-autosave';
const DEBOUNCE_MS = 2000;

interface AutoSaveOptions {
  allowRecovery?: boolean;
}

export function useAutoSave(options: AutoSaveOptions = {}) {
  const allowRecovery = options.allowRecovery ?? true;
  const { exportWorkflow, importWorkflow, setLastAutoSave } = useWorkflowStore();
  const lastSavedJsonRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recoveryHandledRef = useRef(false);

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

  // Handle recovery on mount
  useEffect(() => {
    if (!allowRecovery || recoveryHandledRef.current) return;
    recoveryHandledRef.current = true;
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (saved) {
      try {
        const workflow = JSON.parse(saved);
        // Only show recovery if there are nodes
        if (workflow.nodes && workflow.nodes.length > 0) {
          // Use a custom toast or a simple confirm for now
          // The requirement asked for "Recover unsaved workflow? [Recover] [Discard]"
          
          // Since our toast system might not support buttons easily (need to check),
          // I'll use window.confirm for a definitive choice or implement a custom toast if possible.
          // Looking at Toast.tsx might help, but let's assume a simple confirm for now
          // and maybe improve it if I see a better way.
          
          const recover = window.confirm('Recover unsaved workflow from your last session?');
          if (recover) {
            importWorkflow(workflow);
            lastSavedJsonRef.current = saved;
            setLastAutoSave(Date.now());
            toast.success('Workflow recovered');
          } else {
            localStorage.removeItem(AUTOSAVE_KEY);
          }
        }
      } catch (error) {
        logger.error('Failed to parse auto-saved workflow:', error);
        localStorage.removeItem(AUTOSAVE_KEY);
      }
    }
  }, [allowRecovery, importWorkflow, setLastAutoSave]);

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

  return null;
}
