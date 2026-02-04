import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../../src/hooks/useKeyboardShortcuts';
import { toast } from '../../src/components/ui/Toast';
import type { ReactFlowInstance, Node } from '@xyflow/react';
import type { WorkflowState, NodeData } from '../../src/stores/workflow';

// Mock dependencies
vi.mock('../../src/components/ui/Toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

describe('useKeyboardShortcuts', () => {
  let mockStore: Partial<WorkflowState>;
  let mockReactFlow: Partial<ReactFlowInstance>;
  let onCopy: ReturnType<typeof vi.fn>;
  let onPaste: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock workflow store
    mockStore = {
      canUndo: vi.fn().mockReturnValue(true),
      canRedo: vi.fn().mockReturnValue(true),
      undo: vi.fn(),
      redo: vi.fn(),
      isExecuting: false,
      setExecutionCancelled: vi.fn(),
      setExecuting: vi.fn(),
    };

    // Mock ReactFlow instance
    mockReactFlow = {
      getNodes: vi.fn().mockReturnValue([]),
      getEdges: vi.fn().mockReturnValue([]),
      setNodes: vi.fn(),
      setEdges: vi.fn(),
      deleteElements: vi.fn(),
    };

    // Mock callbacks
    onCopy = vi.fn();
    onPaste = vi.fn();

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const dispatchKeyDown = (options: {
    key: string;
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    defaultPrevented?: boolean;
  }) => {
    const event = new KeyboardEvent('keydown', {
      key: options.key,
      ctrlKey: options.ctrlKey || false,
      metaKey: options.metaKey || false,
      shiftKey: options.shiftKey || false,
      bubbles: true,
      cancelable: true,
    });

    if (options.defaultPrevented) {
      event.preventDefault();
    }

    window.dispatchEvent(event);
    return event;
  };

  describe('Editable element detection', () => {
    it('does not trigger shortcuts when focus is on input element', () => {
      renderHook(() =>
        useKeyboardShortcuts(
          mockStore as WorkflowState,
          mockReactFlow as ReactFlowInstance,
          onCopy,
          onPaste
        )
      );

      // Create and focus an input element
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      const saveListener = vi.fn();
      window.addEventListener('workflow:save', saveListener);

      dispatchKeyDown({ key: 's', ctrlKey: true });

      expect(saveListener).not.toHaveBeenCalled();

      document.body.removeChild(input);
      window.removeEventListener('workflow:save', saveListener);
    });

    it('does not trigger shortcuts when focus is on textarea element', () => {
      renderHook(() =>
        useKeyboardShortcuts(
          mockStore as WorkflowState,
          mockReactFlow as ReactFlowInstance,
          onCopy,
          onPaste
        )
      );

      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.focus();

      const saveListener = vi.fn();
      window.addEventListener('workflow:save', saveListener);

      dispatchKeyDown({ key: 's', ctrlKey: true });

      expect(saveListener).not.toHaveBeenCalled();

      document.body.removeChild(textarea);
      window.removeEventListener('workflow:save', saveListener);
    });

    it('does not trigger shortcuts when focus is on select element', () => {
      renderHook(() =>
        useKeyboardShortcuts(
          mockStore as WorkflowState,
          mockReactFlow as ReactFlowInstance,
          onCopy,
          onPaste
        )
      );

      const select = document.createElement('select');
      document.body.appendChild(select);
      select.focus();

      const saveListener = vi.fn();
      window.addEventListener('workflow:save', saveListener);

      dispatchKeyDown({ key: 's', ctrlKey: true });

      expect(saveListener).not.toHaveBeenCalled();

      document.body.removeChild(select);
      window.removeEventListener('workflow:save', saveListener);
    });

    it('does not trigger shortcuts when focus is on contentEditable element', () => {
      renderHook(() =>
        useKeyboardShortcuts(
          mockStore as WorkflowState,
          mockReactFlow as ReactFlowInstance,
          onCopy,
          onPaste
        )
      );

      const div = document.createElement('div');
      div.contentEditable = 'true';
      document.body.appendChild(div);
      div.focus();

      const saveListener = vi.fn();
      window.addEventListener('workflow:save', saveListener);

      dispatchKeyDown({ key: 's', ctrlKey: true });

      expect(saveListener).not.toHaveBeenCalled();

      document.body.removeChild(div);
      window.removeEventListener('workflow:save', saveListener);
    });

    it('triggers shortcuts when focus is on body', () => {
      renderHook(() =>
        useKeyboardShortcuts(
          mockStore as WorkflowState,
          mockReactFlow as ReactFlowInstance,
          onCopy,
          onPaste
        )
      );

      document.body.focus();

      const saveListener = vi.fn();
      window.addEventListener('workflow:save', saveListener);

      dispatchKeyDown({ key: 's', ctrlKey: true });

      expect(saveListener).toHaveBeenCalled();

      window.removeEventListener('workflow:save', saveListener);
    });
  });

  describe('Ctrl+S - Save workflow', () => {
    it('dispatches workflow:save event', () => {
      renderHook(() =>
        useKeyboardShortcuts(
          mockStore as WorkflowState,
          mockReactFlow as ReactFlowInstance,
          onCopy,
          onPaste
        )
      );

      const saveListener = vi.fn();
      window.addEventListener('workflow:save', saveListener);

      dispatchKeyDown({ key: 's', ctrlKey: true });

      expect(saveListener).toHaveBeenCalledTimes(1);

      window.removeEventListener('workflow:save', saveListener);
    });
  });

  describe('Ctrl+O - Load workflow', () => {
    it('dispatches workflow:load event', () => {
      renderHook(() =>
        useKeyboardShortcuts(
          mockStore as WorkflowState,
          mockReactFlow as ReactFlowInstance,
          onCopy,
          onPaste
        )
      );

      const loadListener = vi.fn();
      window.addEventListener('workflow:load', loadListener);

      dispatchKeyDown({ key: 'o', ctrlKey: true });

      expect(loadListener).toHaveBeenCalledTimes(1);

      window.removeEventListener('workflow:load', loadListener);
    });
  });

  describe('Ctrl+Z - Undo', () => {
    it('calls store.undo() when canUndo() is true', () => {
      const { rerender } = renderHook(() =>
        useKeyboardShortcuts(
          mockStore as WorkflowState,
          mockReactFlow as ReactFlowInstance,
          onCopy,
          onPaste
        )
      );

      // Rerender to ensure storeRef is updated
      rerender();

      dispatchKeyDown({ key: 'z', ctrlKey: true });

      expect(mockStore.canUndo).toHaveBeenCalled();
      expect(mockStore.undo).toHaveBeenCalledTimes(1);
    });

    it('does not call store.undo() when canUndo() is false', () => {
      mockStore.canUndo = vi.fn().mockReturnValue(false);

      const { rerender } = renderHook(() =>
        useKeyboardShortcuts(
          mockStore as WorkflowState,
          mockReactFlow as ReactFlowInstance,
          onCopy,
          onPaste
        )
      );

      rerender();

      dispatchKeyDown({ key: 'z', ctrlKey: true });

      expect(mockStore.canUndo).toHaveBeenCalled();
      expect(mockStore.undo).not.toHaveBeenCalled();
    });
  });

  describe('Ctrl+Shift+Z - Redo', () => {
    it('calls store.redo() when canRedo() is true', () => {
      const { rerender } = renderHook(() =>
        useKeyboardShortcuts(
          mockStore as WorkflowState,
          mockReactFlow as ReactFlowInstance,
          onCopy,
          onPaste
        )
      );

      rerender();

      dispatchKeyDown({ key: 'z', ctrlKey: true, shiftKey: true });

      expect(mockStore.canRedo).toHaveBeenCalled();
      expect(mockStore.redo).toHaveBeenCalledTimes(1);
    });

    it('does not call store.redo() when canRedo() is false', () => {
      mockStore.canRedo = vi.fn().mockReturnValue(false);

      const { rerender } = renderHook(() =>
        useKeyboardShortcuts(
          mockStore as WorkflowState,
          mockReactFlow as ReactFlowInstance,
          onCopy,
          onPaste
        )
      );

      rerender();

      dispatchKeyDown({ key: 'z', ctrlKey: true, shiftKey: true });

      expect(mockStore.canRedo).toHaveBeenCalled();
      expect(mockStore.redo).not.toHaveBeenCalled();
    });

    it('handles Ctrl+Shift+Z before Ctrl+Z', () => {
      const { rerender } = renderHook(() =>
        useKeyboardShortcuts(
          mockStore as WorkflowState,
          mockReactFlow as ReactFlowInstance,
          onCopy,
          onPaste
        )
      );

      rerender();

      // Ctrl+Shift+Z should trigger redo, not undo
      dispatchKeyDown({ key: 'z', ctrlKey: true, shiftKey: true });

      expect(mockStore.redo).toHaveBeenCalledTimes(1);
      expect(mockStore.undo).not.toHaveBeenCalled();
    });
  });

  describe('Ctrl+C - Copy nodes', () => {
    it('calls onCopy with selected nodes and shows toast', () => {
      const selectedNodes = [
        {
          id: 'node1',
          type: 'textPrompt',
          position: { x: 0, y: 0 },
          data: { label: 'Node 1' },
          selected: true,
        },
      ] as Node<NodeData>[];

      mockReactFlow.getNodes = vi.fn().mockReturnValue(selectedNodes);

      const { rerender } = renderHook(() =>
        useKeyboardShortcuts(
          mockStore as WorkflowState,
          mockReactFlow as ReactFlowInstance,
          onCopy,
          onPaste
        )
      );

      rerender();

      dispatchKeyDown({ key: 'c', ctrlKey: true });

      expect(onCopy).toHaveBeenCalledWith(selectedNodes);
      expect(toast.info).toHaveBeenCalledWith('Copied 1 node');
    });

    it('shows plural message for multiple nodes', () => {
      const selectedNodes = [
        {
          id: 'node1',
          type: 'textPrompt',
          position: { x: 0, y: 0 },
          data: { label: 'Node 1' },
          selected: true,
        },
        {
          id: 'node2',
          type: 'textPrompt',
          position: { x: 100, y: 0 },
          data: { label: 'Node 2' },
          selected: true,
        },
      ] as Node<NodeData>[];

      mockReactFlow.getNodes = vi.fn().mockReturnValue(selectedNodes);

      const { rerender } = renderHook(() =>
        useKeyboardShortcuts(
          mockStore as WorkflowState,
          mockReactFlow as ReactFlowInstance,
          onCopy,
          onPaste
        )
      );

      rerender();

      dispatchKeyDown({ key: 'c', ctrlKey: true });

      expect(onCopy).toHaveBeenCalledWith(selectedNodes);
      expect(toast.info).toHaveBeenCalledWith('Copied 2 nodes');
    });

    it('does not call onCopy when no nodes are selected', () => {
      mockReactFlow.getNodes = vi.fn().mockReturnValue([
        {
          id: 'node1',
          type: 'textPrompt',
          position: { x: 0, y: 0 },
          data: { label: 'Node 1' },
          selected: false,
        },
      ]);

      const { rerender } = renderHook(() =>
        useKeyboardShortcuts(
          mockStore as WorkflowState,
          mockReactFlow as ReactFlowInstance,
          onCopy,
          onPaste
        )
      );

      rerender();

      dispatchKeyDown({ key: 'c', ctrlKey: true });

      expect(onCopy).not.toHaveBeenCalled();
      expect(toast.info).not.toHaveBeenCalled();
    });
  });

  describe('Ctrl+V - Paste nodes', () => {
    it('calls onPaste callback', () => {
      const { rerender } = renderHook(() =>
        useKeyboardShortcuts(
          mockStore as WorkflowState,
          mockReactFlow as ReactFlowInstance,
          onCopy,
          onPaste
        )
      );

      rerender();

      dispatchKeyDown({ key: 'v', ctrlKey: true });

      expect(onPaste).toHaveBeenCalledTimes(1);
    });

    it('does not throw when onPaste is undefined', () => {
      const { rerender } = renderHook(() =>
        useKeyboardShortcuts(
          mockStore as WorkflowState,
          mockReactFlow as ReactFlowInstance,
          onCopy,
          undefined
        )
      );

      rerender();

      expect(() => {
        dispatchKeyDown({ key: 'v', ctrlKey: true });
      }).not.toThrow();
    });
  });

  describe('Ctrl+A - Select all nodes', () => {
    it('calls setNodes to select all nodes', () => {
      const nodes = [
        {
          id: 'node1',
          type: 'textPrompt',
          position: { x: 0, y: 0 },
          data: { label: 'Node 1' },
          selected: false,
        },
        {
          id: 'node2',
          type: 'textPrompt',
          position: { x: 100, y: 0 },
          data: { label: 'Node 2' },
          selected: false,
        },
      ];

      mockReactFlow.getNodes = vi.fn().mockReturnValue(nodes);

      const { rerender } = renderHook(() =>
        useKeyboardShortcuts(
          mockStore as WorkflowState,
          mockReactFlow as ReactFlowInstance,
          onCopy,
          onPaste
        )
      );

      rerender();

      dispatchKeyDown({ key: 'a', ctrlKey: true });

      expect(mockReactFlow.setNodes).toHaveBeenCalled();

      // Verify the updater function sets selected: true
      const updaterFn = (mockReactFlow.setNodes as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const result = updaterFn(nodes);
      expect(result).toHaveLength(2);
      expect(result[0].selected).toBe(true);
      expect(result[1].selected).toBe(true);
    });
  });

  describe('Ctrl+Enter - Execute workflow', () => {
    it('dispatches workflow:execute event', () => {
      renderHook(() =>
        useKeyboardShortcuts(
          mockStore as WorkflowState,
          mockReactFlow as ReactFlowInstance,
          onCopy,
          onPaste
        )
      );

      const executeListener = vi.fn();
      window.addEventListener('workflow:execute', executeListener);

      dispatchKeyDown({ key: 'Enter', ctrlKey: true });

      expect(executeListener).toHaveBeenCalledTimes(1);

      window.removeEventListener('workflow:execute', executeListener);
    });
  });

  describe('Escape - Cancel execution or deselect', () => {
    it('cancels execution when isExecuting is true', () => {
      mockStore.isExecuting = true;

      const { rerender } = renderHook(() =>
        useKeyboardShortcuts(
          mockStore as WorkflowState,
          mockReactFlow as ReactFlowInstance,
          onCopy,
          onPaste
        )
      );

      rerender();

      dispatchKeyDown({ key: 'Escape' });

      expect(mockStore.setExecutionCancelled).toHaveBeenCalledWith(true);
      expect(mockStore.setExecuting).toHaveBeenCalledWith(false);
      expect(toast.info).toHaveBeenCalledWith('Execution cancelled');
    });

    it('deselects all nodes and edges when not executing', () => {
      mockStore.isExecuting = false;

      const nodes = [
        {
          id: 'node1',
          type: 'textPrompt',
          position: { x: 0, y: 0 },
          data: { label: 'Node 1' },
          selected: true,
        },
      ];

      const edges = [
        {
          id: 'edge1',
          source: 'node1',
          target: 'node2',
          selected: true,
        },
      ];

      mockReactFlow.getNodes = vi.fn().mockReturnValue(nodes);
      mockReactFlow.getEdges = vi.fn().mockReturnValue(edges);

      const { rerender } = renderHook(() =>
        useKeyboardShortcuts(
          mockStore as WorkflowState,
          mockReactFlow as ReactFlowInstance,
          onCopy,
          onPaste
        )
      );

      rerender();

      dispatchKeyDown({ key: 'Escape' });

      expect(mockReactFlow.setNodes).toHaveBeenCalled();
      expect(mockReactFlow.setEdges).toHaveBeenCalled();

      // Verify nodes are deselected
      const nodesUpdater = (mockReactFlow.setNodes as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const resultNodes = nodesUpdater(nodes);
      expect(resultNodes[0].selected).toBe(false);

      // Verify edges are deselected
      const edgesUpdater = (mockReactFlow.setEdges as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const resultEdges = edgesUpdater(edges);
      expect(resultEdges[0].selected).toBe(false);
    });
  });

  describe('Delete/Backspace - Delete selected nodes and edges', () => {
    it('deletes selected nodes and edges with Delete key', () => {
      const selectedNodes = [
        {
          id: 'node1',
          type: 'textPrompt',
          position: { x: 0, y: 0 },
          data: { label: 'Node 1' },
          selected: true,
        },
      ];

      const selectedEdges = [
        {
          id: 'edge1',
          source: 'node1',
          target: 'node2',
          selected: true,
        },
      ];

      mockReactFlow.getNodes = vi.fn().mockReturnValue(selectedNodes);
      mockReactFlow.getEdges = vi.fn().mockReturnValue(selectedEdges);

      const { rerender } = renderHook(() =>
        useKeyboardShortcuts(
          mockStore as WorkflowState,
          mockReactFlow as ReactFlowInstance,
          onCopy,
          onPaste
        )
      );

      rerender();

      dispatchKeyDown({ key: 'Delete' });

      expect(mockReactFlow.deleteElements).toHaveBeenCalledWith({
        nodes: selectedNodes,
        edges: selectedEdges,
      });
    });

    it('deletes selected nodes and edges with Backspace key', () => {
      const selectedNodes = [
        {
          id: 'node1',
          type: 'textPrompt',
          position: { x: 0, y: 0 },
          data: { label: 'Node 1' },
          selected: true,
        },
      ];

      const selectedEdges = [
        {
          id: 'edge1',
          source: 'node1',
          target: 'node2',
          selected: true,
        },
      ];

      mockReactFlow.getNodes = vi.fn().mockReturnValue(selectedNodes);
      mockReactFlow.getEdges = vi.fn().mockReturnValue(selectedEdges);

      const { rerender } = renderHook(() =>
        useKeyboardShortcuts(
          mockStore as WorkflowState,
          mockReactFlow as ReactFlowInstance,
          onCopy,
          onPaste
        )
      );

      rerender();

      dispatchKeyDown({ key: 'Backspace' });

      expect(mockReactFlow.deleteElements).toHaveBeenCalledWith({
        nodes: selectedNodes,
        edges: selectedEdges,
      });
    });

    it('does not call deleteElements when nothing is selected', () => {
      mockReactFlow.getNodes = vi.fn().mockReturnValue([
        {
          id: 'node1',
          type: 'textPrompt',
          position: { x: 0, y: 0 },
          data: { label: 'Node 1' },
          selected: false,
        },
      ]);
      mockReactFlow.getEdges = vi.fn().mockReturnValue([]);

      const { rerender } = renderHook(() =>
        useKeyboardShortcuts(
          mockStore as WorkflowState,
          mockReactFlow as ReactFlowInstance,
          onCopy,
          onPaste
        )
      );

      rerender();

      dispatchKeyDown({ key: 'Delete' });

      expect(mockReactFlow.deleteElements).not.toHaveBeenCalled();
    });
  });

  describe('defaultPrevented events', () => {
    it('ignores events that are already defaultPrevented', () => {
      renderHook(() =>
        useKeyboardShortcuts(
          mockStore as WorkflowState,
          mockReactFlow as ReactFlowInstance,
          onCopy,
          onPaste
        )
      );

      const saveListener = vi.fn();
      window.addEventListener('workflow:save', saveListener);

      // Create a pre-prevented event
      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, 'defaultPrevented', {
        value: true,
        writable: false,
      });

      window.dispatchEvent(event);

      expect(saveListener).not.toHaveBeenCalled();

      window.removeEventListener('workflow:save', saveListener);
    });
  });

  describe('Cleanup', () => {
    it('removes event listener on unmount', () => {
      const { unmount } = renderHook(() =>
        useKeyboardShortcuts(
          mockStore as WorkflowState,
          mockReactFlow as ReactFlowInstance,
          onCopy,
          onPaste
        )
      );

      const saveListener = vi.fn();
      window.addEventListener('workflow:save', saveListener);

      // Before unmount, the shortcut should work
      dispatchKeyDown({ key: 's', ctrlKey: true });
      expect(saveListener).toHaveBeenCalledTimes(1);

      saveListener.mockClear();

      // After unmount, the hook's handler should not dispatch the event
      unmount();

      dispatchKeyDown({ key: 's', ctrlKey: true });

      // The hook's handler was removed, so no event should be dispatched
      expect(saveListener).not.toHaveBeenCalled();

      window.removeEventListener('workflow:save', saveListener);
    });
  });

  describe('Ref updates', () => {
    it('updates storeRef when workflowStore changes', () => {
      const initialStore = { ...mockStore };
      const { rerender } = renderHook(
        ({ store }) =>
          useKeyboardShortcuts(
            store as WorkflowState,
            mockReactFlow as ReactFlowInstance,
            onCopy,
            onPaste
          ),
        { initialProps: { store: initialStore } }
      );

      const newStore = {
        ...mockStore,
        undo: vi.fn(),
      };

      rerender({ store: newStore });

      dispatchKeyDown({ key: 'z', ctrlKey: true });

      expect(newStore.undo).toHaveBeenCalled();
      expect(initialStore.undo).not.toHaveBeenCalled();
    });

    it('updates flowRef when reactFlow changes', () => {
      const initialFlow = { ...mockReactFlow };
      const { rerender } = renderHook(
        ({ flow }) =>
          useKeyboardShortcuts(
            mockStore as WorkflowState,
            flow as ReactFlowInstance,
            onCopy,
            onPaste
          ),
        { initialProps: { flow: initialFlow } }
      );

      const newFlow = {
        ...mockReactFlow,
        setNodes: vi.fn(),
      };

      rerender({ flow: newFlow });

      dispatchKeyDown({ key: 'a', ctrlKey: true });

      expect(newFlow.setNodes).toHaveBeenCalled();
      expect(initialFlow.setNodes).not.toHaveBeenCalled();
    });
  });
});
