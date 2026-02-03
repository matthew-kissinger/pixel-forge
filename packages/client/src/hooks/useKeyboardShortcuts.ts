import { useEffect, useRef } from 'react';
import type { ReactFlowInstance, Node } from '@xyflow/react';
import { toast } from '../components/ui/Toast';
import { type WorkflowState, type NodeData } from '../stores/workflow';

type WorkflowStore = WorkflowState;

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
  reactFlow: ReactFlowInstance,
  onCopy?: (nodes: Node<NodeData>[]) => void,
  onPaste?: () => void
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
        const store = storeRef.current;
        if (store.canRedo()) {
          store.redo();
        }
        return;
      }

      if (isMeta && key === 'z') {
        event.preventDefault();
        const store = storeRef.current;
        if (store.canUndo()) {
          store.undo();
        }
        return;
      }

      if (isMeta && key === 'c') {
        const flow = flowRef.current;
        const selected = flow.getNodes().filter((n) => n.selected) as Node<NodeData>[];
        if (selected.length > 0) {
          event.preventDefault();
          onCopy?.(selected);
          toast.info(`Copied ${selected.length} node${selected.length > 1 ? 's' : ''}`);
        }
        return;
      }

      if (isMeta && key === 'v') {
        event.preventDefault();
        onPaste?.();
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
        return;
      }

      if (key === 'delete' || key === 'backspace') {
        event.preventDefault();
        const flow = flowRef.current;
        const selectedNodes = flow.getNodes().filter((n) => n.selected);
        const selectedEdges = flow.getEdges().filter((e) => e.selected);
        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          flow.deleteElements({ nodes: selectedNodes, edges: selectedEdges });
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCopy, onPaste]);
};
