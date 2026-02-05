import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdditionalActions } from '../../../src/components/panels/toolbar/AdditionalActions';
import { useWorkflowStore } from '../../../src/stores/workflow';
import { toast } from '../../../src/components/ui/Toast';

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

describe('AdditionalActions', () => {
  const mockReset = vi.fn();
  const mockSetDemoMode = vi.fn();
  const mockOnToggleHistory = vi.fn();
  const mockOnTogglePresetLauncher = vi.fn();

  const createMockStore = (overrides = {}) => ({
    nodes: [
      { id: '1', type: 'input', position: { x: 0, y: 0 }, data: {} },
      { id: '2', type: 'output', position: { x: 100, y: 100 }, data: {} },
    ],
    nodeOutputs: {
      '1': { type: 'image', data: 'data:image/png;base64,iVBORw0KG' },
      '2': { type: 'image', data: 'data:image/png;base64,iVBORw0KG' },
    },
    reset: mockReset,
    demoMode: false,
    setDemoMode: mockSetDemoMode,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (useWorkflowStore as any).mockImplementation(() => createMockStore());

    // Mock window.confirm
    global.confirm = vi.fn(() => true);

    // Store the original createElement
    const originalCreateElement = document.createElement;

    // Mock document.createElement for download links
    const mockLink = {
      click: vi.fn(),
      href: '',
      download: '',
    };

    document.createElement = vi.fn((tagName: string) => {
      if (tagName === 'a') {
        return mockLink as any;
      }
      return originalCreateElement.call(document, tagName);
    });
  });

  it('renders without crashing', () => {
    render(<AdditionalActions />);

    expect(screen.getByTitle('Export all outputs')).toBeInTheDocument();
    expect(screen.getByTitle('Clear canvas')).toBeInTheDocument();
  });

  it('displays export outputs and clear buttons', () => {
    render(<AdditionalActions />);

    expect(screen.getByText('Export')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('exports outputs when export button is clicked', () => {
    render(<AdditionalActions />);

    const exportButton = screen.getByTitle('Export all outputs');
    fireEvent.click(exportButton);

    expect(toast.success).toHaveBeenCalledWith('Exported 2 output(s)');
  });

  it('shows info toast when exporting with no outputs', () => {
    (useWorkflowStore as any).mockImplementation(() =>
      createMockStore({ nodeOutputs: {} })
    );

    render(<AdditionalActions />);

    const exportButton = screen.getByTitle('Export all outputs');
    fireEvent.click(exportButton);

    expect(toast.info).toHaveBeenCalledWith('No outputs to export');
  });

  it('clears canvas when clear button is clicked and confirmed', () => {
    render(<AdditionalActions />);

    const clearButton = screen.getByTitle('Clear canvas');
    fireEvent.click(clearButton);

    expect(global.confirm).toHaveBeenCalledWith('Clear all nodes? This cannot be undone.');
    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Canvas cleared');
  });

  it('does not clear canvas when user cancels confirmation', () => {
    global.confirm = vi.fn(() => false);

    render(<AdditionalActions />);

    const clearButton = screen.getByTitle('Clear canvas');
    fireEvent.click(clearButton);

    expect(mockReset).not.toHaveBeenCalled();
  });

  it('shows info toast when clearing empty canvas', () => {
    (useWorkflowStore as any).mockImplementation(() =>
      createMockStore({ nodes: [] })
    );

    render(<AdditionalActions />);

    const clearButton = screen.getByTitle('Clear canvas');
    fireEvent.click(clearButton);

    expect(toast.info).toHaveBeenCalledWith('Canvas is already empty');
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('toggles demo mode when demo button is clicked', () => {
    render(<AdditionalActions />);

    const demoButton = screen.getByTitle('Enable Demo Mode (Offline)');
    fireEvent.click(demoButton);

    expect(mockSetDemoMode).toHaveBeenCalledWith(true);
  });

  it('shows correct styling when demo mode is active', () => {
    (useWorkflowStore as any).mockImplementation(() =>
      createMockStore({ demoMode: true })
    );

    render(<AdditionalActions />);

    expect(screen.getByText('DEMO MODE')).toBeInTheDocument();
    expect(screen.getByTitle('Disable Demo Mode')).toBeInTheDocument();
  });

  it('renders history toggle button when callback is provided', () => {
    render(
      <AdditionalActions
        onToggleHistory={mockOnToggleHistory}
        isHistoryVisible={false}
      />
    );

    expect(screen.getByTitle('Toggle execution history')).toBeInTheDocument();
  });

  it('does not render history toggle button when callback is not provided', () => {
    render(<AdditionalActions />);

    expect(screen.queryByTitle('Toggle execution history')).not.toBeInTheDocument();
  });

  it('calls onToggleHistory when history button is clicked', () => {
    render(
      <AdditionalActions
        onToggleHistory={mockOnToggleHistory}
        isHistoryVisible={false}
      />
    );

    const historyButton = screen.getByTitle('Toggle execution history');
    fireEvent.click(historyButton);

    expect(mockOnToggleHistory).toHaveBeenCalledTimes(1);
  });

  it('renders preset launcher toggle button when callback is provided', () => {
    render(
      <AdditionalActions
        onTogglePresetLauncher={mockOnTogglePresetLauncher}
        isPresetLauncherVisible={false}
      />
    );

    expect(screen.getByTitle('Toggle preset launcher')).toBeInTheDocument();
  });

  it('does not render preset launcher toggle button when callback is not provided', () => {
    render(<AdditionalActions />);

    expect(screen.queryByTitle('Toggle preset launcher')).not.toBeInTheDocument();
  });

  it('calls onTogglePresetLauncher when preset launcher button is clicked', () => {
    render(
      <AdditionalActions
        onTogglePresetLauncher={mockOnTogglePresetLauncher}
        isPresetLauncherVisible={false}
      />
    );

    const presetButton = screen.getByTitle('Toggle preset launcher');
    fireEvent.click(presetButton);

    expect(mockOnTogglePresetLauncher).toHaveBeenCalledTimes(1);
  });

  it('shows correct styling for active history button', () => {
    render(
      <AdditionalActions
        onToggleHistory={mockOnToggleHistory}
        isHistoryVisible={true}
      />
    );

    const historyButton = screen.getByTitle('Toggle execution history');
    expect(historyButton.className).toContain('bg-[var(--accent)]');
  });

  it('shows correct styling for active preset launcher button', () => {
    render(
      <AdditionalActions
        onTogglePresetLauncher={mockOnTogglePresetLauncher}
        isPresetLauncherVisible={true}
      />
    );

    const presetButton = screen.getByTitle('Toggle preset launcher');
    expect(presetButton.className).toContain('bg-[var(--accent)]');
  });

  it('displays keyboard shortcuts on hover', () => {
    render(<AdditionalActions />);

    expect(screen.getByText('Shortcuts')).toBeInTheDocument();
    expect(screen.getByTitle('Keyboard shortcuts')).toBeInTheDocument();
  });

  it('renders dividers between button groups', () => {
    render(
      <AdditionalActions
        onToggleHistory={mockOnToggleHistory}
        onTogglePresetLauncher={mockOnTogglePresetLauncher}
      />
    );

    const dividers = screen.getByTitle('Export all outputs').parentElement?.querySelectorAll('.w-px');
    expect(dividers).toBeTruthy();
  });
});
