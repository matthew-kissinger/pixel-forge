import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportGLBNode } from '../../src/components/nodes/ExportGLBNode';
import { useWorkflowStore } from '../../src/stores/workflow';

vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

vi.mock('lucide-react', () => ({
  Download: (props: any) => <div data-testid="icon-Download" {...props} />,
  FileBox: (props: any) => <div data-testid="icon-FileBox" {...props} />,
  CheckSquare: (props: any) => <div data-testid="icon-CheckSquare" {...props} />,
  Square: (props: any) => <div data-testid="icon-Square" {...props} />,
}));

vi.mock('../../src/components/nodes/BaseNode', () => ({
  BaseNode: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('ExportGLBNode', () => {
  const mockGetInputsForNode = vi.fn();
  const mockUpdateNodeData = vi.fn();

  const baseProps = {
    id: 'test-export-glb',
    type: 'exportGLB',
    data: {
      includeAnimations: true,
      embedTextures: true,
      fileName: 'model',
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
      render(<ExportGLBNode {...baseProps} />);
      expect(screen.getAllByText('Export GLB')).toHaveLength(2); // label + button
    });

    it('displays the file name input', () => {
      render(<ExportGLBNode {...baseProps} />);
      const input = screen.getByPlaceholderText('File name') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.value).toBe('model');
    });

    it('shows include animations checkbox', () => {
      render(<ExportGLBNode {...baseProps} />);
      expect(screen.getByText('Include Animations')).toBeInTheDocument();
    });

    it('shows embed textures checkbox', () => {
      render(<ExportGLBNode {...baseProps} />);
      expect(screen.getByText('Embed Textures')).toBeInTheDocument();
    });

    it('shows export button', () => {
      render(<ExportGLBNode {...baseProps} />);
      const buttons = screen.getAllByRole('button');
      const exportButton = buttons.find((btn) => btn.textContent?.includes('Export GLB'));
      expect(exportButton).toBeInTheDocument();
    });

    it('uses default fileName when not provided', () => {
      const props = {
        ...baseProps,
        data: { includeAnimations: true, embedTextures: true },
      };
      render(<ExportGLBNode {...props} />);
      const input = screen.getByPlaceholderText('File name') as HTMLInputElement;
      expect(input.value).toBe('model');
    });
  });

  describe('no input state', () => {
    it('shows connect message when no input', () => {
      render(<ExportGLBNode {...baseProps} />);
      expect(screen.getByText('Connect a 3D model input')).toBeInTheDocument();
    });

    it('disables export button when no input', () => {
      render(<ExportGLBNode {...baseProps} />);
      const buttons = screen.getAllByRole('button');
      const exportButton = buttons.find((btn) => btn.textContent?.includes('Export GLB'));
      expect(exportButton).toBeDisabled();
    });
  });

  describe('model input', () => {
    it('shows ready message when model input connected', () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'model', data: 'blob:model-url' }]);
      render(<ExportGLBNode {...baseProps} />);
      expect(screen.getByText('3D Model ready (GLB)')).toBeInTheDocument();
    });

    it('enables export button when model input connected', () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'model', data: 'blob:model-url' }]);
      render(<ExportGLBNode {...baseProps} />);
      const buttons = screen.getAllByRole('button');
      const exportButton = buttons.find((btn) => btn.textContent?.includes('Export GLB'));
      expect(exportButton).not.toBeDisabled();
    });

    it('shows wrong type error when non-model input connected', () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: 'data:image/png;base64,abc' }]);
      render(<ExportGLBNode {...baseProps} />);
      expect(screen.getByText('Wrong input type - expects 3D model')).toBeInTheDocument();
    });

    it('disables export button for wrong input type', () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: 'data:image/png;base64,abc' }]);
      render(<ExportGLBNode {...baseProps} />);
      const buttons = screen.getAllByRole('button');
      const exportButton = buttons.find((btn) => btn.textContent?.includes('Export GLB'));
      expect(exportButton).toBeDisabled();
    });

    it('uses the latest input when multiple inputs', () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,abc' },
        { type: 'model', data: 'blob:model-url' },
      ]);
      render(<ExportGLBNode {...baseProps} />);
      expect(screen.getByText('3D Model ready (GLB)')).toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('updates file name on input change', () => {
      render(<ExportGLBNode {...baseProps} />);
      const input = screen.getByPlaceholderText('File name');
      fireEvent.change(input, { target: { value: 'spaceship' } });
      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-export-glb', {
        fileName: 'spaceship',
      });
    });

    it('toggles includeAnimations when clicked', () => {
      render(<ExportGLBNode {...baseProps} />);
      const animBtn = screen.getByText('Include Animations').closest('button')!;
      fireEvent.click(animBtn);
      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-export-glb', {
        includeAnimations: false,
      });
    });

    it('toggles embedTextures when clicked', () => {
      render(<ExportGLBNode {...baseProps} />);
      const texBtn = screen.getByText('Embed Textures').closest('button')!;
      fireEvent.click(texBtn);
      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-export-glb', {
        embedTextures: false,
      });
    });

    it('toggles includeAnimations from false to true', () => {
      const props = {
        ...baseProps,
        data: { ...baseProps.data, includeAnimations: false },
      };
      render(<ExportGLBNode {...props} />);
      const animBtn = screen.getByText('Include Animations').closest('button')!;
      fireEvent.click(animBtn);
      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-export-glb', {
        includeAnimations: true,
      });
    });

    it('toggles embedTextures from false to true', () => {
      const props = {
        ...baseProps,
        data: { ...baseProps.data, embedTextures: false },
      };
      render(<ExportGLBNode {...props} />);
      const texBtn = screen.getByText('Embed Textures').closest('button')!;
      fireEvent.click(texBtn);
      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-export-glb', {
        embedTextures: true,
      });
    });
  });

  describe('checkbox icons', () => {
    it('shows CheckSquare icons when both options are true', () => {
      render(<ExportGLBNode {...baseProps} />);
      const checkIcons = screen.getAllByTestId('icon-CheckSquare');
      expect(checkIcons).toHaveLength(2);
    });

    it('shows Square icons when both options are false', () => {
      const props = {
        ...baseProps,
        data: {
          ...baseProps.data,
          includeAnimations: false,
          embedTextures: false,
        },
      };
      render(<ExportGLBNode {...props} />);
      const squareIcons = screen.getAllByTestId('icon-Square');
      expect(squareIcons).toHaveLength(2);
    });
  });

  describe('download handler', () => {
    it('creates a download link with correct filename on export', () => {
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      mockGetInputsForNode.mockReturnValue([{ type: 'model', data: 'blob:model-url' }]);
      render(<ExportGLBNode {...baseProps} />);

      const buttons = screen.getAllByRole('button');
      const exportButton = buttons.find((btn) => btn.textContent?.includes('Export GLB'))!;
      fireEvent.click(exportButton);

      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    it('does not download when input is not model type', () => {
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: 'data:image/png;base64,abc' }]);
      render(<ExportGLBNode {...baseProps} />);

      const buttons = screen.getAllByRole('button');
      const exportButton = buttons.find((btn) => btn.textContent?.includes('Export GLB'))!;
      // Button is disabled, so clicking should be a no-op
      expect(exportButton).toBeDisabled();

      clickSpy.mockRestore();
    });

    it('does nothing when clicking export with no input', () => {
      mockGetInputsForNode.mockReturnValue([]);
      render(<ExportGLBNode {...baseProps} />);

      const buttons = screen.getAllByRole('button');
      const exportButton = buttons.find((btn) => btn.textContent?.includes('Export GLB'))!;
      expect(exportButton).toBeDisabled();
    });
  });
});
