import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cellToPixel, pixelToCell, clampCell, TILE_SIZE } from '../src/util/geometry.js';

describe('geometry helpers', () => {
  it('cell to pixel and back', () => {
    const cell = { x: 2, y: 3 };
    const px = cellToPixel(cell);
    assert.deepEqual(px, { x: 2 * TILE_SIZE, y: 3 * TILE_SIZE });
    const back = pixelToCell(px);
    assert.deepEqual(back, cell);
  });

  it('clampCell bounds', () => {
    const clamped = clampCell({ x: -1, y: 12 }, 10);
    assert.deepEqual(clamped, { x: 0, y: 9 });
  });
});
