import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExportSheetNode } from '../../src/components/nodes/ExportSheetNode';
import { useWorkflowStore } from '../../src/stores/workflow';

// Mock the workflow store
vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  LayoutGrid: () => <div data-testid="layout-grid-icon" />,
  Download: () => <div data-testid="download-icon" />,
  CheckSquare: () => <div data-testid="check-square-icon" />,
  Square: () => <div data-testid="square-icon" />,
}));

// Mock BaseNode
vi.mock('../../src/components/nodes/BaseNode', () => ({
  BaseNode: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock JSZip
vi.mock('jszip', () => ({
  default: class MockJSZip {
    file = vi.fn();
    generateAsync = vi.fn().mockResolvedValue(new Blob(['mock zip content']));
  },
}));

describe('ExportSheetNode', () => {
  const mockGetInputsForNode = vi.fn();
  const mockSetNodeOutput = vi.fn();
  const mockSetNodeStatus = vi.fn();
  const mockUpdateNodeData = vi.fn();

  const baseProps = {
    id: 'test-export-node',
    type: 'exportSheet',
    data: {
      fileName: 'sprite-sheet',
      format: 'png' as const,
      atlasFormat: 'none' as const,
      columns: 4,
      rows: 4,
      includeMetadata: true,
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
      nodes: [],
      edges: [],
    });
    mockGetInputsForNode.mockReturnValue([]);

    // Mock URL methods
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  describe('rendering and defaults', () => {
    it('renders with default props', () => {
      render(<ExportSheetNode {...baseProps} />);

      expect(screen.getByText('Export Sprite Sheet')).toBeInTheDocument();
      expect(screen.getByText('Atlas Format')).toBeInTheDocument();
    });

    it('displays default file name input', () => {
      render(<ExportSheetNode {...baseProps} />);

      const fileNameInput = screen.getByDisplayValue('sprite-sheet') as HTMLInputElement;
      expect(fileNameInput).toBeInTheDocument();
    });

    it('does not display column and row inputs when atlas format is none', () => {
      render(<ExportSheetNode {...baseProps} />);

      expect(screen.queryByText('Columns')).not.toBeInTheDocument();
      expect(screen.queryByText('Rows')).not.toBeInTheDocument();
    });

    it('displays column and row inputs when atlas format is selected', () => {
      const propsWithAtlas = {
        ...baseProps,
        data: {
          ...baseProps.data,
          atlasFormat: 'phaser' as const,
        },
      };

      render(<ExportSheetNode {...propsWithAtlas} />);

      expect(screen.getByText('Columns')).toBeInTheDocument();
      expect(screen.getByText('Rows')).toBeInTheDocument();

      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      expect(inputs[0]?.value).toBe('4');
      expect(inputs[1]?.value).toBe('4');
    });

    it('export button is disabled when no input image', () => {
      render(<ExportSheetNode {...baseProps} />);

      const exportButton = screen.getByText('Export Sheet');
      expect(exportButton).toBeDisabled();
    });

    it('export button is enabled when image input is available', async () => {
      const imageDataUrl = 'data:image/png;base64,mockimage';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageDataUrl }]);

      render(<ExportSheetNode {...baseProps} />);

      await waitFor(() => {
        const exportButton = screen.getByText('Export Sheet');
        expect(exportButton).not.toBeDisabled();
      });
    });
  });

  describe('file name input', () => {
    it('updates file name when input changes', () => {
      render(<ExportSheetNode {...baseProps} />);

      const fileNameInput = screen.getByDisplayValue('sprite-sheet') as HTMLInputElement;
      fireEvent.change(fileNameInput, { target: { value: 'my-sprites' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-export-node', {
        fileName: 'my-sprites',
      });
    });

    it('displays custom file name from node data', () => {
      const props = {
        ...baseProps,
        data: {
          ...baseProps.data,
          fileName: 'custom-sheet',
        },
      };

      render(<ExportSheetNode {...props} />);

      const fileNameInput = screen.getByDisplayValue('custom-sheet') as HTMLInputElement;
      expect(fileNameInput).toBeInTheDocument();
    });
  });

  describe('format selection', () => {
    it('shows PNG and WebP format buttons', () => {
      render(<ExportSheetNode {...baseProps} />);

      expect(screen.getByText('png')).toBeInTheDocument();
      expect(screen.getByText('webp')).toBeInTheDocument();
    });

    it('highlights selected format', () => {
      render(<ExportSheetNode {...baseProps} />);

      const pngButton = screen.getByText('png');
      expect(pngButton.className).toContain('bg-[var(--accent)]');
    });

    it('calls updateNodeData when format is changed', () => {
      render(<ExportSheetNode {...baseProps} />);

      const webpButton = screen.getByText('webp');
      fireEvent.click(webpButton);

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-export-node', {
        format: 'webp',
      });
    });
  });

  describe('atlas format selection', () => {
    it('shows atlas format dropdown', () => {
      render(<ExportSheetNode {...baseProps} />);

      expect(screen.getByText('Atlas Format')).toBeInTheDocument();

      const atlasLabel = screen.getByText('Atlas Format');
      const atlasSelect = atlasLabel.parentElement!.querySelector('select') as HTMLSelectElement;
      expect(atlasSelect).toBeInTheDocument();
    });

    it('shows all atlas format options', () => {
      render(<ExportSheetNode {...baseProps} />);

      expect(screen.getByText('None')).toBeInTheDocument();
      expect(screen.getByText('Phaser 3')).toBeInTheDocument();
      expect(screen.getByText('Unity')).toBeInTheDocument();
      expect(screen.getByText('Godot')).toBeInTheDocument();
    });

    it('calls updateNodeData when atlas format is changed', () => {
      render(<ExportSheetNode {...baseProps} />);

      const atlasLabel = screen.getByText('Atlas Format');
      const atlasSelect = atlasLabel.parentElement!.querySelector('select') as HTMLSelectElement;
      fireEvent.change(atlasSelect, { target: { value: 'phaser' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-export-node', {
        atlasFormat: 'phaser',
      });
    });
  });

  describe('column and row settings', () => {
    it('updates columns when input changes', () => {
      const propsWithAtlas = {
        ...baseProps,
        data: {
          ...baseProps.data,
          atlasFormat: 'phaser' as const,
        },
      };

      render(<ExportSheetNode {...propsWithAtlas} />);

      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      fireEvent.change(inputs[0], { target: { value: '8' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-export-node', {
        columns: 8,
      });
    });

    it('updates rows when input changes', () => {
      const propsWithAtlas = {
        ...baseProps,
        data: {
          ...baseProps.data,
          atlasFormat: 'phaser' as const,
        },
      };

      render(<ExportSheetNode {...propsWithAtlas} />);

      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      fireEvent.change(inputs[1], { target: { value: '6' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-export-node', {
        rows: 6,
      });
    });

    it('clamps columns to minimum of 1', () => {
      const propsWithAtlas = {
        ...baseProps,
        data: {
          ...baseProps.data,
          atlasFormat: 'phaser' as const,
        },
      };

      render(<ExportSheetNode {...propsWithAtlas} />);

      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      fireEvent.change(inputs[0], { target: { value: '0' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-export-node', {
        columns: 1,
      });
    });

    it('clamps rows to minimum of 1', () => {
      const propsWithAtlas = {
        ...baseProps,
        data: {
          ...baseProps.data,
          atlasFormat: 'phaser' as const,
        },
      };

      render(<ExportSheetNode {...propsWithAtlas} />);

      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      fireEvent.change(inputs[1], { target: { value: '-1' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-export-node', {
        rows: 1,
      });
    });
  });

  describe('include metadata toggle', () => {
    it('shows include metadata button', () => {
      render(<ExportSheetNode {...baseProps} />);

      expect(screen.getByText('Include Metadata JSON')).toBeInTheDocument();
    });

    it('shows check icon when metadata is enabled', () => {
      render(<ExportSheetNode {...baseProps} />);

      expect(screen.getByTestId('check-square-icon')).toBeInTheDocument();
    });

    it('shows unchecked icon when metadata is disabled', () => {
      const propsNoMetadata = {
        ...baseProps,
        data: {
          ...baseProps.data,
          includeMetadata: false,
        },
      };

      render(<ExportSheetNode {...propsNoMetadata} />);

      expect(screen.getByTestId('square-icon')).toBeInTheDocument();
    });

    it('calls updateNodeData when button is clicked', () => {
      render(<ExportSheetNode {...baseProps} />);

      const metadataButton = screen.getByText('Include Metadata JSON');
      fireEvent.click(metadataButton);

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-export-node', {
        includeMetadata: false,
      });
    });
  });

  describe('input status display', () => {
    it('shows no input message when no image connected', () => {
      render(<ExportSheetNode {...baseProps} />);

      expect(screen.getByText('Connect a sprite sheet input')).toBeInTheDocument();
    });

    it('shows ready message when image is connected', async () => {
      const imageDataUrl = 'data:image/png;base64,mockimage';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageDataUrl }]);

      render(<ExportSheetNode {...baseProps} />);

      await waitFor(() => {
        expect(screen.getByText('Sprite sheet ready')).toBeInTheDocument();
      });
    });

    it('shows wrong type message when non-image input connected', () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'text', data: 'not an image' }]);

      render(<ExportSheetNode {...baseProps} />);

      expect(screen.getByText('Wrong input type - expects image')).toBeInTheDocument();
    });
  });

  describe('image dimensions display', () => {
    it('displays calculated frame size when atlas format is selected and image connected', async () => {
      const imageDataUrl = 'data:image/png;base64,mockimage';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageDataUrl }]);

      const propsWithAtlas = {
        ...baseProps,
        data: {
          ...baseProps.data,
          atlasFormat: 'phaser' as const,
        },
      };

      render(<ExportSheetNode {...propsWithAtlas} />);

      await waitFor(() => {
        // 100x100 sheet / 4x4 grid = 25x25 per frame
        expect(screen.getByText(/Frame size: 25×25px/)).toBeInTheDocument();
      });
    });
  });

  describe('upstream SliceSheetNode inference', () => {
    it('infers columns and rows from upstream SliceSheetNode', () => {
      const sliceSheetNode = {
        id: 'slice-node',
        type: 'sliceSheet',
        data: { nodeType: 'sliceSheet', cols: 8, rows: 6 },
      };

      const edge = {
        id: 'edge-1',
        source: 'slice-node',
        target: 'test-export-node',
      };

      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: {},
        nodes: [sliceSheetNode],
        edges: [edge],
      });

      // Render with data that doesn't have explicit columns/rows
      const propsWithoutExplicitValues = {
        ...baseProps,
        data: {},
      };

      render(<ExportSheetNode {...propsWithoutExplicitValues} />);

      // Should have called updateNodeData to set inferred values
      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-export-node', {
        columns: 8,
        rows: 6,
      });
    });
  });

  describe('export functionality', () => {
    it('downloads image when export button is clicked', async () => {
      const imageDataUrl = 'data:image/png;base64,mockimage';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageDataUrl }]);

      // Mock document.createElement for <a> tag
      const originalCreateElement = document.createElement.bind(document);
      const mockLink = originalCreateElement('a');
      mockLink.click = vi.fn();

      const createElementSpy = vi.spyOn(document, 'createElement');
      createElementSpy.mockImplementation((tagName: string) => {
        if (tagName === 'a') {
          return mockLink;
        }
        return originalCreateElement(tagName);
      });

      render(<ExportSheetNode {...baseProps} />);

      await waitFor(() => {
        const exportButton = screen.getByText('Export Sheet');
        expect(exportButton).not.toBeDisabled();
      });

      const exportButton = screen.getByText('Export Sheet');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockLink.click).toHaveBeenCalled();
      });

      createElementSpy.mockRestore();
    });

    it('downloads metadata JSON when includeMetadata is true', async () => {
      const imageDataUrl = 'data:image/png;base64,mockimage';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageDataUrl }]);

      const originalCreateElement = document.createElement.bind(document);
      const mockLink = originalCreateElement('a');
      mockLink.click = vi.fn();

      const createElementSpy = vi.spyOn(document, 'createElement');
      createElementSpy.mockImplementation((tagName: string) => {
        if (tagName === 'a') {
          return mockLink;
        }
        return originalCreateElement(tagName);
      });

      render(<ExportSheetNode {...baseProps} />);

      await waitFor(() => {
        const exportButton = screen.getByText('Export Sheet');
        expect(exportButton).not.toBeDisabled();
      });

      const exportButton = screen.getByText('Export Sheet');
      fireEvent.click(exportButton);

      await waitFor(() => {
        // Should be called twice - once for image, once for metadata
        expect(mockLink.click).toHaveBeenCalledTimes(2);
      });

      createElementSpy.mockRestore();
    });

    it('creates ZIP with atlas when atlas format is selected', async () => {
      const imageDataUrl = 'data:image/png;base64,mockimage';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageDataUrl }]);

      const propsWithAtlas = {
        ...baseProps,
        data: {
          ...baseProps.data,
          atlasFormat: 'phaser' as const,
        },
      };

      const originalCreateElement = document.createElement.bind(document);
      const mockLink = originalCreateElement('a');
      mockLink.click = vi.fn();

      const createElementSpy = vi.spyOn(document, 'createElement');
      createElementSpy.mockImplementation((tagName: string) => {
        if (tagName === 'a') {
          return mockLink;
        }
        return originalCreateElement(tagName);
      });

      render(<ExportSheetNode {...propsWithAtlas} />);

      await waitFor(() => {
        const exportButton = screen.getByText('Export Sheet');
        expect(exportButton).not.toBeDisabled();
      });

      const exportButton = screen.getByText('Export Sheet');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockLink.download).toContain('.zip');
        expect(mockLink.click).toHaveBeenCalled();
      });

      createElementSpy.mockRestore();
    });

    it('converts to WebP when webp format is selected', async () => {
      const imageDataUrl = 'data:image/png;base64,mockimage';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageDataUrl }]);

      const propsWithWebp = {
        ...baseProps,
        data: {
          ...baseProps.data,
          format: 'webp' as const,
          includeMetadata: false, // Disable metadata to avoid download confusion
        },
      };

      const originalCreateElement = document.createElement.bind(document);
      const mockLink = originalCreateElement('a');
      mockLink.click = vi.fn();

      const createElementSpy = vi.spyOn(document, 'createElement');
      createElementSpy.mockImplementation((tagName: string) => {
        if (tagName === 'a') {
          return mockLink;
        }
        return originalCreateElement(tagName);
      });

      render(<ExportSheetNode {...propsWithWebp} />);

      await waitFor(() => {
        const exportButton = screen.getByText('Export Sheet');
        expect(exportButton).not.toBeDisabled();
      });

      const exportButton = screen.getByText('Export Sheet');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockLink.download).toContain('.webp');
        expect(mockLink.click).toHaveBeenCalled();
      });

      createElementSpy.mockRestore();
    });
  });
});
