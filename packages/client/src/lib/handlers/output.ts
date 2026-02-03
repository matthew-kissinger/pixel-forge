/**
 * Output Node Handlers
 * 
 * Handlers for output nodes: preview, save, exportGLB, exportSheet
 * These nodes don't produce outputs, they consume inputs
 */

import type { NodeHandlerContext } from './index';

export async function handlePreview(context: NodeHandlerContext): Promise<void> {
  // Output nodes don't need execution - they just display/save
  // The preview node will automatically show inputs when they're available
}

export async function handleSave(context: NodeHandlerContext): Promise<void> {
  // Output nodes don't need execution - they just display/save
}

export async function handleExportGLB(context: NodeHandlerContext): Promise<void> {
  // Output nodes don't need execution - they just display/save
}

export async function handleExportSheet(context: NodeHandlerContext): Promise<void> {
  // Output nodes don't need execution - they just display/save
}
