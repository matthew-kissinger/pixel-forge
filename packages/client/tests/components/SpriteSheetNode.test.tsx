import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SpriteSheetNode } from '../../src/components/nodes/SpriteSheetNode';
import { useWorkflowStore } from '../../src/stores/workflow';
import { generateImage } from '../../src/lib/api';

vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

vi.mock('../../src/lib/api', () => ({
  generateImage: vi.fn(),
}));

vi.mock('@pixel-forge/shared/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('lucide-react', () => ({
  LayoutGrid: (props: any) => <div data-testid="icon-LayoutGrid" />,
  Sparkles: (props: any) => <div data-testid="icon-Sparkles" />,
}));

vi.mock('../../src/components/nodes/BaseNode', () => ({
  BaseNode: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('SpriteSheetNode', () => {
  const mockGetInputsForNode = vi.fn();
  const mockSetNodeOutput = vi.fn();
  const mockSetNodeStatus = vi.fn();
  const mockUpdateNodeData = vi.fn();

  const baseProps = {
    id: 'test-sprite-node',
    type: 'spriteSheet',
    data: {
      label: 'Sprite Sheet',
      frames: 4,
      columns: 4,
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
      render(<SpriteSheetNode {...baseProps} />);

      expect(screen.getByText('Sprite Sheet')).toBeInTheDocument();
      expect(screen.getByTestId('icon-LayoutGrid')).toBeInTheDocument();
    });

    it('shows Generate Sheet button', () => {
      render(<SpriteSheetNode {...baseProps} />);

      expect(screen.getByText('Generate Sheet')).toBeInTheDocument();
    });

    it('shows frames input', () => {
      render(<SpriteSheetNode {...baseProps} />);

      expect(screen.getByText('Frames')).toBeInTheDocument();
    });

    it('shows direction dropdown', () => {
      render(<SpriteSheetNode {...baseProps} />);

      expect(screen.getByText('Direction')).toBeInTheDocument();
      expect(screen.getByText('Horizontal')).toBeInTheDocument();
      expect(screen.getByText('Vertical')).toBeInTheDocument();
    });

    it('shows frame width and height inputs', () => {
      render(<SpriteSheetNode {...baseProps} />);

      expect(screen.getByText('Frame Width')).toBeInTheDocument();
      expect(screen.getByText('Frame Height')).toBeInTheDocument();
    });

    it('shows consistency seed input', () => {
      render(<SpriteSheetNode {...baseProps} />);

      expect(screen.getByText('Consistency Seed (optional)')).toBeInTheDocument();
    });

    it('shows sparkles icon on generate button', () => {
      render(<SpriteSheetNode {...baseProps} />);

      expect(screen.getByTestId('icon-Sparkles')).toBeInTheDocument();
    });
  });

  describe('frame count', () => {
    it('displays current frame count', () => {
      render(<SpriteSheetNode {...baseProps} />);

      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      // First spinbutton is frames
      expect(inputs[0].value).toBe('4');
    });

    it('updates frames when changed', () => {
      render(<SpriteSheetNode {...baseProps} />);

      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0], { target: { value: '8' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-sprite-node', expect.objectContaining({
        frames: 8,
      }));
    });

    it('clamps frames to minimum of 1', () => {
      render(<SpriteSheetNode {...baseProps} />);

      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0], { target: { value: '0' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-sprite-node', expect.objectContaining({
        frames: 1,
      }));
    });

    it('defaults to 4 frames when not set', () => {
      const props = {
        ...baseProps,
        data: { label: 'Sprite Sheet' },
      };
      render(<SpriteSheetNode {...props} />);

      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      expect(inputs[0].value).toBe('4');
    });
  });

  describe('direction', () => {
    it('shows horizontal when columns equals frames', () => {
      render(<SpriteSheetNode {...baseProps} />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('horizontal');
    });

    it('shows vertical when columns is 1', () => {
      const props = {
        ...baseProps,
        data: { ...baseProps.data, columns: 1 },
      };
      render(<SpriteSheetNode {...props} />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('vertical');
    });

    it('switches to vertical on direction change', () => {
      render(<SpriteSheetNode {...baseProps} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'vertical' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-sprite-node', {
        columns: 1,
      });
    });

    it('switches to horizontal on direction change', () => {
      const props = {
        ...baseProps,
        data: { ...baseProps.data, columns: 1, frames: 4 },
      };
      render(<SpriteSheetNode {...props} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'horizontal' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-sprite-node', {
        columns: 4,
      });
    });
  });

  describe('frame dimensions', () => {
    it('displays default frame width (64)', () => {
      const props = {
        ...baseProps,
        data: { label: 'Sprite Sheet' },
      };
      render(<SpriteSheetNode {...props} />);

      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      // frameWidth is inputs[1], frameHeight is inputs[2]
      expect(inputs[1].value).toBe('64');
      expect(inputs[2].value).toBe('64');
    });

    it('updates frame width', () => {
      render(<SpriteSheetNode {...baseProps} />);

      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[1], { target: { value: '128' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-sprite-node', {
        frameWidth: 128,
      });
    });

    it('updates frame height', () => {
      render(<SpriteSheetNode {...baseProps} />);

      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[2], { target: { value: '128' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-sprite-node', {
        frameHeight: 128,
      });
    });

    it('clamps frame width to minimum of 8', () => {
      render(<SpriteSheetNode {...baseProps} />);

      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[1], { target: { value: '2' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-sprite-node', {
        frameWidth: 8,
      });
    });

    it('clamps frame height to minimum of 8', () => {
      render(<SpriteSheetNode {...baseProps} />);

      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[2], { target: { value: '2' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-sprite-node', {
        frameHeight: 8,
      });
    });
  });

  describe('consistency seed', () => {
    it('displays empty seed by default', () => {
      render(<SpriteSheetNode {...baseProps} />);

      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      // Seed is the last spinbutton (inputs[3])
      expect(inputs[3].value).toBe('');
    });

    it('updates seed when changed', () => {
      render(<SpriteSheetNode {...baseProps} />);

      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[3], { target: { value: '42' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-sprite-node', {
        consistencySeed: 42,
      });
    });

    it('sets seed to undefined when cleared', () => {
      const props = {
        ...baseProps,
        data: { ...baseProps.data, consistencySeed: 42 },
      };
      render(<SpriteSheetNode {...props} />);

      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[3], { target: { value: '' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-sprite-node', {
        consistencySeed: undefined,
      });
    });

    it('displays set seed value', () => {
      const props = {
        ...baseProps,
        data: { ...baseProps.data, consistencySeed: 123 },
      };
      render(<SpriteSheetNode {...props} />);

      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      expect(inputs[3].value).toBe('123');
    });
  });

  describe('running state', () => {
    it('shows Generating... button when running', () => {
      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'test-sprite-node': 'running' },
      });

      render(<SpriteSheetNode {...baseProps} />);

      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    it('disables generate button when running', () => {
      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'test-sprite-node': 'running' },
      });

      render(<SpriteSheetNode {...baseProps} />);

      const button = screen.getByText('Generating...');
      expect(button.closest('button')).toBeDisabled();
    });
  });

  describe('generate action', () => {
    it('sets error status when no prompt input', async () => {
      mockGetInputsForNode.mockReturnValue([]);

      render(<SpriteSheetNode {...baseProps} />);

      const button = screen.getByText('Generate Sheet');
      fireEvent.click(button.closest('button')!);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-sprite-node', 'error');
      });
    });

    it('sets running status when generation starts', async () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'text', data: 'walking animation' }]);
      (generateImage as any).mockResolvedValue({ image: 'data:image/png;base64,test' });

      render(<SpriteSheetNode {...baseProps} />);

      const button = screen.getByText('Generate Sheet');
      fireEvent.click(button.closest('button')!);

      expect(mockSetNodeStatus).toHaveBeenCalledWith('test-sprite-node', 'running');
    });

    it('sets output and success on completed generation', async () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'text', data: 'walking animation' }]);
      const mockImage = 'data:image/png;base64,test';
      (generateImage as any).mockResolvedValue({ image: mockImage });

      render(<SpriteSheetNode {...baseProps} />);

      const button = screen.getByText('Generate Sheet');
      fireEvent.click(button.closest('button')!);

      await waitFor(() => {
        expect(mockSetNodeOutput).toHaveBeenCalledWith('test-sprite-node', {
          type: 'image',
          data: mockImage,
          timestamp: expect.any(Number),
        });
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-sprite-node', 'success');
      });
    });

    it('sets error status when generation fails', async () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'text', data: 'walking animation' }]);
      (generateImage as any).mockRejectedValue(new Error('API error'));

      render(<SpriteSheetNode {...baseProps} />);

      const button = screen.getByText('Generate Sheet');
      fireEvent.click(button.closest('button')!);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-sprite-node', 'error');
      });
    });

    it('builds correct prompt with sprite sheet parameters', async () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'text', data: 'walking character' }]);
      (generateImage as any).mockResolvedValue({ image: 'data:image/png;base64,test' });

      render(<SpriteSheetNode {...baseProps} />);

      const button = screen.getByText('Generate Sheet');
      fireEvent.click(button.closest('button')!);

      await waitFor(() => {
        expect(generateImage).toHaveBeenCalledWith({
          prompt: expect.stringContaining('sprite sheet'),
        });
        expect(generateImage).toHaveBeenCalledWith({
          prompt: expect.stringContaining('4 frames arranged horizontally'),
        });
        expect(generateImage).toHaveBeenCalledWith({
          prompt: expect.stringContaining('64x64px per frame'),
        });
      });
    });
  });

  describe('error state', () => {
    it('shows error message when status is error', () => {
      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'test-sprite-node': 'error' },
      });

      render(<SpriteSheetNode {...baseProps} />);

      expect(screen.getByText(/Generation failed/)).toBeInTheDocument();
    });

    it('does not show error when status is idle', () => {
      render(<SpriteSheetNode {...baseProps} />);

      expect(screen.queryByText(/Generation failed/)).not.toBeInTheDocument();
    });
  });
});
