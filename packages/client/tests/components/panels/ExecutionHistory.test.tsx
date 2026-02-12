import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExecutionHistory } from '../../../src/components/panels/ExecutionHistory';
import { useWorkflowStore, type ExecutionRecord } from '../../../src/stores/workflow';

// Mock the workflow store
vi.mock('../../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Clock: (props: any) => <div data-testid="icon-Clock" {...props} />,
  CheckCircle: (props: any) => <div data-testid="icon-CheckCircle" {...props} />,
  XCircle: (props: any) => <div data-testid="icon-XCircle" {...props} />,
  AlertTriangle: (props: any) => <div data-testid="icon-AlertTriangle" {...props} />,
  Trash2: (props: any) => <div data-testid="icon-Trash2" {...props} />,
  ChevronDown: (props: any) => <div data-testid="icon-ChevronDown" {...props} />,
  ChevronRight: (props: any) => <div data-testid="icon-ChevronRight" {...props} />,
  ChevronLeft: (props: any) => <div data-testid="icon-ChevronLeft" {...props} />,
  X: (props: any) => <div data-testid="icon-X" {...props} />,
}));

describe('ExecutionHistory', () => {
  const mockClearExecutionHistory = vi.fn();
  const mockExecutionHistory: ExecutionRecord[] = [];

  const baseProps = {
    isVisible: true,
    onToggle: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useWorkflowStore as any).mockReturnValue({
      executionHistory: mockExecutionHistory,
      clearExecutionHistory: mockClearExecutionHistory,
    });
  });

  describe('visibility', () => {
    it('renders when isVisible is true', () => {
      (useWorkflowStore as any).mockReturnValue({
        executionHistory: [],
        clearExecutionHistory: mockClearExecutionHistory,
      });

      render(<ExecutionHistory {...baseProps} />);
      expect(screen.getByText('Execution History')).toBeInTheDocument();
    });

    it('does not render when isVisible is false', () => {
      (useWorkflowStore as any).mockReturnValue({
        executionHistory: [],
        clearExecutionHistory: mockClearExecutionHistory,
      });

      render(<ExecutionHistory {...baseProps} isVisible={false} />);
      expect(screen.queryByText('Execution History')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('displays empty state when no history', () => {
      (useWorkflowStore as any).mockReturnValue({
        executionHistory: [],
        clearExecutionHistory: mockClearExecutionHistory,
      });

      render(<ExecutionHistory {...baseProps} />);
      expect(screen.getByText(/No execution history yet/i)).toBeInTheDocument();
      expect(screen.getByText(/Run a workflow to see results here/i)).toBeInTheDocument();
    });

    it('shows 0 runs in header when empty', () => {
      (useWorkflowStore as any).mockReturnValue({
        executionHistory: [],
        clearExecutionHistory: mockClearExecutionHistory,
      });

      render(<ExecutionHistory {...baseProps} />);
      expect(screen.getByText('0 runs')).toBeInTheDocument();
    });

    it('does not show clear button when empty', () => {
      (useWorkflowStore as any).mockReturnValue({
        executionHistory: [],
        clearExecutionHistory: mockClearExecutionHistory,
      });

      render(<ExecutionHistory {...baseProps} />);
      expect(screen.queryByTestId('icon-Trash2')).not.toBeInTheDocument();
    });
  });

  describe('with execution records', () => {
    const mockRecords: ExecutionRecord[] = [
      {
        id: 'exec1',
        timestamp: Date.now() - 60000, // 1 minute ago
        completedAt: Date.now() - 60000,
        duration: 5000,
        status: 'success',
        executedNodes: 5,
        totalNodes: 5,
        failedNodes: 0,
        errors: [],
      },
      {
        id: 'exec2',
        timestamp: Date.now() - 3600000, // 1 hour ago
        completedAt: Date.now() - 3600000,
        duration: 120000,
        status: 'partial',
        executedNodes: 3,
        totalNodes: 5,
        failedNodes: 2,
        errors: [
          { nodeId: 'node1', nodeLabel: 'Image Gen', error: 'API timeout' },
          { nodeId: 'node2', nodeLabel: 'Save Node', error: 'No input' },
        ],
      },
    ];

    beforeEach(() => {
      (useWorkflowStore as any).mockReturnValue({
        executionHistory: mockRecords,
        clearExecutionHistory: mockClearExecutionHistory,
      });
    });

    it('displays execution count in header', () => {
      render(<ExecutionHistory {...baseProps} />);
      expect(screen.getByText('2 runs')).toBeInTheDocument();
    });

    it('displays singular "run" for single execution', () => {
      (useWorkflowStore as any).mockReturnValue({
        executionHistory: [mockRecords[0]],
        clearExecutionHistory: mockClearExecutionHistory,
      });

      render(<ExecutionHistory {...baseProps} />);
      expect(screen.getByText('1 run')).toBeInTheDocument();
    });

    it('displays all execution records', () => {
      render(<ExecutionHistory {...baseProps} />);
      expect(screen.getByText('5/5 nodes executed')).toBeInTheDocument();
      expect(screen.getByText('3/5 nodes executed')).toBeInTheDocument();
    });

    it('shows success icon for successful execution', () => {
      render(<ExecutionHistory {...baseProps} />);
      const icons = screen.getAllByTestId('icon-CheckCircle');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('shows warning icon for partial execution', () => {
      render(<ExecutionHistory {...baseProps} />);
      expect(screen.getByTestId('icon-AlertTriangle')).toBeInTheDocument();
    });

    it('displays relative time for executions', () => {
      render(<ExecutionHistory {...baseProps} />);
      expect(screen.getByText('1 min ago')).toBeInTheDocument();
      expect(screen.getByText('1 hour ago')).toBeInTheDocument();
    });

    it('displays duration for executions', () => {
      render(<ExecutionHistory {...baseProps} />);
      expect(screen.getByText('5s')).toBeInTheDocument();
      expect(screen.getByText('2m 0s')).toBeInTheDocument();
    });

    it('displays failed node count for partial executions', () => {
      render(<ExecutionHistory {...baseProps} />);
      expect(screen.getByText('(2 failed)')).toBeInTheDocument();
    });

    it('shows clear button when history exists', () => {
      render(<ExecutionHistory {...baseProps} />);
      expect(screen.getByTestId('icon-Trash2')).toBeInTheDocument();
    });
  });

  describe('execution status icons', () => {
    it('shows failed icon for failed execution', () => {
      const failedRecord: ExecutionRecord = {
        id: 'exec1',
        timestamp: Date.now(),
        completedAt: Date.now(),
        duration: 1000,
        status: 'failed',
        executedNodes: 1,
        totalNodes: 5,
        failedNodes: 4,
        errors: [],
      };

      (useWorkflowStore as any).mockReturnValue({
        executionHistory: [failedRecord],
        clearExecutionHistory: mockClearExecutionHistory,
      });

      render(<ExecutionHistory {...baseProps} />);
      const xCircleIcons = screen.getAllByTestId('icon-XCircle');
      expect(xCircleIcons.length).toBeGreaterThan(0);
    });

    it('shows cancelled icon for cancelled execution', () => {
      const cancelledRecord: ExecutionRecord = {
        id: 'exec1',
        timestamp: Date.now(),
        completedAt: Date.now(),
        duration: 500,
        status: 'cancelled',
        executedNodes: 2,
        totalNodes: 5,
        failedNodes: 0,
        errors: [],
      };

      (useWorkflowStore as any).mockReturnValue({
        executionHistory: [cancelledRecord],
        clearExecutionHistory: mockClearExecutionHistory,
      });

      render(<ExecutionHistory {...baseProps} />);
      const xCircleIcons = screen.getAllByTestId('icon-XCircle');
      expect(xCircleIcons.length).toBeGreaterThan(0);
    });
  });

  describe('error expansion', () => {
    const recordWithErrors: ExecutionRecord = {
      id: 'exec1',
      timestamp: Date.now(),
      completedAt: Date.now(),
      duration: 5000,
      status: 'partial',
      executedNodes: 3,
      totalNodes: 5,
      failedNodes: 2,
      errors: [
        { nodeId: 'node1', nodeLabel: 'Image Gen', error: 'API timeout' },
        { nodeId: 'node2', nodeLabel: 'Save Node', error: 'No input connected' },
      ],
    };

    beforeEach(() => {
      (useWorkflowStore as any).mockReturnValue({
        executionHistory: [recordWithErrors],
        clearExecutionHistory: mockClearExecutionHistory,
      });
    });

    it('does not show errors initially', () => {
      render(<ExecutionHistory {...baseProps} />);
      expect(screen.queryByText('API timeout')).not.toBeInTheDocument();
      expect(screen.queryByText('No input connected')).not.toBeInTheDocument();
    });

    it('shows chevron right icon when collapsed', () => {
      render(<ExecutionHistory {...baseProps} />);
      const chevronIcons = screen.getAllByTestId('icon-ChevronRight');
      // At least one chevron right should be present (for error expansion or panel collapse)
      expect(chevronIcons.length).toBeGreaterThan(0);
    });

    it('expands errors when clicked', () => {
      render(<ExecutionHistory {...baseProps} />);
      const entryButton = screen.getByText('3/5 nodes executed').closest('button')!;
      fireEvent.click(entryButton);

      expect(screen.getByText('API timeout')).toBeInTheDocument();
      expect(screen.getByText('No input connected')).toBeInTheDocument();
    });

    it('shows chevron down icon when expanded', () => {
      render(<ExecutionHistory {...baseProps} />);
      const entryButton = screen.getByText('3/5 nodes executed').closest('button')!;
      fireEvent.click(entryButton);

      expect(screen.getByTestId('icon-ChevronDown')).toBeInTheDocument();
    });

    it('displays node labels for errors', () => {
      render(<ExecutionHistory {...baseProps} />);
      const entryButton = screen.getByText('3/5 nodes executed').closest('button')!;
      fireEvent.click(entryButton);

      expect(screen.getByText('Image Gen')).toBeInTheDocument();
      expect(screen.getByText('Save Node')).toBeInTheDocument();
    });

    it('collapses errors when clicked again', () => {
      render(<ExecutionHistory {...baseProps} />);
      const entryButton = screen.getByText('3/5 nodes executed').closest('button')!;

      fireEvent.click(entryButton);
      expect(screen.getByText('API timeout')).toBeInTheDocument();

      fireEvent.click(entryButton);
      expect(screen.queryByText('API timeout')).not.toBeInTheDocument();
    });

    it('does not show chevron for entry when no errors', () => {
      const recordNoErrors: ExecutionRecord = {
        id: 'exec1',
        timestamp: Date.now(),
        completedAt: Date.now(),
        duration: 5000,
        status: 'success',
        executedNodes: 5,
        totalNodes: 5,
        failedNodes: 0,
        errors: [],
      };

      (useWorkflowStore as any).mockReturnValue({
        executionHistory: [recordNoErrors],
        clearExecutionHistory: mockClearExecutionHistory,
      });

      render(<ExecutionHistory {...baseProps} />);
      // There should be a ChevronRight in the header for collapsing the panel
      // But not in the entry itself since there are no errors
      const chevronIcons = screen.getAllByTestId('icon-ChevronRight');
      // Should have exactly 1 for the collapse button in header
      expect(chevronIcons).toHaveLength(1);
    });
  });

  describe('clear history', () => {
    const mockRecords: ExecutionRecord[] = [
      {
        id: 'exec1',
        timestamp: Date.now(),
        completedAt: Date.now(),
        duration: 5000,
        status: 'success',
        executedNodes: 5,
        totalNodes: 5,
        failedNodes: 0,
        errors: [],
      },
    ];

    it('shows confirmation dialog when clear button is clicked', () => {
      (useWorkflowStore as any).mockReturnValue({
        executionHistory: mockRecords,
        clearExecutionHistory: mockClearExecutionHistory,
      });

      const confirmSpy = vi.fn(() => false);
      const originalConfirm = window.confirm;
      window.confirm = confirmSpy;

      render(<ExecutionHistory {...baseProps} />);
      const clearButton = screen.getByTestId('icon-Trash2').closest('button')!;
      fireEvent.click(clearButton);

      expect(confirmSpy).toHaveBeenCalledWith('Clear all execution history?');
      window.confirm = originalConfirm;
    });

    it('calls clearExecutionHistory when confirmed', () => {
      (useWorkflowStore as any).mockReturnValue({
        executionHistory: mockRecords,
        clearExecutionHistory: mockClearExecutionHistory,
      });

      const confirmSpy = vi.fn(() => true);
      const originalConfirm = window.confirm;
      window.confirm = confirmSpy;

      render(<ExecutionHistory {...baseProps} />);
      const clearButton = screen.getByTestId('icon-Trash2').closest('button')!;
      fireEvent.click(clearButton);

      expect(mockClearExecutionHistory).toHaveBeenCalled();
      window.confirm = originalConfirm;
    });

    it('does not clear history when cancelled', () => {
      (useWorkflowStore as any).mockReturnValue({
        executionHistory: mockRecords,
        clearExecutionHistory: mockClearExecutionHistory,
      });

      const confirmSpy = vi.fn(() => false);
      const originalConfirm = window.confirm;
      window.confirm = confirmSpy;

      render(<ExecutionHistory {...baseProps} />);
      const clearButton = screen.getByTestId('icon-Trash2').closest('button')!;
      fireEvent.click(clearButton);

      expect(mockClearExecutionHistory).not.toHaveBeenCalled();
      window.confirm = originalConfirm;
    });
  });

  describe('collapsed state', () => {
    it('shows collapsed view when collapse button is clicked', () => {
      (useWorkflowStore as any).mockReturnValue({
        executionHistory: [],
        clearExecutionHistory: mockClearExecutionHistory,
      });

      render(<ExecutionHistory {...baseProps} />);

      const chevrons = screen.getAllByTestId('icon-ChevronRight');
      const collapseButton = chevrons[0].closest('button')!;
      fireEvent.click(collapseButton);

      expect(screen.queryByText('Execution History')).not.toBeInTheDocument();
    });

    it('shows chevron left icon in collapsed view', () => {
      (useWorkflowStore as any).mockReturnValue({
        executionHistory: [],
        clearExecutionHistory: mockClearExecutionHistory,
      });

      render(<ExecutionHistory {...baseProps} />);

      const chevrons = screen.getAllByTestId('icon-ChevronRight');
      const collapseButton = chevrons[0].closest('button')!;
      fireEvent.click(collapseButton);

      expect(screen.getByTestId('icon-ChevronLeft')).toBeInTheDocument();
    });

    it('expands when chevron left is clicked', () => {
      (useWorkflowStore as any).mockReturnValue({
        executionHistory: [],
        clearExecutionHistory: mockClearExecutionHistory,
      });

      render(<ExecutionHistory {...baseProps} />);

      const chevrons = screen.getAllByTestId('icon-ChevronRight');
      const collapseButton = chevrons[0].closest('button')!;
      fireEvent.click(collapseButton);

      const expandButton = screen.getByTestId('icon-ChevronLeft').closest('button')!;
      fireEvent.click(expandButton);

      expect(screen.getByText('Execution History')).toBeInTheDocument();
    });

    it('does not show collapsed view for mobile overlay', () => {
      (useWorkflowStore as any).mockReturnValue({
        executionHistory: [],
        clearExecutionHistory: mockClearExecutionHistory,
      });

      render(<ExecutionHistory {...baseProps} isMobileOverlay={true} />);

      // Should not have collapse button on mobile overlay
      const chevrons = screen.queryAllByTestId('icon-ChevronRight');
      expect(chevrons).toHaveLength(0);

      // Should show the full panel
      expect(screen.getByText('Execution History')).toBeInTheDocument();
    });
  });

  describe('mobile overlay mode', () => {
    it('shows backdrop in mobile overlay mode', () => {
      (useWorkflowStore as any).mockReturnValue({
        executionHistory: [],
        clearExecutionHistory: mockClearExecutionHistory,
      });

      render(<ExecutionHistory {...baseProps} isMobileOverlay={true} />);

      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/50');
      expect(backdrop).toBeInTheDocument();
    });

    it('calls onToggle when backdrop is clicked', () => {
      const onToggle = vi.fn();
      (useWorkflowStore as any).mockReturnValue({
        executionHistory: [],
        clearExecutionHistory: mockClearExecutionHistory,
      });

      render(<ExecutionHistory {...baseProps} isMobileOverlay={true} onToggle={onToggle} />);

      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/50') as HTMLElement;
      fireEvent.click(backdrop);

      expect(onToggle).toHaveBeenCalled();
    });

    it('shows close button in mobile overlay mode', () => {
      (useWorkflowStore as any).mockReturnValue({
        executionHistory: [],
        clearExecutionHistory: mockClearExecutionHistory,
      });

      render(<ExecutionHistory {...baseProps} isMobileOverlay={true} />);

      expect(screen.getByTestId('icon-X')).toBeInTheDocument();
    });

    it('calls onToggle when close button is clicked', () => {
      const onToggle = vi.fn();
      (useWorkflowStore as any).mockReturnValue({
        executionHistory: [],
        clearExecutionHistory: mockClearExecutionHistory,
      });

      render(<ExecutionHistory {...baseProps} isMobileOverlay={true} onToggle={onToggle} />);

      const closeButton = screen.getByTestId('icon-X').closest('button')!;
      fireEvent.click(closeButton);

      expect(onToggle).toHaveBeenCalled();
    });

    it('does not show collapse button in mobile overlay mode', () => {
      (useWorkflowStore as any).mockReturnValue({
        executionHistory: [],
        clearExecutionHistory: mockClearExecutionHistory,
      });

      render(<ExecutionHistory {...baseProps} isMobileOverlay={true} />);

      // ChevronRight for collapse should not be visible in mobile overlay mode
      const chevronButtons = screen.queryAllByTestId('icon-ChevronRight');
      // Should be 0 (collapse functionality hidden on mobile)
      expect(chevronButtons).toHaveLength(0);
    });
  });

  describe('time formatting', () => {
    it('formats seconds as "just now"', () => {
      const recentRecord: ExecutionRecord = {
        id: 'exec1',
        timestamp: Date.now() - 30000, // 30 seconds ago
        completedAt: Date.now() - 30000,
        duration: 1000,
        status: 'success',
        executedNodes: 5,
        totalNodes: 5,
        failedNodes: 0,
        errors: [],
      };

      (useWorkflowStore as any).mockReturnValue({
        executionHistory: [recentRecord],
        clearExecutionHistory: mockClearExecutionHistory,
      });

      render(<ExecutionHistory {...baseProps} />);
      expect(screen.getByText('just now')).toBeInTheDocument();
    });

    it('formats hours correctly', () => {
      const hourRecord: ExecutionRecord = {
        id: 'exec1',
        timestamp: Date.now() - 7200000, // 2 hours ago
        completedAt: Date.now() - 7200000,
        duration: 1000,
        status: 'success',
        executedNodes: 5,
        totalNodes: 5,
        failedNodes: 0,
        errors: [],
      };

      (useWorkflowStore as any).mockReturnValue({
        executionHistory: [hourRecord],
        clearExecutionHistory: mockClearExecutionHistory,
      });

      render(<ExecutionHistory {...baseProps} />);
      expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    });

    it('formats days correctly', () => {
      const dayRecord: ExecutionRecord = {
        id: 'exec1',
        timestamp: Date.now() - 172800000, // 2 days ago
        completedAt: Date.now() - 172800000,
        duration: 1000,
        status: 'success',
        executedNodes: 5,
        totalNodes: 5,
        failedNodes: 0,
        errors: [],
      };

      (useWorkflowStore as any).mockReturnValue({
        executionHistory: [dayRecord],
        clearExecutionHistory: mockClearExecutionHistory,
      });

      render(<ExecutionHistory {...baseProps} />);
      expect(screen.getByText('2 days ago')).toBeInTheDocument();
    });
  });

  describe('duration formatting', () => {
    it('formats milliseconds', () => {
      const msRecord: ExecutionRecord = {
        id: 'exec1',
        timestamp: Date.now(),
        completedAt: Date.now(),
        duration: 500,
        status: 'success',
        executedNodes: 5,
        totalNodes: 5,
        failedNodes: 0,
        errors: [],
      };

      (useWorkflowStore as any).mockReturnValue({
        executionHistory: [msRecord],
        clearExecutionHistory: mockClearExecutionHistory,
      });

      render(<ExecutionHistory {...baseProps} />);
      expect(screen.getByText('500ms')).toBeInTheDocument();
    });

    it('formats seconds', () => {
      const secRecord: ExecutionRecord = {
        id: 'exec1',
        timestamp: Date.now(),
        completedAt: Date.now(),
        duration: 45000,
        status: 'success',
        executedNodes: 5,
        totalNodes: 5,
        failedNodes: 0,
        errors: [],
      };

      (useWorkflowStore as any).mockReturnValue({
        executionHistory: [secRecord],
        clearExecutionHistory: mockClearExecutionHistory,
      });

      render(<ExecutionHistory {...baseProps} />);
      expect(screen.getByText('45s')).toBeInTheDocument();
    });

    it('formats minutes and seconds', () => {
      const minRecord: ExecutionRecord = {
        id: 'exec1',
        timestamp: Date.now(),
        completedAt: Date.now(),
        duration: 125000, // 2m 5s
        status: 'success',
        executedNodes: 5,
        totalNodes: 5,
        failedNodes: 0,
        errors: [],
      };

      (useWorkflowStore as any).mockReturnValue({
        executionHistory: [minRecord],
        clearExecutionHistory: mockClearExecutionHistory,
      });

      render(<ExecutionHistory {...baseProps} />);
      expect(screen.getByText('2m 5s')).toBeInTheDocument();
    });
  });
});
