/**
 * Canvas Operation Node Handlers
 *
 * Re-exports the per-operation handlers (tile, filter, combine, rotate,
 * colorPalette) and the shared `MAX_CANVAS_DIMENSION` constant. Consumers
 * import from `./canvas`, which Node/Vite resolves to this barrel.
 */

export { handleTile } from './tile';
export { handleFilter } from './filter';
export { handleCombine } from './combine';
export { handleRotate } from './rotate';
export { handleColorPalette } from './colorPalette';
export { MAX_CANVAS_DIMENSION } from './utils';
