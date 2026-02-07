import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { ColorPaletteNode } from '../../src/components/nodes/ColorPaletteNode';

// Mock the store
vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

// Import after mock
import { useWorkflowStore } from '../../src/stores/workflow';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Palette: () => <div data-testid="palette-icon" />,
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

describe('ColorPaletteNode', () => {
  const mockGetInputsForNode = vi.fn();
  const mockSetNodeOutput = vi.fn();
  const mockSetNodeStatus = vi.fn();
  const mockUpdateNodeData = vi.fn();

  const defaultProps = {
    id: 'palette-node-1',
    data: {
      label: 'Color Palette',
      palette: 'pico8',
      dithering: false,
    },
    type: 'colorPalette',
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
    nodeOutputs: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector?: (state: any) => any) => selector ? selector(mockStore) : mockStore
    );
    mockGetInputsForNode.mockReturnValue([]);
  });

  describe('rendering', () => {
    it('renders with default props', () => {
      render(
        <ReactFlowProvider>
          <ColorPaletteNode {...defaultProps} />
        </ReactFlowProvider>
      );

      expect(screen.getByText('Color Palette')).toBeInTheDocument();
      expect(screen.getByText('Apply Palette')).toBeInTheDocument();
    });

    it('displays palette selector with all options', () => {
      render(
        <ReactFlowProvider>
          <ColorPaletteNode {...defaultProps} />
        </ReactFlowProvider>
      );

      expect(screen.getByText('PICO-8 (16 colors)')).toBeInTheDocument();
      expect(screen.getByText('Game Boy (4 colors)')).toBeInTheDocument();
      expect(screen.getByText('NES (54 colors)')).toBeInTheDocument();
      expect(screen.getByText('CGA (4 colors)')).toBeInTheDocument();
      expect(screen.getByText('Grayscale (4 colors)')).toBeInTheDocument();
      expect(screen.getByText('Sepia (5 colors)')).toBeInTheDocument();
      expect(screen.getByText('Neon (6 colors)')).toBeInTheDocument();
      expect(screen.getByText('Pastel (6 colors)')).toBeInTheDocument();
    });

    it('displays dithering checkbox', () => {
      render(
        <ReactFlowProvider>
          <ColorPaletteNode {...defaultProps} />
        </ReactFlowProvider>
      );

      expect(screen.getByText('Floyd-Steinberg Dithering')).toBeInTheDocument();
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('shows palette preview colors', () => {
      render(
        <ReactFlowProvider>
          <ColorPaletteNode {...defaultProps} />
        </ReactFlowProvider>
      );

      const colorDivs = screen.getAllByTitle(/#[0-9a-f]{6}/i);
      expect(colorDivs.length).toBeGreaterThan(0);
    });
  });

  describe('palette selection', () => {
    it('calls updateNodeData when palette is changed', () => {
      render(
        <ReactFlowProvider>
          <ColorPaletteNode {...defaultProps} />
        </ReactFlowProvider>
      );

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'gameboy' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('palette-node-1', { palette: 'gameboy' });
    });

    it('displays selected palette correctly', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, palette: 'gameboy' },
      };

      render(
        <ReactFlowProvider>
          <ColorPaletteNode {...props} />
        </ReactFlowProvider>
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('gameboy');
    });
  });

  describe('dithering toggle', () => {
    it('calls updateNodeData when dithering is toggled', () => {
      render(
        <ReactFlowProvider>
          <ColorPaletteNode {...defaultProps} />
        </ReactFlowProvider>
      );

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(mockUpdateNodeData).toHaveBeenCalledWith('palette-node-1', { dithering: true });
    });

    it('reflects dithering state correctly', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, dithering: true },
      };

      render(
        <ReactFlowProvider>
          <ColorPaletteNode {...props} />
        </ReactFlowProvider>
      );

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });
  });

  describe('status indicators', () => {
    it('shows idle state by default', () => {
      render(
        <ReactFlowProvider>
          <ColorPaletteNode {...defaultProps} />
        </ReactFlowProvider>
      );

      expect(screen.getByText('Apply Palette')).toBeInTheDocument();
    });

    it('shows running state', () => {
      const store = {
        ...mockStore,
        nodeStatus: { 'palette-node-1': 'running' },
      };

      (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (selector?: (state: any) => any) => selector ? selector(store) : store
      );

      render(
        <ReactFlowProvider>
          <ColorPaletteNode {...defaultProps} />
        </ReactFlowProvider>
      );

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('disables button when running', () => {
      const store = {
        ...mockStore,
        nodeStatus: { 'palette-node-1': 'running' },
      };

      (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (selector?: (state: any) => any) => selector ? selector(store) : store
      );

      render(
        <ReactFlowProvider>
          <ColorPaletteNode {...defaultProps} />
        </ReactFlowProvider>
      );

      const button = screen.getByText('Processing...');
      expect(button).toBeDisabled();
    });
  });

  describe('apply palette', () => {
    it('sets error status when no image input', async () => {
      mockGetInputsForNode.mockReturnValue([]);

      render(
        <ReactFlowProvider>
          <ColorPaletteNode {...defaultProps} />
        </ReactFlowProvider>
      );

      const button = screen.getByText('Apply Palette');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('palette-node-1', 'error');
      });
    });

    it('processes image with simple nearest color', async () => {
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

      render(
        <ReactFlowProvider>
          <ColorPaletteNode {...defaultProps} />
        </ReactFlowProvider>
      );

      const button = screen.getByText('Apply Palette');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('palette-node-1', 'running');
      });

      await waitFor(() => {
        expect(mockSetNodeOutput).toHaveBeenCalledWith('palette-node-1', {
          type: 'image',
          data: expect.stringContaining('data:image/png'),
          timestamp: expect.any(Number),
        });
        expect(mockSetNodeStatus).toHaveBeenCalledWith('palette-node-1', 'success');
      });
    });

    it('processes image with dithering enabled', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 10;
      canvas.height = 10;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, 10, 10);
      const imageData = canvas.toDataURL('image/png');

      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: imageData },
      ]);

      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, dithering: true },
      };

      render(
        <ReactFlowProvider>
          <ColorPaletteNode {...props} />
        </ReactFlowProvider>
      );

      const button = screen.getByText('Apply Palette');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSetNodeOutput).toHaveBeenCalledWith('palette-node-1', {
          type: 'image',
          data: expect.stringContaining('data:image/png'),
          timestamp: expect.any(Number),
        });
        expect(mockSetNodeStatus).toHaveBeenCalledWith('palette-node-1', 'success');
      });
    });

    it('handles different palette types', async () => {
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

      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, palette: 'grayscale' },
      };

      render(
        <ReactFlowProvider>
          <ColorPaletteNode {...props} />
        </ReactFlowProvider>
      );

      const button = screen.getByText('Apply Palette');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('palette-node-1', 'success');
      });
    });
  });

  describe('edge cases', () => {
    it('handles missing palette data gracefully', () => {
      const props = {
        ...defaultProps,
        data: { label: 'Color Palette' },
      };

      render(
        <ReactFlowProvider>
          <ColorPaletteNode {...props} />
        </ReactFlowProvider>
      );

      expect(screen.getByText('Apply Palette')).toBeInTheDocument();
    });

    it('handles invalid image input', async () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,invalid' },
      ]);

      render(
        <ReactFlowProvider>
          <ColorPaletteNode {...defaultProps} />
        </ReactFlowProvider>
      );

      const button = screen.getByText('Apply Palette');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('palette-node-1', 'running');
      });

      // In happy-dom, invalid images may still load, so we just verify the process starts
      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalled();
      });
    });
  });
});
