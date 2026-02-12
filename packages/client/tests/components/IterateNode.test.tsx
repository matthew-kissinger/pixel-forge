import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IterateNode } from '../../src/components/nodes/IterateNode';
import { useWorkflowStore } from '../../src/stores/workflow';

vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

vi.mock('lucide-react', () => ({
  Repeat: (props: any) => <div data-testid="icon-Repeat" {...props} />,
  Settings: (props: any) => <div data-testid="icon-Settings" {...props} />,
  Square: (props: any) => <div data-testid="icon-Square" {...props} />,
  Play: (props: any) => <div data-testid="icon-Play" {...props} />,
}));

vi.mock('../../src/components/nodes/BaseNode', () => ({
  BaseNode: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@pixel-forge/shared/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('IterateNode', () => {
  const mockGetInputsForNode = vi.fn();
  const mockSetNodeOutput = vi.fn();
  const mockSetNodeStatus = vi.fn();
  const mockUpdateNodeData = vi.fn();

  const baseProps = {
    id: 'test-iterate',
    type: 'iterate',
    data: {
      label: 'Iterate',
      iterations: 3,
      currentIteration: 0,
    },
    selected: false,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    dragging: false,
    zIndex: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useWorkflowStore as any).mockReturnValue({
      getInputsForNode: mockGetInputsForNode,
      setNodeOutput: mockSetNodeOutput,
      setNodeStatus: mockSetNodeStatus,
      updateNodeData: mockUpdateNodeData,
      nodeStatus: {},
    });
    mockGetInputsForNode.mockReturnValue([]);
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      render(<IterateNode {...baseProps} />);
      expect(screen.getByText('Iterate (3x)')).toBeInTheDocument();
    });

    it('shows repeat icon', () => {
      render(<IterateNode {...baseProps} />);
      expect(screen.getByTestId('icon-Repeat')).toBeInTheDocument();
    });

    it('shows run iterations button', () => {
      render(<IterateNode {...baseProps} />);
      expect(screen.getByText('Run Iterations')).toBeInTheDocument();
    });

    it('shows play icon in run button', () => {
      render(<IterateNode {...baseProps} />);
      expect(screen.getByTestId('icon-Play')).toBeInTheDocument();
    });

    it('shows settings toggle', () => {
      render(<IterateNode {...baseProps} />);
      expect(screen.getByTestId('icon-Settings')).toBeInTheDocument();
    });

    it('does not show settings panel by default', () => {
      render(<IterateNode {...baseProps} />);
      expect(screen.queryByText('Iterations')).not.toBeInTheDocument();
    });

    it('defaults to 3 iterations when not provided', () => {
      const props = { ...baseProps, data: { label: 'Iterate' } };
      render(<IterateNode {...props} />);
      expect(screen.getByText('Iterate (3x)')).toBeInTheDocument();
    });

    it('displays correct iteration count', () => {
      const props = {
        ...baseProps,
        data: { ...baseProps.data, iterations: 7 },
      };
      render(<IterateNode {...props} />);
      expect(screen.getByText('Iterate (7x)')).toBeInTheDocument();
    });
  });

  describe('settings panel', () => {
    it('toggles settings panel on click', () => {
      render(<IterateNode {...baseProps} />);

      const settingsBtn = screen.getByTestId('icon-Settings').closest('button')!;
      fireEvent.click(settingsBtn);

      expect(screen.getByText('Iterations')).toBeInTheDocument();
    });

    it('hides settings panel on second click', () => {
      render(<IterateNode {...baseProps} />);

      const settingsBtn = screen.getByTestId('icon-Settings').closest('button')!;
      fireEvent.click(settingsBtn);
      expect(screen.getByText('Iterations')).toBeInTheDocument();

      fireEvent.click(settingsBtn);
      expect(screen.queryByText('Iterations')).not.toBeInTheDocument();
    });

    it('shows iterations slider', () => {
      render(<IterateNode {...baseProps} />);

      const settingsBtn = screen.getByTestId('icon-Settings').closest('button')!;
      fireEvent.click(settingsBtn);

      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.min).toBe('1');
      expect(slider.max).toBe('10');
      expect(slider.value).toBe('3');
    });

    it('updates iterations when slider changes', () => {
      render(<IterateNode {...baseProps} />);

      const settingsBtn = screen.getByTestId('icon-Settings').closest('button')!;
      fireEvent.click(settingsBtn);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '5' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-iterate', {
        iterations: 5,
      });
    });

    it('shows description text', () => {
      render(<IterateNode {...baseProps} />);

      const settingsBtn = screen.getByTestId('icon-Settings').closest('button')!;
      fireEvent.click(settingsBtn);

      expect(
        screen.getByText('Runs the connected pipeline N times, feeding output back as input.')
      ).toBeInTheDocument();
    });

    it('shows current iteration count in settings', () => {
      render(<IterateNode {...baseProps} />);

      const settingsBtn = screen.getByTestId('icon-Settings').closest('button')!;
      fireEvent.click(settingsBtn);

      // The count label next to the slider
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message when status is error', () => {
      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'test-iterate': 'error' },
      });
      render(<IterateNode {...baseProps} />);
      expect(screen.getByText('Iteration failed')).toBeInTheDocument();
    });

    it('does not show error message when idle', () => {
      render(<IterateNode {...baseProps} />);
      expect(screen.queryByText('Iteration failed')).not.toBeInTheDocument();
    });
  });

  describe('run operation', () => {
    it('sets error status when no input image', async () => {
      mockGetInputsForNode.mockReturnValue([]);
      render(<IterateNode {...baseProps} />);

      fireEvent.click(screen.getByText('Run Iterations'));

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-iterate', 'error');
      });
    });

    it('sets running status when starting', async () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,abc' },
      ]);

      render(<IterateNode {...baseProps} />);
      fireEvent.click(screen.getByText('Run Iterations'));

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-iterate', 'running');
      });
    });

    it('ignores non-image inputs', async () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'text', data: 'hello' }]);

      render(<IterateNode {...baseProps} />);
      fireEvent.click(screen.getByText('Run Iterations'));

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-iterate', 'error');
      });
    });
  });

  describe('stop button', () => {
    it('does not show stop button when not running', () => {
      render(<IterateNode {...baseProps} />);
      expect(screen.queryByText('Stop')).not.toBeInTheDocument();
    });
  });

  describe('disabled states', () => {
    it('disables run button when store status is running', () => {
      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'test-iterate': 'running' },
      });

      render(<IterateNode {...baseProps} />);
      const runBtn = screen.getByText('Run Iterations');
      expect(runBtn).toBeDisabled();
    });
  });
});
