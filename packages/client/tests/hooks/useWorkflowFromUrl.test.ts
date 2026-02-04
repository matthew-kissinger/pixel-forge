import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWorkflowFromUrl } from '../../src/hooks/useWorkflowFromUrl';
import { decodeWorkflow } from '../../src/lib/share';
import { toast } from '../../src/components/ui/Toast';
import { useWorkflowStore } from '../../src/stores/workflow';
import type { WorkflowFromUrlStatus } from '../../src/hooks/useWorkflowFromUrl';
import type { WorkflowData } from '../../src/types/workflow';

vi.mock('../../src/lib/share', () => ({
  decodeWorkflow: vi.fn(),
}));

vi.mock('../../src/components/ui/Toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

vi.mock('@pixel-forge/shared/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('useWorkflowFromUrl', () => {
  let importWorkflowMock: ReturnType<typeof vi.fn>;
  let replaceStateSpy: ReturnType<typeof vi.spyOn>;
  const useWorkflowStoreMock = useWorkflowStore as unknown as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    importWorkflowMock = vi.fn();
    useWorkflowStoreMock.mockImplementation(
      (selector: (state: { importWorkflow: typeof importWorkflowMock }) => unknown) =>
        selector({ importWorkflow: importWorkflowMock })
    );

    window.location.hash = '';
    replaceStateSpy = vi.spyOn(history, 'replaceState');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns none when there is no hash', async () => {
    const { result } = renderHook(() => useWorkflowFromUrl());

    await waitFor(() => {
      const status: WorkflowFromUrlStatus = result.current;
      expect(status).toBe('none');
    });

    expect(decodeWorkflow).not.toHaveBeenCalled();
    expect(importWorkflowMock).not.toHaveBeenCalled();
    expect(replaceStateSpy).not.toHaveBeenCalled();
  });

  it('returns none when hash does not have #wf= prefix', async () => {
    window.location.hash = '#other=abc';

    const { result } = renderHook(() => useWorkflowFromUrl());

    await waitFor(() => {
      const status: WorkflowFromUrlStatus = result.current;
      expect(status).toBe('none');
    });

    expect(decodeWorkflow).not.toHaveBeenCalled();
    expect(importWorkflowMock).not.toHaveBeenCalled();
    expect(replaceStateSpy).not.toHaveBeenCalled();
  });

  it('returns error for empty #wf= hash, shows error toast, and clears hash', async () => {
    window.location.hash = '#wf=';

    const { result } = renderHook(() => useWorkflowFromUrl());

    await waitFor(() => {
      const status: WorkflowFromUrlStatus = result.current;
      expect(status).toBe('error');
    });

    expect(decodeWorkflow).not.toHaveBeenCalled();
    expect(importWorkflowMock).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Shared workflow URL is empty');
    expect(replaceStateSpy).toHaveBeenCalledWith(
      null,
      '',
      window.location.pathname + window.location.search
    );
  });

  it('decodes workflow, imports, returns loaded, shows success toast, and clears hash', async () => {
    window.location.hash = '#wf=encoded123';

    const workflow: WorkflowData = {
      version: 1,
      nodes: [],
      edges: [],
    };

    (decodeWorkflow as ReturnType<typeof vi.fn>).mockResolvedValue(workflow);

    const { result } = renderHook(() => useWorkflowFromUrl());

    await waitFor(() => {
      const status: WorkflowFromUrlStatus = result.current;
      expect(status).toBe('loaded');
    });

    expect(decodeWorkflow).toHaveBeenCalledWith('encoded123');
    expect(importWorkflowMock).toHaveBeenCalledWith(workflow);
    expect(toast.success).toHaveBeenCalledWith('Loaded shared workflow');
    expect(replaceStateSpy).toHaveBeenCalledWith(
      null,
      '',
      window.location.pathname + window.location.search
    );
  });

  it('returns error for invalid hash, shows error toast, and clears hash', async () => {
    window.location.hash = '#wf=broken';

    (decodeWorkflow as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { result } = renderHook(() => useWorkflowFromUrl());

    await waitFor(() => {
      const status: WorkflowFromUrlStatus = result.current;
      expect(status).toBe('error');
    });

    expect(decodeWorkflow).toHaveBeenCalledWith('broken');
    expect(importWorkflowMock).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Failed to load shared workflow');
    expect(replaceStateSpy).toHaveBeenCalledWith(
      null,
      '',
      window.location.pathname + window.location.search
    );
  });

  it('returns error when importWorkflow throws, shows error toast, and clears hash', async () => {
    window.location.hash = '#wf=encoded123';

    const workflow: WorkflowData = {
      version: 1,
      nodes: [],
      edges: [],
    };

    (decodeWorkflow as ReturnType<typeof vi.fn>).mockResolvedValue(workflow);
    importWorkflowMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const { result } = renderHook(() => useWorkflowFromUrl());

    await waitFor(() => {
      const status: WorkflowFromUrlStatus = result.current;
      expect(status).toBe('error');
    });

    expect(importWorkflowMock).toHaveBeenCalledWith(workflow);
    expect(toast.error).toHaveBeenCalledWith('Failed to import shared workflow');
    expect(replaceStateSpy).toHaveBeenCalledWith(
      null,
      '',
      window.location.pathname + window.location.search
    );
  });

  it('does not update state after unmount when async work resolves late', async () => {
    window.location.hash = '#wf=delayed';

    let resolveWorkflow!: (workflow: WorkflowData | null) => void;
    const workflowPromise = new Promise<WorkflowData | null>((resolve) => {
      resolveWorkflow = resolve;
    });

    (decodeWorkflow as ReturnType<typeof vi.fn>).mockReturnValue(workflowPromise);

    const { unmount } = renderHook(() => useWorkflowFromUrl());
    unmount();

    resolveWorkflow({ version: 1, nodes: [], edges: [] });

    await waitFor(() => {
      expect(importWorkflowMock).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });

    expect(replaceStateSpy).not.toHaveBeenCalled();
  });
});
