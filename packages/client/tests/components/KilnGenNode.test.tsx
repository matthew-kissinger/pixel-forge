import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KilnGenNode } from '../../src/components/nodes/KilnGenNode';
import { useWorkflowStore } from '../../src/stores/workflow';

// Mock workflow store - useWorkflowStore is used both as a Zustand selector hook and .getState()
vi.mock('../../src/stores/workflow', () => {
  const fn = vi.fn();
  fn.getState = vi.fn();
  return { useWorkflowStore: fn };
});

// Mock React Flow
vi.mock('@xyflow/react', () => {
  const updateNodeData = vi.fn();
  const getEdges = vi.fn().mockReturnValue([]);
  return {
    useReactFlow: () => ({ updateNodeData, getEdges }),
    Handle: ({ type, position, ...rest }: any) => (
      <div data-testid={`handle-${type}`} data-position={position} {...rest} />
    ),
    Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
  };
});

// Mock KilnRuntime
vi.mock('../../src/lib/kiln', () => {
  class MockKilnRuntime {
    mount = vi.fn();
    dispose = vi.fn();
    execute = vi.fn().mockResolvedValue({ success: true });
    exportGLB = vi.fn().mockResolvedValue('blob:mock-glb-url');
    applyEffect = vi.fn().mockResolvedValue({ success: true });
    removeEffect = vi.fn();
    resetCamera = vi.fn();
    zoomIn = vi.fn();
    zoomOut = vi.fn();
  }
  return { KilnRuntime: MockKilnRuntime };
});

// Mock logger
vi.mock('@pixel-forge/shared/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Box: () => <div data-testid="box-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
  Play: () => <div data-testid="play-icon" />,
  Edit3: () => <div data-testid="edit-icon" />,
  Download: () => <div data-testid="download-icon" />,
  RotateCcw: () => <div data-testid="rotate-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  ZoomIn: () => <div data-testid="zoom-in-icon" />,
  ZoomOut: () => <div data-testid="zoom-out-icon" />,
  Maximize2: () => <div data-testid="maximize-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Get mock references from imported modules
import { useReactFlow } from '@xyflow/react';

function getMocks() {
  const rf = (useReactFlow as any)();
  return {
    updateNodeData: rf.updateNodeData as ReturnType<typeof vi.fn>,
    getEdges: rf.getEdges as ReturnType<typeof vi.fn>,
  };
}

describe('KilnGenNode', () => {
  const defaultData = {
    nodeType: 'kilnGen' as const,
    label: '3D Generator',
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

  const defaultProps = {
    id: 'kiln-1',
    data: { ...defaultData },
    selected: false,
  };

  let mockUpdateNodeData: ReturnType<typeof vi.fn>;
  let mockGetEdges: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    const mocks = getMocks();
    mockUpdateNodeData = mocks.updateNodeData;
    mockGetEdges = mocks.getEdges;
    mockGetEdges.mockReturnValue([]);
    (useWorkflowStore as any).mockReturnValue(vi.fn()); // setNodeOutput mock
    (useWorkflowStore as any).getState.mockReturnValue({ nodes: [] });
    mockFetch.mockReset();
  });

  describe('rendering', () => {
    it('renders with default props', () => {
      render(<KilnGenNode {...defaultProps} />);
      expect(screen.getByText('3D Generator')).toBeInTheDocument();
    });

    it('displays the node label in header', () => {
      const props = { ...defaultProps, data: { ...defaultData, label: 'My Asset' } };
      render(<KilnGenNode {...props} />);
      expect(screen.getByText('My Asset')).toBeInTheDocument();
    });

    it('shows mode badge in header', () => {
      render(<KilnGenNode {...defaultProps} />);
      expect(screen.getByText('glb')).toBeInTheDocument();
    });

    it('shows Box icon when mode is glb', () => {
      render(<KilnGenNode {...defaultProps} />);
      expect(screen.getByTestId('box-icon')).toBeInTheDocument();
    });

    it('shows Sparkles icon when mode is tsl', () => {
      const props = { ...defaultProps, data: { ...defaultData, mode: 'tsl' as const } };
      render(<KilnGenNode {...props} />);
      expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument();
    });

    it('renders input and output handles', () => {
      render(<KilnGenNode {...defaultProps} />);
      expect(screen.getByTestId('handle-target')).toBeInTheDocument();
      expect(screen.getByTestId('handle-source')).toBeInTheDocument();
    });

    it('applies selected border style', () => {
      const props = { ...defaultProps, selected: true };
      const { container } = render(<KilnGenNode {...props} />);
      expect(container.firstChild).toHaveClass('border-purple-500');
    });

    it('applies default border when not selected', () => {
      const { container } = render(<KilnGenNode {...defaultProps} />);
      expect(container.firstChild).toHaveClass('border-zinc-700');
    });
  });

  describe('mode selector', () => {
    it('renders GLB, TSL, and Both mode buttons', () => {
      render(<KilnGenNode {...defaultProps} />);
      expect(screen.getByText('GLB')).toBeInTheDocument();
      expect(screen.getByText('TSL')).toBeInTheDocument();
      expect(screen.getByText('Both')).toBeInTheDocument();
    });

    it('calls updateNodeData when GLB mode clicked', () => {
      const props = { ...defaultProps, data: { ...defaultData, mode: 'tsl' as const } };
      render(<KilnGenNode {...props} />);
      fireEvent.click(screen.getByText('GLB'));
      expect(mockUpdateNodeData).toHaveBeenCalledWith('kiln-1', { mode: 'glb' });
    });

    it('calls updateNodeData when TSL mode clicked', () => {
      render(<KilnGenNode {...defaultProps} />);
      fireEvent.click(screen.getByText('TSL'));
      expect(mockUpdateNodeData).toHaveBeenCalledWith('kiln-1', { mode: 'tsl' });
    });

    it('calls updateNodeData when Both mode clicked', () => {
      render(<KilnGenNode {...defaultProps} />);
      fireEvent.click(screen.getByText('Both'));
      expect(mockUpdateNodeData).toHaveBeenCalledWith('kiln-1', { mode: 'both' });
    });
  });

  describe('category selector', () => {
    it('renders all category buttons', () => {
      render(<KilnGenNode {...defaultProps} />);
      expect(screen.getByText('char')).toBeInTheDocument();
      expect(screen.getByText('prop')).toBeInTheDocument();
      expect(screen.getByText('vfx')).toBeInTheDocument();
      expect(screen.getByText('envi')).toBeInTheDocument();
    });

    it('calls updateNodeData when category is clicked', () => {
      render(<KilnGenNode {...defaultProps} />);
      fireEvent.click(screen.getByText('char'));
      expect(mockUpdateNodeData).toHaveBeenCalledWith('kiln-1', { category: 'character' });
    });
  });

  describe('controls', () => {
    it('renders animation toggle checkbox', () => {
      render(<KilnGenNode {...defaultProps} />);
      expect(screen.getByText('Include animations')).toBeInTheDocument();
    });

    it('animation checkbox reflects data state', () => {
      render(<KilnGenNode {...defaultProps} />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('calls updateNodeData when animation toggled off', () => {
      render(<KilnGenNode {...defaultProps} />);
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      expect(mockUpdateNodeData).toHaveBeenCalledWith('kiln-1', { includeAnimation: false });
    });

    it('renders prompt textarea', () => {
      render(<KilnGenNode {...defaultProps} />);
      expect(screen.getByPlaceholderText('Describe what to generate...')).toBeInTheDocument();
    });

    it('calls updateNodeData when prompt changes', () => {
      render(<KilnGenNode {...defaultProps} />);
      const textarea = screen.getByPlaceholderText('Describe what to generate...');
      fireEvent.change(textarea, { target: { value: 'A small rock' } });
      expect(mockUpdateNodeData).toHaveBeenCalledWith('kiln-1', { prompt: 'A small rock' });
    });

    it('renders Generate button', () => {
      render(<KilnGenNode {...defaultProps} />);
      expect(screen.getByText('Generate')).toBeInTheDocument();
    });
  });

  describe('error display', () => {
    it('shows errors when present', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultData, errors: ['Something went wrong'] },
      };
      render(<KilnGenNode {...props} />);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('shows multiple errors', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultData, errors: ['Error 1', 'Error 2'] },
      };
      render(<KilnGenNode {...props} />);
      expect(screen.getByText('Error 1')).toBeInTheDocument();
      expect(screen.getByText('Error 2')).toBeInTheDocument();
    });

    it('does not show error area when no errors', () => {
      render(<KilnGenNode {...defaultProps} />);
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  describe('triangle count', () => {
    it('shows triangle count when available', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultData, triangleCount: 1500 },
      };
      render(<KilnGenNode {...props} />);
      expect(screen.getByText(/1,500/)).toBeInTheDocument();
    });

    it('does not show triangle count when null', () => {
      render(<KilnGenNode {...defaultProps} />);
      expect(screen.queryByText(/Triangles/)).not.toBeInTheDocument();
    });
  });

  describe('generate action', () => {
    it('sets error when no prompt is provided', async () => {
      render(<KilnGenNode {...defaultProps} />);
      fireEvent.click(screen.getByText('Generate'));

      await waitFor(() => {
        expect(mockUpdateNodeData).toHaveBeenCalledWith('kiln-1', {
          errors: ['Enter a prompt to generate'],
        });
      });
    });

    it('calls fetch with correct payload when prompt is provided', async () => {
      const props = {
        ...defaultProps,
        data: { ...defaultData, prompt: 'A crystal sword' },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, code: 'const x = 1;' }),
      });

      render(<KilnGenNode {...props} />);
      fireEvent.click(screen.getByText('Generate'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/kiln/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: 'A crystal sword',
            mode: 'glb',
            category: 'prop',
            style: 'low-poly',
            includeAnimation: true,
          }),
        });
      });
    });

    it('updates node data on successful generation', async () => {
      const props = {
        ...defaultProps,
        data: { ...defaultData, prompt: 'A sword' },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, code: 'generated code', effectCode: 'fx' }),
      });

      render(<KilnGenNode {...props} />);
      fireEvent.click(screen.getByText('Generate'));

      await waitFor(() => {
        expect(mockUpdateNodeData).toHaveBeenCalledWith('kiln-1', {
          code: 'generated code',
          effectCode: 'fx',
          errors: [],
        });
      });
    });

    it('sets error on server error response', async () => {
      const props = {
        ...defaultProps,
        data: { ...defaultData, prompt: 'A sword' },
      };
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      render(<KilnGenNode {...props} />);
      fireEvent.click(screen.getByText('Generate'));

      await waitFor(() => {
        expect(mockUpdateNodeData).toHaveBeenCalledWith('kiln-1', {
          errors: ['Server error: 500'],
        });
      });
    });

    it('sets error on network failure', async () => {
      const props = {
        ...defaultProps,
        data: { ...defaultData, prompt: 'A sword' },
      };
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<KilnGenNode {...props} />);
      fireEvent.click(screen.getByText('Generate'));

      await waitFor(() => {
        expect(mockUpdateNodeData).toHaveBeenCalledWith('kiln-1', {
          errors: ['Network error'],
        });
      });
    });

    it('sets error when API returns failure result', async () => {
      const props = {
        ...defaultProps,
        data: { ...defaultData, prompt: 'A sword' },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: false, error: 'Bad prompt' }),
      });

      render(<KilnGenNode {...props} />);
      fireEvent.click(screen.getByText('Generate'));

      await waitFor(() => {
        expect(mockUpdateNodeData).toHaveBeenCalledWith('kiln-1', {
          errors: ['Bad prompt'],
        });
      });
    });

    it('uses connected TextPrompt node prompt over inline prompt', async () => {
      const props = {
        ...defaultProps,
        data: { ...defaultData, prompt: 'inline prompt' },
      };
      mockGetEdges.mockReturnValue([{ source: 'text-1', target: 'kiln-1' }]);
      (useWorkflowStore as any).getState.mockReturnValue({
        nodes: [{ id: 'text-1', type: 'textPrompt', data: { prompt: 'connected prompt' } }],
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, code: 'code' }),
      });

      render(<KilnGenNode {...props} />);
      fireEvent.click(screen.getByText('Generate'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/kiln/generate',
          expect.objectContaining({
            body: expect.stringContaining('connected prompt'),
          })
        );
      });
    });
  });

  describe('code editor toggle', () => {
    it('does not show code editor by default', () => {
      render(<KilnGenNode {...defaultProps} />);
      expect(
        screen.queryByPlaceholderText('// Generated code will appear here')
      ).not.toBeInTheDocument();
    });

    it('shows code editor after toggle button click', () => {
      render(<KilnGenNode {...defaultProps} />);
      // The edit button is the one with Edit3 icon
      const editButton = screen.getByTestId('edit-icon').closest('button')!;
      fireEvent.click(editButton);
      expect(
        screen.getByPlaceholderText('// Generated code will appear here')
      ).toBeInTheDocument();
    });

    it('hides code editor on second toggle', () => {
      render(<KilnGenNode {...defaultProps} />);
      const editButton = screen.getByTestId('edit-icon').closest('button')!;
      fireEvent.click(editButton);
      fireEvent.click(editButton);
      expect(
        screen.queryByPlaceholderText('// Generated code will appear here')
      ).not.toBeInTheDocument();
    });
  });

  describe('download button', () => {
    it('shows download button when glbUrl is available in glb mode', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultData, glbUrl: 'blob:mock-url', mode: 'glb' as const },
      };
      render(<KilnGenNode {...props} />);
      expect(screen.getByTestId('download-icon')).toBeInTheDocument();
    });

    it('does not show download button when glbUrl is null', () => {
      render(<KilnGenNode {...defaultProps} />);
      expect(screen.queryByTestId('download-icon')).not.toBeInTheDocument();
    });

    it('does not show download button in tsl mode even with glbUrl', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultData, glbUrl: 'blob:mock-url', mode: 'tsl' as const },
      };
      render(<KilnGenNode {...props} />);
      expect(screen.queryByTestId('download-icon')).not.toBeInTheDocument();
    });
  });
});
