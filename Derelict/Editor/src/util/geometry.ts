export const TILE_SIZE = 32;

export function cellToPixel(cell: { x: number; y: number }) {
  return { x: cell.x * TILE_SIZE, y: cell.y * TILE_SIZE };
}

export function pixelToCell(pos: { x: number; y: number }) {
  return { x: Math.floor(pos.x / TILE_SIZE), y: Math.floor(pos.y / TILE_SIZE) };
}

export function clampCell(cell: { x: number; y: number }, size: number) {
  return {
    x: Math.min(Math.max(0, cell.x), size - 1),
    y: Math.min(Math.max(0, cell.y), size - 1),
  };
}
