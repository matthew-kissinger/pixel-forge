import { useEffect, useState } from 'react';
import { useWorkflowStore } from '../stores/workflow';
import { decodeWorkflow } from '../lib/share';
import { toast } from '../components/ui/Toast';

export type WorkflowFromUrlStatus = 'pending' | 'loaded' | 'none' | 'error';

export function useWorkflowFromUrl(): WorkflowFromUrlStatus {
  const importWorkflow = useWorkflowStore((state) => state.importWorkflow);
  const [status, setStatus] = useState<WorkflowFromUrlStatus>('pending');

  useEffect(() => {
    let active = true;

    const loadFromUrl = async () => {
      const hash = window.location.hash;
      if (!hash || !hash.startsWith('#wf=')) {
        if (active) setStatus('none');
        return;
      }

      const encoded = hash.slice(4);
      if (!encoded) {
        if (active) {
          setStatus('error');
          toast.error('Shared workflow URL is empty');
        }
        history.replaceState(null, '', window.location.pathname + window.location.search);
        return;
      }

      const workflow = await decodeWorkflow(encoded);
      if (!active) return;

      if (!workflow) {
        setStatus('error');
        toast.error('Failed to load shared workflow');
        history.replaceState(null, '', window.location.pathname + window.location.search);
        return;
      }

      try {
        importWorkflow(workflow);
        toast.success('Loaded shared workflow');
        setStatus('loaded');
      } catch (error) {
        console.error('Failed to import shared workflow:', error);
        toast.error('Failed to import shared workflow');
        setStatus('error');
      } finally {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };

    loadFromUrl();

    return () => {
      active = false;
    };
  }, [importWorkflow]);

  return status;
}
