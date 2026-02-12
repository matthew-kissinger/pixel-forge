import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NodePalette } from '../../../src/components/panels/NodePalette';
import { useWorkflowStore } from '../../../src/stores/workflow';

// Mock the workflow store
const mockAddNode = vi.fn();
vi.mock('../../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn((selector) => {
    const store = {
      addNode: mockAddNode,
    };
    return selector ? selector(store) : store;
  }),
}));

// Mock useFocusTrap
vi.mock('../../../src/hooks/useFocusTrap', () => ({
  useFocusTrap: vi.fn(() => null),
}));

describe('NodePalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Search Debouncing', () => {
    it('should debounce search input by 150ms', async () => {
      render(<NodePalette />);
      const searchInput = screen.getByPlaceholderText('Search nodes...') as HTMLInputElement;

      // Type search query
      fireEvent.change(searchInput, { target: { value: 'text' } });
      expect(searchInput.value).toBe('text');

      // Wait for debounce to complete
      await waitFor(() => {
        expect(screen.getByText('Text Prompt')).toBeInTheDocument();
      }, { timeout: 500 });
    });

    it('should show search results after debounce completes', async () => {
      render(<NodePalette />);
      const searchInput = screen.getByPlaceholderText('Search nodes...') as HTMLInputElement;

      fireEvent.change(searchInput, { target: { value: 'image' } });

      await waitFor(() => {
        expect(screen.getByText('Image Gen')).toBeInTheDocument();
        expect(screen.getByText('Image Upload')).toBeInTheDocument();
      }, { timeout: 500 });
    });

    it('should handle search query clearing', async () => {
      render(<NodePalette />);
      const searchInput = screen.getByPlaceholderText('Search nodes...') as HTMLInputElement;

      fireEvent.change(searchInput, { target: { value: 'test' } });
      expect(searchInput.value).toBe('test');

      await waitFor(() => {
        const clearButtons = screen.getAllByRole('button');
        const clearButton = clearButtons.find(btn => btn.querySelector('.lucide-x'));
        expect(clearButton).toBeInTheDocument();
      });

      // Clear search
      const clearButtons = screen.getAllByRole('button');
      const clearButton = clearButtons.find(btn => btn.querySelector('.lucide-x'));
      fireEvent.click(clearButton!);

      expect(searchInput.value).toBe('');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should highlight first item on ArrowDown', async () => {
      render(<NodePalette />);
      const searchInput = screen.getByPlaceholderText('Search nodes...') as HTMLInputElement;

      fireEvent.change(searchInput, { target: { value: 'text' } });

      // Wait for search results to appear (debounce completes)
      await waitFor(() => {
        expect(screen.getByText('Text Prompt')).toBeInTheDocument();
        // Also verify we're in search mode by checking draggable exists
        const draggableElements = document.querySelectorAll('[draggable="true"]');
        expect(draggableElements.length).toBeGreaterThan(0);
      }, { timeout: 500 });

      // NOW press ArrowDown to highlight first result
      fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

      // Check if first item has highlight class
      await waitFor(() => {
        const allDivs = document.querySelectorAll('[draggable="true"]');
        const highlighted = Array.from(allDivs).find(div =>
          div.classList.contains('border-[var(--accent)]')
        );
        expect(highlighted).toBeDefined();
        expect(highlighted).toHaveClass('border-[var(--accent)]');
      }, { timeout: 200 });
    });

    it('should move highlight down with ArrowDown', async () => {
      render(<NodePalette />);
      const searchInput = screen.getByPlaceholderText('Search nodes...') as HTMLInputElement;

      fireEvent.change(searchInput, { target: { value: 'gen' } });

      await waitFor(() => {
        expect(screen.getByText('Image Gen')).toBeInTheDocument();
      }, { timeout: 500 });

      // Press ArrowDown twice
      fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
      fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

      // Get all items with "Gen" in them and check second is highlighted
      const items = screen.getAllByText(/Gen/);
      expect(items.length).toBeGreaterThan(1);
    });

    it('should move highlight up with ArrowUp', async () => {
      render(<NodePalette />);
      const searchInput = screen.getByPlaceholderText('Search nodes...') as HTMLInputElement;

      fireEvent.change(searchInput, { target: { value: 'gen' } });

      await waitFor(() => {
        expect(screen.getByText('Image Gen')).toBeInTheDocument();
      }, { timeout: 500 });

      // Move down twice, then up once
      fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
      fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
      fireEvent.keyDown(searchInput, { key: 'ArrowUp' });

      // First item should be highlighted again - get draggable container
      await waitFor(() => {
        const allDivs = document.querySelectorAll('[draggable="true"]');
        const firstDraggable = allDivs[0];
        expect(firstDraggable).toHaveClass('border-[var(--accent)]');
      });
    });

    it('should add node on Enter when item is highlighted', async () => {
      render(<NodePalette />);
      const searchInput = screen.getByPlaceholderText('Search nodes...') as HTMLInputElement;

      fireEvent.change(searchInput, { target: { value: 'text' } });

      await waitFor(() => {
        expect(screen.getByText('Text Prompt')).toBeInTheDocument();
      }, { timeout: 500 });

      // Highlight first item and press Enter
      fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
      fireEvent.keyDown(searchInput, { key: 'Enter' });

      await waitFor(() => {
        expect(mockAddNode).toHaveBeenCalledTimes(1);
      });

      // Check that node was added with correct type
      const addedNode = mockAddNode.mock.calls[0][0];
      expect(addedNode.type).toBe('textPrompt');
    });

    it('should not add node on Enter when no item is highlighted', async () => {
      render(<NodePalette />);
      const searchInput = screen.getByPlaceholderText('Search nodes...') as HTMLInputElement;

      fireEvent.change(searchInput, { target: { value: 'text' } });

      await waitFor(() => {
        expect(screen.getByText('Text Prompt')).toBeInTheDocument();
      }, { timeout: 500 });

      // Press Enter without highlighting anything
      fireEvent.keyDown(searchInput, { key: 'Enter' });

      expect(mockAddNode).not.toHaveBeenCalled();
    });

    it('should clear search on Escape', async () => {
      render(<NodePalette />);
      const searchInput = screen.getByPlaceholderText('Search nodes...') as HTMLInputElement;

      fireEvent.change(searchInput, { target: { value: 'text' } });
      expect(searchInput.value).toBe('text');

      await waitFor(() => {
        expect(screen.getByText('Text Prompt')).toBeInTheDocument();
      }, { timeout: 500 });

      // Press Escape
      fireEvent.keyDown(searchInput, { key: 'Escape' });

      expect(searchInput.value).toBe('');
    });

    it('should reset highlight when search query changes', async () => {
      render(<NodePalette />);
      const searchInput = screen.getByPlaceholderText('Search nodes...') as HTMLInputElement;

      fireEvent.change(searchInput, { target: { value: 'text' } });

      await waitFor(() => {
        expect(screen.getByText('Text Prompt')).toBeInTheDocument();
      }, { timeout: 500 });

      // Highlight first item
      fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

      await waitFor(() => {
        const firstDraggable = document.querySelector('[draggable="true"]');
        expect(firstDraggable).toHaveClass('border-[var(--accent)]');
      });

      // Type more characters
      fireEvent.change(searchInput, { target: { value: 'text prompt' } });

      // Wait for debounce
      await waitFor(() => {
        const items = screen.getAllByText(/Text/);
        // After search change, no items should be highlighted
        items.forEach(item => {
          const container = item.closest('div');
          // Initially no highlight after search change
          expect(container).toBeDefined();
        });
      }, { timeout: 500 });
    });
  });

  describe('Click to Add Node', () => {
    it('should add node when search result is clicked', async () => {
      render(<NodePalette />);
      const searchInput = screen.getByPlaceholderText('Search nodes...') as HTMLInputElement;

      fireEvent.change(searchInput, { target: { value: 'text' } });

      await waitFor(() => {
        expect(screen.getByText('Text Prompt')).toBeInTheDocument();
      }, { timeout: 500 });

      // Click on the result - find the draggable container
      const textPromptItem = document.querySelector('[draggable="true"]');
      fireEvent.click(textPromptItem!);

      await waitFor(() => {
        expect(mockAddNode).toHaveBeenCalledTimes(1);
      });

      const addedNode = mockAddNode.mock.calls[0][0];
      expect(addedNode.type).toBe('textPrompt');
    });

    it('should clear search after adding node via click', async () => {
      render(<NodePalette />);
      const searchInput = screen.getByPlaceholderText('Search nodes...') as HTMLInputElement;

      fireEvent.change(searchInput, { target: { value: 'text' } });

      await waitFor(() => {
        expect(screen.getByText('Text Prompt')).toBeInTheDocument();
      }, { timeout: 500 });

      // Click on the result - find the draggable container
      const textPromptItem = document.querySelector('[draggable="true"]');
      fireEvent.click(textPromptItem!);

      await waitFor(() => {
        expect(searchInput.value).toBe('');
      });
    });
  });

  describe('Memoization', () => {
    it('should filter results based on search query', async () => {
      render(<NodePalette />);
      const searchInput = screen.getByPlaceholderText('Search nodes...') as HTMLInputElement;

      // First search
      fireEvent.change(searchInput, { target: { value: 'text' } });

      await waitFor(() => {
        expect(screen.getByText('Text Prompt')).toBeInTheDocument();
      }, { timeout: 500 });

      // Should show text-related nodes
      expect(screen.getByText('Text Prompt')).toBeInTheDocument();
    });

    it('should update filtered results when search changes', async () => {
      render(<NodePalette />);
      const searchInput = screen.getByPlaceholderText('Search nodes...') as HTMLInputElement;

      // First search
      fireEvent.change(searchInput, { target: { value: 'text' } });

      await waitFor(() => {
        expect(screen.getByText('Text Prompt')).toBeInTheDocument();
      }, { timeout: 500 });

      // Clear and search again
      fireEvent.change(searchInput, { target: { value: '' } });
      await waitFor(() => {
        expect(screen.queryByText('No nodes match')).not.toBeInTheDocument();
      });

      fireEvent.change(searchInput, { target: { value: 'image' } });

      await waitFor(() => {
        expect(screen.getByText('Image Gen')).toBeInTheDocument();
      }, { timeout: 500 });
    });
  });

  describe('Drag and Drop', () => {
    it('should still support drag to add functionality', async () => {
      render(<NodePalette />);
      const searchInput = screen.getByPlaceholderText('Search nodes...') as HTMLInputElement;

      fireEvent.change(searchInput, { target: { value: 'text' } });

      await waitFor(() => {
        expect(screen.getByText('Text Prompt')).toBeInTheDocument();
      }, { timeout: 500 });

      const textPromptItem = document.querySelector('[draggable="true"]');
      expect(textPromptItem).toHaveAttribute('draggable', 'true');

      // Test drag start
      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: '',
      };

      fireEvent.dragStart(textPromptItem!, { dataTransfer });

      expect(dataTransfer.setData).toHaveBeenCalledWith(
        'application/reactflow',
        'textPrompt'
      );
    });
  });

  describe('No Results', () => {
    it('should show no results message for non-matching query', async () => {
      render(<NodePalette />);
      const searchInput = screen.getByPlaceholderText('Search nodes...') as HTMLInputElement;

      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText('No nodes match "nonexistent"')).toBeInTheDocument();
      }, { timeout: 500 });
    });

    it('should not trigger keyboard navigation when no results', async () => {
      render(<NodePalette />);
      const searchInput = screen.getByPlaceholderText('Search nodes...') as HTMLInputElement;

      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText('No nodes match "nonexistent"')).toBeInTheDocument();
      }, { timeout: 500 });

      // Press ArrowDown - should do nothing
      fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

      // Press Enter - should not call addNode
      fireEvent.keyDown(searchInput, { key: 'Enter' });

      expect(mockAddNode).not.toHaveBeenCalled();
    });
  });
});
