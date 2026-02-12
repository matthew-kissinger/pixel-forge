import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KilnCodeEditor } from '../../../../src/components/nodes/kiln/KilnCodeEditor';
import type { KilnGenNodeData, KilnGenNodeCallbacks } from '../../../../src/components/nodes/kiln/types';

describe('KilnCodeEditor', () => {
  const mockData: KilnGenNodeData = {
    nodeType: 'kilnGen',
    label: 'Kiln Gen',
    prompt: 'test prompt',
    mode: 'glb',
    category: 'prop',
    includeAnimation: true,
    code: 'const test = "code";',
    effectCode: null,
    glbUrl: null,
    triangleCount: 0,
    errors: [],
  };

  const mockCallbacks: Partial<KilnGenNodeCallbacks> = {
    onCodeChange: vi.fn(),
  };

  it('renders a textarea for code when showCode is true', () => {
    render(
      <KilnCodeEditor
        data={mockData}
        callbacks={mockCallbacks as any}
        showCode={true}
      />
    );

    const textarea = screen.getByPlaceholderText('// Generated code will appear here');
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('displays the current code value', () => {
    render(
      <KilnCodeEditor
        data={mockData}
        callbacks={mockCallbacks as any}
        showCode={true}
      />
    );

    const textarea = screen.getByPlaceholderText('// Generated code will appear here');
    expect(textarea).toHaveValue('const test = "code";');
  });

  it('displays empty string if code is null', () => {
    const dataWithNullCode = { ...mockData, code: null };
    render(
      <KilnCodeEditor
        data={dataWithNullCode}
        callbacks={mockCallbacks as any}
        showCode={true}
      />
    );

    const textarea = screen.getByPlaceholderText('// Generated code will appear here');
    expect(textarea).toHaveValue('');
  });

  it('fires onCodeChange callback when code is edited', () => {
    render(
      <KilnCodeEditor
        data={mockData}
        callbacks={mockCallbacks as any}
        showCode={true}
      />
    );

    const textarea = screen.getByPlaceholderText('// Generated code will appear here');
    fireEvent.change(textarea, { target: { value: 'new code content' } });

    expect(mockCallbacks.onCodeChange).toHaveBeenCalledWith('new code content');
  });

  it('returns null when showCode is false', () => {
    const { container } = render(
      <KilnCodeEditor
        data={mockData}
        callbacks={mockCallbacks as any}
        showCode={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
