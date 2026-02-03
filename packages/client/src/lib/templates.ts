/**
 * Workflow Templates
 *
 * Pre-built node configurations for common asset generation workflows.
 */

import type { Node, Edge } from '@xyflow/react';
import { getPresetById, buildPresetPrompt } from '@pixel-forge/shared/presets';
import type { NodeData } from '../stores/workflow';
import type { ArtStyle2D } from '../types/nodes';
import { calculateWorkflowLayout } from './nodeLayout';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'sprite' | 'tile' | '3d' | 'conversion' | 'composite';
  nodes: Array<{
    type: string;
    data: NodeData;
  }>;
  // Connections between nodes by index (sourceIdx -> targetIdx)
  connections: Array<[number, number]>;
}

// Template registry
export const templates: WorkflowTemplate[] = [
  // ========== SPRITE TEMPLATES ==========
  {
    id: 'character-sprite',
    name: 'Character Sprite',
    description: 'Generate a character sprite with background removal',
    category: 'sprite',
    nodes: [
      { type: 'textPrompt', data: { label: 'Character Description', prompt: 'A brave knight with silver armor' } },
      { type: 'imageGen', data: { label: 'Generate', style: 'pixel-art', autoRemoveBg: true } },
      { type: 'preview', data: { label: 'Preview', inputType: 'any' } },
      { type: 'save', data: { label: 'Save', fileName: 'character', format: 'png', quality: 100 } },
    ],
    connections: [
      [0, 1],
      [1, 2],
      [1, 3],
    ],
  },
  {
    id: 'billboard-sprite',
    name: 'Billboard Sprite',
    description: '2D sprite optimized for 3D billboarding (power-of-2 dimensions)',
    category: 'sprite',
    nodes: [
      { type: 'textPrompt', data: { label: 'Sprite Description', prompt: 'A glowing magic crystal' } },
      { type: 'imageGen', data: { label: 'Generate', style: 'painted', autoRemoveBg: true } },
      { type: 'resize', data: { label: 'Power of 2', width: 256, height: 256, lockAspect: false, mode: 'contain', pixelPerfect: true } },
      { type: 'preview', data: { label: 'Preview', inputType: 'any' } },
      { type: 'save', data: { label: 'Save', fileName: 'billboard', format: 'png', quality: 100 } },
    ],
    connections: [
      [0, 1],
      [1, 2],
      [2, 3],
      [2, 4],
    ],
  },

  // ========== TILE TEMPLATES ==========
  {
    id: 'isometric-tile',
    name: 'Isometric Tile',
    description: 'Generate isometric game tiles (26.565° projection)',
    category: 'tile',
    nodes: [
      { type: 'textPrompt', data: { label: 'Tile Description', prompt: 'A medieval tavern building with wooden walls and smoking chimney' } },
      { type: 'imageGen', data: { label: 'Generate Isometric', style: 'isometric', autoRemoveBg: true } },
      { type: 'preview', data: { label: 'Preview', inputType: 'any' } },
      { type: 'save', data: { label: 'Save', fileName: 'iso-tile', format: 'png', quality: 100 } },
    ],
    connections: [
      [0, 1],
      [1, 2],
      [1, 3],
    ],
  },
  {
    id: 'seamless-texture',
    name: 'Seamless Texture',
    description: 'Generate a tileable texture for terrain or materials',
    category: 'tile',
    nodes: [
      { type: 'textPrompt', data: { label: 'Texture Description', prompt: 'Grass and dirt ground texture, top-down view' } },
      { type: 'imageGen', data: { label: 'Generate', style: 'painted' } },
      { type: 'tile', data: { label: 'Make Seamless', mode: 'seamless', repeatX: 2, repeatY: 2, blendAmount: 0.25 } },
      { type: 'preview', data: { label: 'Preview', inputType: 'any' } },
      { type: 'save', data: { label: 'Save', fileName: 'texture', format: 'png', quality: 100 } },
    ],
    connections: [
      [0, 1],
      [1, 2],
      [2, 3],
      [2, 4],
    ],
  },

  // ========== 3D TEMPLATES ==========
  {
    id: 'low-poly-prop',
    name: 'Low-Poly 3D Prop',
    description: 'Generate a game-ready low-poly 3D model',
    category: '3d',
    nodes: [
      { type: 'textPrompt', data: { label: 'Prop Description', prompt: 'A wooden treasure chest with gold coins' } },
      { type: 'model3DGen', data: { label: 'Generate 3D', artStyle: 'low-poly' } },
      { type: 'preview', data: { label: 'Preview', inputType: 'any' } },
      { type: 'save', data: { label: 'Save GLB', fileName: 'prop', format: 'glb', quality: 100 } },
    ],
    connections: [
      [0, 1],
      [1, 2],
      [1, 3],
    ],
  },

  // ========== CONVERSION TEMPLATES ==========
  {
    id: 'pixel-conversion',
    name: 'Pixel Art Conversion',
    description: 'Convert any image to pixel art style',
    category: 'conversion',
    nodes: [
      { type: 'imageUpload', data: { label: 'Upload Image' } },
      { type: 'pixelate', data: { label: 'Pixelate', pixelSize: 8, colorLevels: 16 } },
      { type: 'colorPalette', data: { label: 'Apply Palette', palette: 'pico8', dithering: true } },
      { type: 'resize', data: { label: 'Final Size', width: 128, height: 128, lockAspect: true, mode: 'contain', pixelPerfect: true } },
      { type: 'preview', data: { label: 'Preview', inputType: 'any' } },
      { type: 'save', data: { label: 'Save', fileName: 'pixel-art', format: 'png', quality: 100 } },
    ],
    connections: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [3, 5],
    ],
  },
  {
    id: 'gameboy-filter',
    name: 'Game Boy Style',
    description: 'Convert image to classic Game Boy 4-color palette',
    category: 'conversion',
    nodes: [
      { type: 'imageUpload', data: { label: 'Upload Image' } },
      { type: 'pixelate', data: { label: 'Pixelate', pixelSize: 4, colorLevels: 8 } },
      { type: 'colorPalette', data: { label: 'Game Boy Colors', palette: 'gameboy', dithering: true } },
      { type: 'resize', data: { label: 'Scale to 160x144', width: 160, height: 144, lockAspect: false, mode: 'stretch', pixelPerfect: true } },
      { type: 'preview', data: { label: 'Preview', inputType: 'any' } },
    ],
    connections: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },

  // ========== COMPOSITE TEMPLATES ==========
  {
    id: 'item-icon',
    name: 'Item Icon',
    description: 'Generate an item icon with background removal and resize',
    category: 'composite',
    nodes: [
      { type: 'textPrompt', data: { label: 'Item Description', prompt: 'A glowing blue health potion in a glass bottle' } },
      { type: 'imageGen', data: { label: 'Generate', style: 'pixel-art' } },
      { type: 'removeBg', data: { label: 'Remove BG' } },
      { type: 'resize', data: { label: 'Icon Size', width: 64, height: 64, lockAspect: true, mode: 'contain', pixelPerfect: true } },
      { type: 'preview', data: { label: 'Preview', inputType: 'any' } },
      { type: 'save', data: { label: 'Save', fileName: 'icon', format: 'png', quality: 100 } },
    ],
    connections: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [3, 5],
    ],
  },
  {
    id: 'full-pipeline',
    name: 'Full Asset Pipeline',
    description: 'Complete workflow: generate, process, and export',
    category: 'composite',
    nodes: [
      { type: 'textPrompt', data: { label: 'Asset Description', prompt: 'A magical sword with glowing runes' } },
      { type: 'imageGen', data: { label: 'Generate', style: 'painted' } },
      { type: 'removeBg', data: { label: 'Remove BG' } },
      { type: 'filter', data: { label: 'Enhance', filter: 'sharpen', intensity: 50 } },
      { type: 'resize', data: { label: 'Resize', width: 256, height: 256, lockAspect: true, mode: 'contain', pixelPerfect: false } },
      { type: 'preview', data: { label: 'Preview', inputType: 'any' } },
      { type: 'save', data: { label: 'Save PNG', fileName: 'asset', format: 'png', quality: 100 } },
    ],
    connections: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [4, 6],
    ],
  },
];

// Template categories with metadata
export const templateCategories = {
  sprite: { label: 'Sprites', description: 'Character and object sprites' },
  tile: { label: 'Tiles', description: 'Tilesets and textures' },
  '3d': { label: '3D Models', description: '3D asset generation' },
  conversion: { label: 'Conversion', description: 'Style conversion pipelines' },
  composite: { label: 'Composite', description: 'Multi-step workflows' },
} as const;

/**
 * Convert a template to React Flow nodes and edges
 */
export function templateToFlow(
  template: WorkflowTemplate,
  startPosition = { x: 320, y: 100 }
): { nodes: Node<NodeData>[]; edges: Edge[] } {
  // Calculate positions for each node
  const positions = calculateWorkflowLayout(
    template.nodes.map((n) => n.type),
    startPosition
  );

  // Create nodes
  const nodes: Node<NodeData>[] = template.nodes.map((nodeDef, index) => ({
    id: `template_${template.id}_${index}`,
    type: nodeDef.type,
    position: positions[index],
    data: { ...nodeDef.data },
  }));

  // Create edges
  const edges: Edge[] = template.connections.map(([sourceIdx, targetIdx], edgeIdx) => ({
    id: `template_${template.id}_edge_${edgeIdx}`,
    source: nodes[sourceIdx].id,
    target: nodes[targetIdx].id,
    type: 'smoothstep',
    animated: true,
  }));

  return { nodes, edges };
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: WorkflowTemplate['category']
): WorkflowTemplate[] {
  return templates.filter((t) => t.category === category);
}

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return templates.find((t) => t.id === id);
}

/**
 * Create a workflow from a preset and subject
 */
export function createWorkflowFromPreset(
  presetId: string,
  subject: string,
  startPosition = { x: 320, y: 100 }
): { nodes: Node<NodeData>[]; edges: Edge[] } | undefined {
  const preset = getPresetById(presetId);
  if (!preset) return undefined;

  const fullPrompt = buildPresetPrompt(preset, subject);

  // Map category/id to style
  let style: ArtStyle2D = 'pixel-art';
  if (preset.id === 'planet-texture') style = 'realistic';
  else if (preset.id === 'isometric-sheet') style = 'isometric';
  else if (preset.category === 'texture') style = 'painted';
  else if (preset.id === 'game-icon') style = 'vector';

  // Determine node sequence
  const nodeSequence: Array<{ type: string; data: any }> = [
    {
      type: 'textPrompt',
      data: {
        nodeType: 'textPrompt',
        label: 'Preset Prompt',
        prompt: fullPrompt,
      },
    },
    {
      type: 'imageGen',
      data: {
        nodeType: 'imageGen',
        label: 'Generate',
        model: 'nano-banana',
        style: style,
        smartAspect: true,
        autoRemoveBg: false,
      },
    },
  ];

  if (preset.autoRemoveBg) {
    nodeSequence.push({
      type: 'removeBg',
      data: {
        nodeType: 'removeBg',
        label: 'Remove BG',
      },
    });
  }

  nodeSequence.push({
    type: 'resize',
    data: {
      nodeType: 'resize',
      label: 'Resize',
      width: preset.outputSize.width,
      height: preset.outputSize.height,
      lockAspect: true,
      mode: 'contain',
      pixelPerfect: style === 'pixel-art',
    },
  });

  nodeSequence.push({
    type: 'preview',
    data: {
      nodeType: 'preview',
      label: 'Preview',
      inputType: 'any',
    },
  });

  nodeSequence.push({
    type: 'save',
    data: {
      nodeType: 'save',
      label: 'Save',
      fileName: subject.toLowerCase().replace(/\s+/g, '-'),
      format: preset.format,
      quality: 90,
    },
  });

  const nodeTypes = nodeSequence.map((n) => n.type);
  const positions = calculateWorkflowLayout(nodeTypes, startPosition);

  const nodes: Node<NodeData>[] = nodeSequence.map((nodeDef, index) => ({
    id: `preset_${preset.id}_${Date.now()}_${index}`,
    type: nodeDef.type,
    position: positions[index],
    data: nodeDef.data,
  }));

  const edges: Edge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      id: `preset_${preset.id}_edge_${Date.now()}_${i}`,
      source: nodes[i].id,
      target: nodes[i + 1].id,
      type: 'smoothstep',
      animated: true,
    });
  }

  return { nodes, edges };
}
