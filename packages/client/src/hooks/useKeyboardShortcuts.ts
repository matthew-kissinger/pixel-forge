import { useEffect, useRef } from 'react';
import type { ReactFlowInstance } from '@xyflow/react';
import { toast } from '../components/ui/Toast';
import { useWorkflowStore } from '../stores/workflow';

type WorkflowStore = ReturnType<typeof useWorkflowStore>;

type EditableElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const isEditableElement = (element: Element | null): element is EditableElement => {
  if (!element) return false;
  if (element instanceof HTMLInputElement) return true;
  if (element instanceof HTMLTextAreaElement) return true;
  if (element instanceof HTMLSelectElement) return true;
  if (element instanceof HTMLElement && element.isContentEditable) return true;
  return false;
};

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (target instanceof Element && isEditableElement(target)) return true;
  if (isEditableElement(document.activeElement)) return true;
  return false;
};

export const useKeyboardShortcuts = (
  workflowStore: WorkflowStore,
  reactFlow: ReactFlowInstance
) => {
  const storeRef = useRef(workflowStore);
  const flowRef = useRef(reactFlow);

  useEffect(() => {
    storeRef.current = workflowStore;
  }, [workflowStore]);

  useEffect(() => {
    flowRef.current = reactFlow;
  }, [reactFlow]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (isEditableTarget(event.target)) return;

      const key = event.key.toLowerCase();
      const isMeta = event.metaKey || event.ctrlKey;

      if (isMeta && key === 's') {
        event.preventDefault();
        window.dispatchEvent(new Event('workflow:save'));
        return;
      }

      if (isMeta && key === 'o') {
        event.preventDefault();
        window.dispatchEvent(new Event('workflow:load'));
        return;
      }

      if (isMeta && key === 'z' && event.shiftKey) {
        event.preventDefault();
        toast.info('Redo not yet implemented');
        return;
      }

      if (isMeta && key === 'z') {
        event.preventDefault();
        toast.info('Undo not yet implemented');
        return;
      }

      if (isMeta && key === 'a') {
        event.preventDefault();
        const flow = flowRef.current;
        flow.setNodes((nodes) => nodes.map((node) => ({ ...node, selected: true })));
        return;
      }

      if (isMeta && key === 'enter') {
        event.preventDefault();
        window.dispatchEvent(new Event('workflow:execute'));
        return;
      }

      if (key === 'escape') {
        event.preventDefault();
        const store = storeRef.current;
        if (store.isExecuting) {
          store.setExecutionCancelled(true);
          store.setExecuting(false);
          toast.info('Execution cancelled');
          return;
        }

        const flow = flowRef.current;
        flow.setNodes((nodes) =>
          nodes.map((node) => (node.selected ? { ...node, selected: false } : node))
        );
        flow.setEdges((edges) =>
          edges.map((edge) => (edge.selected ? { ...edge, selected: false } : edge))
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};
