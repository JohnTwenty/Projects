import test from 'node:test';
import assert from 'node:assert/strict';
import { boardToScreen, isCellVisible } from '../src/math.js';
import type { Viewport } from '../src/types.js';

test('boardToScreen maps correctly with scale and origin', () => {
  const vp: Viewport = { origin: { x: 1, y: 2 }, scale: 2, cellSize: 16 };
  const rect = boardToScreen({ x: 3, y: 4 }, vp);
  assert.deepEqual(rect, { x: 64, y: 64, width: 32, height: 32 });
});

test('isCellVisible inside and outside bounds', () => {
  const vp: Viewport = { origin: { x: 0, y: 0 }, scale: 1, cellSize: 32 };
  const canvasPx = { w: 64, h: 64 };
  assert.equal(isCellVisible({ x: 1, y: 1 }, vp, canvasPx), true);
  assert.equal(isCellVisible({ x: -1, y: 0 }, vp, canvasPx), false);
  assert.equal(isCellVisible({ x: 2, y: 0 }, vp, canvasPx), false);
});
