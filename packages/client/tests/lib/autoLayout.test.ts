import { describe, it, expect } from 'vitest';
import { autoLayoutNodes } from '../../src/lib/autoLayout';
import type { Node, Edge } from '@xyflow/react';
import type { NodeData } from '../../src/stores/workflow';

describe('autoLayout', () => {
  const createNode = (id: string, x = 0, y = 0): Node<NodeData> => ({
    id,
    type: 'default',
    position: { x, y },
    data: { nodeType: 'default', label: id },
  });

  const createEdge = (source: string, target: string): Edge => ({
    id: `${source}-${target}`,
    source,
    target,
  });

  it('should handle empty graph', () => {
    const nodes: Node<NodeData>[] = [];
    const edges: Edge[] = [];
    const result = autoLayoutNodes(nodes, edges);
    expect(result).toEqual([]);
  });

  it('should handle single node', () => {
    const nodes = [createNode('A', 10, 20)];
    const result = autoLayoutNodes(nodes, []);
    
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('A');
    // Should keep relative position start or reset?
    // The code calculates startX/startY from min of nodes.
    // So if only one node, it stays at minX/minY (itself).
    expect(result[0].position).toEqual({ x: 10, y: 20 });
  });

  it('should layout linear chain A -> B -> C', () => {
    const nodes = [
      createNode('A', 0, 0),
      createNode('B', 0, 0),
      createNode('C', 0, 0),
    ];
    const edges = [
      createEdge('A', 'B'),
      createEdge('B', 'C'),
    ];

    const result = autoLayoutNodes(nodes, edges, { horizontalSpacing: 100, verticalSpacing: 50 });
    
    const nodeA = result.find((n) => n.id === 'A')!;
    const nodeB = result.find((n) => n.id === 'B')!;
    const nodeC = result.find((n) => n.id === 'C')!;

    // Wave 0: A
    // Wave 1: B
    // Wave 2: C
    
    expect(nodeA.position.x).toBe(0);
    expect(nodeB.position.x).toBe(100);
    expect(nodeC.position.x).toBe(200);

    // Vertical alignment should be 0 since they are single items in their waves
    expect(nodeA.position.y).toBe(0);
    expect(nodeB.position.y).toBe(0);
    expect(nodeC.position.y).toBe(0);
  });

  it('should layout diamond pattern A -> [B, C] -> D', () => {
    const nodes = [
      createNode('A', 0, 0),
      createNode('B', 0, 0),
      createNode('C', 0, 0),
      createNode('D', 0, 0),
    ];
    const edges = [
      createEdge('A', 'B'),
      createEdge('A', 'C'),
      createEdge('B', 'D'),
      createEdge('C', 'D'),
    ];

    const result = autoLayoutNodes(nodes, edges, { horizontalSpacing: 100, verticalSpacing: 50 });

    const nodeA = result.find((n) => n.id === 'A')!;
    const nodeB = result.find((n) => n.id === 'B')!;
    const nodeC = result.find((n) => n.id === 'C')!;
    const nodeD = result.find((n) => n.id === 'D')!;

    // Wave 0: A (x=0)
    // Wave 1: B, C (x=100)
    // Wave 2: D (x=200)

    expect(nodeA.position.x).toBe(0);
    expect(nodeB.position.x).toBe(100);
    expect(nodeC.position.x).toBe(100);
    expect(nodeD.position.x).toBe(200);

    // B and C should have different Y positions
    expect(nodeB.position.y).not.toBe(nodeC.position.y);
    
    // Sort order in wave depends on initial order or id?
    // Code says: sort by index in original nodes array.
    // In nodes array: B is index 1, C is index 2.
    // So B should be first (y=0), C should be second (y=50).
    expect(nodeB.position.y).toBe(0);
    expect(nodeC.position.y).toBe(50);
  });

  it('should handle disconnected components', () => {
    const nodes = [
      createNode('A', 0, 0),
      createNode('B', 0, 0),
      createNode('C', 0, 0), // Disconnected
    ];
    const edges = [
      createEdge('A', 'B'),
    ];

    const result = autoLayoutNodes(nodes, edges, { horizontalSpacing: 100 });

    const nodeA = result.find((n) => n.id === 'A')!;
    const nodeB = result.find((n) => n.id === 'B')!;
    const nodeC = result.find((n) => n.id === 'C')!;

    // A (degree 0) -> Wave 0
    // B (degree 1) -> Wave 1 (after A processed)
    // C (degree 0) -> Wave 0 (since it has no deps)
    
    // So A and C are in Wave 0. B in Wave 1.
    
    expect(nodeA.position.x).toBe(0);
    expect(nodeC.position.x).toBe(0);
    expect(nodeB.position.x).toBe(100);
    
    expect(nodeA.position.y).not.toBe(nodeC.position.y);
  });

  it('should handle cycles gracefully', () => {
    // A -> B -> A
    const nodes = [
      createNode('A', 0, 0),
      createNode('B', 0, 0),
    ];
    const edges = [
      createEdge('A', 'B'),
      createEdge('B', 'A'),
    ];

    // With cycle, in-degrees never reach 0 for A and B initially if we strictly follow Kahn's.
    // But the implementation pushes 0-degree nodes to queue.
    // Here:
    // A depends on B. B depends on A.
    // In-degree A = 1, B = 1.
    // Queue is empty initially.
    // Loop finishes.
    // processedIds empty.
    // orphanNodes = [A, B].
    // waves.push([A, B]).
    
    const result = autoLayoutNodes(nodes, edges);

    expect(result).toHaveLength(2);
    // Both should be in the same wave (the "orphan" wave)
    const nodeA = result.find((n) => n.id === 'A')!;
    const nodeB = result.find((n) => n.id === 'B')!;

    expect(nodeA.position.x).toBe(nodeB.position.x);
    expect(nodeA.position.y).not.toBe(nodeB.position.y);
  });
});
