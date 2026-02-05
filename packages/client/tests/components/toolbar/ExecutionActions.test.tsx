import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExecutionActions } from '../../../src/components/panels/toolbar/ExecutionActions';
import { useWorkflowStore } from '../../../src/stores/workflow';
import { toast } from '../../../src/components/ui/Toast';
import { executeWorkflow } from '../../../src/lib/executor';
import { validateWorkflow } from '../../../src/lib/validate';

// Mock the workflow store
vi.mock('../../../src/stores/workflow', () => {
  return {
    useWorkflowStore: vi.fn(() => ({
      nodes: [],
      edges: [],
      isExecuting: false,
      executionProgress: { current: 0, total: 0 },
      setExecuting: vi.fn(),
      setExecutionProgress: vi.fn(),
      setExecutionCancelled: vi.fn(),
      getState: vi.fn(() => ({
        setNodeError: vi.fn(),
        executionCancelled: false,
      })),
    })),
  };
});

// Add getState as a static method to the mocked useWorkflowStore
(useWorkflowStore as any).getState = vi.fn(() => ({
  setNodeError: vi.fn(),
  executionCancelled: false,
}));

// Mock the toast utility
vi.mock('../../../src/components/ui/Toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock the executor
vi.mock('../../../src/lib/executor', () => ({
  executeWorkflow: vi.fn().mockResolvedValue({
    executed: 5,
    total: 5,
    errors: [],
  }),
}));

// Mock the validator
vi.mock('../../../src/lib/validate', () => ({
  validateWorkflow: vi.fn().mockReturnValue({
    valid: true,
    errors: [],
    warnings: [],
  }),
}));

describe('ExecutionActions', () => {
  const mockSetExecuting = vi.fn();
  const mockSetExecutionProgress = vi.fn();
  const mockSetExecutionCancelled = vi.fn();
  const mockSetNodeError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    const createMockStore = (overrides = {}) => ({
      nodes: [
        { id: '1', type: 'input', position: { x: 0, y: 0 }, data: {} },
        { id: '2', type: 'output', position: { x: 100, y: 100 }, data: {} },
      ],
      edges: [],
      isExecuting: false,
      executionProgress: { current: 0, total: 0 },
      setExecuting: mockSetExecuting,
      setExecutionProgress: mockSetExecutionProgress,
      setExecutionCancelled: mockSetExecutionCancelled,
      getState: vi.fn(() => ({
        setNodeError: mockSetNodeError,
        executionCancelled: false,
      })),
      ...overrides,
    });

    (useWorkflowStore as any).mockImplementation(() => createMockStore());
    (useWorkflowStore as any).getState = vi.fn(() => ({
      setNodeError: mockSetNodeError,
      executionCancelled: false,
    }));
  });

  it('renders without crashing', () => {
    render(<ExecutionActions />);

    expect(screen.getByTitle('Validate workflow')).toBeInTheDocument();
    expect(screen.getByTitle('Execute all nodes')).toBeInTheDocument();
  });

  it('displays validate and execute buttons', () => {
    render(<ExecutionActions />);

    expect(screen.getByText('Validate')).toBeInTheDocument();
    expect(screen.getByText('Execute')).toBeInTheDocument();
  });

  it('calls validateWorkflow when validate button is clicked', () => {
    render(<ExecutionActions />);

    const validateButton = screen.getByTitle('Validate workflow');
    fireEvent.click(validateButton);

    expect(validateWorkflow).toHaveBeenCalled();
  });

  it('shows success toast when validation passes', () => {
    render(<ExecutionActions />);

    const validateButton = screen.getByTitle('Validate workflow');
    fireEvent.click(validateButton);

    expect(toast.success).toHaveBeenCalledWith('Validation passed - workflow is ready to execute');
  });

  it('shows error toast when validation fails', () => {
    (validateWorkflow as any).mockReturnValue({
      valid: false,
      errors: [{ nodeId: '1', message: 'Missing input' }],
      warnings: [],
    });

    render(<ExecutionActions />);

    const validateButton = screen.getByTitle('Validate workflow');
    fireEvent.click(validateButton);

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Validation failed')
    );
  });

  it('cancels execution when execute button is clicked during execution', () => {
    (useWorkflowStore as any).mockImplementation(() => ({
      nodes: [
        { id: '1', type: 'input', position: { x: 0, y: 0 }, data: {} },
        { id: '2', type: 'output', position: { x: 100, y: 100 }, data: {} },
      ],
      edges: [],
      isExecuting: true,
      executionProgress: { current: 0, total: 0 },
      setExecuting: mockSetExecuting,
      setExecutionProgress: mockSetExecutionProgress,
      setExecutionCancelled: mockSetExecutionCancelled,
      getState: vi.fn(() => ({
        setNodeError: mockSetNodeError,
        executionCancelled: false,
      })),
    }));

    render(<ExecutionActions />);

    const stopButton = screen.getByTitle('Stop execution');
    fireEvent.click(stopButton);

    expect(mockSetExecutionCancelled).toHaveBeenCalledWith(true);
    expect(mockSetExecuting).toHaveBeenCalledWith(false);
  });

  it('disables buttons when there are no nodes', () => {
    (useWorkflowStore as any).mockImplementation(() => ({
      nodes: [],
      edges: [],
      isExecuting: false,
      executionProgress: { current: 0, total: 0 },
      setExecuting: mockSetExecuting,
      setExecutionProgress: mockSetExecutionProgress,
      setExecutionCancelled: mockSetExecutionCancelled,
      getState: vi.fn(() => ({
        setNodeError: mockSetNodeError,
        executionCancelled: false,
      })),
    }));

    render(<ExecutionActions />);

    const validateButton = screen.getByTitle('Validate workflow');
    const executeButton = screen.getByTitle('Execute all nodes');

    expect(validateButton).toBeDisabled();
    expect(executeButton).toBeDisabled();
  });

  it('shows progress indicator during execution', () => {
    (useWorkflowStore as any).mockImplementation(() => ({
      nodes: [
        { id: '1', type: 'input', position: { x: 0, y: 0 }, data: {} },
        { id: '2', type: 'output', position: { x: 100, y: 100 }, data: {} },
      ],
      edges: [],
      isExecuting: true,
      executionProgress: { current: 3, total: 5 },
      setExecuting: mockSetExecuting,
      setExecutionProgress: mockSetExecutionProgress,
      setExecutionCancelled: mockSetExecutionCancelled,
      getState: vi.fn(() => ({
        setNodeError: mockSetNodeError,
        executionCancelled: false,
      })),
    }));

    render(<ExecutionActions />);

    expect(screen.getByText('3/5')).toBeInTheDocument();
  });

  it('changes button appearance when executing', () => {
    (useWorkflowStore as any).mockImplementation(() => ({
      nodes: [
        { id: '1', type: 'input', position: { x: 0, y: 0 }, data: {} },
        { id: '2', type: 'output', position: { x: 100, y: 100 }, data: {} },
      ],
      edges: [],
      isExecuting: true,
      executionProgress: { current: 0, total: 0 },
      setExecuting: mockSetExecuting,
      setExecutionProgress: mockSetExecutionProgress,
      setExecutionCancelled: mockSetExecutionCancelled,
      getState: vi.fn(() => ({
        setNodeError: mockSetNodeError,
        executionCancelled: false,
      })),
    }));

    render(<ExecutionActions />);

    expect(screen.getByText('Stop')).toBeInTheDocument();
    expect(screen.getByTitle('Stop execution')).toBeInTheDocument();
  });

  it('listens to workflow:execute event', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    render(<ExecutionActions />);

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'workflow:execute',
      expect.any(Function)
    );
  });
});
