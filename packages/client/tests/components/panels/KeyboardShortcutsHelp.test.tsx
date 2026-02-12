import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KeyboardShortcutsHelp } from '../../../src/components/panels/KeyboardShortcutsHelp';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: (props: any) => <div data-testid="icon-X" {...props} />,
}));

describe('KeyboardShortcutsHelp', () => {
  const mockOnClose = vi.fn();

  const baseProps = {
    isOpen: true,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders nothing when isOpen is false', () => {
      render(<KeyboardShortcutsHelp isOpen={false} onClose={mockOnClose} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders dialog when isOpen is true', () => {
      render(<KeyboardShortcutsHelp {...baseProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('shows correct title text', () => {
      render(<KeyboardShortcutsHelp {...baseProps} />);
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });

    it('shows all shortcut sections', () => {
      render(<KeyboardShortcutsHelp {...baseProps} />);
      expect(screen.getByText('General')).toBeInTheDocument();
      expect(screen.getByText('File')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Execution')).toBeInTheDocument();
      expect(screen.getByText('Canvas')).toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('calls onClose when Escape key is pressed', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcutsHelp {...baseProps} />);

      await user.keyboard('{Escape}');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when close button is clicked', () => {
      render(<KeyboardShortcutsHelp {...baseProps} />);
      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', () => {
      render(<KeyboardShortcutsHelp {...baseProps} />);
      const backdrop = screen.getByRole('dialog');
      fireEvent.mouseDown(backdrop);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when clicking inside dialog', () => {
      render(<KeyboardShortcutsHelp {...baseProps} />);
      const dialogContent = screen.getByText('Keyboard Shortcuts').closest('div')!;
      fireEvent.mouseDown(dialogContent);
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('dialog has role="dialog"', () => {
      render(<KeyboardShortcutsHelp {...baseProps} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('dialog has aria-modal="true"', () => {
      render(<KeyboardShortcutsHelp {...baseProps} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('dialog has aria-labelledby pointing to title', () => {
      render(<KeyboardShortcutsHelp {...baseProps} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'shortcuts-title');
    });

    it('close button has aria-label="Close"', () => {
      render(<KeyboardShortcutsHelp {...baseProps} />);
      const closeButton = screen.getByLabelText('Close');
      expect(closeButton).toBeInTheDocument();
    });

    it('title has correct id for aria-labelledby', () => {
      render(<KeyboardShortcutsHelp {...baseProps} />);
      const title = screen.getByText('Keyboard Shortcuts');
      expect(title).toHaveAttribute('id', 'shortcuts-title');
    });
  });

  describe('content', () => {
    it('displays General section shortcuts', () => {
      render(<KeyboardShortcutsHelp {...baseProps} />);
      expect(screen.getByText('Show this help')).toBeInTheDocument();
      expect(screen.getByText('Close current panel or deselect')).toBeInTheDocument();
      expect(screen.getByText('Open command palette')).toBeInTheDocument();
    });

    it('displays File section shortcuts', () => {
      render(<KeyboardShortcutsHelp {...baseProps} />);
      expect(screen.getByText('Save workflow')).toBeInTheDocument();
      expect(screen.getByText('Open workflow')).toBeInTheDocument();
    });

    it('displays Edit section shortcuts', () => {
      render(<KeyboardShortcutsHelp {...baseProps} />);
      expect(screen.getByText('Undo')).toBeInTheDocument();
      expect(screen.getByText('Redo')).toBeInTheDocument();
      expect(screen.getByText('Copy selected nodes')).toBeInTheDocument();
      expect(screen.getByText('Paste nodes')).toBeInTheDocument();
      expect(screen.getByText('Select all nodes')).toBeInTheDocument();
      const deleteTexts = screen.getAllByText('Delete selected');
      expect(deleteTexts).toHaveLength(2); // Delete and Backspace
    });

    it('displays Execution section shortcuts', () => {
      render(<KeyboardShortcutsHelp {...baseProps} />);
      expect(screen.getByText('Execute workflow')).toBeInTheDocument();
    });

    it('displays Canvas section shortcuts', () => {
      render(<KeyboardShortcutsHelp {...baseProps} />);
      expect(screen.getByText('Zoom in/out')).toBeInTheDocument();
      expect(screen.getByText('Pan canvas')).toBeInTheDocument();
      expect(screen.getByText('Select multiple nodes')).toBeInTheDocument();
    });

    it('displays Ctrl+Z shortcut key', () => {
      render(<KeyboardShortcutsHelp {...baseProps} />);
      const keys = screen.getAllByText('Ctrl/Cmd');
      const zKeys = screen.getAllByText('Z');
      expect(keys.length).toBeGreaterThan(0);
      expect(zKeys).toHaveLength(2); // Undo and Redo
    });

    it('displays Ctrl+S shortcut key', () => {
      render(<KeyboardShortcutsHelp {...baseProps} />);
      const keys = screen.getAllByText('Ctrl/Cmd');
      const sKey = screen.getByText('S');
      expect(keys.length).toBeGreaterThan(0);
      expect(sKey).toBeInTheDocument();
    });

    it('displays Delete shortcut key', () => {
      render(<KeyboardShortcutsHelp {...baseProps} />);
      const deleteKey = screen.getByText('Delete');
      expect(deleteKey).toBeInTheDocument();
    });

    it('displays Backspace shortcut key', () => {
      render(<KeyboardShortcutsHelp {...baseProps} />);
      const backspaceKey = screen.getByText('Backspace');
      expect(backspaceKey).toBeInTheDocument();
    });

    it('displays Escape shortcut key', () => {
      render(<KeyboardShortcutsHelp {...baseProps} />);
      const escapeKeys = screen.getAllByText('Escape');
      expect(escapeKeys.length).toBeGreaterThan(0);
    });

    it('sections are properly grouped', () => {
      render(<KeyboardShortcutsHelp {...baseProps} />);
      const sections = ['General', 'File', 'Edit', 'Execution', 'Canvas'];
      sections.forEach(section => {
        const sectionElement = screen.getByText(section);
        expect(sectionElement.tagName).toBe('H3');
      });
    });
  });
});
