import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QualityCheckNode } from '../../src/components/nodes/QualityCheckNode';
import { useWorkflowStore } from '../../src/stores/workflow';

vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

vi.mock('@pixel-forge/shared/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => (props: any) => <div data-testid={`icon-${String(name)}`} />,
}));

vi.mock('../../src/components/nodes/BaseNode', () => ({
  BaseNode: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock the quality sub-components
vi.mock('../../src/components/nodes/quality/QualityActions', () => ({
  QualityActions: ({ status, showSettings, callbacks }: any) => (
    <div data-testid="quality-actions">
      <span data-testid="quality-status">{status}</span>
      <button data-testid="validate-btn" onClick={callbacks.onValidate}>
        {status === 'running' ? 'Validating...' : 'Validate'}
      </button>
      <button data-testid="toggle-settings-btn" onClick={callbacks.onToggleSettings}>
        Settings
      </button>
    </div>
  ),
}));

vi.mock('../../src/components/nodes/quality/ValidationSettings', () => ({
  ValidationSettings: ({ data, callbacks }: any) => (
    <div data-testid="validation-settings">
      <input
        data-testid="max-file-size-input"
        type="number"
        value={data.maxFileSize ?? 51200}
        onChange={(e: any) => callbacks.onMaxFileSizeChange(parseInt(e.target.value))}
      />
      <input
        data-testid="power-of-2-checkbox"
        type="checkbox"
        checked={data.requirePowerOf2 ?? true}
        onChange={() => callbacks.onRequirePowerOf2Change(!(data.requirePowerOf2 ?? true))}
      />
      <input
        data-testid="transparency-checkbox"
        type="checkbox"
        checked={data.requireTransparency ?? false}
        onChange={() => callbacks.onRequireTransparencyChange(!(data.requireTransparency ?? false))}
      />
    </div>
  ),
}));

vi.mock('../../src/components/nodes/quality/ValidationResults', () => ({
  ValidationResults: ({ result }: any) => (
    <div data-testid="validation-results">
      <span>{result.passed ? 'All checks passed' : 'Validation failed'}</span>
    </div>
  ),
}));

vi.mock('../../src/components/nodes/quality/validation', () => ({
  validateImage: vi.fn(),
}));

// Need to import validateImage after mock
import { validateImage } from '../../src/components/nodes/quality/validation';

describe('QualityCheckNode', () => {
  const mockGetInputsForNode = vi.fn();
  const mockSetNodeOutput = vi.fn();
  const mockSetNodeStatus = vi.fn();
  const mockUpdateNodeData = vi.fn();

  const baseProps = {
    id: 'test-quality-node',
    type: 'qualityCheck',
    data: {
      label: 'Quality Check',
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
      setNodeOutput: mockSetNodeOutput,
      setNodeStatus: mockSetNodeStatus,
      updateNodeData: mockUpdateNodeData,
      nodeStatus: {},
    });
    mockGetInputsForNode.mockReturnValue([]);
  });

  describe('rendering', () => {
    it('renders with default props', () => {
      render(<QualityCheckNode {...baseProps} />);

      expect(screen.getByTestId('quality-actions')).toBeInTheDocument();
    });

    it('shows Validate button', () => {
      render(<QualityCheckNode {...baseProps} />);

      expect(screen.getByText('Validate')).toBeInTheDocument();
    });

    it('shows Settings toggle button', () => {
      render(<QualityCheckNode {...baseProps} />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('does not show settings panel by default', () => {
      render(<QualityCheckNode {...baseProps} />);

      expect(screen.queryByTestId('validation-settings')).not.toBeInTheDocument();
    });

    it('does not show results by default', () => {
      render(<QualityCheckNode {...baseProps} />);

      expect(screen.queryByTestId('validation-results')).not.toBeInTheDocument();
    });
  });

  describe('settings panel toggle', () => {
    it('shows settings panel when toggle is clicked', () => {
      render(<QualityCheckNode {...baseProps} />);

      fireEvent.click(screen.getByTestId('toggle-settings-btn'));

      expect(screen.getByTestId('validation-settings')).toBeInTheDocument();
    });

    it('hides settings panel when toggle is clicked again', () => {
      render(<QualityCheckNode {...baseProps} />);

      fireEvent.click(screen.getByTestId('toggle-settings-btn'));
      expect(screen.getByTestId('validation-settings')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('toggle-settings-btn'));
      expect(screen.queryByTestId('validation-settings')).not.toBeInTheDocument();
    });
  });

  describe('validation callbacks', () => {
    it('updates maxFileSize via callback', () => {
      render(<QualityCheckNode {...baseProps} />);

      // Open settings first
      fireEvent.click(screen.getByTestId('toggle-settings-btn'));

      const input = screen.getByTestId('max-file-size-input');
      fireEvent.change(input, { target: { value: '102400' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-quality-node', {
        maxFileSize: 102400,
      });
    });

    it('updates requirePowerOf2 via callback', () => {
      render(<QualityCheckNode {...baseProps} />);

      fireEvent.click(screen.getByTestId('toggle-settings-btn'));

      const checkbox = screen.getByTestId('power-of-2-checkbox');
      fireEvent.click(checkbox);

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-quality-node', {
        requirePowerOf2: false,
      });
    });

    it('updates requireTransparency via callback', () => {
      render(<QualityCheckNode {...baseProps} />);

      fireEvent.click(screen.getByTestId('toggle-settings-btn'));

      const checkbox = screen.getByTestId('transparency-checkbox');
      fireEvent.click(checkbox);

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-quality-node', {
        requireTransparency: true,
      });
    });
  });

  describe('validate action', () => {
    it('sets error status when no image input', async () => {
      mockGetInputsForNode.mockReturnValue([]);

      render(<QualityCheckNode {...baseProps} />);

      fireEvent.click(screen.getByTestId('validate-btn'));

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-quality-node', 'error');
      });
    });

    it('sets running status when validation starts', async () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,test' },
      ]);
      (validateImage as any).mockResolvedValue({
        passed: true,
        checks: {
          dimensionRange: { passed: true, message: 'OK' },
          powerOf2: { passed: true, message: 'OK' },
          fileSize: { passed: true, message: 'OK' },
          format: { passed: true, message: 'OK' },
          transparency: { passed: true, message: 'OK' },
        },
      });

      render(<QualityCheckNode {...baseProps} />);

      fireEvent.click(screen.getByTestId('validate-btn'));

      expect(mockSetNodeStatus).toHaveBeenCalledWith('test-quality-node', 'running');
    });

    it('sets success and passes image through on passing validation', async () => {
      const imageData = 'data:image/png;base64,test';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageData }]);
      (validateImage as any).mockResolvedValue({
        passed: true,
        checks: {
          dimensionRange: { passed: true, message: 'OK' },
          powerOf2: { passed: true, message: 'OK' },
          fileSize: { passed: true, message: 'OK' },
          format: { passed: true, message: 'OK' },
          transparency: { passed: true, message: 'OK' },
        },
      });

      render(<QualityCheckNode {...baseProps} />);

      fireEvent.click(screen.getByTestId('validate-btn'));

      await waitFor(() => {
        expect(mockSetNodeOutput).toHaveBeenCalledWith('test-quality-node', {
          type: 'image',
          data: imageData,
          timestamp: expect.any(Number),
        });
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-quality-node', 'success');
      });
    });

    it('shows validation results after validation', async () => {
      const imageData = 'data:image/png;base64,test';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageData }]);
      (validateImage as any).mockResolvedValue({
        passed: true,
        checks: {
          dimensionRange: { passed: true, message: 'OK' },
          powerOf2: { passed: true, message: 'OK' },
          fileSize: { passed: true, message: 'OK' },
          format: { passed: true, message: 'OK' },
          transparency: { passed: true, message: 'OK' },
        },
      });

      render(<QualityCheckNode {...baseProps} />);

      fireEvent.click(screen.getByTestId('validate-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('validation-results')).toBeInTheDocument();
        expect(screen.getByText('All checks passed')).toBeInTheDocument();
      });
    });

    it('sets error status on failing validation', async () => {
      const imageData = 'data:image/png;base64,test';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageData }]);
      (validateImage as any).mockResolvedValue({
        passed: false,
        checks: {
          dimensionRange: { passed: true, message: 'OK' },
          powerOf2: { passed: false, message: 'Not power of 2' },
          fileSize: { passed: true, message: 'OK' },
          format: { passed: true, message: 'OK' },
          transparency: { passed: true, message: 'OK' },
        },
      });

      render(<QualityCheckNode {...baseProps} />);

      fireEvent.click(screen.getByTestId('validate-btn'));

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-quality-node', 'error');
      });
    });

    it('sets error status when validateImage throws', async () => {
      const imageData = 'data:image/png;base64,test';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageData }]);
      (validateImage as any).mockRejectedValue(new Error('Canvas error'));

      render(<QualityCheckNode {...baseProps} />);

      fireEvent.click(screen.getByTestId('validate-btn'));

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-quality-node', 'error');
      });
    });
  });

  describe('default config values', () => {
    it('uses default maxFileSize of 51200', async () => {
      const imageData = 'data:image/png;base64,test';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageData }]);
      (validateImage as any).mockResolvedValue({
        passed: true,
        checks: {
          dimensionRange: { passed: true, message: 'OK' },
          powerOf2: { passed: true, message: 'OK' },
          fileSize: { passed: true, message: 'OK' },
          format: { passed: true, message: 'OK' },
          transparency: { passed: true, message: 'OK' },
        },
      });

      render(<QualityCheckNode {...baseProps} />);

      fireEvent.click(screen.getByTestId('validate-btn'));

      await waitFor(() => {
        expect(validateImage).toHaveBeenCalledWith(imageData, expect.objectContaining({
          maxFileSize: 51200,
          requirePowerOf2: true,
          requireTransparency: false,
          minWidth: 0,
          maxWidth: 4096,
          minHeight: 0,
          maxHeight: 4096,
        }));
      });
    });

    it('passes custom config values when set', async () => {
      const imageData = 'data:image/png;base64,test';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageData }]);
      (validateImage as any).mockResolvedValue({
        passed: true,
        checks: {
          dimensionRange: { passed: true, message: 'OK' },
          powerOf2: { passed: true, message: 'OK' },
          fileSize: { passed: true, message: 'OK' },
          format: { passed: true, message: 'OK' },
          transparency: { passed: true, message: 'OK' },
        },
      });

      const customProps = {
        ...baseProps,
        data: {
          ...baseProps.data,
          maxFileSize: 102400,
          requirePowerOf2: false,
          requireTransparency: true,
          minWidth: 32,
          maxWidth: 2048,
          minHeight: 32,
          maxHeight: 2048,
          allowedFormats: ['png'],
        },
      };

      render(<QualityCheckNode {...customProps} />);

      fireEvent.click(screen.getByTestId('validate-btn'));

      await waitFor(() => {
        expect(validateImage).toHaveBeenCalledWith(imageData, expect.objectContaining({
          maxFileSize: 102400,
          requirePowerOf2: false,
          requireTransparency: true,
          minWidth: 32,
          maxWidth: 2048,
          minHeight: 32,
          maxHeight: 2048,
          allowedFormats: ['png'],
        }));
      });
    });
  });
});
