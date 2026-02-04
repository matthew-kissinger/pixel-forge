/**
 * Output Node Handlers
 *
 * Handlers for output nodes: preview, save, exportGLB, exportSheet
 * These nodes don't produce outputs, they consume inputs
 */

import type { NodeHandlerContext } from './index';
import { exportToFile } from '../api';
import type { SaveNodeData } from '../../types/nodes';

export async function handlePreview(_context: NodeHandlerContext): Promise<void> {
  // Output nodes don't need execution - they just display/save
  // The preview node will automatically show inputs when they're available
}

export async function handleSave(context: NodeHandlerContext): Promise<void> {
  // If outputPath is set, save to disk via export API
  const nodeData = context.node.data as SaveNodeData;

  if (!nodeData.outputPath) {
    // No outputPath - fall through to client-side download (no-op here)
    return;
  }

  // Get the input to save
  const inputs = Object.values(context.inputs);
  if (inputs.length === 0) {
    throw new Error('No input connected to Save node');
  }

  const input = inputs[0];

  if (!input || typeof input !== 'object' || !('type' in input) || !('data' in input)) {
    throw new Error('Invalid input data');
  }

  // Only support image exports for now
  if (input.type !== 'image') {
    throw new Error(`Cannot export ${input.type} to file yet - only images supported`);
  }

  // Determine format from node data or input type
  let format: 'png' | 'jpeg' | 'webp' = 'png';
  if (nodeData.format === 'jpg') {
    format = 'jpeg';
  } else if (nodeData.format === 'webp') {
    format = 'webp';
  }

  // Call export API
  const result = await exportToFile(
    input.data,
    nodeData.outputPath,
    format,
    nodeData.quality
  );

  context.onProgress?.({
    message: `Saved to ${result.path} (${result.size} bytes)`,
  });
}

export async function handleExportGLB(_context: NodeHandlerContext): Promise<void> {
  // Output nodes don't need execution - they just display/save
}

export async function handleExportSheet(_context: NodeHandlerContext): Promise<void> {
  // Output nodes don't need execution - they just display/save
}
