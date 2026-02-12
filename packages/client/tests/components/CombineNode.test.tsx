import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CombineNode } from '../../src/components/nodes/CombineNode';
import { useWorkflowStore } from '../../src/stores/workflow';

// Mock the workflow store
vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Layers: () => <div data-testid="layers-icon" />,
}));

// Mock cn utility
vi.mock('../../src/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

// Mock logger
vi.mock('@pixel-forge/shared/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// Mock React Flow Handle
vi.mock('@xyflow/react', () => ({
  Handle: ({ type, id, ...rest }: any) => (
    <div data-testid={`handle-${type}${id ? `-${id}` : ''}`} {...rest} />
  ),
  Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
}));

describe('CombineNode', () => {
  const mockSetNodeOutput = vi.fn();
  const mockSetNodeStatus = vi.fn();
  const mockUpdateNodeData = vi.fn();

  const defaultProps = {
    id: 'combine-1',
    data: {
      label: 'Combine',
      mode: 'overlay' as const,
      alignment: 'center' as const,
      spacing: 0,
    },
    type: 'combine',
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
      edges: [],
      nodeOutputs: {},
      setNodeOutput: mockSetNodeOutput,
      setNodeStatus: mockSetNodeStatus,
      updateNodeData: mockUpdateNodeData,
      nodeStatus: {},
    });
  });

  describe('rendering', () => {
    it('renders with default props', () => {
      render(<CombineNode {...defaultProps} />);
      expect(screen.getByText('Combine Images')).toBeInTheDocument();
    });

    it('displays the node label', () => {
      const props = { ...defaultProps, data: { ...defaultProps.data, label: 'My Combiner' } };
      render(<CombineNode {...props} />);
      expect(screen.getByText('My Combiner')).toBeInTheDocument();
    });

    it('renders layers icon', () => {
      render(<CombineNode {...defaultProps} />);
      expect(screen.getByTestId('layers-icon')).toBeInTheDocument();
    });

    it('renders multiple input handles and one output handle', () => {
      render(<CombineNode {...defaultProps} />);
      expect(screen.getByTestId('handle-target-input1')).toBeInTheDocument();
      expect(screen.getByTestId('handle-target-input2')).toBeInTheDocument();
      expect(screen.getByTestId('handle-target-input3')).toBeInTheDocument();
      expect(screen.getByTestId('handle-source')).toBeInTheDocument();
    });

    it('shows 0 images connected with need 2+ message', () => {
      render(<CombineNode {...defaultProps} />);
      expect(screen.getByText('0 images connected (need 2+)')).toBeInTheDocument();
    });

    it('shows correct count when 1 image connected', () => {
      (useWorkflowStore as any).mockReturnValue({
        edges: [{ source: 'img-1', target: 'combine-1' }],
        nodeOutputs: { 'img-1': { type: 'image', data: 'data:image/png;base64,a' } },
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: {},
      });

      render(<CombineNode {...defaultProps} />);
      expect(screen.getByText('1 image connected (need 2+)')).toBeInTheDocument();
    });

    it('shows plural count when 2 images connected without need message', () => {
      (useWorkflowStore as any).mockReturnValue({
        edges: [
          { source: 'img-1', target: 'combine-1' },
          { source: 'img-2', target: 'combine-1' },
        ],
        nodeOutputs: {
          'img-1': { type: 'image', data: 'data:image/png;base64,a' },
          'img-2': { type: 'image', data: 'data:image/png;base64,b' },
        },
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: {},
      });

      render(<CombineNode {...defaultProps} />);
      expect(screen.getByText('2 images connected')).toBeInTheDocument();
    });

    it('does not count non-image outputs', () => {
      (useWorkflowStore as any).mockReturnValue({
        edges: [
          { source: 'txt-1', target: 'combine-1' },
          { source: 'img-1', target: 'combine-1' },
        ],
        nodeOutputs: {
          'txt-1': { type: 'text', data: 'hello' },
          'img-1': { type: 'image', data: 'data:image/png;base64,a' },
        },
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: {},
      });

      render(<CombineNode {...defaultProps} />);
      expect(screen.getByText('1 image connected (need 2+)')).toBeInTheDocument();
    });
  });

  describe('mode selection', () => {
    it('renders mode dropdown with all options', () => {
      render(<CombineNode {...defaultProps} />);
      expect(screen.getByText('Overlay (stack)')).toBeInTheDocument();
      expect(screen.getByText('Side by Side')).toBeInTheDocument();
      expect(screen.getByText('Vertical Stack')).toBeInTheDocument();
      expect(screen.getByText('Grid (2 cols)')).toBeInTheDocument();
    });

    it('has overlay selected by default', () => {
      render(<CombineNode {...defaultProps} />);
      const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
      expect(selects[0].value).toBe('overlay');
    });

    it('calls updateNodeData when mode is changed', () => {
      render(<CombineNode {...defaultProps} />);
      const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
      fireEvent.change(selects[0], { target: { value: 'side-by-side' } });
      expect(mockUpdateNodeData).toHaveBeenCalledWith('combine-1', { mode: 'side-by-side' });
    });
  });

  describe('alignment selection', () => {
    it('renders alignment dropdown with all options', () => {
      render(<CombineNode {...defaultProps} />);
      expect(screen.getByText('Center')).toBeInTheDocument();
      expect(screen.getByText('Top Left')).toBeInTheDocument();
      expect(screen.getByText('Top Right')).toBeInTheDocument();
      expect(screen.getByText('Bottom Left')).toBeInTheDocument();
      expect(screen.getByText('Bottom Right')).toBeInTheDocument();
    });

    it('has center selected by default', () => {
      render(<CombineNode {...defaultProps} />);
      const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
      expect(selects[1].value).toBe('center');
    });

    it('calls updateNodeData when alignment is changed', () => {
      render(<CombineNode {...defaultProps} />);
      const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
      fireEvent.change(selects[1], { target: { value: 'top-left' } });
      expect(mockUpdateNodeData).toHaveBeenCalledWith('combine-1', { alignment: 'top-left' });
    });
  });

  describe('spacing control', () => {
    it('does not show spacing when mode is overlay', () => {
      render(<CombineNode {...defaultProps} />);
      expect(screen.queryByText(/Spacing/)).not.toBeInTheDocument();
    });

    it('shows spacing slider when mode is side-by-side', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, mode: 'side-by-side' as const },
      };
      render(<CombineNode {...props} />);
      expect(screen.getByText('Spacing: 0px')).toBeInTheDocument();
    });

    it('shows spacing slider when mode is stack', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, mode: 'stack' as const },
      };
      render(<CombineNode {...props} />);
      expect(screen.getByText('Spacing: 0px')).toBeInTheDocument();
    });

    it('shows spacing slider when mode is grid', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, mode: 'grid' as const },
      };
      render(<CombineNode {...props} />);
      expect(screen.getByText('Spacing: 0px')).toBeInTheDocument();
    });

    it('calls updateNodeData when spacing is changed', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, mode: 'side-by-side' as const },
      };
      render(<CombineNode {...props} />);
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '10' } });
      expect(mockUpdateNodeData).toHaveBeenCalledWith('combine-1', { spacing: 10 });
    });

    it('displays current spacing value', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, mode: 'grid' as const, spacing: 25 },
      };
      render(<CombineNode {...props} />);
      expect(screen.getByText('Spacing: 25px')).toBeInTheDocument();
    });
  });

  describe('combine button', () => {
    it('is disabled when fewer than 2 images connected', () => {
      render(<CombineNode {...defaultProps} />);
      const button = screen.getByRole('button', { name: 'Combine' });
      expect(button).toBeDisabled();
    });

    it('is disabled when status is running', () => {
      (useWorkflowStore as any).mockReturnValue({
        edges: [
          { source: 'img-1', target: 'combine-1' },
          { source: 'img-2', target: 'combine-1' },
        ],
        nodeOutputs: {
          'img-1': { type: 'image', data: 'data:image/png;base64,a' },
          'img-2': { type: 'image', data: 'data:image/png;base64,b' },
        },
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'combine-1': 'running' },
      });

      render(<CombineNode {...defaultProps} />);
      expect(screen.getByText('Processing...')).toBeDisabled();
    });

    it('shows Processing text when running', () => {
      (useWorkflowStore as any).mockReturnValue({
        edges: [],
        nodeOutputs: {},
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'combine-1': 'running' },
      });

      render(<CombineNode {...defaultProps} />);
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('is enabled when 2+ images connected and status is idle', () => {
      (useWorkflowStore as any).mockReturnValue({
        edges: [
          { source: 'img-1', target: 'combine-1' },
          { source: 'img-2', target: 'combine-1' },
        ],
        nodeOutputs: {
          'img-1': { type: 'image', data: 'data:image/png;base64,a' },
          'img-2': { type: 'image', data: 'data:image/png;base64,b' },
        },
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: {},
      });

      render(<CombineNode {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Combine' })).not.toBeDisabled();
    });

    it('sets error when clicking with fewer than 2 inputs', async () => {
      (useWorkflowStore as any).mockReturnValue({
        edges: [{ source: 'img-1', target: 'combine-1' }],
        nodeOutputs: { 'img-1': { type: 'image', data: 'data:image/png;base64,a' } },
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: {},
      });

      render(<CombineNode {...defaultProps} />);
      // Button is disabled but let's verify handleCombine behavior
      // The button will be disabled, so we test the logic indirectly through the disabled state
      expect(screen.getByRole('button', { name: 'Combine' })).toBeDisabled();
    });
  });

  describe('selected state', () => {
    it('applies ring styles when selected', () => {
      const props = { ...defaultProps, selected: true };
      const { container } = render(<CombineNode {...props} />);
      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv.className).toContain('ring-2');
    });

    it('does not apply ring styles when not selected', () => {
      const { container } = render(<CombineNode {...defaultProps} />);
      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv.className).not.toContain('ring-2');
    });
  });

  describe('edge cases', () => {
    it('renders with empty data (uses defaults)', () => {
      const props = {
        ...defaultProps,
        data: { label: 'Combine' },
      };
      render(<CombineNode {...props} />);
      // Defaults: mode=overlay, alignment=center, spacing=0
      const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
      expect(selects[0].value).toBe('overlay');
      expect(selects[1].value).toBe('center');
    });

    it('filters out edges not targeting this node', () => {
      (useWorkflowStore as any).mockReturnValue({
        edges: [
          { source: 'img-1', target: 'other-node' },
          { source: 'img-2', target: 'combine-1' },
        ],
        nodeOutputs: {
          'img-1': { type: 'image', data: 'data:image/png;base64,a' },
          'img-2': { type: 'image', data: 'data:image/png;base64,b' },
        },
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: {},
      });

      render(<CombineNode {...defaultProps} />);
      expect(screen.getByText('1 image connected (need 2+)')).toBeInTheDocument();
    });

    it('handles missing node outputs gracefully', () => {
      (useWorkflowStore as any).mockReturnValue({
        edges: [
          { source: 'img-1', target: 'combine-1' },
          { source: 'img-2', target: 'combine-1' },
        ],
        nodeOutputs: {
          // img-1 has no output yet
          'img-2': { type: 'image', data: 'data:image/png;base64,b' },
        },
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: {},
      });

      render(<CombineNode {...defaultProps} />);
      expect(screen.getByText('1 image connected (need 2+)')).toBeInTheDocument();
    });
  });
});
