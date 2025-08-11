import type { Viewport } from './types.js';

export function boardToScreen(
  cell: { x: number; y: number },
  vp: Viewport
): { x: number; y: number; width: number; height: number } {
  const sizePx = vp.cellSize * (vp.scale || 1);
  return {
    x: (cell.x - vp.origin.x) * sizePx,
    y: (cell.y - vp.origin.y) * sizePx,
    width: sizePx,
    height: sizePx,
  };
}

export function isCellVisible(
  cell: { x: number; y: number },
  vp: Viewport,
  canvasPx: { w: number; h: number }
): boolean {
  const rect = boardToScreen(cell, vp);
  return (
    rect.x + rect.width > 0 &&
    rect.y + rect.height > 0 &&
    rect.x < canvasPx.w &&
    rect.y < canvasPx.h
  );
}
