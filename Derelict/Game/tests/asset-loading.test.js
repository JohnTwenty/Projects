import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createRenderer } from '../../Renderer/dist/src/renderer.js';

test('renderer re-renders after image load', async () => {
  class FakeImage {
    constructor() {
      this._listeners = new Map();
      this.width = 0;
      this.height = 0;
    }
    addEventListener(name, fn) {
      this._listeners.set(name, fn);
    }
    set src(_value) {
      setTimeout(() => {
        this.width = 1;
        this.height = 1;
        const fn = this._listeners.get('load');
        if (fn) fn();
      }, 0);
    }
  }

  const OrigImage = globalThis.Image;
  globalThis.Image = FakeImage;

  const renderer = createRenderer();
  renderer.loadSpriteManifestFromText('0 foo.png 0 0 0 0 0 0 0');

  const ctx = {
    canvas: { width: 0, height: 0 },
    save() {},
    restore() {},
    scale() {},
    clearRect() {},
    fillRect() {},
    drawImage() {},
    translate() {},
    rotate() {},
    globalAlpha: 1,
  };

  renderer.resize(1, 1);

  const viewport = { origin: { x: 0, y: 0 }, scale: 1, cellSize: 1, dpr: 1 };

  let currentState = null;
  let renders = 0;
  function render(state) {
    renders++;
    currentState = state;
    renderer.render(ctx, state, viewport);
  }

  const cache = new Map();
  renderer.setAssetResolver((key) => {
    let img = cache.get(key);
    if (!img) {
      img = new Image();
      img.addEventListener('load', () => {
        if (currentState) render(currentState);
      });
      img.src = key;
      cache.set(key, img);
    }
    return img;
  });

  const board = { size: 1, segments: [], tokens: [], getCellType: () => 0 };

  render(board);
  assert.equal(renders, 1);

  await new Promise((r) => setTimeout(r, 5));

  assert.equal(renders, 2);

  globalThis.Image = OrigImage;
});

