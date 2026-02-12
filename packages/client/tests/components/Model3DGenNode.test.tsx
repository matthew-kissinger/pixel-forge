import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Model3DGenNode } from '../../src/components/nodes/Model3DGenNode';
import { useWorkflowStore } from '../../src/stores/workflow';
import { generateModel, pollModelStatus } from '../../src/lib/api';

vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

vi.mock('../../src/lib/api', () => ({
  generateModel: vi.fn(),
  pollModelStatus: vi.fn(),
}));

vi.mock('@pixel-forge/shared/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('lucide-react', () => ({
  Box: (props: any) => <div data-testid="icon-Box" />,
}));

vi.mock('../../src/components/nodes/BaseNode', () => ({
  BaseNode: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('Model3DGenNode', () => {
  const mockGetInputsForNode = vi.fn();
  const mockSetNodeOutput = vi.fn();
  const mockSetNodeStatus = vi.fn();
  const mockUpdateNodeData = vi.fn();

  const baseProps = {
    id: 'test-3d-node',
    type: 'model3DGen',
    data: {
      label: '3D Model',
      artStyle: 'low-poly' as const,
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
    it('renders with default props', () => {
      render(<Model3DGenNode {...baseProps} />);

      expect(screen.getByText('FAL Meshy 3D')).toBeInTheDocument();
      expect(screen.getByTestId('icon-Box')).toBeInTheDocument();
    });

    it('shows Generate 3D button when idle', () => {
      render(<Model3DGenNode {...baseProps} />);

      expect(screen.getByText('Generate 3D')).toBeInTheDocument();
    });

    it('shows art style dropdown with all options', () => {
      render(<Model3DGenNode {...baseProps} />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select).toBeInTheDocument();
      expect(screen.getByText('Low Poly')).toBeInTheDocument();
      expect(screen.getByText('Realistic')).toBeInTheDocument();
      expect(screen.getByText('Sculpture')).toBeInTheDocument();
    });

    it('shows selected art style', () => {
      render(<Model3DGenNode {...baseProps} />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('low-poly');
    });
  });

  describe('art style selection', () => {
    it('updates art style when changed', () => {
      render(<Model3DGenNode {...baseProps} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'realistic' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-3d-node', {
        artStyle: 'realistic',
      });
    });

    it('displays realistic when selected', () => {
      const props = {
        ...baseProps,
        data: { ...baseProps.data, artStyle: 'realistic' as const },
      };
      render(<Model3DGenNode {...props} />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('realistic');
    });

    it('displays sculpture when selected', () => {
      const props = {
        ...baseProps,
        data: { ...baseProps.data, artStyle: 'sculpture' as const },
      };
      render(<Model3DGenNode {...props} />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('sculpture');
    });
  });

  describe('running state', () => {
    it('shows Generating... button when running', () => {
      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'test-3d-node': 'running' },
      });

      render(<Model3DGenNode {...baseProps} />);

      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    it('disables generate button when running', () => {
      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'test-3d-node': 'running' },
      });

      render(<Model3DGenNode {...baseProps} />);

      const button = screen.getByText('Generating...');
      expect(button).toBeDisabled();
    });

    it('shows cancel button when running', () => {
      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'test-3d-node': 'running' },
      });

      render(<Model3DGenNode {...baseProps} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('does not show cancel button when idle', () => {
      render(<Model3DGenNode {...baseProps} />);

      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });
  });

  describe('generate action', () => {
    it('sets error status when no prompt input', async () => {
      mockGetInputsForNode.mockReturnValue([]);

      render(<Model3DGenNode {...baseProps} />);

      const button = screen.getByText('Generate 3D');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-3d-node', 'error');
      });
    });

    it('sets running status when generation starts', async () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'text', data: 'a tree' }]);
      (generateModel as any).mockResolvedValue({ requestId: 'req-123' });
      (pollModelStatus as any).mockResolvedValue({
        status: 'completed',
        modelUrl: 'https://example.com/model.glb',
      });

      render(<Model3DGenNode {...baseProps} />);

      fireEvent.click(screen.getByText('Generate 3D'));

      expect(mockSetNodeStatus).toHaveBeenCalledWith('test-3d-node', 'running');
    });

    it('sets output and success on completed generation', async () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'text', data: 'a tree' }]);
      (generateModel as any).mockResolvedValue({ requestId: 'req-123' });
      (pollModelStatus as any).mockResolvedValue({
        status: 'completed',
        modelUrl: 'https://example.com/model.glb',
      });

      render(<Model3DGenNode {...baseProps} />);

      fireEvent.click(screen.getByText('Generate 3D'));

      await waitFor(() => {
        expect(mockSetNodeOutput).toHaveBeenCalledWith('test-3d-node', {
          type: 'model',
          data: 'https://example.com/model.glb',
          timestamp: expect.any(Number),
        });
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-3d-node', 'success');
      });
    });

    it('sets error status when generation fails', async () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'text', data: 'a tree' }]);
      (generateModel as any).mockRejectedValue(new Error('API error'));

      render(<Model3DGenNode {...baseProps} />);

      fireEvent.click(screen.getByText('Generate 3D'));

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-3d-node', 'error');
      });
    });

    it('sets error when result has no modelUrl', async () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'text', data: 'a tree' }]);
      (generateModel as any).mockResolvedValue({ requestId: 'req-123' });
      (pollModelStatus as any).mockResolvedValue({
        status: 'failed',
        error: 'Model generation timed out',
      });

      render(<Model3DGenNode {...baseProps} />);

      fireEvent.click(screen.getByText('Generate 3D'));

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-3d-node', 'error');
      });
    });
  });

  describe('status text', () => {
    it('does not show status text when idle and no text set', () => {
      render(<Model3DGenNode {...baseProps} />);

      // No status text elements besides the main UI
      expect(screen.queryByText('Starting...')).not.toBeInTheDocument();
      expect(screen.queryByText('Queued...')).not.toBeInTheDocument();
    });
  });
});
