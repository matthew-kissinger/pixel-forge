import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewActions } from '../../../src/components/panels/toolbar/ViewActions';
import { useWorkflowStore } from '../../../src/stores/workflow';
import { toast } from '../../../src/components/ui/Toast';
import { autoLayoutNodes } from '../../../src/lib/autoLayout';
import { useReactFlow } from '@xyflow/react';

// Mock the workflow store
vi.mock('../../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

// Mock the toast utility
vi.mock('../../../src/components/ui/Toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock autoLayout utility
vi.mock('../../../src/lib/autoLayout', () => ({
  autoLayoutNodes: vi.fn((nodes) => nodes),
}));

// Mock ReactFlow
vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react');
  return {
    ...actual,
    useReactFlow: vi.fn(),
  };
});

describe('ViewActions', () => {
  const mockSetNodes = vi.fn();
  const mockFitView = vi.fn();
  const mockOnToggleMiniMap = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useWorkflowStore as any).mockReturnValue({
      nodes: [
        { id: '1', type: 'input', position: { x: 0, y: 0 }, data: {} },
        { id: '2', type: 'output', position: { x: 100, y: 100 }, data: {} },
      ],
      edges: [],
      setNodes: mockSetNodes,
    });

    (useReactFlow as any).mockReturnValue({
      fitView: mockFitView,
    });
  });

  it('renders without crashing', () => {
    render(<ViewActions />);

    expect(screen.getByTitle('Fit view')).toBeInTheDocument();
    expect(screen.getByTitle('Auto layout')).toBeInTheDocument();
  });

  it('displays fit view and auto layout buttons', () => {
    render(<ViewActions />);

    expect(screen.getByText('Fit View')).toBeInTheDocument();
    expect(screen.getByText('Auto Layout')).toBeInTheDocument();
  });

  it('calls fitView when fit view button is clicked', () => {
    render(<ViewActions />);

    const fitViewButton = screen.getByTitle('Fit view');
    fireEvent.click(fitViewButton);

    expect(mockFitView).toHaveBeenCalledWith({ padding: 0.2 });
  });

  it('calls autoLayoutNodes when auto layout button is clicked', () => {
    render(<ViewActions />);

    const autoLayoutButton = screen.getByTitle('Auto layout');
    fireEvent.click(autoLayoutButton);

    expect(autoLayoutNodes).toHaveBeenCalled();
    expect(mockSetNodes).toHaveBeenCalled();
  });

  it('shows toast when auto layout is clicked with no nodes', () => {
    (useWorkflowStore as any).mockReturnValue({
      nodes: [],
      edges: [],
      setNodes: mockSetNodes,
    });

    render(<ViewActions />);

    const autoLayoutButton = screen.getByTitle('Auto layout');
    fireEvent.click(autoLayoutButton);

    expect(toast.info).toHaveBeenCalledWith('No nodes to layout');
    expect(mockSetNodes).not.toHaveBeenCalled();
  });

  it('renders minimap toggle button when callback is provided', () => {
    render(
      <ViewActions onToggleMiniMap={mockOnToggleMiniMap} isMiniMapVisible={false} />
    );

    expect(screen.getByTitle('Show minimap')).toBeInTheDocument();
  });

  it('does not render minimap toggle button when callback is not provided', () => {
    render(<ViewActions />);

    expect(screen.queryByTitle('Show minimap')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Hide minimap')).not.toBeInTheDocument();
  });

  it('calls onToggleMiniMap when minimap button is clicked', () => {
    render(
      <ViewActions onToggleMiniMap={mockOnToggleMiniMap} isMiniMapVisible={false} />
    );

    const minimapButton = screen.getByTitle('Show minimap');
    fireEvent.click(minimapButton);

    expect(mockOnToggleMiniMap).toHaveBeenCalledTimes(1);
  });

  it('shows correct icon and title based on minimap visibility', () => {
    const { rerender } = render(
      <ViewActions onToggleMiniMap={mockOnToggleMiniMap} isMiniMapVisible={false} />
    );

    expect(screen.getByTitle('Show minimap')).toBeInTheDocument();

    rerender(
      <ViewActions onToggleMiniMap={mockOnToggleMiniMap} isMiniMapVisible={true} />
    );

    expect(screen.getByTitle('Hide minimap')).toBeInTheDocument();
  });
});
