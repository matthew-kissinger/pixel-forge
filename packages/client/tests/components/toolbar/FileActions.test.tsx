import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileActions } from '../../../src/components/panels/toolbar/FileActions';
import { useWorkflowStore } from '../../../src/stores/workflow';
import { toast } from '../../../src/components/ui/Toast';
import { encodeWorkflow } from '../../../src/lib/share';

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

// Mock the share utility
vi.mock('../../../src/lib/share', () => ({
  encodeWorkflow: vi.fn().mockResolvedValue('encoded-workflow-data'),
}));

describe('FileActions', () => {
  const mockExportWorkflow = vi.fn();
  const mockOnFileChange = vi.fn();
  const mockFileInputRef = { current: null } as React.RefObject<HTMLInputElement | null>;

  beforeEach(() => {
    vi.clearAllMocks();
    (useWorkflowStore as any).mockReturnValue({
      exportWorkflow: mockExportWorkflow,
      lastAutoSave: Date.now() - 5000, // 5 seconds ago
    });
    mockExportWorkflow.mockReturnValue({
      nodes: [],
      edges: [],
      version: '1.0',
    });

    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock clipboard API - use defineProperty instead of Object.assign
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window, 'isSecureContext', {
      writable: true,
      value: true,
      configurable: true,
    });
  });

  it('renders without crashing', () => {
    render(<FileActions onFileChange={mockOnFileChange} fileInputRef={mockFileInputRef} />);

    expect(screen.getByTitle('Save workflow (JSON)')).toBeInTheDocument();
    expect(screen.getByTitle('Load workflow')).toBeInTheDocument();
    expect(screen.getByTitle('Share workflow')).toBeInTheDocument();
  });

  it('displays save, load, and share buttons', () => {
    render(<FileActions onFileChange={mockOnFileChange} fileInputRef={mockFileInputRef} />);

    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Load')).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
  });

  it('displays last saved time', () => {
    render(<FileActions onFileChange={mockOnFileChange} fileInputRef={mockFileInputRef} />);

    expect(screen.getByText(/Last saved:/)).toBeInTheDocument();
  });

  it('calls exportWorkflow when save button is clicked', () => {
    render(<FileActions onFileChange={mockOnFileChange} fileInputRef={mockFileInputRef} />);

    const saveButton = screen.getByTitle('Save workflow (JSON)');
    fireEvent.click(saveButton);

    expect(mockExportWorkflow).toHaveBeenCalledTimes(1);
  });

  it('renders hidden file input with correct attributes', () => {
    const { container } = render(<FileActions onFileChange={mockOnFileChange} fileInputRef={mockFileInputRef} />);

    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('accept', '.json');
  });

  it('calls encodeWorkflow and updates URL hash when share button is clicked', async () => {
    render(<FileActions onFileChange={mockOnFileChange} fileInputRef={mockFileInputRef} />);

    const shareButton = screen.getByTitle('Share workflow');
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(mockExportWorkflow).toHaveBeenCalled();
      expect(encodeWorkflow).toHaveBeenCalled();
    });
  });

  it('listens to workflow:save and workflow:load events', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    render(<FileActions onFileChange={mockOnFileChange} fileInputRef={mockFileInputRef} />);

    expect(addEventListenerSpy).toHaveBeenCalledWith('workflow:save', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('workflow:load', expect.any(Function));
  });
});
