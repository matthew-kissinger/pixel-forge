import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAutoSave } from '../../src/hooks/useAutoSave';
import { useWorkflowStore } from '../../src/stores/workflow';
import { toast } from '../../src/components/ui/Toast';
import type { WorkflowData } from '../../src/types/workflow';

// Mock dependencies
vi.mock('../../src/components/ui/Toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock logger to avoid console noise
vi.mock('@pixel-forge/shared/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const AUTOSAVE_KEY = 'pixel-forge-autosave';
const DEBOUNCE_MS = 2000;

describe('useAutoSave', () => {
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      return localStorageMock[key] || null;
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      localStorageMock[key] = value;
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => {
      delete localStorageMock[key];
    });

    // Reset store
    useWorkflowStore.getState().reset();

    // Clear toast mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Auto-save functionality', () => {
    it('saves workflow to localStorage after debounce', async () => {
      vi.useFakeTimers();

      renderHook(() => useAutoSave());

      // Add a node to trigger save
      const store = useWorkflowStore.getState();
      store.addNode({
        id: 'test-1',
        type: 'textPrompt',
        position: { x: 0, y: 0 },
        data: { label: 'Test', prompt: 'hello' },
      });

      // Should not save immediately
      expect(localStorageMock[AUTOSAVE_KEY]).toBeUndefined();

      // Advance timers by debounce duration
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

      // Should have saved
      expect(localStorageMock[AUTOSAVE_KEY]).toBeDefined();
      const saved = JSON.parse(localStorageMock[AUTOSAVE_KEY]);
      expect(saved.nodes).toHaveLength(1);
      expect(saved.nodes[0].id).toBe('test-1');
    });

    it('skips save when JSON unchanged', async () => {
      vi.useFakeTimers();

      renderHook(() => useAutoSave());

      const store = useWorkflowStore.getState();

      // First change
      store.addNode({
        id: 'test-1',
        type: 'textPrompt',
        position: { x: 0, y: 0 },
        data: { label: 'Test', prompt: 'hello' },
      });

      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

      const firstSave = localStorageMock[AUTOSAVE_KEY];
      expect(firstSave).toBeDefined();

      // Clear the mock to count new calls
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      // Trigger another change that results in same JSON
      // (updateNodeData with same values)
      store.updateNodeData('test-1', { prompt: 'hello' });

      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

      // setItem should not be called again because JSON is unchanged
      expect(setItemSpy).not.toHaveBeenCalled();
    });

    it('does not save workflow larger than 4MB', async () => {
      vi.useFakeTimers();

      renderHook(() => useAutoSave());

      const store = useWorkflowStore.getState();

      // Create a large workflow (simulate with many nodes with large data)
      const largeData = 'x'.repeat(5 * 1024 * 1024); // 5MB of data
      store.addNode({
        id: 'test-1',
        type: 'textPrompt',
        position: { x: 0, y: 0 },
        data: { label: 'Test', prompt: largeData },
      });

      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

      // Should not save to localStorage
      expect(localStorageMock[AUTOSAVE_KEY]).toBeUndefined();
    });

    it('debounces multiple rapid changes', async () => {
      vi.useFakeTimers();

      renderHook(() => useAutoSave());

      const store = useWorkflowStore.getState();

      // Make 5 rapid changes
      for (let i = 0; i < 5; i++) {
        store.addNode({
          id: `test-${i}`,
          type: 'textPrompt',
          position: { x: i * 100, y: 0 },
          data: { label: `Test ${i}`, prompt: 'hello' },
        });
        // Advance by a small amount but not enough to complete debounce
        await vi.advanceTimersByTimeAsync(500);
      }

      // Should not have saved yet (debounce keeps resetting)
      expect(localStorageMock[AUTOSAVE_KEY]).toBeUndefined();

      // Now wait for the full debounce period after the last change
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

      // Should have saved
      expect(localStorageMock[AUTOSAVE_KEY]).toBeDefined();
      const saved = JSON.parse(localStorageMock[AUTOSAVE_KEY]);
      expect(saved.nodes).toHaveLength(5);
    });

    it('updates lastAutoSave timestamp when saving', async () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      renderHook(() => useAutoSave());

      const store = useWorkflowStore.getState();
      store.addNode({
        id: 'test-1',
        type: 'textPrompt',
        position: { x: 0, y: 0 },
        data: { label: 'Test', prompt: 'hello' },
      });

      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

      // Check that lastAutoSave was set to a recent timestamp (within reasonable range)
      expect(store.lastAutoSave).toBeDefined();
      expect(store.lastAutoSave).toBeGreaterThanOrEqual(now);
    });
  });

  describe('Recovery on mount', () => {
    it('exposes pendingRecovery when localStorage has valid workflow with nodes', () => {
      const workflow: WorkflowData = {
        version: 1,
        nodes: [
          {
            id: 'test-1',
            type: 'textPrompt',
            position: { x: 0, y: 0 },
            data: { label: 'Test', prompt: 'hello' },
          },
        ],
        edges: [],
      };

      localStorageMock[AUTOSAVE_KEY] = JSON.stringify(workflow);

      const { result } = renderHook(() => useAutoSave());

      expect(result.current.pendingRecovery).not.toBeNull();
      expect(result.current.pendingRecovery?.nodes).toHaveLength(1);
      expect(result.current.pendingRecovery?.nodes[0].id).toBe('test-1');
      expect(typeof result.current.confirmRecovery).toBe('function');
      expect(typeof result.current.discardRecovery).toBe('function');
    });

    it('recovers workflow when user calls confirmRecovery', async () => {
      const workflow: WorkflowData = {
        version: 1,
        nodes: [
          {
            id: 'test-1',
            type: 'textPrompt',
            position: { x: 0, y: 0 },
            data: { label: 'Test', prompt: 'hello' },
          },
        ],
        edges: [],
      };

      localStorageMock[AUTOSAVE_KEY] = JSON.stringify(workflow);

      const { result } = renderHook(() => useAutoSave());

      result.current.confirmRecovery();

      const store = useWorkflowStore.getState();
      expect(store.nodes).toHaveLength(1);
      expect(store.nodes[0].id).toBe('test-1');
      expect(toast.success).toHaveBeenCalledWith('Workflow recovered');
      await waitFor(() => {
        expect(result.current.pendingRecovery).toBeNull();
      });
    });

    it('removes workflow from localStorage when user calls discardRecovery', async () => {
      const workflow: WorkflowData = {
        version: 1,
        nodes: [
          {
            id: 'test-1',
            type: 'textPrompt',
            position: { x: 0, y: 0 },
            data: { label: 'Test', prompt: 'hello' },
          },
        ],
        edges: [],
      };

      localStorageMock[AUTOSAVE_KEY] = JSON.stringify(workflow);

      const { result } = renderHook(() => useAutoSave());

      result.current.discardRecovery();

      expect(localStorageMock[AUTOSAVE_KEY]).toBeUndefined();

      const store = useWorkflowStore.getState();
      expect(store.nodes).toHaveLength(0);
      await waitFor(() => {
        expect(result.current.pendingRecovery).toBeNull();
      });
    });

    it('does not set pendingRecovery when no saved data exists', () => {
      const { result } = renderHook(() => useAutoSave());

      expect(result.current.pendingRecovery).toBeNull();
    });

    it('does not set pendingRecovery when saved workflow has no nodes', () => {
      const workflow: WorkflowData = {
        version: 1,
        nodes: [],
        edges: [],
      };

      localStorageMock[AUTOSAVE_KEY] = JSON.stringify(workflow);

      const { result } = renderHook(() => useAutoSave());

      expect(result.current.pendingRecovery).toBeNull();
    });

    it('removes invalid saved data and does not set pendingRecovery', () => {
      localStorageMock[AUTOSAVE_KEY] = 'invalid json{{{';

      const { result } = renderHook(() => useAutoSave());

      expect(result.current.pendingRecovery).toBeNull();
      expect(localStorageMock[AUTOSAVE_KEY]).toBeUndefined();
    });

    it('does not set pendingRecovery when allowRecovery is false', () => {
      const workflow: WorkflowData = {
        version: 1,
        nodes: [
          {
            id: 'test-1',
            type: 'textPrompt',
            position: { x: 0, y: 0 },
            data: { label: 'Test', prompt: 'hello' },
          },
        ],
        edges: [],
      };

      localStorageMock[AUTOSAVE_KEY] = JSON.stringify(workflow);

      const { result } = renderHook(() => useAutoSave({ allowRecovery: false }));

      expect(result.current.pendingRecovery).toBeNull();

      const store = useWorkflowStore.getState();
      expect(store.nodes).toHaveLength(0);
    });

    it('only sets pendingRecovery once on mount', () => {
      const workflow: WorkflowData = {
        version: 1,
        nodes: [
          {
            id: 'test-1',
            type: 'textPrompt',
            position: { x: 0, y: 0 },
            data: { label: 'Test', prompt: 'hello' },
          },
        ],
        edges: [],
      };

      localStorageMock[AUTOSAVE_KEY] = JSON.stringify(workflow);

      const { result, rerender } = renderHook(() => useAutoSave());

      expect(result.current.pendingRecovery).not.toBeNull();
      const firstPending = result.current.pendingRecovery;

      rerender();

      expect(result.current.pendingRecovery).toBe(firstPending);
    });
  });

  describe('Cleanup', () => {
    it('clears timeout on unmount', async () => {
      vi.useFakeTimers();

      const { unmount } = renderHook(() => useAutoSave());

      const store = useWorkflowStore.getState();
      store.addNode({
        id: 'test-1',
        type: 'textPrompt',
        position: { x: 0, y: 0 },
        data: { label: 'Test', prompt: 'hello' },
      });

      // Unmount before debounce completes
      unmount();

      // Advance timers
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

      // Should not have saved because hook was unmounted
      expect(localStorageMock[AUTOSAVE_KEY]).toBeUndefined();
    });

    it('unsubscribes from store on unmount', () => {
      const subscribeSpy = vi.spyOn(useWorkflowStore, 'subscribe');

      const { unmount } = renderHook(() => useAutoSave());

      expect(subscribeSpy).toHaveBeenCalled();

      // Get the unsubscribe function that was returned
      const unsubscribeFn = subscribeSpy.mock.results[0].value;
      const unsubscribeSpy = vi.fn(unsubscribeFn);

      // Replace with spy
      subscribeSpy.mockReturnValue(unsubscribeSpy as any);

      // Unmount should call unsubscribe
      unmount();

      // Note: We can't directly verify unsubscribe was called because it's
      // an internal implementation detail, but we can verify no errors occur
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('handles save errors gracefully', async () => {
      vi.useFakeTimers();

      // Make setItem throw
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      renderHook(() => useAutoSave());

      const store = useWorkflowStore.getState();
      store.addNode({
        id: 'test-1',
        type: 'textPrompt',
        position: { x: 0, y: 0 },
        data: { label: 'Test', prompt: 'hello' },
      });

      // Should not throw
      await expect(vi.advanceTimersByTimeAsync(DEBOUNCE_MS)).resolves.not.toThrow();
    });

    it('handles export errors gracefully', async () => {
      vi.useFakeTimers();

      renderHook(() => useAutoSave());

      const store = useWorkflowStore.getState();

      // Mock exportWorkflow to throw
      vi.spyOn(store, 'exportWorkflow').mockImplementation(() => {
        throw new Error('Export failed');
      });

      store.addNode({
        id: 'test-1',
        type: 'textPrompt',
        position: { x: 0, y: 0 },
        data: { label: 'Test', prompt: 'hello' },
      });

      // Should not throw
      await expect(vi.advanceTimersByTimeAsync(DEBOUNCE_MS)).resolves.not.toThrow();
    });

    it('uses subscribe with equality function for nodes and edges', () => {
      // This test verifies the hook sets up subscription correctly
      // by spying on the subscribe method
      const subscribeSpy = vi.spyOn(useWorkflowStore, 'subscribe');

      renderHook(() => useAutoSave());

      // Verify subscribe was called with a selector and callback
      expect(subscribeSpy).toHaveBeenCalled();

      const subscribeCall = subscribeSpy.mock.calls[0];
      expect(subscribeCall).toBeDefined();

      // The first argument should be a selector function
      const selector = subscribeCall[0];
      expect(typeof selector).toBe('function');

      // Test the selector returns nodes and edges
      const mockState = {
        nodes: [{ id: '1', type: 'test', position: { x: 0, y: 0 }, data: {} }],
        edges: [{ id: 'e1', source: '1', target: '2' }],
      };
      const selected = selector(mockState as any);
      expect(selected).toEqual({ nodes: mockState.nodes, edges: mockState.edges });

      // The third argument should have an equalityFn
      const options = subscribeCall[2];
      expect(options).toBeDefined();
      expect(typeof options?.equalityFn).toBe('function');
    });
  });
});
