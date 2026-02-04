/**
 * Node layout utilities for automatic positioning
 */

import type { Node } from '@xyflow/react';

export interface Position {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Default node dimensions (approximate)
const DEFAULT_NODE_WIDTH = 220;
const DEFAULT_NODE_HEIGHT = 180;
const NODE_PADDING = 40; // Minimum space between nodes
const GRID_SIZE = 20; // Snap-to-grid size

/**
 * Get bounding box for a node
 */
export function getNodeBounds(node: Node): BoundingBox {
  return {
    x: node.position.x,
    y: node.position.y,
    width: node.measured?.width ?? DEFAULT_NODE_WIDTH,
    height: node.measured?.height ?? DEFAULT_NODE_HEIGHT,
  };
}

/**
 * Check if two bounding boxes overlap
 */
export function boxesOverlap(a: BoundingBox, b: BoundingBox): boolean {
  return !(
    a.x + a.width + NODE_PADDING < b.x ||
    b.x + b.width + NODE_PADDING < a.x ||
    a.y + a.height + NODE_PADDING < b.y ||
    b.y + b.height + NODE_PADDING < a.y
  );
}

/**
 * Check if a position would overlap with any existing nodes
 */
export function wouldOverlap(pos: Position, nodes: Node[], excludeId?: string): boolean {
  const testBox: BoundingBox = {
    x: pos.x,
    y: pos.y,
    width: DEFAULT_NODE_WIDTH,
    height: DEFAULT_NODE_HEIGHT,
  };

  return nodes.some((node) => {
    if (node.id === excludeId) return false;
    return boxesOverlap(testBox, getNodeBounds(node));
  });
}

/**
 * Snap a position to the grid
 */
export function snapToGrid(pos: Position): Position {
  return {
    x: Math.round(pos.x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(pos.y / GRID_SIZE) * GRID_SIZE,
  };
}

/**
 * Find a non-overlapping position for a new node.
 * Starts at the suggested position and spirals outward if needed.
 */
export function findNonOverlappingPosition(
  suggestedPos: Position,
  nodes: Node[]
): Position {
  // Snap to grid first
  const pos = snapToGrid(suggestedPos);

  // If no overlap, return immediately
  if (!wouldOverlap(pos, nodes)) {
    return pos;
  }

  // Spiral outward to find an empty space
  const spiralStep = GRID_SIZE * 2;
  let layer = 1;
  const maxLayers = 20;

  while (layer < maxLayers) {
    // Check positions in a square spiral pattern
    for (let side = 0; side < 4; side++) {
      for (let step = 0; step < layer * 2; step++) {
        switch (side) {
          case 0: // Right
            pos.x += spiralStep;
            break;
          case 1: // Down
            pos.y += spiralStep;
            break;
          case 2: // Left
            pos.x -= spiralStep;
            break;
          case 3: // Up
            pos.y -= spiralStep;
            break;
        }

        if (!wouldOverlap(pos, nodes)) {
          return snapToGrid(pos);
        }
      }
    }
    layer++;
  }

  // Fallback: just offset significantly
  return snapToGrid({
    x: suggestedPos.x + nodes.length * (DEFAULT_NODE_WIDTH + NODE_PADDING),
    y: suggestedPos.y,
  });
}

/**
 * Calculate the center of the current viewport (canvas bounds)
 */
export function getViewportCenter(
  nodes: Node[]
): Position {
  if (nodes.length === 0) {
    return { x: 320, y: 100 }; // Default start position
  }

  // Get bounds of all nodes
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const bounds = getNodeBounds(node);
    minX = Math.min(minX, bounds.x);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    minY = Math.min(minY, bounds.y);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  }

  // Return center of existing nodes, offset to the right
  return {
    x: maxX + NODE_PADDING * 2,
    y: (minY + maxY) / 2 - DEFAULT_NODE_HEIGHT / 2,
  };
}

/**
 * Auto-layout nodes in a grid pattern
 */
export function autoLayoutNodes(
  nodes: Node[],
  startPos: Position = { x: 320, y: 100 },
  columnsPerRow = 4
): Node[] {
  const spacing = {
    x: DEFAULT_NODE_WIDTH + NODE_PADDING * 2,
    y: DEFAULT_NODE_HEIGHT + NODE_PADDING * 2,
  };

  return nodes.map((node, index) => {
    const col = index % columnsPerRow;
    const row = Math.floor(index / columnsPerRow);

    return {
      ...node,
      position: snapToGrid({
        x: startPos.x + col * spacing.x,
        y: startPos.y + row * spacing.y,
      }),
    };
  });
}

/**
 * Get the rightmost position of all nodes (for adding new nodes)
 */
export function getRightmostPosition(nodes: Node[]): Position {
  if (nodes.length === 0) {
    return { x: 320, y: 100 };
  }

  let maxX = -Infinity;
  let avgY = 0;

  for (const node of nodes) {
    const bounds = getNodeBounds(node);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    avgY += bounds.y;
  }

  avgY /= nodes.length;

  return snapToGrid({
    x: maxX + NODE_PADDING * 2,
    y: avgY,
  });
}

/**
 * Calculate positions for a workflow template
 * Arranges nodes in a left-to-right flow
 */
export function calculateWorkflowLayout(
  nodeTypes: string[],
  startPos: Position = { x: 320, y: 100 }
): Position[] {
  const spacing = DEFAULT_NODE_WIDTH + NODE_PADDING * 2;

  return nodeTypes.map((_, index) =>
    snapToGrid({
      x: startPos.x + index * spacing,
      y: startPos.y,
    })
  );
}

/**
 * Check if a node is within the visible viewport
 */
export function isNodeVisible(
  node: Node,
  viewport: { x: number; y: number; zoom: number },
  canvasSize: { width: number; height: number }
): boolean {
  const bounds = getNodeBounds(node);

  // Transform node position to screen coordinates
  const screenX = (bounds.x - viewport.x) * viewport.zoom;
  const screenY = (bounds.y - viewport.y) * viewport.zoom;
  const screenWidth = bounds.width * viewport.zoom;
  const screenHeight = bounds.height * viewport.zoom;

  // Check if any part of the node is visible
  return !(
    screenX + screenWidth < 0 ||
    screenX > canvasSize.width ||
    screenY + screenHeight < 0 ||
    screenY > canvasSize.height
  );
}
