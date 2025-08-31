import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSegmentDefs } from '../dist/src/segments.js';
import { createRenderer } from '../../Renderer/dist/renderer.js';

test('renderer uses segment dimensions for bounds', () => {
  const segLib = `segment a 2x2\n1 1\n1 1\nendsegment`;
  const segmentDefs = parseSegmentDefs(segLib);
  const board = {
    size: 5,
    segments: [
      { instanceId: 's1', type: 'a', origin: { x: 0, y: 0 }, rot: 0 },
    ],
    tokens: [],
    segmentDefs,
    getCellType: () => 0,
  };

  const renderer = createRenderer();
  renderer.resize(10, 10);
  renderer.loadSpriteManifestFromText('');

  const calls = { strokeRect: [] };
  const ctx = {
    canvas: { width: 10, height: 10 },
    save() {},
    restore() {},
    scale() {},
    clearRect() {},
    fillRect() {},
    drawImage() {},
    translate() {},
    rotate() {},
    strokeRect(...a) {
      calls.strokeRect.push(a);
    },
    lineWidth: 0,
    strokeStyle: '',
  };

  const viewport = { origin: { x: 0, y: 0 }, scale: 1, cellSize: 1, dpr: 1 };
  renderer.render(ctx, board, viewport);
  assert.equal(calls.strokeRect.length, 1);
  const [x, y, w, h] = calls.strokeRect[0];
  assert.equal(w, 2);
  assert.equal(h, 2);
  assert.equal(x, 0);
  assert.equal(y, 0);
});
