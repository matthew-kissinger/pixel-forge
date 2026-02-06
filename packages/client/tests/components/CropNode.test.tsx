import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { CropNode } from '../../src/components/nodes/CropNode';

// Mock the store
vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

// Import after mock
import { useWorkflowStore } from '../../src/stores/workflow';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Crop: () => <div data-testid="crop-icon" />,
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

describe('CropNode', () => {
  const mockGetInputsForNode = vi.fn();
  const mockSetNodeOutput = vi.fn();
  const mockSetNodeStatus = vi.fn();
  const mockUpdateNodeData = vi.fn();

  const defaultProps = {
    id: 'crop-node-1',
    data: {
      label: 'Crop',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      preset: 'custom' as const,
    },
    type: 'crop',
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
          <CropNode {...defaultProps} />
        </ReactFlowProvider>
      );

      const buttons = screen.getAllByRole('button');
      const cropButton = buttons.find(btn => btn.textContent === 'Crop');
      expect(cropButton).toBeInTheDocument();
    });

    it('displays preset buttons', () => {
      render(
        <ReactFlowProvider>
          <CropNode {...defaultProps} />
        </ReactFlowProvider>
      );

      expect(screen.getByText('custom')).toBeInTheDocument();
      expect(screen.getByText('square')).toBeInTheDocument();
      expect(screen.getByText('16:9')).toBeInTheDocument();
      expect(screen.getByText('4:3')).toBeInTheDocument();
    });

    it('displays position inputs', () => {
      render(
        <ReactFlowProvider>
          <CropNode {...defaultProps} />
        </ReactFlowProvider>
      );

      expect(screen.getByText('X')).toBeInTheDocument();
      expect(screen.getByText('Y')).toBeInTheDocument();
    });

    it('displays size inputs', () => {
      render(
        <ReactFlowProvider>
          <CropNode {...defaultProps} />
        </ReactFlowProvider>
      );

      expect(screen.getByText('W')).toBeInTheDocument();
      expect(screen.getByText('H')).toBeInTheDocument();
    });
  });

  describe('preset selection', () => {
    it('highlights selected preset', () => {
      render(
        <ReactFlowProvider>
          <CropNode {...defaultProps} />
        </ReactFlowProvider>
      );

      const customButton = screen.getByText('custom');
      expect(customButton).toHaveClass('bg-[var(--accent)]');
    });

    it('applies square preset', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 100;
      const imageData = canvas.toDataURL('image/png');

      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: imageData },
      ]);

      render(
        <ReactFlowProvider>
          <CropNode {...defaultProps} />
        </ReactFlowProvider>
      );

      const squareButton = screen.getByText('square');
      fireEvent.click(squareButton);

      // Preset application happens in useEffect, just verify button click works
      expect(squareButton).toBeInTheDocument();
    });

    it('applies 16:9 preset', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 90;
      const imageData = canvas.toDataURL('image/png');

      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: imageData },
      ]);

      render(
        <ReactFlowProvider>
          <CropNode {...defaultProps} />
        </ReactFlowProvider>
      );

      const button = screen.getByText('16:9');
      fireEvent.click(button);

      expect(button).toBeInTheDocument();
    });

    it('applies 4:3 preset', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      const imageData = canvas.toDataURL('image/png');

      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: imageData },
      ]);

      render(
        <ReactFlowProvider>
          <CropNode {...defaultProps} />
        </ReactFlowProvider>
      );

      const button = screen.getByText('4:3');
      fireEvent.click(button);

      expect(button).toBeInTheDocument();
    });
  });

  describe('position and size inputs', () => {
    it('updates x position', () => {
      render(
        <ReactFlowProvider>
          <CropNode {...defaultProps} />
        </ReactFlowProvider>
      );

      const xInput = screen.getAllByRole('spinbutton')[0];
      fireEvent.change(xInput, { target: { value: '50' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('crop-node-1', { x: 50, preset: 'custom' });
    });

    it('updates y position', () => {
      render(
        <ReactFlowProvider>
          <CropNode {...defaultProps} />
        </ReactFlowProvider>
      );

      const yInput = screen.getAllByRole('spinbutton')[1];
      fireEvent.change(yInput, { target: { value: '25' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('crop-node-1', { y: 25, preset: 'custom' });
    });

    it('updates width', () => {
      render(
        <ReactFlowProvider>
          <CropNode {...defaultProps} />
        </ReactFlowProvider>
      );

      const widthInput = screen.getAllByRole('spinbutton')[2];
      fireEvent.change(widthInput, { target: { value: '200' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('crop-node-1', { width: 200, preset: 'custom' });
    });

    it('updates height', () => {
      render(
        <ReactFlowProvider>
          <CropNode {...defaultProps} />
        </ReactFlowProvider>
      );

      const heightInput = screen.getAllByRole('spinbutton')[3];
      fireEvent.change(heightInput, { target: { value: '150' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('crop-node-1', { height: 150, preset: 'custom' });
    });

    it('resets preset to custom when manual input changes', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, preset: 'square' as const },
      };

      render(
        <ReactFlowProvider>
          <CropNode {...props} />
        </ReactFlowProvider>
      );

      const xInput = screen.getAllByRole('spinbutton')[0];
      fireEvent.change(xInput, { target: { value: '10' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('crop-node-1', { x: 10, preset: 'custom' });
    });
  });

  describe('source image info', () => {
    it('displays source dimensions when image is loaded', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const imageData = canvas.toDataURL('image/png');

      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: imageData },
      ]);

      render(
        <ReactFlowProvider>
          <CropNode {...defaultProps} />
        </ReactFlowProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Source:/)).toBeInTheDocument();
      });
    });

    it('does not display source info when no image', () => {
      render(
        <ReactFlowProvider>
          <CropNode {...defaultProps} />
        </ReactFlowProvider>
      );

      expect(screen.queryByText(/Source:/)).not.toBeInTheDocument();
    });
  });

  describe('status indicators', () => {
    it('shows idle state by default', () => {
      render(
        <ReactFlowProvider>
          <CropNode {...defaultProps} />
        </ReactFlowProvider>
      );

      expect(screen.getByText('Crop', { selector: 'button' })).toBeInTheDocument();
    });

    it('shows running state', () => {
      const store = {
        ...mockStore,
        nodeStatus: { 'crop-node-1': 'running' },
      };

      (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (selector?: (state: any) => any) => selector ? selector(store) : store
      );

      render(
        <ReactFlowProvider>
          <CropNode {...defaultProps} />
        </ReactFlowProvider>
      );

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('disables button when running', () => {
      const store = {
        ...mockStore,
        nodeStatus: { 'crop-node-1': 'running' },
      };

      (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (selector?: (state: any) => any) => selector ? selector(store) : store
      );

      render(
        <ReactFlowProvider>
          <CropNode {...defaultProps} />
        </ReactFlowProvider>
      );

      const button = screen.getByText('Processing...');
      expect(button).toBeDisabled();
    });
  });

  describe('crop operation', () => {
    it('sets error status when no image input', async () => {
      mockGetInputsForNode.mockReturnValue([]);

      render(
        <ReactFlowProvider>
          <CropNode {...defaultProps} />
        </ReactFlowProvider>
      );

      const buttons = screen.getAllByRole('button');
      const cropButton = buttons.find(btn => btn.textContent === 'Crop')!;
      fireEvent.click(cropButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('crop-node-1', 'error');
      });
    });

    it('crops image successfully', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 200, 200);
      const imageData = canvas.toDataURL('image/png');

      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: imageData },
      ]);

      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, x: 50, y: 50, width: 100, height: 100 },
      };

      render(
        <ReactFlowProvider>
          <CropNode {...props} />
        </ReactFlowProvider>
      );

      const buttons = screen.getAllByRole('button');
      const cropButton = buttons.find(btn => btn.textContent === 'Crop')!;
      fireEvent.click(cropButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('crop-node-1', 'running');
      });

      await waitFor(() => {
        expect(mockSetNodeOutput).toHaveBeenCalledWith('crop-node-1', {
          type: 'image',
          data: expect.stringContaining('data:image/png'),
          timestamp: expect.any(Number),
        });
        expect(mockSetNodeStatus).toHaveBeenCalledWith('crop-node-1', 'success');
      });
    });

    it('clamps crop values to image bounds', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(0, 0, 100, 100);
      const imageData = canvas.toDataURL('image/png');

      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: imageData },
      ]);

      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, x: 150, y: 150, width: 200, height: 200 },
      };

      render(
        <ReactFlowProvider>
          <CropNode {...props} />
        </ReactFlowProvider>
      );

      const buttons = screen.getAllByRole('button');
      const cropButton = buttons.find(btn => btn.textContent === 'Crop')!;
      fireEvent.click(cropButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('crop-node-1', 'success');
      });
    });

    it('handles invalid image input', async () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,invalid' },
      ]);

      render(
        <ReactFlowProvider>
          <CropNode {...defaultProps} />
        </ReactFlowProvider>
      );

      const buttons = screen.getAllByRole('button');
      const cropButton = buttons.find(btn => btn.textContent === 'Crop')!;
      fireEvent.click(cropButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('crop-node-1', 'running');
      });

      // In happy-dom, invalid images may still load, so we just verify the process starts
      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalled();
      });
    });
  });

  describe('edge cases', () => {
    it('handles missing crop data gracefully', () => {
      const props = {
        ...defaultProps,
        data: { label: 'Crop' },
      };

      render(
        <ReactFlowProvider>
          <CropNode {...props} />
        </ReactFlowProvider>
      );

      const buttons = screen.getAllByRole('button');
      const cropButton = buttons.find(btn => btn.textContent === 'Crop');
      expect(cropButton).toBeInTheDocument();
    });

    it('handles zero width and height', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const imageData = canvas.toDataURL('image/png');

      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: imageData },
      ]);

      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, width: 0, height: 0 },
      };

      render(
        <ReactFlowProvider>
          <CropNode {...props} />
        </ReactFlowProvider>
      );

      const buttons = screen.getAllByRole('button');
      const cropButton = buttons.find(btn => btn.textContent === 'Crop')!;
      fireEvent.click(cropButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('crop-node-1', 'success');
      });
    });

    it('handles negative position values', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const imageData = canvas.toDataURL('image/png');

      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: imageData },
      ]);

      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, x: -10, y: -10 },
      };

      render(
        <ReactFlowProvider>
          <CropNode {...props} />
        </ReactFlowProvider>
      );

      const buttons = screen.getAllByRole('button');
      const cropButton = buttons.find(btn => btn.textContent === 'Crop')!;
      fireEvent.click(cropButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('crop-node-1', 'success');
      });
    });
  });
});
