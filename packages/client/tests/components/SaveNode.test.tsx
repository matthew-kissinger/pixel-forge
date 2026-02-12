import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SaveNode } from '../../src/components/nodes/SaveNode';
import { useWorkflowStore } from '../../src/stores/workflow';

vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

vi.mock('lucide-react', () => ({
  Download: (props: any) => <div data-testid="icon-Download" {...props} />,
  FileImage: (props: any) => <div data-testid="icon-FileImage" {...props} />,
  FileBox: (props: any) => <div data-testid="icon-FileBox" {...props} />,
}));

vi.mock('../../src/components/nodes/BaseNode', () => ({
  BaseNode: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('SaveNode', () => {
  const mockGetInputsForNode = vi.fn();
  const mockUpdateNodeData = vi.fn();

  const baseProps = {
    id: 'test-save',
    type: 'save',
    data: {
      fileName: 'output',
      format: 'png' as const,
      quality: 90,
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
      updateNodeData: mockUpdateNodeData,
    });
    mockGetInputsForNode.mockReturnValue([]);
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      render(<SaveNode {...baseProps} />);
      expect(screen.getByText('Save / Download')).toBeInTheDocument();
    });

    it('displays the file name input', () => {
      render(<SaveNode {...baseProps} />);
      const input = screen.getByPlaceholderText('File name') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.value).toBe('output');
    });

    it('shows format buttons', () => {
      render(<SaveNode {...baseProps} />);
      expect(screen.getByText('png')).toBeInTheDocument();
      expect(screen.getByText('jpg')).toBeInTheDocument();
      expect(screen.getByText('webp')).toBeInTheDocument();
    });

    it('shows download button', () => {
      render(<SaveNode {...baseProps} />);
      const buttons = screen.getAllByRole('button');
      const downloadBtn = buttons.find((btn) => btn.textContent?.includes('Download'));
      expect(downloadBtn).toBeInTheDocument();
    });

    it('uses default fileName when not provided', () => {
      const props = { ...baseProps, data: { format: 'png', quality: 90 } };
      render(<SaveNode {...props} />);
      const input = screen.getByPlaceholderText('File name') as HTMLInputElement;
      expect(input.value).toBe('output');
    });

    it('uses default format png when not provided', () => {
      const props = { ...baseProps, data: { fileName: 'output', quality: 90 } };
      render(<SaveNode {...props} />);
      const pngBtn = screen.getByText('png');
      expect(pngBtn.className).toContain('bg-[var(--accent)]');
    });
  });

  describe('no input state', () => {
    it('shows connect message when no input', () => {
      render(<SaveNode {...baseProps} />);
      expect(screen.getByText('Connect an input')).toBeInTheDocument();
    });

    it('disables download button when no input', () => {
      render(<SaveNode {...baseProps} />);
      const buttons = screen.getAllByRole('button');
      const downloadBtn = buttons.find((btn) => btn.textContent?.includes('Download'));
      expect(downloadBtn).toBeDisabled();
    });
  });

  describe('input types', () => {
    it('shows image ready when image input connected', () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,abc' },
      ]);
      render(<SaveNode {...baseProps} />);
      expect(screen.getByText('Image ready')).toBeInTheDocument();
    });

    it('shows model ready when model input connected', () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'model', data: 'blob:model' }]);
      render(<SaveNode {...baseProps} />);
      expect(screen.getByText('3D Model ready (GLB)')).toBeInTheDocument();
    });

    it('shows text ready when text input connected', () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'text', data: 'Hello world' }]);
      render(<SaveNode {...baseProps} />);
      expect(screen.getByText('Text ready')).toBeInTheDocument();
    });

    it('enables download button when input connected', () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,abc' },
      ]);
      render(<SaveNode {...baseProps} />);
      const buttons = screen.getAllByRole('button');
      const downloadBtn = buttons.find((btn) => btn.textContent?.includes('Download'));
      expect(downloadBtn).not.toBeDisabled();
    });

    it('uses the latest input when multiple inputs', () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'text', data: 'hello' },
        { type: 'image', data: 'data:image/png;base64,abc' },
      ]);
      render(<SaveNode {...baseProps} />);
      expect(screen.getByText('Image ready')).toBeInTheDocument();
    });

    it('hides format buttons when model input is connected', () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'model', data: 'blob:model' }]);
      render(<SaveNode {...baseProps} />);
      expect(screen.queryByText('png')).not.toBeInTheDocument();
      expect(screen.queryByText('jpg')).not.toBeInTheDocument();
      expect(screen.queryByText('webp')).not.toBeInTheDocument();
    });

    it('hides format buttons when text input is connected', () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'text', data: 'hello' }]);
      render(<SaveNode {...baseProps} />);
      expect(screen.queryByText('png')).not.toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('updates file name on change', () => {
      render(<SaveNode {...baseProps} />);
      const input = screen.getByPlaceholderText('File name');
      fireEvent.change(input, { target: { value: 'my-asset' } });
      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-save', {
        fileName: 'my-asset',
      });
    });

    it('updates format when format button clicked', () => {
      render(<SaveNode {...baseProps} />);
      fireEvent.click(screen.getByText('jpg'));
      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-save', {
        format: 'jpg',
      });
    });

    it('updates format to webp', () => {
      render(<SaveNode {...baseProps} />);
      fireEvent.click(screen.getByText('webp'));
      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-save', {
        format: 'webp',
      });
    });

    it('highlights selected format', () => {
      render(<SaveNode {...baseProps} />);
      const pngBtn = screen.getByText('png');
      expect(pngBtn.className).toContain('bg-[var(--accent)]');

      const jpgBtn = screen.getByText('jpg');
      expect(jpgBtn.className).toContain('bg-[var(--bg-tertiary)]');
    });
  });

  describe('quality slider', () => {
    it('does not show quality slider for png format', () => {
      render(<SaveNode {...baseProps} />);
      expect(screen.queryByText(/Quality:/)).not.toBeInTheDocument();
    });

    it('shows quality slider for jpg format', () => {
      const props = {
        ...baseProps,
        data: { ...baseProps.data, format: 'jpg' as const },
      };
      render(<SaveNode {...props} />);
      expect(screen.getByText('Quality: 90%')).toBeInTheDocument();
    });

    it('shows quality slider for webp format', () => {
      const props = {
        ...baseProps,
        data: { ...baseProps.data, format: 'webp' as const },
      };
      render(<SaveNode {...props} />);
      expect(screen.getByText('Quality: 90%')).toBeInTheDocument();
    });

    it('updates quality when slider changes', () => {
      const props = {
        ...baseProps,
        data: { ...baseProps.data, format: 'jpg' as const },
      };
      render(<SaveNode {...props} />);
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '75' } });
      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-save', {
        quality: 75,
      });
    });

    it('renders slider with correct min/max', () => {
      const props = {
        ...baseProps,
        data: { ...baseProps.data, format: 'jpg' as const },
      };
      render(<SaveNode {...props} />);
      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.min).toBe('10');
      expect(slider.max).toBe('100');
      expect(slider.value).toBe('90');
    });

    it('hides quality slider when model input connected (even with jpg format)', () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'model', data: 'blob:model' }]);
      const props = {
        ...baseProps,
        data: { ...baseProps.data, format: 'jpg' as const },
      };
      render(<SaveNode {...props} />);
      expect(screen.queryByText(/Quality:/)).not.toBeInTheDocument();
    });
  });

  describe('download handler', () => {
    it('triggers download for image/png input', () => {
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,abc' },
      ]);
      render(<SaveNode {...baseProps} />);

      const buttons = screen.getAllByRole('button');
      const downloadBtn = buttons.find((btn) => btn.textContent?.includes('Download'))!;
      fireEvent.click(downloadBtn);

      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    it('triggers download for model input', () => {
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      mockGetInputsForNode.mockReturnValue([{ type: 'model', data: 'blob:model-url' }]);
      render(<SaveNode {...baseProps} />);

      const buttons = screen.getAllByRole('button');
      const downloadBtn = buttons.find((btn) => btn.textContent?.includes('Download'))!;
      fireEvent.click(downloadBtn);

      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    it('triggers download for text input', () => {
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      mockGetInputsForNode.mockReturnValue([{ type: 'text', data: 'Hello world' }]);
      render(<SaveNode {...baseProps} />);

      const buttons = screen.getAllByRole('button');
      const downloadBtn = buttons.find((btn) => btn.textContent?.includes('Download'))!;
      fireEvent.click(downloadBtn);

      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    it('does nothing when no input present', () => {
      render(<SaveNode {...baseProps} />);

      const buttons = screen.getAllByRole('button');
      const downloadBtn = buttons.find((btn) => btn.textContent?.includes('Download'))!;
      // Button is disabled so click is a no-op
      expect(downloadBtn).toBeDisabled();
    });
  });
});
