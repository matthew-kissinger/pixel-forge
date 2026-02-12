import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KilnGenNode } from '../../src/components/nodes/KilnGenNode';
import { useWorkflowStore } from '../../src/stores/workflow';

// Mock workflow store - KilnGenNode uses both useWorkflowStore and useReactFlow
const mockSetNodeOutput = vi.fn();

vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: Object.assign(vi.fn(), {
    getState: vi.fn(() => ({ nodes: [] })),
  }),
}));

// Mock useReactFlow
const mockUpdateNodeData = vi.fn();
const mockGetEdges = vi.fn(() => []);

vi.mock('@xyflow/react', () => ({
  useReactFlow: () => ({
    updateNodeData: mockUpdateNodeData,
    getEdges: mockGetEdges,
  }),
  Handle: ({ title, ...props }: any) => <div data-testid={`handle-${title || props.type}`} />,
  Position: { Left: 'left', Right: 'right' },
}));

// Mock KilnRuntime - use vi.hoisted to avoid TDZ with vi.mock hoisting
const { MockKilnRuntime, mockMount, mockDispose, mockExecute, mockExportGLB, mockApplyEffect, mockRemoveEffect } = vi.hoisted(() => {
  const mockMount = vi.fn();
  const mockDispose = vi.fn();
  const mockExecute = vi.fn();
  const mockExportGLB = vi.fn();
  const mockApplyEffect = vi.fn();
  const mockRemoveEffect = vi.fn();

  class MockKilnRuntime {
    mount = mockMount;
    dispose = mockDispose;
    execute = mockExecute;
    exportGLB = mockExportGLB;
    applyEffect = mockApplyEffect;
    removeEffect = mockRemoveEffect;
    constructor(_opts?: any) {}
  }

  return { MockKilnRuntime, mockMount, mockDispose, mockExecute, mockExportGLB, mockApplyEffect, mockRemoveEffect };
});

vi.mock('../../src/lib/kiln', () => ({
  KilnRuntime: MockKilnRuntime,
}));

vi.mock('@pixel-forge/shared/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('lucide-react', () => ({
  Box: (props: any) => <div data-testid="icon-Box" />,
  Sparkles: (props: any) => <div data-testid="icon-Sparkles" />,
}));

// Mock sub-components
let capturedModeCallbacks: any = null;
let capturedControlCallbacks: any = null;
let capturedCodeCallbacks: any = null;

vi.mock('../../src/components/nodes/kiln/KilnModeSelector', () => ({
  KilnModeSelector: ({ data, callbacks }: any) => {
    capturedModeCallbacks = callbacks;
    return (
      <div data-testid="kiln-mode-selector">
        <span data-testid="current-mode">{data.mode}</span>
        <span data-testid="current-category">{data.category}</span>
        <button data-testid="mode-glb-btn" onClick={() => callbacks.onModeChange('glb')}>GLB</button>
        <button data-testid="mode-tsl-btn" onClick={() => callbacks.onModeChange('tsl')}>TSL</button>
        <button data-testid="cat-prop-btn" onClick={() => callbacks.onCategoryChange('prop')}>Prop</button>
      </div>
    );
  },
}));

vi.mock('../../src/components/nodes/kiln/KilnPreview', () => ({
  KilnPreview: ({ data, containerRef }: any) => (
    <div data-testid="kiln-preview">
      <div ref={containerRef} data-testid="preview-container" />
    </div>
  ),
}));

vi.mock('../../src/components/nodes/kiln/KilnControls', () => ({
  KilnControls: ({ data, callbacks, isRunning }: any) => {
    capturedControlCallbacks = callbacks;
    return (
      <div data-testid="kiln-controls">
        <span data-testid="is-running">{isRunning ? 'true' : 'false'}</span>
        <button data-testid="generate-btn" onClick={callbacks.onGenerate} disabled={isRunning}>
          {isRunning ? 'Generating...' : 'Generate'}
        </button>
        <button data-testid="download-btn" onClick={callbacks.onDownload}>Download</button>
        <textarea
          data-testid="prompt-textarea"
          value={data.prompt || ''}
          onChange={(e: any) => callbacks.onPromptChange(e.target.value)}
        />
        <input
          data-testid="animation-toggle"
          type="checkbox"
          checked={data.includeAnimation ?? true}
          onChange={(e: any) => callbacks.onAnimationToggle(e.target.checked)}
        />
        <button data-testid="toggle-code-btn" onClick={callbacks.onToggleCodeEditor}>Code</button>
      </div>
    );
  },
}));

vi.mock('../../src/components/nodes/kiln/KilnCodeEditor', () => ({
  KilnCodeEditor: ({ data, callbacks, showCode }: any) => {
    capturedCodeCallbacks = callbacks;
    return showCode ? (
      <div data-testid="kiln-code-editor">
        <textarea
          data-testid="code-editor-textarea"
          value={data.code || ''}
          onChange={(e: any) => callbacks.onCodeChange(e.target.value)}
        />
      </div>
    ) : null;
  },
}));

describe('KilnGenNode', () => {
  const baseData = {
    nodeType: 'kilnGen' as const,
    label: 'Kiln Gen',
    prompt: '',
    mode: 'glb' as const,
    category: 'prop' as const,
    includeAnimation: true,
    code: null as string | null,
    effectCode: null as string | null,
    glbUrl: null as string | null,
    triangleCount: null as number | null,
    errors: [] as string[],
  };

  const baseProps = {
    id: 'test-kiln-node',
    data: baseData,
    selected: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    capturedModeCallbacks = null;
    capturedControlCallbacks = null;
    capturedCodeCallbacks = null;

    // Reset the mock for useWorkflowStore
    (useWorkflowStore as any).mockReturnValue(mockSetNodeOutput);
    // Also mock the function-style call: useWorkflowStore((s) => s.setNodeOutput)
    (useWorkflowStore as any).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({ setNodeOutput: mockSetNodeOutput });
      }
      return { setNodeOutput: mockSetNodeOutput };
    });
    // Keep getState working
    (useWorkflowStore as any).getState = vi.fn(() => ({ nodes: [] }));

    mockGetEdges.mockReturnValue([]);

    // Reset global fetch mock
    globalThis.fetch = vi.fn();
  });

  describe('rendering', () => {
    it('renders with default props', () => {
      render(<KilnGenNode {...baseProps} />);

      expect(screen.getByText('Kiln Gen')).toBeInTheDocument();
    });

    it('shows the mode label in header', () => {
      render(<KilnGenNode {...baseProps} />);

      // Header shows mode text - use getAllByText since 'glb' appears in both header and mode selector
      const glbElements = screen.getAllByText('glb');
      expect(glbElements.length).toBeGreaterThan(0);
    });

    it('shows Box icon for glb mode', () => {
      render(<KilnGenNode {...baseProps} />);

      expect(screen.getByTestId('icon-Box')).toBeInTheDocument();
    });

    it('shows Sparkles icon for tsl mode', () => {
      const props = {
        ...baseProps,
        data: { ...baseData, mode: 'tsl' as const },
      };
      render(<KilnGenNode {...props} />);

      expect(screen.getByTestId('icon-Sparkles')).toBeInTheDocument();
    });

    it('renders all sub-components', () => {
      render(<KilnGenNode {...baseProps} />);

      expect(screen.getByTestId('kiln-mode-selector')).toBeInTheDocument();
      expect(screen.getByTestId('kiln-preview')).toBeInTheDocument();
      expect(screen.getByTestId('kiln-controls')).toBeInTheDocument();
    });

    it('renders input and output handles', () => {
      render(<KilnGenNode {...baseProps} />);

      expect(screen.getByTestId('handle-target')).toBeInTheDocument();
      expect(screen.getByTestId('handle-source')).toBeInTheDocument();
    });

    it('does not show code editor by default', () => {
      render(<KilnGenNode {...baseProps} />);

      expect(screen.queryByTestId('kiln-code-editor')).not.toBeInTheDocument();
    });
  });

  describe('selected state', () => {
    it('applies selected border styling', () => {
      const props = { ...baseProps, selected: true };
      render(<KilnGenNode {...props} />);

      // Verify it renders without error
      expect(screen.getByText('Kiln Gen')).toBeInTheDocument();
    });
  });

  describe('mode callbacks', () => {
    it('updates mode when mode button is clicked', () => {
      render(<KilnGenNode {...baseProps} />);

      fireEvent.click(screen.getByTestId('mode-tsl-btn'));

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-kiln-node', { mode: 'tsl' });
    });

    it('updates category when category button is clicked', () => {
      render(<KilnGenNode {...baseProps} />);

      fireEvent.click(screen.getByTestId('cat-prop-btn'));

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-kiln-node', { category: 'prop' });
    });
  });

  describe('control callbacks', () => {
    it('updates prompt when changed', () => {
      render(<KilnGenNode {...baseProps} />);

      const textarea = screen.getByTestId('prompt-textarea');
      fireEvent.change(textarea, { target: { value: 'a low-poly tree' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-kiln-node', {
        prompt: 'a low-poly tree',
      });
    });

    it('updates animation toggle', () => {
      render(<KilnGenNode {...baseProps} />);

      const checkbox = screen.getByTestId('animation-toggle');
      // Use click instead of change for checkbox - the mock needs e.target.checked
      fireEvent.click(checkbox);

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-kiln-node', {
        includeAnimation: false,
      });
    });

    it('toggles code editor visibility', () => {
      render(<KilnGenNode {...baseProps} />);

      expect(screen.queryByTestId('kiln-code-editor')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('toggle-code-btn'));

      expect(screen.getByTestId('kiln-code-editor')).toBeInTheDocument();
    });

    it('hides code editor on second toggle', () => {
      render(<KilnGenNode {...baseProps} />);

      fireEvent.click(screen.getByTestId('toggle-code-btn'));
      expect(screen.getByTestId('kiln-code-editor')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('toggle-code-btn'));
      expect(screen.queryByTestId('kiln-code-editor')).not.toBeInTheDocument();
    });
  });

  describe('code editor callbacks', () => {
    it('updates code when edited', () => {
      render(<KilnGenNode {...baseProps} />);

      // Open code editor
      fireEvent.click(screen.getByTestId('toggle-code-btn'));

      const codeTextarea = screen.getByTestId('code-editor-textarea');
      fireEvent.change(codeTextarea, { target: { value: 'new code' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-kiln-node', {
        code: 'new code',
      });
    });
  });

  describe('generate action', () => {
    it('sets error when no prompt is available', async () => {
      const props = {
        ...baseProps,
        data: { ...baseData, prompt: '' },
      };

      render(<KilnGenNode {...props} />);

      fireEvent.click(screen.getByTestId('generate-btn'));

      await waitFor(() => {
        expect(mockUpdateNodeData).toHaveBeenCalledWith('test-kiln-node', {
          errors: ['Enter a prompt to generate'],
        });
      });
    });

    it('calls fetch with correct parameters when generating', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ success: true, code: 'generated code' }),
      };
      (globalThis.fetch as any).mockResolvedValue(mockResponse);

      const props = {
        ...baseProps,
        data: { ...baseData, prompt: 'a low-poly tree' },
      };

      render(<KilnGenNode {...props} />);

      fireEvent.click(screen.getByTestId('generate-btn'));

      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalledWith('/api/kiln/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('a low-poly tree'),
        });
      });
    });

    it('updates code on successful generation', async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            code: 'const mesh = new THREE.Mesh();',
            effectCode: 'tsl effect',
          }),
      };
      (globalThis.fetch as any).mockResolvedValue(mockResponse);

      const props = {
        ...baseProps,
        data: { ...baseData, prompt: 'a low-poly tree' },
      };

      render(<KilnGenNode {...props} />);

      fireEvent.click(screen.getByTestId('generate-btn'));

      await waitFor(() => {
        expect(mockUpdateNodeData).toHaveBeenCalledWith('test-kiln-node', {
          code: 'const mesh = new THREE.Mesh();',
          effectCode: 'tsl effect',
          errors: [],
        });
      });
    });

    it('sets error on failed API response', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
      };
      (globalThis.fetch as any).mockResolvedValue(mockResponse);

      const props = {
        ...baseProps,
        data: { ...baseData, prompt: 'a low-poly tree' },
      };

      render(<KilnGenNode {...props} />);

      fireEvent.click(screen.getByTestId('generate-btn'));

      await waitFor(() => {
        expect(mockUpdateNodeData).toHaveBeenCalledWith('test-kiln-node', {
          errors: ['Server error: 500'],
        });
      });
    });

    it('sets error on network failure', async () => {
      (globalThis.fetch as any).mockRejectedValue(new Error('Network error'));

      const props = {
        ...baseProps,
        data: { ...baseData, prompt: 'a low-poly tree' },
      };

      render(<KilnGenNode {...props} />);

      fireEvent.click(screen.getByTestId('generate-btn'));

      await waitFor(() => {
        expect(mockUpdateNodeData).toHaveBeenCalledWith('test-kiln-node', {
          errors: ['Network error'],
        });
      });
    });

    it('sets error when result is unsuccessful', async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Model not available',
          }),
      };
      (globalThis.fetch as any).mockResolvedValue(mockResponse);

      const props = {
        ...baseProps,
        data: { ...baseData, prompt: 'a low-poly tree' },
      };

      render(<KilnGenNode {...props} />);

      fireEvent.click(screen.getByTestId('generate-btn'));

      await waitFor(() => {
        expect(mockUpdateNodeData).toHaveBeenCalledWith('test-kiln-node', {
          errors: ['Model not available'],
        });
      });
    });
  });

  describe('prompt resolution', () => {
    it('uses connected text prompt node when available', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ success: true, code: 'code' }),
      };
      (globalThis.fetch as any).mockResolvedValue(mockResponse);

      mockGetEdges.mockReturnValue([{ source: 'prompt-node', target: 'test-kiln-node' }]);
      (useWorkflowStore as any).getState = vi.fn(() => ({
        nodes: [
          {
            id: 'prompt-node',
            type: 'textPrompt',
            data: { prompt: 'connected prompt text' },
          },
        ],
      }));

      const props = {
        ...baseProps,
        data: { ...baseData, prompt: 'inline prompt' },
      };

      render(<KilnGenNode {...props} />);

      fireEvent.click(screen.getByTestId('generate-btn'));

      await waitFor(() => {
        const fetchBody = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
        expect(fetchBody.prompt).toBe('connected prompt text');
      });
    });

    it('falls back to inline prompt when no connected node', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ success: true, code: 'code' }),
      };
      (globalThis.fetch as any).mockResolvedValue(mockResponse);

      const props = {
        ...baseProps,
        data: { ...baseData, prompt: 'inline prompt' },
      };

      render(<KilnGenNode {...props} />);

      fireEvent.click(screen.getByTestId('generate-btn'));

      await waitFor(() => {
        const fetchBody = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
        expect(fetchBody.prompt).toBe('inline prompt');
      });
    });
  });

  describe('running state', () => {
    it('passes isRunning false initially', () => {
      render(<KilnGenNode {...baseProps} />);

      expect(screen.getByTestId('is-running').textContent).toBe('false');
    });
  });

  describe('mode display', () => {
    it('shows mode selector with current mode', () => {
      render(<KilnGenNode {...baseProps} />);

      expect(screen.getByTestId('current-mode').textContent).toBe('glb');
    });

    it('shows category in mode selector', () => {
      render(<KilnGenNode {...baseProps} />);

      expect(screen.getByTestId('current-category').textContent).toBe('prop');
    });
  });
});
