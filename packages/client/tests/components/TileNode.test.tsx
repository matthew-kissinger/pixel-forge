import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TileNode } from '../../src/components/nodes/TileNode';

// Mock the store
vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

import { useWorkflowStore } from '../../src/stores/workflow';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  LayoutGrid: () => <div data-testid="layout-grid-icon" />,
}));

// Mock BaseNode
vi.mock('../../src/components/nodes/BaseNode', () => ({
  BaseNode: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock logger
vi.mock('@pixel-forge/shared/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('TileNode', () => {
  const mockGetInputsForNode = vi.fn();
  const mockSetNodeOutput = vi.fn();
  const mockSetNodeStatus = vi.fn();
  const mockUpdateNodeData = vi.fn();

  const defaultProps = {
    id: 'tile-node-1',
    data: {
      label: 'Tile/Seamless',
      mode: 'seamless' as const,
      repeatX: 2,
      repeatY: 2,
      blendAmount: 0.25,
    },
    type: 'tile',
    selected: false,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    dragging: false,
    zIndex: 0,
  };

  const mockStore = {
    getInputsForNode: mockGetInputsForNode,
    setNodeOutput: mockSetNodeOutput,
    setNodeStatus: mockSetNodeStatus,
    nodeStatus: {},
    updateNodeData: mockUpdateNodeData,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useWorkflowStore as any).mockReturnValue(mockStore);
    mockGetInputsForNode.mockReturnValue([]);
  });

  describe('rendering', () => {
    it('renders with default props', () => {
      render(<TileNode {...defaultProps} />);

      expect(screen.getByText('Tile / Seamless')).toBeInTheDocument();
      expect(screen.getByText('Apply')).toBeInTheDocument();
    });

    it('displays the layout grid icon', () => {
      render(<TileNode {...defaultProps} />);

      expect(screen.getByTestId('layout-grid-icon')).toBeInTheDocument();
    });

    it('shows mode selector with all options', () => {
      render(<TileNode {...defaultProps} />);

      expect(screen.getByText('Make Seamless')).toBeInTheDocument();
      expect(screen.getByText('Repeat Pattern')).toBeInTheDocument();
      expect(screen.getByText('Mirror Pattern')).toBeInTheDocument();
    });
  });

  describe('mode selection', () => {
    it('displays selected mode', () => {
      render(<TileNode {...defaultProps} />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('seamless');
    });

    it('calls updateNodeData when mode is changed to repeat', () => {
      render(<TileNode {...defaultProps} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'repeat' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('tile-node-1', {
        mode: 'repeat',
      });
    });

    it('calls updateNodeData when mode is changed to mirror', () => {
      render(<TileNode {...defaultProps} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'mirror' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('tile-node-1', {
        mode: 'mirror',
      });
    });
  });

  describe('seamless mode controls', () => {
    it('shows blend amount slider in seamless mode', () => {
      render(<TileNode {...defaultProps} />);

      expect(screen.getByText('Blend: 25%')).toBeInTheDocument();
      const sliders = screen.getAllByRole('slider');
      expect(sliders).toHaveLength(1);
    });

    it('updates blend amount when slider changes', () => {
      render(<TileNode {...defaultProps} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '40' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('tile-node-1', {
        blendAmount: 0.4,
      });
    });

    it('does not show repeat controls in seamless mode', () => {
      render(<TileNode {...defaultProps} />);

      expect(screen.queryByText(/X: /)).not.toBeInTheDocument();
      expect(screen.queryByText(/Y: /)).not.toBeInTheDocument();
    });
  });

  describe('repeat mode controls', () => {
    const repeatProps = {
      ...defaultProps,
      data: {
        ...defaultProps.data,
        mode: 'repeat' as const,
      },
    };

    it('shows X and Y repeat sliders in repeat mode', () => {
      render(<TileNode {...repeatProps} />);

      expect(screen.getByText('X: 2')).toBeInTheDocument();
      expect(screen.getByText('Y: 2')).toBeInTheDocument();
    });

    it('updates repeatX when slider changes', () => {
      render(<TileNode {...repeatProps} />);

      const sliders = screen.getAllByRole('slider');
      // First slider is X
      fireEvent.change(sliders[0], { target: { value: '4' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('tile-node-1', {
        repeatX: 4,
      });
    });

    it('updates repeatY when slider changes', () => {
      render(<TileNode {...repeatProps} />);

      const sliders = screen.getAllByRole('slider');
      // Second slider is Y
      fireEvent.change(sliders[1], { target: { value: '6' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('tile-node-1', {
        repeatY: 6,
      });
    });

    it('does not show blend slider in repeat mode', () => {
      render(<TileNode {...repeatProps} />);

      expect(screen.queryByText(/Blend:/)).not.toBeInTheDocument();
    });
  });

  describe('mirror mode controls', () => {
    const mirrorProps = {
      ...defaultProps,
      data: {
        ...defaultProps.data,
        mode: 'mirror' as const,
      },
    };

    it('does not show blend slider in mirror mode', () => {
      render(<TileNode {...mirrorProps} />);

      expect(screen.queryByText(/Blend:/)).not.toBeInTheDocument();
    });

    it('does not show repeat sliders in mirror mode', () => {
      render(<TileNode {...mirrorProps} />);

      expect(screen.queryByText(/X: /)).not.toBeInTheDocument();
      expect(screen.queryByText(/Y: /)).not.toBeInTheDocument();
    });
  });

  describe('tile operation', () => {
    it('sets error when no image input is connected', async () => {
      mockGetInputsForNode.mockReturnValue([]);

      render(<TileNode {...defaultProps} />);

      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('tile-node-1', 'error');
      });
    });

    it('sets running status when tiling starts', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 10;
      canvas.height = 10;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 10, 10);
      const imageData = canvas.toDataURL('image/png');

      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: imageData },
      ]);

      render(<TileNode {...defaultProps} />);

      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('tile-node-1', 'running');
      });
    });

    it('processes seamless tile successfully', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 20;
      canvas.height = 20;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 20, 20);
      const imageData = canvas.toDataURL('image/png');

      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: imageData },
      ]);

      render(<TileNode {...defaultProps} />);

      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(mockSetNodeOutput).toHaveBeenCalledWith('tile-node-1', {
          type: 'image',
          data: expect.stringContaining('data:image/png'),
          timestamp: expect.any(Number),
        });
        expect(mockSetNodeStatus).toHaveBeenCalledWith('tile-node-1', 'success');
      });
    });

    it('processes repeat tile successfully', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 10;
      canvas.height = 10;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(0, 0, 10, 10);
      const imageData = canvas.toDataURL('image/png');

      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: imageData },
      ]);

      const repeatProps = {
        ...defaultProps,
        data: { ...defaultProps.data, mode: 'repeat' as const, repeatX: 3, repeatY: 2 },
      };

      render(<TileNode {...repeatProps} />);

      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(mockSetNodeOutput).toHaveBeenCalledWith('tile-node-1', {
          type: 'image',
          data: expect.stringContaining('data:image/png'),
          timestamp: expect.any(Number),
        });
        expect(mockSetNodeStatus).toHaveBeenCalledWith('tile-node-1', 'success');
      });
    });

    it('processes mirror tile successfully', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 10;
      canvas.height = 10;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#0000ff';
      ctx.fillRect(0, 0, 10, 10);
      const imageData = canvas.toDataURL('image/png');

      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: imageData },
      ]);

      const mirrorProps = {
        ...defaultProps,
        data: { ...defaultProps.data, mode: 'mirror' as const },
      };

      render(<TileNode {...mirrorProps} />);

      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(mockSetNodeOutput).toHaveBeenCalledWith('tile-node-1', {
          type: 'image',
          data: expect.stringContaining('data:image/png'),
          timestamp: expect.any(Number),
        });
        expect(mockSetNodeStatus).toHaveBeenCalledWith('tile-node-1', 'success');
      });
    });

    it('handles image load error', async () => {
      const OriginalImage = globalThis.Image;
      class FailingMockImage {
        onload: (() => void) | null = null;
        onerror: ((error: Error) => void) | null = null;
        src: string = '';
        width: number = 10;
        height: number = 10;

        constructor() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Error('Image load failed'));
            }
          }, 0);
        }
      }
      globalThis.Image = FailingMockImage as any;

      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'invalid-image' },
      ]);

      render(<TileNode {...defaultProps} />);

      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('tile-node-1', 'error');
      });

      globalThis.Image = OriginalImage;
    });
  });

  describe('status indicators', () => {
    it('shows running state', () => {
      (useWorkflowStore as any).mockReturnValue({
        ...mockStore,
        nodeStatus: { 'tile-node-1': 'running' },
      });

      render(<TileNode {...defaultProps} />);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(screen.getByText('Processing...')).toBeDisabled();
    });

    it('shows idle state by default', () => {
      render(<TileNode {...defaultProps} />);

      expect(screen.getByText('Apply')).toBeInTheDocument();
      expect(screen.getByText('Apply')).not.toBeDisabled();
    });
  });

  describe('edge cases', () => {
    it('handles missing data gracefully', () => {
      const props = {
        ...defaultProps,
        data: { label: 'Tile' },
      };

      render(<TileNode {...props} />);

      // Defaults to seamless mode
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('seamless');
    });

    it('ignores non-image inputs', async () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'text', data: 'some text' },
      ]);

      render(<TileNode {...defaultProps} />);

      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('tile-node-1', 'error');
      });
    });

    it('displays correct blend percentage from decimal', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, blendAmount: 0.35 },
      };

      render(<TileNode {...props} />);

      expect(screen.getByText('Blend: 35%')).toBeInTheDocument();
    });

    it('displays correct repeat counts', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, mode: 'repeat' as const, repeatX: 5, repeatY: 3 },
      };

      render(<TileNode {...props} />);

      expect(screen.getByText('X: 5')).toBeInTheDocument();
      expect(screen.getByText('Y: 3')).toBeInTheDocument();
    });
  });
});
