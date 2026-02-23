import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PreviewNode } from '../../src/components/nodes/PreviewNode';

// Mock workflow store
vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));
import { useWorkflowStore } from '../../src/stores/workflow';

// Mock @xyflow/react
vi.mock('@xyflow/react', () => ({
  useEdges: vi.fn(),
  Handle: () => null,
  Position: { Left: 'left', Right: 'right' },
}));
import { useEdges } from '@xyflow/react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Eye: () => <div data-testid="eye-icon" />,
  Link: () => <div data-testid="link-icon" />,
  Loader2: (props: any) => <div data-testid="loader-icon" className={props.className} />,
  Download: () => <div data-testid="download-icon" />,
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

describe('PreviewNode', () => {
  const mockGetInputsForNode = vi.fn();

  const defaultProps = {
    id: 'preview-1',
    type: 'preview',
    data: { label: 'Preview' },
    selected: false,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    dragging: false,
    zIndex: 0,
  };

  const mockStore = {
    getInputsForNode: mockGetInputsForNode,
    nodeStatus: {} as Record<string, string>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);
    (useEdges as ReturnType<typeof vi.fn>).mockReturnValue([]);
    mockGetInputsForNode.mockReturnValue([]);
  });

  describe('rendering', () => {
    it('renders with preview label', () => {
      render(<PreviewNode {...defaultProps} />);
      expect(screen.getByText('Preview')).toBeInTheDocument();
      expect(screen.getByTestId('eye-icon')).toBeInTheDocument();
    });
  });

  describe('no connection state', () => {
    it('shows no input connected message when no edges', () => {
      render(<PreviewNode {...defaultProps} />);
      expect(screen.getByText('No input connected')).toBeInTheDocument();
      expect(screen.getByTestId('link-icon')).toBeInTheDocument();
    });
  });

  describe('connected but waiting', () => {
    it('shows waiting message when connected but no data', () => {
      (useEdges as ReturnType<typeof vi.fn>).mockReturnValue([
        { id: 'e1', source: 'gen-1', target: 'preview-1' },
      ]);
      mockGetInputsForNode.mockReturnValue([]);

      render(<PreviewNode {...defaultProps} />);
      expect(screen.getByText('Connected - waiting for data')).toBeInTheDocument();
    });

    it('shows generating when source is running', () => {
      (useEdges as ReturnType<typeof vi.fn>).mockReturnValue([
        { id: 'e1', source: 'gen-1', target: 'preview-1' },
      ]);
      mockGetInputsForNode.mockReturnValue([]);
      mockStore.nodeStatus = { 'gen-1': 'running' };

      render(<PreviewNode {...defaultProps} />);
      expect(screen.getByText('Generating...')).toBeInTheDocument();
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });
  });

  describe('text input', () => {
    it('displays text content', () => {
      (useEdges as ReturnType<typeof vi.fn>).mockReturnValue([
        { id: 'e1', source: 'text-1', target: 'preview-1' },
      ]);
      mockGetInputsForNode.mockReturnValue([{ type: 'text', data: 'Hello world' }]);

      render(<PreviewNode {...defaultProps} />);
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('displays (empty) for empty text', () => {
      (useEdges as ReturnType<typeof vi.fn>).mockReturnValue([
        { id: 'e1', source: 'text-1', target: 'preview-1' },
      ]);
      mockGetInputsForNode.mockReturnValue([{ type: 'text', data: '' }]);

      render(<PreviewNode {...defaultProps} />);
      expect(screen.getByText('(empty)')).toBeInTheDocument();
    });
  });

  describe('image input', () => {
    it('displays image', () => {
      (useEdges as ReturnType<typeof vi.fn>).mockReturnValue([
        { id: 'e1', source: 'gen-1', target: 'preview-1' },
      ]);
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: 'data:image/png;base64,abc' }]);

      render(<PreviewNode {...defaultProps} />);
      const img = screen.getByAltText('Generated');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'data:image/png;base64,abc');
    });
  });

  describe('model input', () => {
    it('displays 3D model link', () => {
      (useEdges as ReturnType<typeof vi.fn>).mockReturnValue([
        { id: 'e1', source: 'model-1', target: 'preview-1' },
      ]);
      mockGetInputsForNode.mockReturnValue([{ type: 'model', data: 'https://example.com/model.glb' }]);

      render(<PreviewNode {...defaultProps} />);
      expect(screen.getByText('3D Model')).toBeInTheDocument();
      const link = screen.getByText('View/Download GLB');
      expect(link).toHaveAttribute('href', 'https://example.com/model.glb');
      expect(link).toHaveAttribute('target', '_blank');
    });
  });

  describe('unknown input type', () => {
    it('shows unknown type message', () => {
      (useEdges as ReturnType<typeof vi.fn>).mockReturnValue([
        { id: 'e1', source: 'other-1', target: 'preview-1' },
      ]);
      mockGetInputsForNode.mockReturnValue([{ type: 'unknown', data: 'something' }]);

      render(<PreviewNode {...defaultProps} />);
      expect(screen.getByText('Unknown input type')).toBeInTheDocument();
    });
  });

  describe('multiple inputs', () => {
    it('displays the latest input', () => {
      (useEdges as ReturnType<typeof vi.fn>).mockReturnValue([
        { id: 'e1', source: 'text-1', target: 'preview-1' },
        { id: 'e2', source: 'text-2', target: 'preview-1' },
      ]);
      mockGetInputsForNode.mockReturnValue([
        { type: 'text', data: 'First' },
        { type: 'text', data: 'Second' },
      ]);

      render(<PreviewNode {...defaultProps} />);
      expect(screen.getByText('Second')).toBeInTheDocument();
    });
  });
});
