import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PixelateNode } from '../../src/components/nodes/PixelateNode';
import { useWorkflowStore } from '../../src/stores/workflow';

vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

vi.mock('lucide-react', () => ({
  Grid3X3: (props: any) => <div data-testid="icon-Grid3X3" {...props} />,
}));

vi.mock('../../src/components/nodes/BaseNode', () => ({
  BaseNode: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@pixel-forge/shared/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('PixelateNode', () => {
  const mockGetInputsForNode = vi.fn();
  const mockSetNodeOutput = vi.fn();
  const mockSetNodeStatus = vi.fn();
  const mockUpdateNodeData = vi.fn();

  const baseProps = {
    id: 'test-pixelate',
    type: 'pixelate',
    data: {
      pixelSize: 8,
      colorLevels: 16,
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
    it('renders without crashing', () => {
      render(<PixelateNode {...baseProps} />);
      expect(screen.getAllByText('Pixelate')).toHaveLength(2); // label + button
    });

    it('displays pixel size label with current value', () => {
      render(<PixelateNode {...baseProps} />);
      expect(screen.getByText('Pixel Size: 8px')).toBeInTheDocument();
    });

    it('displays color levels label with current value', () => {
      render(<PixelateNode {...baseProps} />);
      expect(screen.getByText('Colors: 16')).toBeInTheDocument();
    });

    it('shows pixelate button', () => {
      render(<PixelateNode {...baseProps} />);
      const button = screen.getByRole('button', { name: 'Pixelate' });
      expect(button).toBeInTheDocument();
    });

    it('shows grid icon', () => {
      render(<PixelateNode {...baseProps} />);
      expect(screen.getByTestId('icon-Grid3X3')).toBeInTheDocument();
    });

    it('uses default pixelSize of 8 when not provided', () => {
      const props = { ...baseProps, data: {} };
      render(<PixelateNode {...props} />);
      expect(screen.getByText('Pixel Size: 8px')).toBeInTheDocument();
    });

    it('uses default colorLevels of 16 when not provided', () => {
      const props = { ...baseProps, data: {} };
      render(<PixelateNode {...props} />);
      expect(screen.getByText('Colors: 16')).toBeInTheDocument();
    });
  });

  describe('range sliders', () => {
    it('renders pixel size slider with correct attributes', () => {
      render(<PixelateNode {...baseProps} />);
      const sliders = screen.getAllByRole('slider');
      const pixelSlider = sliders[0] as HTMLInputElement;
      expect(pixelSlider).toBeInTheDocument();
      expect(pixelSlider.min).toBe('2');
      expect(pixelSlider.max).toBe('32');
      expect(pixelSlider.value).toBe('8');
    });

    it('renders color levels slider with correct attributes', () => {
      render(<PixelateNode {...baseProps} />);
      const sliders = screen.getAllByRole('slider');
      const colorSlider = sliders[1] as HTMLInputElement;
      expect(colorSlider).toBeInTheDocument();
      expect(colorSlider.min).toBe('2');
      expect(colorSlider.max).toBe('64');
      expect(colorSlider.value).toBe('16');
    });

    it('updates pixelSize when slider changes', () => {
      render(<PixelateNode {...baseProps} />);
      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[0], { target: { value: '16' } });
      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-pixelate', {
        pixelSize: 16,
      });
    });

    it('updates colorLevels when slider changes', () => {
      render(<PixelateNode {...baseProps} />);
      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[1], { target: { value: '32' } });
      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-pixelate', {
        colorLevels: 32,
      });
    });

    it('displays updated pixel size value', () => {
      const props = { ...baseProps, data: { pixelSize: 16, colorLevels: 16 } };
      render(<PixelateNode {...props} />);
      expect(screen.getByText('Pixel Size: 16px')).toBeInTheDocument();
    });

    it('displays updated color levels value', () => {
      const props = { ...baseProps, data: { pixelSize: 8, colorLevels: 32 } };
      render(<PixelateNode {...props} />);
      expect(screen.getByText('Colors: 32')).toBeInTheDocument();
    });
  });

  describe('running state', () => {
    it('shows Processing text when running', () => {
      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'test-pixelate': 'running' },
      });
      render(<PixelateNode {...baseProps} />);
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('disables button when running', () => {
      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'test-pixelate': 'running' },
      });
      render(<PixelateNode {...baseProps} />);
      expect(screen.getByText('Processing...')).toBeDisabled();
    });
  });

  describe('pixelate operation', () => {
    it('sets error status when no input image', async () => {
      mockGetInputsForNode.mockReturnValue([]);
      render(<PixelateNode {...baseProps} />);

      const button = screen.getByRole('button', { name: 'Pixelate' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-pixelate', 'error');
      });
    });

    it('sets running status when processing starts', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 16, 16);
      const imageData = canvas.toDataURL('image/png');

      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageData }]);
      render(<PixelateNode {...baseProps} />);

      const button = screen.getByRole('button', { name: 'Pixelate' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-pixelate', 'running');
      });
    });

    it('sets output and success on successful pixelate', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(0, 0, 32, 32);
      const imageData = canvas.toDataURL('image/png');

      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageData }]);
      render(<PixelateNode {...baseProps} />);

      const button = screen.getByRole('button', { name: 'Pixelate' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSetNodeOutput).toHaveBeenCalledWith('test-pixelate', {
          type: 'image',
          data: expect.stringContaining('data:image/png'),
          timestamp: expect.any(Number),
        });
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-pixelate', 'success');
      });
    });

    it('ignores non-image inputs', async () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'text', data: 'hello' }]);
      render(<PixelateNode {...baseProps} />);

      const button = screen.getByRole('button', { name: 'Pixelate' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-pixelate', 'error');
      });
    });

    it('handles image load error gracefully', async () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: 'invalid-data-url' }]);

      const OriginalImage = globalThis.Image;
      class FailingImage {
        onload: (() => void) | null = null;
        onerror: ((error: Error) => void) | null = null;
        src: string = '';
        width = 0;
        height = 0;
        constructor() {
          setTimeout(() => {
            if (this.onerror) this.onerror(new Error('Failed'));
          }, 0);
        }
      }
      globalThis.Image = FailingImage as any;

      render(<PixelateNode {...baseProps} />);
      const button = screen.getByRole('button', { name: 'Pixelate' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-pixelate', 'error');
      });

      globalThis.Image = OriginalImage;
    });
  });
});
