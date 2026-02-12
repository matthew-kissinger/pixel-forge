import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FilterNode } from '../../src/components/nodes/FilterNode';

// Mock the store
vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

import { useWorkflowStore } from '../../src/stores/workflow';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Wand2: () => <div data-testid="wand2-icon" />,
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

describe('FilterNode', () => {
  const mockGetInputsForNode = vi.fn();
  const mockSetNodeOutput = vi.fn();
  const mockSetNodeStatus = vi.fn();
  const mockUpdateNodeData = vi.fn();

  const defaultProps = {
    id: 'filter-node-1',
    data: {
      label: 'Filter',
      filter: 'grayscale' as const,
      intensity: 100,
    },
    type: 'filter',
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
      render(<FilterNode {...defaultProps} />);

      expect(screen.getByText('Image Filter')).toBeInTheDocument();
      expect(screen.getByText('Apply Filter')).toBeInTheDocument();
    });

    it('displays the wand icon', () => {
      render(<FilterNode {...defaultProps} />);

      expect(screen.getByTestId('wand2-icon')).toBeInTheDocument();
    });

    it('shows filter type selector with all options', () => {
      render(<FilterNode {...defaultProps} />);

      expect(screen.getByText('Grayscale')).toBeInTheDocument();
      expect(screen.getByText('Sepia')).toBeInTheDocument();
      expect(screen.getByText('Invert')).toBeInTheDocument();
      expect(screen.getByText('Brightness')).toBeInTheDocument();
      expect(screen.getByText('Contrast')).toBeInTheDocument();
      expect(screen.getByText('Saturation')).toBeInTheDocument();
      expect(screen.getByText('Blur')).toBeInTheDocument();
      expect(screen.getByText('Sharpen')).toBeInTheDocument();
    });

    it('shows intensity slider', () => {
      render(<FilterNode {...defaultProps} />);

      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
    });
  });

  describe('filter type selection', () => {
    it('displays selected filter type', () => {
      render(<FilterNode {...defaultProps} />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('grayscale');
    });

    it('calls updateNodeData when filter is changed', () => {
      render(<FilterNode {...defaultProps} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'sepia' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('filter-node-1', {
        filter: 'sepia',
        intensity: 100,
      });
    });

    it('resets intensity to 50 when switching to blur', () => {
      render(<FilterNode {...defaultProps} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'blur' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('filter-node-1', {
        filter: 'blur',
        intensity: 50,
      });
    });

    it('resets intensity to 100 for brightness', () => {
      render(<FilterNode {...defaultProps} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'brightness' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('filter-node-1', {
        filter: 'brightness',
        intensity: 100,
      });
    });

    it('shows correct selected value for each filter type', () => {
      const filters = ['grayscale', 'sepia', 'invert', 'brightness', 'contrast', 'saturate', 'blur', 'sharpen'];

      filters.forEach((filter) => {
        const props = {
          ...defaultProps,
          data: { ...defaultProps.data, filter },
        };

        const { unmount } = render(<FilterNode {...props} />);
        const select = screen.getByRole('combobox') as HTMLSelectElement;
        expect(select.value).toBe(filter);
        unmount();
      });
    });
  });

  describe('intensity controls', () => {
    it('updates intensity when slider changes', () => {
      render(<FilterNode {...defaultProps} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '50' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('filter-node-1', {
        intensity: 50,
      });
    });

    it('shows percentage label for grayscale', () => {
      render(<FilterNode {...defaultProps} />);

      expect(screen.getByText('Intensity: 100%')).toBeInTheDocument();
    });

    it('shows pixel label for blur', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, filter: 'blur' as const, intensity: 50 },
      };

      render(<FilterNode {...props} />);

      expect(screen.getByText('Intensity: 5.0px')).toBeInTheDocument();
    });

    it('shows percentage label for brightness', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, filter: 'brightness' as const, intensity: 150 },
      };

      render(<FilterNode {...props} />);

      expect(screen.getByText('Intensity: 150%')).toBeInTheDocument();
    });

    it('has correct range for grayscale (0-100)', () => {
      render(<FilterNode {...defaultProps} />);

      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.min).toBe('0');
      expect(slider.max).toBe('100');
    });

    it('has correct range for brightness (0-200)', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, filter: 'brightness' as const },
      };

      render(<FilterNode {...props} />);

      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.min).toBe('0');
      expect(slider.max).toBe('200');
    });

    it('has correct range for contrast (0-200)', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, filter: 'contrast' as const },
      };

      render(<FilterNode {...props} />);

      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.min).toBe('0');
      expect(slider.max).toBe('200');
    });

    it('has correct range for blur (0-100)', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, filter: 'blur' as const },
      };

      render(<FilterNode {...props} />);

      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.min).toBe('0');
      expect(slider.max).toBe('100');
    });

    it('has correct range for saturate (0-200)', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, filter: 'saturate' as const },
      };

      render(<FilterNode {...props} />);

      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.min).toBe('0');
      expect(slider.max).toBe('200');
    });

    it('defaults intensity to 100 when not specified', () => {
      const props = {
        ...defaultProps,
        data: { label: 'Filter' },
      };

      render(<FilterNode {...props} />);

      expect(screen.getByText('Intensity: 100%')).toBeInTheDocument();
    });
  });

  describe('apply filter operation', () => {
    it('sets error when no image input is connected', async () => {
      mockGetInputsForNode.mockReturnValue([]);

      render(<FilterNode {...defaultProps} />);

      const applyButton = screen.getByText('Apply Filter');
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('filter-node-1', 'error');
      });
    });

    it('sets running status when filter starts', async () => {
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

      render(<FilterNode {...defaultProps} />);

      const applyButton = screen.getByText('Apply Filter');
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('filter-node-1', 'running');
      });
    });

    it('sets output and success on successful grayscale filter', async () => {
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

      render(<FilterNode {...defaultProps} />);

      const applyButton = screen.getByText('Apply Filter');
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(mockSetNodeOutput).toHaveBeenCalledWith('filter-node-1', {
          type: 'image',
          data: expect.stringContaining('data:image/png'),
          timestamp: expect.any(Number),
        });
        expect(mockSetNodeStatus).toHaveBeenCalledWith('filter-node-1', 'success');
      });
    });

    it('processes invert filter successfully', async () => {
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

      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, filter: 'invert' as const },
      };

      render(<FilterNode {...props} />);

      const applyButton = screen.getByText('Apply Filter');
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('filter-node-1', 'success');
      });
    });

    it('processes sharpen filter successfully', async () => {
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

      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, filter: 'sharpen' as const },
      };

      render(<FilterNode {...props} />);

      const applyButton = screen.getByText('Apply Filter');
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('filter-node-1', 'success');
      });
    });

    it('processes blur filter successfully', async () => {
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
        data: { ...defaultProps.data, filter: 'blur' as const, intensity: 50 },
      };

      render(<FilterNode {...props} />);

      const applyButton = screen.getByText('Apply Filter');
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('filter-node-1', 'success');
      });
    });

    it('handles image load error', async () => {
      // Override Image constructor to trigger error
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

      render(<FilterNode {...defaultProps} />);

      const applyButton = screen.getByText('Apply Filter');
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('filter-node-1', 'error');
      });

      globalThis.Image = OriginalImage;
    });
  });

  describe('status indicators', () => {
    it('shows running state', () => {
      (useWorkflowStore as any).mockReturnValue({
        ...mockStore,
        nodeStatus: { 'filter-node-1': 'running' },
      });

      render(<FilterNode {...defaultProps} />);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(screen.getByText('Processing...')).toBeDisabled();
    });

    it('shows idle state by default', () => {
      render(<FilterNode {...defaultProps} />);

      expect(screen.getByText('Apply Filter')).toBeInTheDocument();
      expect(screen.getByText('Apply Filter')).not.toBeDisabled();
    });
  });

  describe('edge cases', () => {
    it('handles missing filter data gracefully', () => {
      const props = {
        ...defaultProps,
        data: { label: 'Filter' },
      };

      render(<FilterNode {...props} />);

      // Defaults to grayscale
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('grayscale');
    });

    it('ignores non-image inputs', async () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'text', data: 'some text' },
      ]);

      render(<FilterNode {...defaultProps} />);

      const applyButton = screen.getByText('Apply Filter');
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('filter-node-1', 'error');
      });
    });
  });
});
