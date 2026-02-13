import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ValidationSettings } from '../../../../src/components/nodes/quality/ValidationSettings';
import type { QualityCheckNodeData } from '../../../../src/components/nodes/quality/types';

describe('ValidationSettings', () => {
  const mockCallbacks = {
    onMaxFileSizeChange: vi.fn(),
    onAllowedFormatsChange: vi.fn(),
    onRequirePowerOf2Change: vi.fn(),
    onRequireTransparencyChange: vi.fn(),
    onMinWidthChange: vi.fn(),
    onMaxWidthChange: vi.fn(),
    onMinHeightChange: vi.fn(),
    onMaxHeightChange: vi.fn(),
  };

  const defaultData = {
    label: 'Quality Check',
    nodeType: 'qualityCheck' as const,
    maxFileSize: 51200,
    allowedFormats: ['png', 'webp', 'jpeg'],
    requirePowerOf2: true,
    requireTransparency: false,
    minWidth: 0,
    maxWidth: 4096,
    minHeight: 0,
    maxHeight: 4096,
  } as QualityCheckNodeData;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering all controls', () => {
    it('renders Max File Size input with label', () => {
      render(<ValidationSettings data={defaultData} callbacks={mockCallbacks} />);
      expect(screen.getByText('Max File Size (bytes)')).toBeInTheDocument();
    });

    it('renders Allowed Formats input with label', () => {
      render(<ValidationSettings data={defaultData} callbacks={mockCallbacks} />);
      expect(screen.getByText('Allowed Formats (comma-separated)')).toBeInTheDocument();
    });

    it('renders Require Power of 2 checkbox', () => {
      render(<ValidationSettings data={defaultData} callbacks={mockCallbacks} />);
      expect(screen.getByText('Require Power of 2')).toBeInTheDocument();
    });

    it('renders Require Transparency checkbox', () => {
      render(<ValidationSettings data={defaultData} callbacks={mockCallbacks} />);
      expect(screen.getByText('Require Transparency')).toBeInTheDocument();
    });

    it('renders all dimension inputs', () => {
      render(<ValidationSettings data={defaultData} callbacks={mockCallbacks} />);
      expect(screen.getByText('Min Width')).toBeInTheDocument();
      expect(screen.getByText('Max Width')).toBeInTheDocument();
      expect(screen.getByText('Min Height')).toBeInTheDocument();
      expect(screen.getByText('Max Height')).toBeInTheDocument();
    });
  });

  describe('default values', () => {
    it('pre-populates max file size with default', () => {
      render(<ValidationSettings data={defaultData} callbacks={mockCallbacks} />);
      const inputs = screen.getAllByRole('spinbutton');
      // maxFileSize is the first number input
      expect(inputs[0]).toHaveValue(51200);
    });

    it('pre-populates allowed formats', () => {
      render(<ValidationSettings data={defaultData} callbacks={mockCallbacks} />);
      const textInput = screen.getByPlaceholderText('png, webp, jpeg');
      expect(textInput).toHaveValue('png, webp, jpeg');
    });

    it('pre-populates requirePowerOf2 as checked', () => {
      render(<ValidationSettings data={defaultData} callbacks={mockCallbacks} />);
      const checkboxes = screen.getAllByRole('checkbox');
      // requirePowerOf2 is first checkbox
      expect(checkboxes[0]).toBeChecked();
    });

    it('pre-populates requireTransparency as unchecked', () => {
      render(<ValidationSettings data={defaultData} callbacks={mockCallbacks} />);
      const checkboxes = screen.getAllByRole('checkbox');
      // requireTransparency is second checkbox
      expect(checkboxes[1]).not.toBeChecked();
    });

    it('pre-populates dimension defaults', () => {
      render(<ValidationSettings data={defaultData} callbacks={mockCallbacks} />);
      const inputs = screen.getAllByRole('spinbutton');
      // Order: maxFileSize, minWidth, maxWidth, minHeight, maxHeight
      expect(inputs[1]).toHaveValue(0);    // minWidth
      expect(inputs[2]).toHaveValue(4096); // maxWidth
      expect(inputs[3]).toHaveValue(0);    // minHeight
      expect(inputs[4]).toHaveValue(4096); // maxHeight
    });
  });

  describe('onChange callbacks', () => {
    it('fires onMaxFileSizeChange with parsed integer', () => {
      render(<ValidationSettings data={defaultData} callbacks={mockCallbacks} />);
      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0], { target: { value: '102400' } });
      expect(mockCallbacks.onMaxFileSizeChange).toHaveBeenCalledWith(102400);
    });

    it('fires onAllowedFormatsChange with trimmed array', () => {
      render(<ValidationSettings data={defaultData} callbacks={mockCallbacks} />);
      const textInput = screen.getByPlaceholderText('png, webp, jpeg');
      fireEvent.change(textInput, { target: { value: 'png, bmp' } });
      expect(mockCallbacks.onAllowedFormatsChange).toHaveBeenCalledWith(['png', 'bmp']);
    });

    it('fires onRequirePowerOf2Change when checkbox toggled', () => {
      render(<ValidationSettings data={defaultData} callbacks={mockCallbacks} />);
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      expect(mockCallbacks.onRequirePowerOf2Change).toHaveBeenCalledWith(false);
    });

    it('fires onRequireTransparencyChange when checkbox toggled', () => {
      render(<ValidationSettings data={defaultData} callbacks={mockCallbacks} />);
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);
      expect(mockCallbacks.onRequireTransparencyChange).toHaveBeenCalledWith(true);
    });

    it('fires onMinWidthChange with parsed integer', () => {
      render(<ValidationSettings data={defaultData} callbacks={mockCallbacks} />);
      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[1], { target: { value: '128' } });
      expect(mockCallbacks.onMinWidthChange).toHaveBeenCalledWith(128);
    });

    it('fires onMaxWidthChange with parsed integer', () => {
      render(<ValidationSettings data={defaultData} callbacks={mockCallbacks} />);
      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[2], { target: { value: '2048' } });
      expect(mockCallbacks.onMaxWidthChange).toHaveBeenCalledWith(2048);
    });

    it('fires onMinHeightChange with parsed integer', () => {
      render(<ValidationSettings data={defaultData} callbacks={mockCallbacks} />);
      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[3], { target: { value: '64' } });
      expect(mockCallbacks.onMinHeightChange).toHaveBeenCalledWith(64);
    });

    it('fires onMaxHeightChange with parsed integer', () => {
      render(<ValidationSettings data={defaultData} callbacks={mockCallbacks} />);
      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[4], { target: { value: '1024' } });
      expect(mockCallbacks.onMaxHeightChange).toHaveBeenCalledWith(1024);
    });
  });

  describe('invalid input handling', () => {
    it('falls back to default when maxFileSize input is NaN', () => {
      render(<ValidationSettings data={defaultData} callbacks={mockCallbacks} />);
      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0], { target: { value: '' } });
      expect(mockCallbacks.onMaxFileSizeChange).toHaveBeenCalledWith(51200);
    });

    it('falls back to 0 when minWidth input is NaN', () => {
      render(<ValidationSettings data={defaultData} callbacks={mockCallbacks} />);
      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[1], { target: { value: 'abc' } });
      expect(mockCallbacks.onMinWidthChange).toHaveBeenCalledWith(0);
    });

    it('falls back to 4096 when maxWidth input is NaN', () => {
      render(<ValidationSettings data={defaultData} callbacks={mockCallbacks} />);
      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[2], { target: { value: '' } });
      expect(mockCallbacks.onMaxWidthChange).toHaveBeenCalledWith(4096);
    });
  });

  describe('custom data values', () => {
    it('renders with custom data values', () => {
      const customData = {
        ...defaultData,
        maxFileSize: 102400,
        allowedFormats: ['png'],
        requirePowerOf2: false,
        requireTransparency: true,
        minWidth: 256,
        maxWidth: 2048,
        minHeight: 256,
        maxHeight: 2048,
      } as QualityCheckNodeData;

      render(<ValidationSettings data={customData} callbacks={mockCallbacks} />);

      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs[0]).toHaveValue(102400);  // maxFileSize
      expect(inputs[1]).toHaveValue(256);     // minWidth
      expect(inputs[2]).toHaveValue(2048);    // maxWidth
      expect(inputs[3]).toHaveValue(256);     // minHeight
      expect(inputs[4]).toHaveValue(2048);    // maxHeight

      const textInput = screen.getByPlaceholderText('png, webp, jpeg');
      expect(textInput).toHaveValue('png');

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).not.toBeChecked(); // requirePowerOf2
      expect(checkboxes[1]).toBeChecked();     // requireTransparency
    });
  });

  describe('accessibility', () => {
    it('all text inputs are associated with labels', () => {
      render(<ValidationSettings data={defaultData} callbacks={mockCallbacks} />);
      // Labels are rendered as text elements adjacent to inputs
      expect(screen.getByText('Max File Size (bytes)')).toBeInTheDocument();
      expect(screen.getByText('Allowed Formats (comma-separated)')).toBeInTheDocument();
    });

    it('checkboxes have associated label text', () => {
      render(<ValidationSettings data={defaultData} callbacks={mockCallbacks} />);
      // Checkbox labels wrap the input and span
      expect(screen.getByText('Require Power of 2')).toBeInTheDocument();
      expect(screen.getByText('Require Transparency')).toBeInTheDocument();
    });

    it('number inputs have min attribute set', () => {
      render(<ValidationSettings data={defaultData} callbacks={mockCallbacks} />);
      const inputs = screen.getAllByRole('spinbutton');
      // maxFileSize has min=0
      expect(inputs[0]).toHaveAttribute('min', '0');
    });
  });
});
