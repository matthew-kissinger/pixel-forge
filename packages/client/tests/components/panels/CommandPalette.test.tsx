import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from '../../../src/components/panels/CommandPalette';
import { useWorkflowStore } from '../../../src/stores/workflow';

// Mock the workflow store
vi.mock('../../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

// Mock React Flow
vi.mock('@xyflow/react', () => ({
  useReactFlow: vi.fn(() => ({
    fitView: vi.fn(),
  })),
}));

// Mock toast
vi.mock('../../../src/components/ui/Toast', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock validation
vi.mock('../../../src/lib/validate', () => ({
  validateWorkflow: vi.fn(() => ({
    valid: true,
    errors: [],
    warnings: [],
  })),
}));

// Mock auto layout
vi.mock('../../../src/lib/autoLayout', () => ({
  autoLayoutNodes: vi.fn((nodes) => nodes),
}));

// Mock executor
vi.mock('../../../src/lib/executor', () => ({
  executeWorkflow: vi.fn(() =>
    Promise.resolve({
      executed: 5,
      total: 5,
      errors: [],
    })
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Undo2: (props: any) => <div data-testid="icon-Undo2" {...props} />,
  Redo2: (props: any) => <div data-testid="icon-Redo2" {...props} />,
  Save: (props: any) => <div data-testid="icon-Save" {...props} />,
  FolderOpen: (props: any) => <div data-testid="icon-FolderOpen" {...props} />,
  Play: (props: any) => <div data-testid="icon-Play" {...props} />,
  CheckCircle2: (props: any) => <div data-testid="icon-CheckCircle2" {...props} />,
  Maximize2: (props: any) => <div data-testid="icon-Maximize2" {...props} />,
  LayoutGrid: (props: any) => <div data-testid="icon-LayoutGrid" {...props} />,
  Trash2: (props: any) => <div data-testid="icon-Trash2" {...props} />,
  FileJson: (props: any) => <div data-testid="icon-FileJson" {...props} />,
  Command: (props: any) => <div data-testid="icon-Command" {...props} />,
}));

describe('CommandPalette', () => {
  const mockUndo = vi.fn();
  const mockRedo = vi.fn();
  const mockCanUndo = vi.fn(() => true);
  const mockCanRedo = vi.fn(() => true);
  const mockReset = vi.fn();
  const mockSetNodes = vi.fn();
  const mockSetNodeError = vi.fn();
  const mockSetExecuting = vi.fn();
  const mockSetExecutionCancelled = vi.fn();
  const mockSetExecutionProgress = vi.fn();
  const mockOnClose = vi.fn();

  const baseProps = {
    isOpen: true,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useWorkflowStore as any).mockReturnValue({
      undo: mockUndo,
      redo: mockRedo,
      canUndo: mockCanUndo,
      canRedo: mockCanRedo,
      reset: mockReset,
      nodes: [],
      edges: [],
      setNodes: mockSetNodes,
      setNodeError: mockSetNodeError,
      nodeOutputs: {},
      isExecuting: false,
      setExecuting: mockSetExecuting,
      setExecutionCancelled: mockSetExecutionCancelled,
      setExecutionProgress: mockSetExecutionProgress,
    });
    (useWorkflowStore as any).getState = vi.fn(() => ({
      executionCancelled: false,
    }));
  });

  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      render(<CommandPalette {...baseProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search actions...')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<CommandPalette {...baseProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('displays search input', () => {
      render(<CommandPalette {...baseProps} />);
      const input = screen.getByPlaceholderText('Search actions...');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'text');
    });

    it('displays all command items', () => {
      render(<CommandPalette {...baseProps} />);
      expect(screen.getByText('Undo')).toBeInTheDocument();
      expect(screen.getByText('Redo')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Load')).toBeInTheDocument();
      expect(screen.getByText('Execute')).toBeInTheDocument();
      expect(screen.getByText('Validate')).toBeInTheDocument();
      expect(screen.getByText('Fit View')).toBeInTheDocument();
      expect(screen.getByText('Auto Layout')).toBeInTheDocument();
      expect(screen.getByText('Clear')).toBeInTheDocument();
      expect(screen.getByText('Export outputs')).toBeInTheDocument();
    });

    it('has correct aria attributes', () => {
      render(<CommandPalette {...baseProps} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-label', 'Command palette');
      
      const input = screen.getByPlaceholderText('Search actions...');
      expect(input).toHaveAttribute('aria-label', 'Search commands');
      
      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveAttribute('aria-label', 'Commands');
    });
  });

  describe('search and filtering', () => {
    it('filters commands by label', async () => {
      const user = userEvent.setup();
      render(<CommandPalette {...baseProps} />);
      
      const input = screen.getByPlaceholderText('Search actions...');
      await user.type(input, 'undo');
      
      expect(screen.getByText('Undo')).toBeInTheDocument();
      expect(screen.queryByText('Save')).not.toBeInTheDocument();
      expect(screen.queryByText('Load')).not.toBeInTheDocument();
    });

    it('filters commands by keywords', async () => {
      const user = userEvent.setup();
      render(<CommandPalette {...baseProps} />);
      
      const input = screen.getByPlaceholderText('Search actions...');
      await user.type(input, 'run');
      
      expect(screen.getByText('Execute')).toBeInTheDocument();
      expect(screen.queryByText('Undo')).not.toBeInTheDocument();
    });

    it('is case insensitive', async () => {
      const user = userEvent.setup();
      render(<CommandPalette {...baseProps} />);
      
      const input = screen.getByPlaceholderText('Search actions...');
      await user.type(input, 'SAVE');
      
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('shows all commands when search is empty', () => {
      render(<CommandPalette {...baseProps} />);
      expect(screen.getByText('Undo')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Execute')).toBeInTheDocument();
    });

    it('shows "No matching actions" when no results', async () => {
      const user = userEvent.setup();
      render(<CommandPalette {...baseProps} />);
      
      const input = screen.getByPlaceholderText('Search actions...');
      await user.type(input, 'xyz123notfound');
      
      expect(screen.getByText('No matching actions')).toBeInTheDocument();
    });

    it('clears search when reopened', () => {
      const { rerender } = render(<CommandPalette {...baseProps} isOpen={false} />);
      rerender(<CommandPalette {...baseProps} isOpen={true} />);
      
      const input = screen.getByPlaceholderText('Search actions...') as HTMLInputElement;
      expect(input.value).toBe('');
    });

    it('handles special characters in search', async () => {
      const user = userEvent.setup();
      render(<CommandPalette {...baseProps} />);
      
      const input = screen.getByPlaceholderText('Search actions...');
      await user.type(input, '!@#$%');
      
      expect(screen.getByText('No matching actions')).toBeInTheDocument();
    });
  });

  describe('command execution', () => {
    it('executes undo command', () => {
      render(<CommandPalette {...baseProps} />);
      const undoButton = screen.getByText('Undo').closest('button')!;
      fireEvent.click(undoButton);
      
      expect(mockUndo).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('executes redo command', () => {
      render(<CommandPalette {...baseProps} />);
      const redoButton = screen.getByText('Redo').closest('button')!;
      fireEvent.click(redoButton);
      
      expect(mockRedo).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('dispatches save event', () => {
      const eventSpy = vi.fn();
      window.addEventListener('workflow:save', eventSpy);
      
      render(<CommandPalette {...baseProps} />);
      const saveButton = screen.getByText('Save').closest('button')!;
      fireEvent.click(saveButton);
      
      expect(eventSpy).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
      
      window.removeEventListener('workflow:save', eventSpy);
    });

    it('dispatches load event', () => {
      const eventSpy = vi.fn();
      window.addEventListener('workflow:load', eventSpy);
      
      render(<CommandPalette {...baseProps} />);
      const loadButton = screen.getByText('Load').closest('button')!;
      fireEvent.click(loadButton);
      
      expect(eventSpy).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
      
      window.removeEventListener('workflow:load', eventSpy);
    });

    it('closes palette after command execution', () => {
      render(<CommandPalette {...baseProps} />);
      const undoButton = screen.getByText('Undo').closest('button')!;
      fireEvent.click(undoButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('keyboard navigation', () => {
    it('closes on Escape key', () => {
      render(<CommandPalette {...baseProps} />);
      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape' });
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('focuses input when opened', () => {
      render(<CommandPalette {...baseProps} />);
      const input = screen.getByPlaceholderText('Search actions...');
      expect(input).toHaveFocus();
    });
  });

  describe('disabled states', () => {
    it('disables undo when canUndo returns false', () => {
      (useWorkflowStore as any).mockReturnValue({
        ...useWorkflowStore(),
        canUndo: () => false,
        canRedo: () => true,
      });
      
      render(<CommandPalette {...baseProps} />);
      const undoButton = screen.getByText('Undo').closest('button')!;
      expect(undoButton).toBeDisabled();
    });

    it('disables redo when canRedo returns false', () => {
      (useWorkflowStore as any).mockReturnValue({
        ...useWorkflowStore(),
        canUndo: () => true,
        canRedo: () => false,
      });
      
      render(<CommandPalette {...baseProps} />);
      const redoButton = screen.getByText('Redo').closest('button')!;
      expect(redoButton).toBeDisabled();
    });

    it('disables execute when no nodes', () => {
      (useWorkflowStore as any).mockReturnValue({
        ...useWorkflowStore(),
        nodes: [],
      });
      
      render(<CommandPalette {...baseProps} />);
      const executeButton = screen.getByText('Execute').closest('button')!;
      expect(executeButton).toBeDisabled();
    });

    it('does not execute disabled commands', () => {
      (useWorkflowStore as any).mockReturnValue({
        ...useWorkflowStore(),
        canUndo: () => false,
      });
      
      render(<CommandPalette {...baseProps} />);
      const undoButton = screen.getByText('Undo').closest('button')!;
      fireEvent.click(undoButton);
      
      expect(mockUndo).not.toHaveBeenCalled();
    });
  });

  describe('shortcuts display', () => {
    it('shows shortcuts when showShortcuts is true', () => {
      render(<CommandPalette {...baseProps} showShortcuts={true} />);
      expect(screen.getByText('Ctrl+Z')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+Shift+Z')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+S')).toBeInTheDocument();
    });

    it('hides shortcuts when showShortcuts is false', () => {
      render(<CommandPalette {...baseProps} showShortcuts={false} />);
      expect(screen.queryByText('Ctrl+Z')).not.toBeInTheDocument();
      expect(screen.queryByText('Ctrl+Shift+Z')).not.toBeInTheDocument();
    });

    it('shows shortcuts by default', () => {
      render(<CommandPalette isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByText('Ctrl+Z')).toBeInTheDocument();
    });
  });

  describe('backdrop interaction', () => {
    it('closes when backdrop is clicked', () => {
      render(<CommandPalette {...baseProps} />);
      const backdrop = document.querySelector('.absolute.inset-0') as HTMLElement;
      fireEvent.click(backdrop);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('does not close when dialog content is clicked', () => {
      render(<CommandPalette {...baseProps} />);
      const dialog = screen.getByRole('dialog').querySelector('.relative') as HTMLElement;
      fireEvent.click(dialog);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('execute command states', () => {
    it('shows "Execute" when not executing', () => {
      (useWorkflowStore as any).mockReturnValue({
        ...useWorkflowStore(),
        nodes: [{ id: '1' }],
        isExecuting: false,
      });
      
      render(<CommandPalette {...baseProps} />);
      expect(screen.getByText('Execute')).toBeInTheDocument();
    });

    it('shows "Stop execution" when executing', () => {
      (useWorkflowStore as any).mockReturnValue({
        ...useWorkflowStore(),
        nodes: [{ id: '1' }],
        isExecuting: true,
      });
      
      render(<CommandPalette {...baseProps} />);
      expect(screen.getByText('Stop execution')).toBeInTheDocument();
    });
  });

  describe('validate command', () => {
    it('validates workflow with nodes', async () => {
      const { validateWorkflow } = await import('../../../src/lib/validate');
      const { toast } = await import('../../../src/components/ui/Toast');
      
      (useWorkflowStore as any).mockReturnValue({
        ...useWorkflowStore(),
        nodes: [{ id: '1' }],
        edges: [],
      });
      
      render(<CommandPalette {...baseProps} />);
      const validateButton = screen.getByText('Validate').closest('button')!;
      fireEvent.click(validateButton);
      
      expect(validateWorkflow).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Validation passed - workflow is ready to execute');
    });
  });

  describe('auto layout command', () => {
    it('applies auto layout to nodes', async () => {
      const { autoLayoutNodes } = await import('../../../src/lib/autoLayout');
      const { useReactFlow } = await import('@xyflow/react');
      
      (useWorkflowStore as any).mockReturnValue({
        ...useWorkflowStore(),
        nodes: [{ id: '1' }],
        edges: [],
      });
      
      render(<CommandPalette {...baseProps} />);
      const layoutButton = screen.getByText('Auto Layout').closest('button')!;
      fireEvent.click(layoutButton);
      
      expect(autoLayoutNodes).toHaveBeenCalled();
      expect(mockSetNodes).toHaveBeenCalled();
    });
  });

  describe('clear command', () => {
    it('shows confirmation dialog', () => {
      const confirmSpy = vi.fn(() => false);
      const originalConfirm = window.confirm;
      window.confirm = confirmSpy;
      
      (useWorkflowStore as any).mockReturnValue({
        ...useWorkflowStore(),
        nodes: [{ id: '1' }],
      });
      
      render(<CommandPalette {...baseProps} />);
      const clearButton = screen.getByText('Clear').closest('button')!;
      fireEvent.click(clearButton);
      
      expect(confirmSpy).toHaveBeenCalledWith('Clear all nodes? This cannot be undone.');
      window.confirm = originalConfirm;
    });

    it('clears workflow when confirmed', () => {
      const confirmSpy = vi.fn(() => true);
      const originalConfirm = window.confirm;
      window.confirm = confirmSpy;
      
      (useWorkflowStore as any).mockReturnValue({
        ...useWorkflowStore(),
        nodes: [{ id: '1' }],
      });
      
      render(<CommandPalette {...baseProps} />);
      const clearButton = screen.getByText('Clear').closest('button')!;
      fireEvent.click(clearButton);
      
      expect(mockReset).toHaveBeenCalled();
      window.confirm = originalConfirm;
    });

    it('does not clear when cancelled', () => {
      const confirmSpy = vi.fn(() => false);
      const originalConfirm = window.confirm;
      window.confirm = confirmSpy;
      
      (useWorkflowStore as any).mockReturnValue({
        ...useWorkflowStore(),
        nodes: [{ id: '1' }],
      });
      
      render(<CommandPalette {...baseProps} />);
      const clearButton = screen.getByText('Clear').closest('button')!;
      fireEvent.click(clearButton);
      
      expect(mockReset).not.toHaveBeenCalled();
      window.confirm = originalConfirm;
    });
  });

  describe('export command', () => {
    it('exports node outputs', () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      
      (useWorkflowStore as any).mockReturnValue({
        ...useWorkflowStore(),
        nodeOutputs: {
          node1: { type: 'image', data: 'data:image/png;base64,abc', timestamp: Date.now() },
        },
      });
      
      render(<CommandPalette {...baseProps} />);
      const exportButton = screen.getByText('Export outputs').closest('button')!;
      fireEvent.click(exportButton);
      
      expect(createElementSpy).toHaveBeenCalledWith('a');
      createElementSpy.mockRestore();
    });
  });

  describe('icons', () => {
    it('displays command icon', () => {
      render(<CommandPalette {...baseProps} />);
      expect(screen.getByTestId('icon-Command')).toBeInTheDocument();
    });

    it('displays all command icons', () => {
      render(<CommandPalette {...baseProps} />);
      expect(screen.getByTestId('icon-Undo2')).toBeInTheDocument();
      expect(screen.getByTestId('icon-Redo2')).toBeInTheDocument();
      expect(screen.getByTestId('icon-Save')).toBeInTheDocument();
      expect(screen.getByTestId('icon-FolderOpen')).toBeInTheDocument();
      expect(screen.getByTestId('icon-Play')).toBeInTheDocument();
      expect(screen.getByTestId('icon-CheckCircle2')).toBeInTheDocument();
      expect(screen.getByTestId('icon-Maximize2')).toBeInTheDocument();
      expect(screen.getByTestId('icon-LayoutGrid')).toBeInTheDocument();
      expect(screen.getByTestId('icon-Trash2')).toBeInTheDocument();
      expect(screen.getByTestId('icon-FileJson')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty nodes array for validate', async () => {
      const { toast } = await import('../../../src/components/ui/Toast');
      
      (useWorkflowStore as any).mockReturnValue({
        ...useWorkflowStore(),
        nodes: [],
      });
      
      render(<CommandPalette {...baseProps} />);
      const validateButton = screen.getByText('Validate').closest('button')!;
      fireEvent.click(validateButton);
      
      expect(toast.info).toHaveBeenCalledWith('No nodes to validate');
    });

    it('handles empty nodes array for auto layout', async () => {
      const { toast } = await import('../../../src/components/ui/Toast');
      
      (useWorkflowStore as any).mockReturnValue({
        ...useWorkflowStore(),
        nodes: [],
      });
      
      render(<CommandPalette {...baseProps} />);
      const layoutButton = screen.getByText('Auto Layout').closest('button')!;
      fireEvent.click(layoutButton);
      
      expect(toast.info).toHaveBeenCalledWith('No nodes to layout');
    });

    it('handles empty canvas for clear', async () => {
      const { toast } = await import('../../../src/components/ui/Toast');
      
      (useWorkflowStore as any).mockReturnValue({
        ...useWorkflowStore(),
        nodes: [],
      });
      
      render(<CommandPalette {...baseProps} />);
      const clearButton = screen.getByText('Clear').closest('button')!;
      fireEvent.click(clearButton);
      
      expect(toast.info).toHaveBeenCalledWith('Canvas is already empty');
    });

    it('handles no outputs for export', async () => {
      const { toast } = await import('../../../src/components/ui/Toast');
      
      (useWorkflowStore as any).mockReturnValue({
        ...useWorkflowStore(),
        nodeOutputs: {},
      });
      
      render(<CommandPalette {...baseProps} />);
      const exportButton = screen.getByText('Export outputs').closest('button')!;
      fireEvent.click(exportButton);
      
      expect(toast.info).toHaveBeenCalledWith('No outputs to export');
    });

    it('handles rapid open/close cycles', () => {
      const { rerender } = render(<CommandPalette {...baseProps} isOpen={false} />);
      
      rerender(<CommandPalette {...baseProps} isOpen={true} />);
      rerender(<CommandPalette {...baseProps} isOpen={false} />);
      rerender(<CommandPalette {...baseProps} isOpen={true} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('handles whitespace-only search', async () => {
      const user = userEvent.setup();
      render(<CommandPalette {...baseProps} />);
      
      const input = screen.getByPlaceholderText('Search actions...');
      await user.type(input, '   ');
      
      // Should show all commands (whitespace is trimmed)
      expect(screen.getByText('Undo')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });

  describe('command categories', () => {
    it('groups history commands', () => {
      render(<CommandPalette {...baseProps} />);
      expect(screen.getByText('Undo')).toBeInTheDocument();
      expect(screen.getByText('Redo')).toBeInTheDocument();
    });

    it('groups file commands', () => {
      render(<CommandPalette {...baseProps} />);
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Load')).toBeInTheDocument();
    });

    it('groups workflow commands', () => {
      render(<CommandPalette {...baseProps} />);
      expect(screen.getByText('Execute')).toBeInTheDocument();
      expect(screen.getByText('Validate')).toBeInTheDocument();
    });

    it('groups view commands', () => {
      render(<CommandPalette {...baseProps} />);
      expect(screen.getByText('Fit View')).toBeInTheDocument();
      expect(screen.getByText('Auto Layout')).toBeInTheDocument();
    });
  });
});
