import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImageUploadNode } from '../../src/components/nodes/ImageUploadNode';

// Mock workflow store
vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));
import { useWorkflowStore } from '../../src/stores/workflow';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Upload: () => <div data-testid="upload-icon" />,
  X: () => <div data-testid="x-icon" />,
  Pencil: () => <div data-testid="pencil-icon" />,
}));

vi.mock('../../src/components/nodes/editor/ImageEditor', () => ({
  ImageEditor: () => <div data-testid="image-editor" />,
}));

// Mock BaseNode
vi.mock('../../src/components/nodes/BaseNode', () => ({
  BaseNode: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock FileReader as a class
class MockFileReader {
  result: string | null = null;
  onload: ((event: any) => void) | null = null;
  readAsDataURL(_file: Blob) {
    // Simulate async read
    setTimeout(() => {
      this.result = 'data:image/png;base64,mockdata';
      if (this.onload) {
        this.onload({ target: { result: this.result } });
      }
    }, 0);
  }
}

describe('ImageUploadNode', () => {
  const mockSetNodeOutput = vi.fn();
  const mockUpdateNodeData = vi.fn();
  let originalFileReader: typeof FileReader;
  let originalAlert: typeof window.alert;

  const defaultProps = {
    id: 'upload-1',
    type: 'imageUpload',
    data: {
      label: 'Image Upload',
    },
    selected: false,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    dragging: false,
    zIndex: 0,
  };

  const mockStore = {
    setNodeOutput: mockSetNodeOutput,
    updateNodeData: mockUpdateNodeData,
    nodeOutputs: {} as Record<string, any>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.nodeOutputs = {};
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);
    // Save and replace FileReader
    originalFileReader = globalThis.FileReader;
    globalThis.FileReader = MockFileReader as any;
    // Ensure alert exists
    originalAlert = globalThis.alert;
    globalThis.alert = vi.fn();
  });

  afterEach(() => {
    globalThis.FileReader = originalFileReader;
    globalThis.alert = originalAlert;
  });

  describe('rendering', () => {
    it('renders upload area when no image', () => {
      render(<ImageUploadNode {...defaultProps} />);
      expect(screen.getByText('Click or drop image')).toBeInTheDocument();
      expect(screen.getByTestId('upload-icon')).toBeInTheDocument();
    });

    it('renders hidden file input', () => {
      const { container } = render(<ImageUploadNode {...defaultProps} />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('accept', 'image/*');
    });
  });

  describe('file selection', () => {
    it('reads and previews valid image file', async () => {
      const { container } = render(<ImageUploadNode {...defaultProps} />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['image-data'], 'test.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 1024 });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockUpdateNodeData).toHaveBeenCalledWith('upload-1', { fileName: 'test.png' });
        expect(mockSetNodeOutput).toHaveBeenCalledWith('upload-1', {
          type: 'image',
          data: 'data:image/png;base64,mockdata',
          timestamp: expect.any(Number),
        });
      });
    });

    it('rejects non-image files', () => {
      const { container } = render(<ImageUploadNode {...defaultProps} />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['text-data'], 'test.txt', { type: 'text/plain' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(globalThis.alert).toHaveBeenCalledWith('Please select an image file');
      expect(mockSetNodeOutput).not.toHaveBeenCalled();
    });

    it('rejects files over 10MB', () => {
      const { container } = render(<ImageUploadNode {...defaultProps} />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File([''], 'big.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 });
      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(globalThis.alert).toHaveBeenCalledWith('File too large. Max 10MB.');
      expect(mockSetNodeOutput).not.toHaveBeenCalled();
    });

    it('handles empty file selection', () => {
      const { container } = render(<ImageUploadNode {...defaultProps} />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [] } });

      expect(mockSetNodeOutput).not.toHaveBeenCalled();
    });
  });

  describe('preview display', () => {
    it('shows image when output exists', () => {
      mockStore.nodeOutputs = { 'upload-1': { data: 'data:image/png;base64,existing' } };
      render(<ImageUploadNode {...defaultProps} />);

      const img = screen.getByAltText('Uploaded');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'data:image/png;base64,existing');
    });

    it('shows filename when present', () => {
      mockStore.nodeOutputs = { 'upload-1': { data: 'data:image/png;base64,existing' } };
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, fileName: 'landscape.png' },
      };
      render(<ImageUploadNode {...props} />);

      expect(screen.getByText('landscape.png')).toBeInTheDocument();
    });

    it('shows clear button when image is present', () => {
      mockStore.nodeOutputs = { 'upload-1': { data: 'data:image/png;base64,existing' } };
      render(<ImageUploadNode {...defaultProps} />);

      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    });
  });

  describe('clear functionality', () => {
    it('clears data when clear button clicked', () => {
      mockStore.nodeOutputs = { 'upload-1': { data: 'data:image/png;base64,existing' } };
      render(<ImageUploadNode {...defaultProps} />);

      const clearButton = screen.getByTestId('x-icon').closest('button')!;
      fireEvent.click(clearButton);

      expect(mockUpdateNodeData).toHaveBeenCalledWith('upload-1', { fileName: undefined });
    });
  });

  describe('drag and drop', () => {
    it('handles drag over without errors', () => {
      render(<ImageUploadNode {...defaultProps} />);
      const dropZone = screen.getByText('Click or drop image').closest('div')!;
      fireEvent.dragOver(dropZone);
      // Should not throw
    });

    it('handles drop with valid image file', async () => {
      render(<ImageUploadNode {...defaultProps} />);
      const dropZone = screen.getByText('Click or drop image').closest('div')!;

      const file = new File(['image-data'], 'dropped.png', { type: 'image/png' });

      fireEvent.drop(dropZone, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(mockUpdateNodeData).toHaveBeenCalledWith('upload-1', { fileName: 'dropped.png' });
        expect(mockSetNodeOutput).toHaveBeenCalledWith('upload-1', {
          type: 'image',
          data: 'data:image/png;base64,mockdata',
          timestamp: expect.any(Number),
        });
      });
    });
  });
});
