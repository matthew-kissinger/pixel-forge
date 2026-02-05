import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditActions } from '../../../src/components/panels/toolbar/EditActions';
import { useWorkflowStore } from '../../../src/stores/workflow';

// Mock the workflow store
vi.mock('../../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

describe('EditActions', () => {
  const mockUndo = vi.fn();
  const mockRedo = vi.fn();
  const mockCanUndo = vi.fn();
  const mockCanRedo = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useWorkflowStore as any).mockReturnValue({
      undo: mockUndo,
      redo: mockRedo,
      canUndo: mockCanUndo,
      canRedo: mockCanRedo,
    });
  });

  it('renders without crashing', () => {
    mockCanUndo.mockReturnValue(true);
    mockCanRedo.mockReturnValue(true);

    render(<EditActions />);

    expect(screen.getByTitle('Undo')).toBeInTheDocument();
    expect(screen.getByTitle('Redo')).toBeInTheDocument();
  });

  it('displays undo and redo buttons', () => {
    mockCanUndo.mockReturnValue(true);
    mockCanRedo.mockReturnValue(true);

    render(<EditActions />);

    expect(screen.getByText('Undo')).toBeInTheDocument();
    expect(screen.getByText('Redo')).toBeInTheDocument();
  });

  it('calls undo when undo button is clicked', () => {
    mockCanUndo.mockReturnValue(true);
    mockCanRedo.mockReturnValue(false);

    render(<EditActions />);

    const undoButton = screen.getByTitle('Undo');
    fireEvent.click(undoButton);

    expect(mockUndo).toHaveBeenCalledTimes(1);
  });

  it('calls redo when redo button is clicked', () => {
    mockCanUndo.mockReturnValue(false);
    mockCanRedo.mockReturnValue(true);

    render(<EditActions />);

    const redoButton = screen.getByTitle('Redo');
    fireEvent.click(redoButton);

    expect(mockRedo).toHaveBeenCalledTimes(1);
  });

  it('disables undo button when canUndo returns false', () => {
    mockCanUndo.mockReturnValue(false);
    mockCanRedo.mockReturnValue(true);

    render(<EditActions />);

    const undoButton = screen.getByTitle('Undo');
    expect(undoButton).toBeDisabled();
  });

  it('disables redo button when canRedo returns false', () => {
    mockCanUndo.mockReturnValue(true);
    mockCanRedo.mockReturnValue(false);

    render(<EditActions />);

    const redoButton = screen.getByTitle('Redo');
    expect(redoButton).toBeDisabled();
  });

  it('enables both buttons when both canUndo and canRedo return true', () => {
    mockCanUndo.mockReturnValue(true);
    mockCanRedo.mockReturnValue(true);

    render(<EditActions />);

    const undoButton = screen.getByTitle('Undo');
    const redoButton = screen.getByTitle('Redo');

    expect(undoButton).not.toBeDisabled();
    expect(redoButton).not.toBeDisabled();
  });

  it('does not call undo when button is disabled', () => {
    mockCanUndo.mockReturnValue(false);
    mockCanRedo.mockReturnValue(true);

    render(<EditActions />);

    const undoButton = screen.getByTitle('Undo');
    fireEvent.click(undoButton);

    expect(mockUndo).not.toHaveBeenCalled();
  });

  it('does not call redo when button is disabled', () => {
    mockCanUndo.mockReturnValue(true);
    mockCanRedo.mockReturnValue(false);

    render(<EditActions />);

    const redoButton = screen.getByTitle('Redo');
    fireEvent.click(redoButton);

    expect(mockRedo).not.toHaveBeenCalled();
  });
});
