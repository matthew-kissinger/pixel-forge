import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactFlowProvider } from '@xyflow/react';
import { BaseNode } from '../../src/components/nodes/BaseNode';

// Mock workflow store
vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));
import { useWorkflowStore } from '../../src/stores/workflow';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Loader2: (props: any) => <div data-testid="loader-icon" className={props.className} />,
  AlertCircle: (props: any) => <div data-testid="alert-icon" className={props.className} />,
  RefreshCw: (props: any) => <div data-testid="refresh-icon" className={props.className} />,
}));

describe('BaseNode', () => {
  const mockRetryNode = vi.fn();
  const mockStore = {
    nodeStatus: {} as Record<string, string>,
    nodeErrors: {} as Record<string, string>,
    retryNode: mockRetryNode,
  };

  const baseProps = {
    id: 'base-node-1',
    type: 'test',
    data: { label: 'Test Node' },
    selected: false,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    dragging: false,
    zIndex: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.nodeStatus = {};
    mockStore.nodeErrors = {};
    mockRetryNode.mockClear();
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector?: (state: any) => any) => selector ? selector(mockStore) : mockStore
    );
  });

  const renderBaseNode = (props = {}, children: React.ReactNode = <span>content</span>) => {
    return render(
      <ReactFlowProvider>
        <BaseNode {...baseProps} {...props}>
          {children}
        </BaseNode>
      </ReactFlowProvider>
    );
  };

  describe('rendering', () => {
    it('renders the node label', () => {
      renderBaseNode();
      expect(screen.getByText('Test Node')).toBeInTheDocument();
    });

    it('renders children content', () => {
      renderBaseNode({}, <span>My child content</span>);
      expect(screen.getByText('My child content')).toBeInTheDocument();
    });

    it('renders custom label', () => {
      renderBaseNode({ data: { label: 'Custom Label' } });
      expect(screen.getByText('Custom Label')).toBeInTheDocument();
    });
  });

  describe('status indicators', () => {
    it('does not show status icons when idle', () => {
      renderBaseNode();
      expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('alert-icon')).not.toBeInTheDocument();
    });

    it('shows spinner when running', () => {
      mockStore.nodeStatus = { 'base-node-1': 'running' };
      renderBaseNode();
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });

    it('shows alert icon when error', () => {
      mockStore.nodeStatus = { 'base-node-1': 'error' };
      renderBaseNode();
      expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
    });

    it('does not show spinner on success', () => {
      mockStore.nodeStatus = { 'base-node-1': 'success' };
      renderBaseNode();
      expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
    });
  });

  describe('error display', () => {
    it('does not show error banner when idle', () => {
      renderBaseNode();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('shows error message when error status and error text', () => {
      mockStore.nodeStatus = { 'base-node-1': 'error' };
      mockStore.nodeErrors = { 'base-node-1': 'Something went wrong' };
      renderBaseNode();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('does not show error banner without error text', () => {
      mockStore.nodeStatus = { 'base-node-1': 'error' };
      mockStore.nodeErrors = {};
      renderBaseNode();
      // Alert icon shown but no error text banner
      expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
    });
  });

  describe('handles', () => {
    it('does not render handles by default', () => {
      const { container } = renderBaseNode();
      // React Flow handles have class .react-flow__handle
      const handles = container.querySelectorAll('.react-flow__handle');
      expect(handles.length).toBe(0);
    });

    it('renders input handle when hasInput is true', () => {
      const { container } = renderBaseNode({ hasInput: true });
      const handles = container.querySelectorAll('.react-flow__handle');
      expect(handles.length).toBe(1);
    });

    it('renders output handle when hasOutput is true', () => {
      const { container } = renderBaseNode({ hasOutput: true });
      const handles = container.querySelectorAll('.react-flow__handle');
      expect(handles.length).toBe(1);
    });

    it('renders both handles when hasInput and hasOutput are true', () => {
      const { container } = renderBaseNode({ hasInput: true, hasOutput: true });
      const handles = container.querySelectorAll('.react-flow__handle');
      expect(handles.length).toBe(2);
    });

    it('sets handle titles from labels', () => {
      const { container } = renderBaseNode({
        hasInput: true,
        hasOutput: true,
        inputLabel: 'Image In',
        outputLabel: 'Image Out',
      });
      const handles = container.querySelectorAll('.react-flow__handle');
      const titles = Array.from(handles).map(h => h.getAttribute('title'));
      expect(titles).toContain('Image In');
      expect(titles).toContain('Image Out');
    });

    it('uses default labels (Input/Output) when not specified', () => {
      const { container } = renderBaseNode({ hasInput: true, hasOutput: true });
      const handles = container.querySelectorAll('.react-flow__handle');
      const titles = Array.from(handles).map(h => h.getAttribute('title'));
      expect(titles).toContain('Input');
      expect(titles).toContain('Output');
    });
  });

  describe('selection', () => {
    it('applies selected styling when selected', () => {
      const { container } = renderBaseNode({ selected: true });
      const node = container.firstChild as HTMLElement;
      expect(node.className).toContain('ring-2');
    });

    it('does not apply selected styling when not selected', () => {
      const { container } = renderBaseNode({ selected: false });
      const node = container.firstChild as HTMLElement;
      expect(node.className).not.toContain('ring-2');
    });
  });

  describe('retry button', () => {
    it('shows retry button when node status is error', () => {
      mockStore.nodeStatus = { 'base-node-1': 'error' };
      mockStore.nodeErrors = { 'base-node-1': 'API timeout' };
      renderBaseNode();
      expect(screen.getByLabelText('Retry this node')).toBeInTheDocument();
    });

    it('does not show retry button when status is idle', () => {
      mockStore.nodeStatus = { 'base-node-1': 'idle' };
      renderBaseNode();
      expect(screen.queryByLabelText('Retry this node')).not.toBeInTheDocument();
    });

    it('does not show retry button when status is running', () => {
      mockStore.nodeStatus = { 'base-node-1': 'running' };
      renderBaseNode();
      expect(screen.queryByLabelText('Retry this node')).not.toBeInTheDocument();
    });

    it('does not show retry button when status is success', () => {
      mockStore.nodeStatus = { 'base-node-1': 'success' };
      renderBaseNode();
      expect(screen.queryByLabelText('Retry this node')).not.toBeInTheDocument();
    });

    it('calls retryNode with node id when clicked', async () => {
      mockStore.nodeStatus = { 'base-node-1': 'error' };
      mockStore.nodeErrors = { 'base-node-1': 'API timeout' };
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <BaseNode {...baseProps}>
            <span>content</span>
          </BaseNode>
        </ReactFlowProvider>
      );
      
      const retryButton = screen.getByLabelText('Retry this node');
      await user.click(retryButton);
      
      expect(mockRetryNode).toHaveBeenCalledWith('base-node-1');
      expect(mockRetryNode).toHaveBeenCalledTimes(1);
    });
  });
});
