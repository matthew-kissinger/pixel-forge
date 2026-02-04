import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodePalette } from '../../src/components/panels/NodePalette';
import { legacyNodeDefinitions as nodeDefinitions, nodeCategories } from '../../src/components/nodes';

const getCategorySection = (label: string) => {
  const button = screen.getByRole('button', { name: new RegExp(label, 'i') });
  const section = button.closest('div');
  if (!section) {
    throw new Error(`Unable to find category section for ${label}`);
  }
  return { button, section };
};

const getSearchFixture = () => {
  for (const def of nodeDefinitions) {
    const query = def.label.toLowerCase();
    const nonMatching = nodeDefinitions.find(
      (other) =>
        other.label !== def.label &&
        !other.label.toLowerCase().includes(query) &&
        !other.description.toLowerCase().includes(query)
    );

    if (nonMatching) {
      return { matching: def, nonMatching, query };
    }
  }

  return {
    matching: nodeDefinitions[0],
    nonMatching: nodeDefinitions[1],
    query: nodeDefinitions[0].label.toLowerCase(),
  };
};

describe('NodePalette', () => {
  it('renders without crashing', () => {
    render(<NodePalette />);

    expect(screen.getByText('Node Palette')).toBeInTheDocument();
    expect(screen.getByText('Drag nodes to canvas')).toBeInTheDocument();
  });

  it('displays all node categories', () => {
    render(<NodePalette />);

    Object.values(nodeCategories).forEach((category) => {
      expect(screen.getByText(category.label)).toBeInTheDocument();
    });
  });

  it('shows the correct node count per category', () => {
    render(<NodePalette />);

    Object.entries(nodeCategories).forEach(([categoryKey, category]) => {
      const expectedCount = nodeDefinitions.filter((def) => def.category === categoryKey).length;
      const { section } = getCategorySection(category.label);
      const nodes = section.querySelectorAll('[draggable="true"]');

      expect(nodes.length).toBe(expectedCount);
    });
  });

  it('allows categories to be collapsed and expanded', () => {
    render(<NodePalette />);

    const categoryKey = Object.keys(nodeCategories)[0];
    const category = nodeCategories[categoryKey as keyof typeof nodeCategories];
    const expectedCount = nodeDefinitions.filter((def) => def.category === categoryKey).length;
    const { button, section } = getCategorySection(category.label);

    expect(section.querySelectorAll('[draggable="true"]').length).toBe(expectedCount);

    fireEvent.click(button);
    expect(section.querySelectorAll('[draggable="true"]').length).toBe(0);

    fireEvent.click(button);
    expect(section.querySelectorAll('[draggable="true"]').length).toBe(expectedCount);
  });

  describe('search/filter', () => {
    it('filters visible nodes based on search input', () => {
      render(<NodePalette />);
      const { matching, nonMatching, query } = getSearchFixture();

      const input = screen.getByPlaceholderText('Search nodes...');
      fireEvent.change(input, { target: { value: query } });

      expect(screen.getByText(matching.label)).toBeInTheDocument();
      expect(screen.queryByText(nonMatching.label)).not.toBeInTheDocument();
    });

    it('clears search and shows all nodes again', () => {
      render(<NodePalette />);
      const { nonMatching, query } = getSearchFixture();

      const input = screen.getByPlaceholderText('Search nodes...');
      fireEvent.change(input, { target: { value: query } });

      const searchContainer = input.parentElement;
      const clearButton = searchContainer?.querySelector('button');
      expect(clearButton).toBeTruthy();

      if (clearButton) {
        fireEvent.click(clearButton);
      }

      expect(input).toHaveValue('');
      expect(screen.getByText(nonMatching.label)).toBeInTheDocument();
    });

    it('shows an empty message when no nodes match', () => {
      render(<NodePalette />);

      const input = screen.getByPlaceholderText('Search nodes...');
      fireEvent.change(input, { target: { value: 'nonexistent node search' } });

      expect(screen.getByText('No nodes match "nonexistent node search"')).toBeInTheDocument();
    });
  });
});
