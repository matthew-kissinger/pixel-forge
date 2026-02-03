import type { Edge, Node } from '@xyflow/react';

const DEFAULT_HORIZONTAL_SPACING = 250;
const DEFAULT_VERTICAL_SPACING = 100;

interface LayoutOptions {
  horizontalSpacing?: number;
  verticalSpacing?: number;
}

const getExecutionWaves = (nodes: Node[], edges: Edge[]): Node[][] => {
  const dependents = new Map<string, Set<string>>();
  const dependencies = new Map<string, Set<string>>();
  const nodeMap = new Map<string, Node>();

  nodes.forEach((node) => {
    nodeMap.set(node.id, node);
    dependents.set(node.id, new Set());
    dependencies.set(node.id, new Set());
  });

  edges.forEach((edge) => {
    const sourceDeps = dependencies.get(edge.target);
    const targetDeps = dependents.get(edge.source);
    if (sourceDeps) sourceDeps.add(edge.source);
    if (targetDeps) targetDeps.add(edge.target);
  });

  const waves: Node[][] = [];
  const queue: Node[] = [];
  const inDegree = new Map<string, number>();

  nodes.forEach((node) => {
    const deps = dependencies.get(node.id);
    const degree = deps ? deps.size : 0;
    inDegree.set(node.id, degree);
    if (degree === 0) {
      queue.push(node);
    }
  });

  while (queue.length > 0) {
    const currentWave: Node[] = [];
    const waveSize = queue.length;

    for (let i = 0; i < waveSize; i++) {
      const node = queue.shift()!;
      currentWave.push(node);

      const deps = dependents.get(node.id);
      if (deps) {
        deps.forEach((dependentId) => {
          const currentDegree = inDegree.get(dependentId) ?? 0;
          const newDegree = currentDegree - 1;
          inDegree.set(dependentId, newDegree);
          if (newDegree === 0) {
            const dependentNode = nodeMap.get(dependentId);
            if (dependentNode) queue.push(dependentNode);
          }
        });
      }
    }

    if (currentWave.length > 0) {
      waves.push(currentWave);
    }
  }

  const processedIds = new Set(waves.flat().map((node) => node.id));
  const orphanNodes = nodes.filter((node) => !processedIds.has(node.id));
  if (orphanNodes.length > 0) {
    waves.push(orphanNodes);
  }

  return waves;
};

export const autoLayoutNodes = (
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): Node[] => {
  if (nodes.length === 0) return nodes;

  const horizontalSpacing = options.horizontalSpacing ?? DEFAULT_HORIZONTAL_SPACING;
  const verticalSpacing = options.verticalSpacing ?? DEFAULT_VERTICAL_SPACING;

  const waves = getExecutionWaves(nodes, edges);
  const nodeOrder = new Map(nodes.map((node, index) => [node.id, index]));
  const startX = Math.min(...nodes.map((node) => node.position.x));
  const startY = Math.min(...nodes.map((node) => node.position.y));
  const positions = new Map<string, { x: number; y: number }>();

  waves.forEach((wave, columnIndex) => {
    const sortedWave = [...wave].sort((a, b) => {
      const aIndex = nodeOrder.get(a.id) ?? 0;
      const bIndex = nodeOrder.get(b.id) ?? 0;
      return aIndex - bIndex;
    });

    sortedWave.forEach((node, rowIndex) => {
      positions.set(node.id, {
        x: startX + columnIndex * horizontalSpacing,
        y: startY + rowIndex * verticalSpacing,
      });
    });
  });

  return nodes.map((node) => {
    const position = positions.get(node.id);
    if (!position) return node;
    return {
      ...node,
      position,
    };
  });
};
