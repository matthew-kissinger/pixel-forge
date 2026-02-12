import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SpriteSheetNode } from '../../src/components/nodes/SpriteSheetNode';
import { useWorkflowStore } from '../../src/stores/workflow';
import { generateImage } from '../../src/lib/api';

// Mock the workflow store
vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

// Mock the API
vi.mock('../../src/lib/api', () => ({
  generateImage: vi.fn(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  LayoutGrid: () => <div data-testid="layout-grid-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
}));

// Mock BaseNode
vi.mock('../../src/components/nodes/BaseNode', () => ({
  BaseNode: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock logger
vi.mock('@pixel-forge/shared/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

describe('SpriteSheetNode', () => {
  const mockGetInputsForNode = vi.fn();
  const mockSetNodeOutput = vi.fn();
  const mockSetNodeStatus = vi.fn();
  const mockUpdateNodeData = vi.fn();

  const defaultProps = {
    id: 'sprite-1',
    data: {
      label: 'Sprite Sheet',
      frames: 4,
      columns: 4,
    },
    type: 'spriteSheet',
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
      render(<SpriteSheetNode {...defaultProps} />);
      expect(screen.getByText('Sprite Sheet')).toBeInTheDocument();
    });

    it('renders frame input with default value', () => {
      render(<SpriteSheetNode {...defaultProps} />);
      const framesInput = screen.getByLabelText('Frames') as HTMLInputElement;
      expect(framesInput.value).toBe('4');
    });

    it('renders direction dropdown defaulting to horizontal', () => {
      render(<SpriteSheetNode {...defaultProps} />);
      const directionSelect = screen.getByLabelText('Direction') as HTMLSelectElement;
      expect(directionSelect.value).toBe('horizontal');
    });

    it('shows vertical direction when columns is 1', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, columns: 1 },
      };
      render(<SpriteSheetNode {...props} />);
      const directionSelect = screen.getByLabelText('Direction') as HTMLSelectElement;
      expect(directionSelect.value).toBe('vertical');
    });

    it('renders frame width input with default 64', () => {
      render(<SpriteSheetNode {...defaultProps} />);
      const widthInput = screen.getByLabelText('Frame Width') as HTMLInputElement;
      expect(widthInput.value).toBe('64');
    });

    it('renders frame height input with default 64', () => {
      render(<SpriteSheetNode {...defaultProps} />);
      const heightInput = screen.getByLabelText('Frame Height') as HTMLInputElement;
      expect(heightInput.value).toBe('64');
    });

    it('renders consistency seed input', () => {
      render(<SpriteSheetNode {...defaultProps} />);
      expect(screen.getByText('Consistency Seed (optional)')).toBeInTheDocument();
    });

    it('renders generate button', () => {
      render(<SpriteSheetNode {...defaultProps} />);
      expect(screen.getByText('Generate Sheet')).toBeInTheDocument();
    });

    it('shows Generating... text when status is running', () => {
      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'sprite-1': 'running' },
      });

      render(<SpriteSheetNode {...defaultProps} />);
      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    it('shows error message when status is error', () => {
      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'sprite-1': 'error' },
      });

      render(<SpriteSheetNode {...defaultProps} />);
      expect(screen.getByText(/Generation failed/)).toBeInTheDocument();
    });

    it('does not show error message when idle', () => {
      render(<SpriteSheetNode {...defaultProps} />);
      expect(screen.queryByText(/Generation failed/)).not.toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('updates frames when input changes', () => {
      render(<SpriteSheetNode {...defaultProps} />);
      const framesInput = screen.getByLabelText('Frames');
      fireEvent.change(framesInput, { target: { value: '8' } });
      expect(mockUpdateNodeData).toHaveBeenCalledWith('sprite-1', {
        frames: 8,
        columns: 8,
      });
    });

    it('clamps frames to minimum of 1', () => {
      render(<SpriteSheetNode {...defaultProps} />);
      const framesInput = screen.getByLabelText('Frames');
      fireEvent.change(framesInput, { target: { value: '0' } });
      expect(mockUpdateNodeData).toHaveBeenCalledWith('sprite-1', {
        frames: 1,
        columns: 1,
      });
    });

    it('keeps columns as 1 when direction is vertical and frames change', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, columns: 1 },
      };
      render(<SpriteSheetNode {...props} />);
      const framesInput = screen.getByLabelText('Frames');
      fireEvent.change(framesInput, { target: { value: '6' } });
      expect(mockUpdateNodeData).toHaveBeenCalledWith('sprite-1', {
        frames: 6,
        columns: 1,
      });
    });

    it('changes direction to vertical', () => {
      render(<SpriteSheetNode {...defaultProps} />);
      const directionSelect = screen.getByLabelText('Direction');
      fireEvent.change(directionSelect, { target: { value: 'vertical' } });
      expect(mockUpdateNodeData).toHaveBeenCalledWith('sprite-1', { columns: 1 });
    });

    it('changes direction to horizontal', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, columns: 1 },
      };
      render(<SpriteSheetNode {...props} />);
      const directionSelect = screen.getByLabelText('Direction');
      fireEvent.change(directionSelect, { target: { value: 'horizontal' } });
      expect(mockUpdateNodeData).toHaveBeenCalledWith('sprite-1', { columns: 4 });
    });

    it('updates frame width', () => {
      render(<SpriteSheetNode {...defaultProps} />);
      const widthInput = screen.getByLabelText('Frame Width');
      fireEvent.change(widthInput, { target: { value: '128' } });
      expect(mockUpdateNodeData).toHaveBeenCalledWith('sprite-1', { frameWidth: 128 });
    });

    it('clamps frame width to minimum of 8', () => {
      render(<SpriteSheetNode {...defaultProps} />);
      const widthInput = screen.getByLabelText('Frame Width');
      fireEvent.change(widthInput, { target: { value: '2' } });
      expect(mockUpdateNodeData).toHaveBeenCalledWith('sprite-1', { frameWidth: 8 });
    });

    it('updates frame height', () => {
      render(<SpriteSheetNode {...defaultProps} />);
      const heightInput = screen.getByLabelText('Frame Height');
      fireEvent.change(heightInput, { target: { value: '96' } });
      expect(mockUpdateNodeData).toHaveBeenCalledWith('sprite-1', { frameHeight: 96 });
    });

    it('clamps frame height to minimum of 8', () => {
      render(<SpriteSheetNode {...defaultProps} />);
      const heightInput = screen.getByLabelText('Frame Height');
      fireEvent.change(heightInput, { target: { value: '0' } });
      expect(mockUpdateNodeData).toHaveBeenCalledWith('sprite-1', { frameHeight: 8 });
    });

    it('updates consistency seed', () => {
      render(<SpriteSheetNode {...defaultProps} />);
      const seedInput = screen.getByText('Consistency Seed (optional)').closest('label')!.querySelector('input')!;
      fireEvent.change(seedInput, { target: { value: '42' } });
      expect(mockUpdateNodeData).toHaveBeenCalledWith('sprite-1', { consistencySeed: 42 });
    });

    it('clears consistency seed when empty', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, consistencySeed: 42 },
      };
      render(<SpriteSheetNode {...props} />);
      const seedInput = screen.getByText('Consistency Seed (optional)').closest('label')!.querySelector('input')!;
      fireEvent.change(seedInput, { target: { value: '' } });
      expect(mockUpdateNodeData).toHaveBeenCalledWith('sprite-1', { consistencySeed: undefined });
    });
  });

  describe('generate button', () => {
    it('is enabled when status is idle', () => {
      render(<SpriteSheetNode {...defaultProps} />);
      expect(screen.getByText('Generate Sheet')).not.toBeDisabled();
    });

    it('is disabled when status is running', () => {
      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'sprite-1': 'running' },
      });

      render(<SpriteSheetNode {...defaultProps} />);
      expect(screen.getByText('Generating...')).toBeDisabled();
    });

    it('sets error status when no prompt input', async () => {
      mockGetInputsForNode.mockReturnValue([]);
      render(<SpriteSheetNode {...defaultProps} />);
      fireEvent.click(screen.getByText('Generate Sheet'));

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('sprite-1', 'error');
      });
    });

    it('calls generateImage with constructed prompt on click', async () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'text', data: 'walk cycle' }]);
      (generateImage as any).mockResolvedValue({ image: 'data:image/png;base64,test' });

      render(<SpriteSheetNode {...defaultProps} />);
      fireEvent.click(screen.getByText('Generate Sheet'));

      await waitFor(() => {
        expect(generateImage).toHaveBeenCalledWith({
          prompt: expect.stringContaining('walk cycle'),
        });
        // Should include sprite sheet layout info
        expect((generateImage as any).mock.calls[0][0].prompt).toContain('sprite sheet');
        expect((generateImage as any).mock.calls[0][0].prompt).toContain('4 frames');
        expect((generateImage as any).mock.calls[0][0].prompt).toContain('64x64');
      });
    });

    it('sets output and success status on successful generation', async () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'text', data: 'run' }]);
      const mockImage = 'data:image/png;base64,sprite';
      (generateImage as any).mockResolvedValue({ image: mockImage });

      render(<SpriteSheetNode {...defaultProps} />);
      fireEvent.click(screen.getByText('Generate Sheet'));

      await waitFor(() => {
        expect(mockSetNodeOutput).toHaveBeenCalledWith('sprite-1', {
          type: 'image',
          data: mockImage,
          timestamp: expect.any(Number),
        });
        expect(mockSetNodeStatus).toHaveBeenCalledWith('sprite-1', 'success');
      });
    });

    it('sets error status on generation failure', async () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'text', data: 'run' }]);
      (generateImage as any).mockRejectedValue(new Error('API down'));

      render(<SpriteSheetNode {...defaultProps} />);
      fireEvent.click(screen.getByText('Generate Sheet'));

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('sprite-1', 'error');
      });
    });

    it('includes seed in prompt when consistencySeed is set', async () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, consistencySeed: 42 },
      };
      mockGetInputsForNode.mockReturnValue([{ type: 'text', data: 'idle' }]);
      (generateImage as any).mockResolvedValue({ image: 'data:image/png;base64,test' });

      render(<SpriteSheetNode {...props} />);
      fireEvent.click(screen.getByText('Generate Sheet'));

      await waitFor(() => {
        expect((generateImage as any).mock.calls[0][0].prompt).toContain('Seed 42');
      });
    });
  });

  describe('edge cases', () => {
    it('renders with minimal data (no frames/columns set)', () => {
      const props = {
        ...defaultProps,
        data: { label: 'Sprite Sheet' },
      };
      render(<SpriteSheetNode {...props} />);
      // Should use defaults: frames=4, columns=4
      const framesInput = screen.getByLabelText('Frames') as HTMLInputElement;
      expect(framesInput.value).toBe('4');
    });

    it('displays custom frame size values', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, frameWidth: 128, frameHeight: 256 },
      };
      render(<SpriteSheetNode {...props} />);
      expect((screen.getByLabelText('Frame Width') as HTMLInputElement).value).toBe('128');
      expect((screen.getByLabelText('Frame Height') as HTMLInputElement).value).toBe('256');
    });
  });
});
