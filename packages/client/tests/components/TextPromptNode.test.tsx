import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TextPromptNode } from '../../src/components/nodes/TextPromptNode';

// Mock workflow store
vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));
import { useWorkflowStore } from '../../src/stores/workflow';

// Mock BaseNode
vi.mock('../../src/components/nodes/BaseNode', () => ({
  BaseNode: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('TextPromptNode', () => {
  const mockUpdateNodeData = vi.fn();
  const mockSetNodeOutput = vi.fn();

  const defaultProps = {
    id: 'text-prompt-1',
    type: 'textPrompt',
    data: {
      label: 'Text Prompt',
      prompt: '',
    },
    selected: false,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    dragging: false,
    zIndex: 0,
  };

  const mockStore = {
    updateNodeData: mockUpdateNodeData,
    setNodeOutput: mockSetNodeOutput,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector?: (state: any) => any) => selector ? selector(mockStore) : mockStore
    );
  });

  it('renders a textarea', () => {
    render(<TextPromptNode {...defaultProps} />);
    expect(screen.getByPlaceholderText('Enter your prompt...')).toBeInTheDocument();
  });

  it('displays existing prompt text', () => {
    const props = {
      ...defaultProps,
      data: { ...defaultProps.data, prompt: 'A red dragon' },
    };
    render(<TextPromptNode {...props} />);
    const textarea = screen.getByPlaceholderText('Enter your prompt...') as HTMLTextAreaElement;
    expect(textarea.value).toBe('A red dragon');
  });

  it('displays empty string when prompt is undefined', () => {
    const props = {
      ...defaultProps,
      data: { label: 'Text Prompt' },
    };
    render(<TextPromptNode {...props} />);
    const textarea = screen.getByPlaceholderText('Enter your prompt...') as HTMLTextAreaElement;
    expect(textarea.value).toBe('');
  });

  it('updates node data on text change', () => {
    render(<TextPromptNode {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('Enter your prompt...');
    fireEvent.change(textarea, { target: { value: 'A blue castle' } });

    expect(mockUpdateNodeData).toHaveBeenCalledWith('text-prompt-1', { prompt: 'A blue castle' });
  });

  it('sets node output on text change', () => {
    render(<TextPromptNode {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('Enter your prompt...');
    fireEvent.change(textarea, { target: { value: 'Hello world' } });

    expect(mockSetNodeOutput).toHaveBeenCalledWith('text-prompt-1', {
      type: 'text',
      data: 'Hello world',
      timestamp: expect.any(Number),
    });
  });

  it('handles empty text input', () => {
    const props = {
      ...defaultProps,
      data: { ...defaultProps.data, prompt: 'Existing text' },
    };
    render(<TextPromptNode {...props} />);
    const textarea = screen.getByPlaceholderText('Enter your prompt...');
    fireEvent.change(textarea, { target: { value: '' } });

    expect(mockUpdateNodeData).toHaveBeenCalledWith('text-prompt-1', { prompt: '' });
    expect(mockSetNodeOutput).toHaveBeenCalledWith('text-prompt-1', {
      type: 'text',
      data: '',
      timestamp: expect.any(Number),
    });
  });

  it('textarea has 3 rows', () => {
    render(<TextPromptNode {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('Enter your prompt...');
    expect(textarea).toHaveAttribute('rows', '3');
  });
});
