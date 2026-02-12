import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AnalyzeNode } from '../../src/components/nodes/AnalyzeNode';

// Mock the store
vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

import { useWorkflowStore } from '../../src/stores/workflow';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ScanSearch: () => <div data-testid="scan-search-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
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

// Mock image-utils
vi.mock('../../src/lib/image-utils', () => ({
  getImageDimensions: vi.fn(),
  extractDominantColors: vi.fn(),
}));

import { getImageDimensions, extractDominantColors } from '../../src/lib/image-utils';

describe('AnalyzeNode', () => {
  const mockGetInputsForNode = vi.fn();
  const mockSetNodeOutput = vi.fn();
  const mockSetNodeStatus = vi.fn();
  const mockUpdateNodeData = vi.fn();

  const defaultProps = {
    id: 'analyze-node-1',
    data: {
      label: 'Analyze',
      extractStats: true,
      extractPalette: true,
      extractDimensions: true,
    },
    type: 'analyze',
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
    (getImageDimensions as any).mockResolvedValue({ width: 256, height: 256 });
    (extractDominantColors as any).mockResolvedValue([
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
    ]);
  });

  describe('rendering', () => {
    it('renders with default props', () => {
      render(<AnalyzeNode {...defaultProps} />);

      expect(screen.getByText('Analyze Image')).toBeInTheDocument();
      expect(screen.getByText('Analyze')).toBeInTheDocument();
    });

    it('displays the scan search icon', () => {
      render(<AnalyzeNode {...defaultProps} />);

      expect(screen.getByTestId('scan-search-icon')).toBeInTheDocument();
    });

    it('displays the settings icon button', () => {
      render(<AnalyzeNode {...defaultProps} />);

      expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
    });

    it('does not show settings panel by default', () => {
      render(<AnalyzeNode {...defaultProps} />);

      expect(screen.queryByText('Dimensions')).not.toBeInTheDocument();
      expect(screen.queryByText('Color Palette')).not.toBeInTheDocument();
      expect(screen.queryByText('Image Stats')).not.toBeInTheDocument();
    });
  });

  describe('settings panel', () => {
    it('toggles settings panel on settings button click', () => {
      render(<AnalyzeNode {...defaultProps} />);

      const settingsButton = screen.getByTestId('settings-icon').closest('button')!;
      fireEvent.click(settingsButton);

      expect(screen.getByText('Dimensions')).toBeInTheDocument();
      expect(screen.getByText('Color Palette')).toBeInTheDocument();
      expect(screen.getByText('Image Stats')).toBeInTheDocument();
    });

    it('hides settings panel on second click', () => {
      render(<AnalyzeNode {...defaultProps} />);

      const settingsButton = screen.getByTestId('settings-icon').closest('button')!;
      fireEvent.click(settingsButton);
      expect(screen.getByText('Dimensions')).toBeInTheDocument();

      fireEvent.click(settingsButton);
      expect(screen.queryByText('Dimensions')).not.toBeInTheDocument();
    });

    it('shows all checkboxes checked by default', () => {
      render(<AnalyzeNode {...defaultProps} />);

      const settingsButton = screen.getByTestId('settings-icon').closest('button')!;
      fireEvent.click(settingsButton);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(3);
      checkboxes.forEach((cb) => {
        expect(cb).toBeChecked();
      });
    });

    it('toggles extractDimensions checkbox', () => {
      render(<AnalyzeNode {...defaultProps} />);

      const settingsButton = screen.getByTestId('settings-icon').closest('button')!;
      fireEvent.click(settingsButton);

      const dimensionsCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(dimensionsCheckbox);

      expect(mockUpdateNodeData).toHaveBeenCalledWith('analyze-node-1', {
        extractDimensions: false,
      });
    });

    it('toggles extractPalette checkbox', () => {
      render(<AnalyzeNode {...defaultProps} />);

      const settingsButton = screen.getByTestId('settings-icon').closest('button')!;
      fireEvent.click(settingsButton);

      const paletteCheckbox = screen.getAllByRole('checkbox')[1];
      fireEvent.click(paletteCheckbox);

      expect(mockUpdateNodeData).toHaveBeenCalledWith('analyze-node-1', {
        extractPalette: false,
      });
    });

    it('toggles extractStats checkbox', () => {
      render(<AnalyzeNode {...defaultProps} />);

      const settingsButton = screen.getByTestId('settings-icon').closest('button')!;
      fireEvent.click(settingsButton);

      const statsCheckbox = screen.getAllByRole('checkbox')[2];
      fireEvent.click(statsCheckbox);

      expect(mockUpdateNodeData).toHaveBeenCalledWith('analyze-node-1', {
        extractStats: false,
      });
    });

    it('shows unchecked state when options are disabled', () => {
      const props = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          extractStats: false,
          extractPalette: false,
          extractDimensions: false,
        },
      };

      render(<AnalyzeNode {...props} />);

      const settingsButton = screen.getByTestId('settings-icon').closest('button')!;
      fireEvent.click(settingsButton);

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((cb) => {
        expect(cb).not.toBeChecked();
      });
    });
  });

  describe('analyze operation', () => {
    it('sets error when no image input is connected', async () => {
      mockGetInputsForNode.mockReturnValue([]);

      render(<AnalyzeNode {...defaultProps} />);

      const analyzeButton = screen.getByText('Analyze');
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('analyze-node-1', 'error');
      });
    });

    it('sets running status when analysis starts', async () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,mockdata' },
      ]);

      render(<AnalyzeNode {...defaultProps} />);

      const analyzeButton = screen.getByText('Analyze');
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('analyze-node-1', 'running');
      });
    });

    it('calls getImageDimensions when extractDimensions is true', async () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,mockdata' },
      ]);

      render(<AnalyzeNode {...defaultProps} />);

      const analyzeButton = screen.getByText('Analyze');
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(getImageDimensions).toHaveBeenCalledWith('data:image/png;base64,mockdata');
      });
    });

    it('calls extractDominantColors when extractPalette is true', async () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,mockdata' },
      ]);

      render(<AnalyzeNode {...defaultProps} />);

      const analyzeButton = screen.getByText('Analyze');
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(extractDominantColors).toHaveBeenCalledWith('data:image/png;base64,mockdata', 8);
      });
    });

    it('sets output with analysis result on success', async () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,mockdata' },
      ]);

      render(<AnalyzeNode {...defaultProps} />);

      const analyzeButton = screen.getByText('Analyze');
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(mockSetNodeOutput).toHaveBeenCalledWith('analyze-node-1', {
          type: 'metadata',
          data: expect.stringContaining('"width": 256'),
          timestamp: expect.any(Number),
        });
        expect(mockSetNodeStatus).toHaveBeenCalledWith('analyze-node-1', 'success');
      });
    });

    it('computes stats including aspect ratio and power of 2', async () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,mockdata' },
      ]);

      render(<AnalyzeNode {...defaultProps} />);

      const analyzeButton = screen.getByText('Analyze');
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        const outputCall = mockSetNodeOutput.mock.calls[0];
        const parsedData = JSON.parse(outputCall[1].data);
        expect(parsedData.stats.aspectRatio).toBe('1:1');
        expect(parsedData.stats.totalPixels).toBe(65536);
        expect(parsedData.stats.isPowerOf2).toBe(true);
      });
    });

    it('detects non-power-of-2 dimensions', async () => {
      (getImageDimensions as any).mockResolvedValue({ width: 300, height: 200 });

      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,mockdata' },
      ]);

      render(<AnalyzeNode {...defaultProps} />);

      const analyzeButton = screen.getByText('Analyze');
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        const outputCall = mockSetNodeOutput.mock.calls[0];
        const parsedData = JSON.parse(outputCall[1].data);
        expect(parsedData.stats.isPowerOf2).toBe(false);
        expect(parsedData.stats.aspectRatio).toBe('3:2');
      });
    });

    it('converts palette colors to hex strings', async () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,mockdata' },
      ]);

      render(<AnalyzeNode {...defaultProps} />);

      const analyzeButton = screen.getByText('Analyze');
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        const outputCall = mockSetNodeOutput.mock.calls[0];
        const parsedData = JSON.parse(outputCall[1].data);
        expect(parsedData.palette).toEqual(['#ff0000', '#00ff00', '#0000ff']);
      });
    });

    it('does not extract dimensions when disabled', async () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, extractDimensions: false },
      };

      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,mockdata' },
      ]);

      render(<AnalyzeNode {...props} />);

      const analyzeButton = screen.getByText('Analyze');
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(getImageDimensions).not.toHaveBeenCalled();
        expect(mockSetNodeStatus).toHaveBeenCalledWith('analyze-node-1', 'success');
      });
    });

    it('does not extract palette when disabled', async () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, extractPalette: false },
      };

      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,mockdata' },
      ]);

      render(<AnalyzeNode {...props} />);

      const analyzeButton = screen.getByText('Analyze');
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(extractDominantColors).not.toHaveBeenCalled();
        expect(mockSetNodeStatus).toHaveBeenCalledWith('analyze-node-1', 'success');
      });
    });

    it('does not compute stats when extractStats is disabled', async () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, extractStats: false },
      };

      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,mockdata' },
      ]);

      render(<AnalyzeNode {...props} />);

      const analyzeButton = screen.getByText('Analyze');
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        const outputCall = mockSetNodeOutput.mock.calls[0];
        const parsedData = JSON.parse(outputCall[1].data);
        expect(parsedData.stats).toBeUndefined();
      });
    });

    it('handles analysis failure gracefully', async () => {
      (getImageDimensions as any).mockRejectedValue(new Error('Failed to load image'));

      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,mockdata' },
      ]);

      render(<AnalyzeNode {...defaultProps} />);

      const analyzeButton = screen.getByText('Analyze');
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('analyze-node-1', 'error');
      });
    });
  });

  describe('result display', () => {
    it('displays dimension info after successful analysis', async () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,mockdata' },
      ]);

      (useWorkflowStore as any).mockReturnValue({
        ...mockStore,
        nodeStatus: { 'analyze-node-1': 'success' },
      });

      render(<AnalyzeNode {...defaultProps} />);

      // Trigger analysis
      const analyzeButton = screen.getByText('Analyze');
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(screen.getByText(/256 x 256/)).toBeInTheDocument();
      });
    });

    it('displays aspect ratio after analysis', async () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,mockdata' },
      ]);

      (useWorkflowStore as any).mockReturnValue({
        ...mockStore,
        nodeStatus: { 'analyze-node-1': 'success' },
      });

      render(<AnalyzeNode {...defaultProps} />);

      const analyzeButton = screen.getByText('Analyze');
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(screen.getByText('1:1')).toBeInTheDocument();
      });
    });

    it('displays power of 2 status', async () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,mockdata' },
      ]);

      (useWorkflowStore as any).mockReturnValue({
        ...mockStore,
        nodeStatus: { 'analyze-node-1': 'success' },
      });

      render(<AnalyzeNode {...defaultProps} />);

      const analyzeButton = screen.getByText('Analyze');
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(screen.getByText('Yes')).toBeInTheDocument();
      });
    });

    it('displays palette color swatches', async () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,mockdata' },
      ]);

      (useWorkflowStore as any).mockReturnValue({
        ...mockStore,
        nodeStatus: { 'analyze-node-1': 'success' },
      });

      render(<AnalyzeNode {...defaultProps} />);

      const analyzeButton = screen.getByText('Analyze');
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(screen.getByText('Palette:')).toBeInTheDocument();
        expect(screen.getByTitle('#ff0000')).toBeInTheDocument();
        expect(screen.getByTitle('#00ff00')).toBeInTheDocument();
        expect(screen.getByTitle('#0000ff')).toBeInTheDocument();
      });
    });
  });

  describe('status indicators', () => {
    it('shows running state', () => {
      (useWorkflowStore as any).mockReturnValue({
        ...mockStore,
        nodeStatus: { 'analyze-node-1': 'running' },
      });

      render(<AnalyzeNode {...defaultProps} />);

      expect(screen.getByText('Analyzing...')).toBeInTheDocument();
      expect(screen.getByText('Analyzing...')).toBeDisabled();
    });

    it('shows error message on error status', () => {
      (useWorkflowStore as any).mockReturnValue({
        ...mockStore,
        nodeStatus: { 'analyze-node-1': 'error' },
      });

      render(<AnalyzeNode {...defaultProps} />);

      expect(screen.getByText('Analysis failed')).toBeInTheDocument();
    });

    it('shows idle state by default', () => {
      render(<AnalyzeNode {...defaultProps} />);

      expect(screen.getByText('Analyze')).toBeInTheDocument();
      expect(screen.getByText('Analyze')).not.toBeDisabled();
    });
  });

  describe('edge cases', () => {
    it('handles missing node data gracefully', () => {
      const props = {
        ...defaultProps,
        data: { label: 'Analyze' },
      };

      render(<AnalyzeNode {...props} />);

      expect(screen.getByText('Analyze')).toBeInTheDocument();
    });

    it('ignores non-image inputs', async () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'text', data: 'some text' },
      ]);

      render(<AnalyzeNode {...defaultProps} />);

      const analyzeButton = screen.getByText('Analyze');
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('analyze-node-1', 'error');
      });
    });
  });
});
