export const TILE_SIZE = 32;
export function cellToPixel(cell, tileSize = TILE_SIZE) {
    return { x: cell.x * tileSize, y: cell.y * tileSize };
}
export function pixelToCell(pos, tileSize = TILE_SIZE) {
    return { x: Math.floor(pos.x / tileSize), y: Math.floor(pos.y / tileSize) };
}
export function clampCell(cell, size) {
    return {
        x: Math.min(Math.max(0, cell.x), size - 1),
        y: Math.min(Math.max(0, cell.y), size - 1),
    };
}
