import { describe, it, expect } from 'vitest';
import { 
  boxesOverlap, 
  snapToGrid, 
  findNonOverlappingPosition, 
  autoLayoutNodes,
  getRightmostPosition,
  isNodeVisible,
  getNodeBounds,
  wouldOverlap,
  type Position
} from '../../src/lib/nodeLayout';
import type { Node } from '@xyflow/react';

describe('nodeLayout', () => {
  const createNode = (id: string, x = 0, y = 0, width = 220, height = 180): Node => ({
    id,
    position: { x, y },
    data: {},
    measured: { width, height },
  });

  describe('boxesOverlap', () => {
    it('should detect overlapping boxes', () => {
      const box1 = { x: 0, y: 0, width: 100, height: 100 };
      const box2 = { x: 50, y: 50, width: 100, height: 100 };
      expect(boxesOverlap(box1, box2)).toBe(true);
    });

    it('should detect non-overlapping boxes', () => {
      const box1 = { x: 0, y: 0, width: 100, height: 100 };
      const box2 = { x: 200, y: 0, width: 100, height: 100 };
      // PADDING is 40. 100 + 40 < 200. So no overlap.
      expect(boxesOverlap(box1, box2)).toBe(false);
    });

    it('should account for padding', () => {
      const box1 = { x: 0, y: 0, width: 100, height: 100 };
      // Placed right at the edge of padding (100 + 40 = 140)
      const box2 = { x: 139, y: 0, width: 100, height: 100 };
      expect(boxesOverlap(box1, box2)).toBe(true);

      const box3 = { x: 141, y: 0, width: 100, height: 100 };
      expect(boxesOverlap(box1, box3)).toBe(false);
    });
  });

  describe('snapToGrid', () => {
    it('should snap coordinates to grid size 20', () => {
      expect(snapToGrid({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
      expect(snapToGrid({ x: 22, y: 18 })).toEqual({ x: 20, y: 20 });
      expect(snapToGrid({ x: 10, y: 10 })).toEqual({ x: 20, y: 20 }); // Rounds up 0.5? Math.round(10/20) = 0 or 1? 0.5 rounds up to 1.
      expect(snapToGrid({ x: 5, y: 5 })).toEqual({ x: 0, y: 0 });
    });
  });

  describe('findNonOverlappingPosition', () => {
    it('should return suggested position if no overlap', () => {
      const nodes = [createNode('A', 0, 0)];
      const suggested = { x: 500, y: 0 };
      const result = findNonOverlappingPosition(suggested, nodes);
      expect(result).toEqual(snapToGrid(suggested));
    });

    it('should find new position if overlapping', () => {
      // Node at 0,0 size 220x180
      const nodes = [createNode('A', 0, 0)];
      const suggested = { x: 10, y: 10 }; // Overlaps with A
      
      const result = findNonOverlappingPosition(suggested, nodes);
      
      expect(result).not.toEqual(snapToGrid(suggested));
      expect(wouldOverlap(result, nodes)).toBe(false);
    });

    it('should exclude specific node ID when checking overlap', () => {
      const nodes = [createNode('A', 0, 0)];
      const suggested = { x: 10, y: 10 };
      
      // If we exclude 'A', it should find the suggested position is fine
      // But findNonOverlappingPosition doesn't take an excludeId param.
      // It takes (suggestedPos, nodes).
      // Wait, let's check the signature.
      // export function findNonOverlappingPosition(suggestedPos: Position, nodes: Node[]): Position
      // It does NOT take excludeId.
      
      // However `wouldOverlap` takes excludeId.
      // Let's test wouldOverlap separately.
      
      expect(wouldOverlap(suggested, nodes, 'A')).toBe(false);
      expect(wouldOverlap(suggested, nodes, 'B')).toBe(true);
    });
  });

  describe('autoLayoutNodes (Grid)', () => {
    it('should layout nodes in a grid', () => {
      const nodes = [
        createNode('1'),
        createNode('2'),
        createNode('3'),
        createNode('4'),
        createNode('5'),
      ];
      
      const startPos = { x: 0, y: 0 };
      const cols = 2;
      const result = autoLayoutNodes(nodes, startPos, cols);
      
      // Node 0: col 0, row 0 -> 0,0
      // Node 1: col 1, row 0 -> spacingX, 0
      // Node 2: col 0, row 1 -> 0, spacingY
      // Node 3: col 1, row 1 -> spacingX, spacingY
      // Node 4: col 0, row 2 -> 0, 2*spacingY

      expect(result[0].position.x).toBe(0);
      expect(result[0].position.y).toBe(0);
      
      expect(result[1].position.x).toBeGreaterThan(0);
      expect(result[1].position.y).toBe(0);
      
      expect(result[2].position.x).toBe(0);
      expect(result[2].position.y).toBeGreaterThan(0);
    });
  });

  describe('getRightmostPosition', () => {
    it('should return default start if empty', () => {
      expect(getRightmostPosition([])).toEqual({ x: 320, y: 100 });
    });

    it('should find position after rightmost node', () => {
      const nodes = [
        createNode('A', 0, 0),
        createNode('B', 300, 0), // Width 220 -> ends at 520
      ];
      
      const pos = getRightmostPosition(nodes);
      // Expected x: max(A_right, B_right) + padding
      // A_right = 0 + 220 = 220
      // B_right = 300 + 220 = 520
      // Result = 520 + 40*2 = 600
      
      expect(pos.x).toBeGreaterThan(520);
      expect(pos.x).toBe(600); // 520 + 80
    });
  });

  describe('isNodeVisible', () => {
    it('should return true if node is in viewport', () => {
      const node = createNode('A', 100, 100, 100, 100);
      const viewport = { x: 0, y: 0, zoom: 1 };
      const canvas = { width: 500, height: 500 };
      
      expect(isNodeVisible(node, viewport, canvas)).toBe(true);
    });

    it('should return false if node is outside viewport', () => {
      const node = createNode('A', 600, 600, 100, 100);
      const viewport = { x: 0, y: 0, zoom: 1 };
      const canvas = { width: 500, height: 500 };
      
      expect(isNodeVisible(node, viewport, canvas)).toBe(false);
    });

    it('should handle zoom', () => {
      // Node at 100, 100.
      // Viewport panned to -200, -200 (so node is effectively at 300, 300 relative to 0,0 screen?)
      // Wait. screenX = (node.x - viewport.x) * zoom
      
      const node = createNode('A', 100, 100, 100, 100);
      
      // Panned far right: viewport.x = 200.
      // screenX = (100 - 200) * 1 = -100.
      // screenWidth = 100.
      // right edge = -100 + 100 = 0.
      // It barely touches left edge? 
      // check: screenX + screenWidth < 0
      // -100 + 100 = 0. 0 < 0 is false. So it is NOT considered invisible (i.e. it IS visible).
      
      let viewport = { x: 201, y: 0, zoom: 1 };
      let canvas = { width: 500, height: 500 };
      expect(isNodeVisible(node, viewport, canvas)).toBe(false);
      
      viewport = { x: 200, y: 0, zoom: 1 };
      expect(isNodeVisible(node, viewport, canvas)).toBe(true);
    });
  });
});
