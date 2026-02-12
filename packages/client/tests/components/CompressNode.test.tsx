import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CompressNode } from '../../src/components/nodes/CompressNode';

// Mock the store
vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

import { useWorkflowStore } from '../../src/stores/workflow';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Minimize2: () => <div data-testid="minimize2-icon" />,
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

// Mock api
vi.mock('../../src/lib/api', () => ({
  compressImage: vi.fn(),
}));

import { compressImage } from '../../src/lib/api';

describe('CompressNode', () => {
  const mockGetInputsForNode = vi.fn();
  const mockSetNodeOutput = vi.fn();
  const mockSetNodeStatus = vi.fn();
  const mockUpdateNodeData = vi.fn();

  const defaultProps = {
    id: 'compress-node-1',
    data: {
      label: 'Compress',
      format: 'webp' as const,
      quality: 80,
    },
    type: 'compress',
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
    (compressImage as any).mockResolvedValue({
      image: 'data:image/webp;base64,compressed',
      originalSize: 10240,
      compressedSize: 5120,
      format: 'webp',
    });
  });

  describe('rendering', () => {
    it('renders with default props', () => {
      render(<CompressNode {...defaultProps} />);

      expect(screen.getByText('Compress Image')).toBeInTheDocument();
      expect(screen.getByText('Compress')).toBeInTheDocument();
    });

    it('displays the icon', () => {
      render(<CompressNode {...defaultProps} />);

      expect(screen.getByTestId('minimize2-icon')).toBeInTheDocument();
    });

    it('shows format selector with all options', () => {
      render(<CompressNode {...defaultProps} />);

      expect(screen.getByText('WebP')).toBeInTheDocument();
      expect(screen.getByText('PNG')).toBeInTheDocument();
      expect(screen.getByText('JPEG')).toBeInTheDocument();
    });

    it('shows format label', () => {
      render(<CompressNode {...defaultProps} />);

      expect(screen.getByText('Format')).toBeInTheDocument();
    });

    it('shows quality slider with value', () => {
      render(<CompressNode {...defaultProps} />);

      expect(screen.getByText('Quality: 80')).toBeInTheDocument();
      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
      expect((slider as HTMLInputElement).value).toBe('80');
    });

    it('shows max width and height inputs', () => {
      render(<CompressNode {...defaultProps} />);

      expect(screen.getByText('Max W')).toBeInTheDocument();
      expect(screen.getByText('Max H')).toBeInTheDocument();
    });

    it('shows placeholder "Auto" for empty max dimensions', () => {
      render(<CompressNode {...defaultProps} />);

      const spinbuttons = screen.getAllByRole('spinbutton');
      expect(spinbuttons[0]).toHaveAttribute('placeholder', 'Auto');
      expect(spinbuttons[1]).toHaveAttribute('placeholder', 'Auto');
    });
  });

  describe('format selection', () => {
    it('displays selected format', () => {
      render(<CompressNode {...defaultProps} />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('webp');
    });

    it('calls updateNodeData when format is changed to png', () => {
      render(<CompressNode {...defaultProps} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'png' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('compress-node-1', {
        format: 'png',
      });
    });

    it('calls updateNodeData when format is changed to jpeg', () => {
      render(<CompressNode {...defaultProps} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'jpeg' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('compress-node-1', {
        format: 'jpeg',
      });
    });

    it('shows correct format when data says png', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, format: 'png' as const },
      };

      render(<CompressNode {...props} />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('png');
    });
  });

  describe('quality slider', () => {
    it('updates quality when slider changes', () => {
      render(<CompressNode {...defaultProps} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '50' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('compress-node-1', {
        quality: 50,
      });
    });

    it('displays quality label that updates with value', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, quality: 95 },
      };

      render(<CompressNode {...props} />);

      expect(screen.getByText('Quality: 95')).toBeInTheDocument();
    });

    it('defaults quality to 80 when not specified', () => {
      const props = {
        ...defaultProps,
        data: { label: 'Compress', format: 'webp' as const },
      };

      render(<CompressNode {...props} />);

      expect(screen.getByText('Quality: 80')).toBeInTheDocument();
    });
  });

  describe('max dimension inputs', () => {
    it('updates maxWidth when value is entered', () => {
      render(<CompressNode {...defaultProps} />);

      const spinbuttons = screen.getAllByRole('spinbutton');
      fireEvent.change(spinbuttons[0], { target: { value: '1024' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('compress-node-1', {
        maxWidth: 1024,
      });
    });

    it('updates maxHeight when value is entered', () => {
      render(<CompressNode {...defaultProps} />);

      const spinbuttons = screen.getAllByRole('spinbutton');
      fireEvent.change(spinbuttons[1], { target: { value: '768' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('compress-node-1', {
        maxHeight: 768,
      });
    });

    it('clears maxWidth when input is emptied', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, maxWidth: 1024 },
      };

      render(<CompressNode {...props} />);

      const spinbuttons = screen.getAllByRole('spinbutton');
      fireEvent.change(spinbuttons[0], { target: { value: '' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('compress-node-1', {
        maxWidth: undefined,
      });
    });

    it('clamps maxWidth to minimum 1', () => {
      render(<CompressNode {...defaultProps} />);

      const spinbuttons = screen.getAllByRole('spinbutton');
      fireEvent.change(spinbuttons[0], { target: { value: '0' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('compress-node-1', {
        maxWidth: 1,
      });
    });

    it('clamps maxWidth to maximum 8192', () => {
      render(<CompressNode {...defaultProps} />);

      const spinbuttons = screen.getAllByRole('spinbutton');
      fireEvent.change(spinbuttons[0], { target: { value: '10000' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('compress-node-1', {
        maxWidth: 8192,
      });
    });
  });

  describe('compress operation', () => {
    it('sets error when no image input is connected', async () => {
      mockGetInputsForNode.mockReturnValue([]);

      render(<CompressNode {...defaultProps} />);

      const compressButton = screen.getByText('Compress');
      fireEvent.click(compressButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('compress-node-1', 'error');
      });
    });

    it('sets running status when compression starts', async () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,mockdata' },
      ]);

      render(<CompressNode {...defaultProps} />);

      const compressButton = screen.getByText('Compress');
      fireEvent.click(compressButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('compress-node-1', 'running');
      });
    });

    it('calls compressImage API with correct params', async () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,mockdata' },
      ]);

      render(<CompressNode {...defaultProps} />);

      const compressButton = screen.getByText('Compress');
      fireEvent.click(compressButton);

      await waitFor(() => {
        expect(compressImage).toHaveBeenCalledWith(
          'data:image/png;base64,mockdata',
          'webp',
          80,
          undefined,
          undefined
        );
      });
    });

    it('calls compressImage with maxWidth and maxHeight when set', async () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, maxWidth: 1024, maxHeight: 768 },
      };

      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,mockdata' },
      ]);

      render(<CompressNode {...props} />);

      const compressButton = screen.getByText('Compress');
      fireEvent.click(compressButton);

      await waitFor(() => {
        expect(compressImage).toHaveBeenCalledWith(
          'data:image/png;base64,mockdata',
          'webp',
          80,
          1024,
          768
        );
      });
    });

    it('sets output and success status on successful compression', async () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,mockdata' },
      ]);

      render(<CompressNode {...defaultProps} />);

      const compressButton = screen.getByText('Compress');
      fireEvent.click(compressButton);

      await waitFor(() => {
        expect(mockSetNodeOutput).toHaveBeenCalledWith('compress-node-1', {
          type: 'image',
          data: 'data:image/webp;base64,compressed',
          timestamp: expect.any(Number),
        });
        expect(mockSetNodeStatus).toHaveBeenCalledWith('compress-node-1', 'success');
      });
    });

    it('handles compression failure', async () => {
      (compressImage as any).mockRejectedValue(new Error('Compression failed'));

      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,mockdata' },
      ]);

      render(<CompressNode {...defaultProps} />);

      const compressButton = screen.getByText('Compress');
      fireEvent.click(compressButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('compress-node-1', 'error');
      });
    });
  });

  describe('compression stats display', () => {
    it('displays compression stats after successful compression', async () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,mockdata' },
      ]);

      render(<CompressNode {...defaultProps} />);

      const compressButton = screen.getByText('Compress');
      fireEvent.click(compressButton);

      await waitFor(() => {
        expect(screen.getByText(/10\.0 KB/)).toBeInTheDocument();
        expect(screen.getByText(/5\.0 KB/)).toBeInTheDocument();
        expect(screen.getByText(/WEBP/)).toBeInTheDocument();
        expect(screen.getByText(/50\.0% saved/)).toBeInTheDocument();
      });
    });

    it('formats bytes correctly for small sizes', async () => {
      (compressImage as any).mockResolvedValue({
        image: 'data:image/png;base64,tiny',
        originalSize: 500,
        compressedSize: 200,
        format: 'png',
      });

      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,mockdata' },
      ]);

      render(<CompressNode {...defaultProps} />);

      const compressButton = screen.getByText('Compress');
      fireEvent.click(compressButton);

      await waitFor(() => {
        expect(screen.getByText(/500 B/)).toBeInTheDocument();
        expect(screen.getByText(/200 B/)).toBeInTheDocument();
      });
    });
  });

  describe('status indicators', () => {
    it('shows running state', () => {
      (useWorkflowStore as any).mockReturnValue({
        ...mockStore,
        nodeStatus: { 'compress-node-1': 'running' },
      });

      render(<CompressNode {...defaultProps} />);

      expect(screen.getByText('Compressing...')).toBeInTheDocument();
      expect(screen.getByText('Compressing...')).toBeDisabled();
    });

    it('shows error message on error status', () => {
      (useWorkflowStore as any).mockReturnValue({
        ...mockStore,
        nodeStatus: { 'compress-node-1': 'error' },
      });

      render(<CompressNode {...defaultProps} />);

      expect(screen.getByText('Failed. Connect an image input.')).toBeInTheDocument();
    });

    it('shows idle state by default', () => {
      render(<CompressNode {...defaultProps} />);

      expect(screen.getByText('Compress')).toBeInTheDocument();
      expect(screen.getByText('Compress')).not.toBeDisabled();
    });
  });

  describe('edge cases', () => {
    it('handles missing format data gracefully', () => {
      const props = {
        ...defaultProps,
        data: { label: 'Compress' },
      };

      render(<CompressNode {...props} />);

      // Defaults to webp
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('webp');
    });

    it('ignores non-image inputs', async () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'text', data: 'some text' },
      ]);

      render(<CompressNode {...defaultProps} />);

      const compressButton = screen.getByText('Compress');
      fireEvent.click(compressButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('compress-node-1', 'error');
      });
    });
  });
});
