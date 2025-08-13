import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

test('bootstrap initializes without errors', async () => {
  const dom = new JSDOM(`<!DOCTYPE html><div id="app"></div>`, { url: 'http://localhost/' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.HTMLCanvasElement = dom.window.HTMLCanvasElement;
  globalThis.CustomEvent = dom.window.CustomEvent;
  globalThis.devicePixelRatio = 1;
  globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

  class DummyContext2D {
    constructor(canvas) { this.canvas = canvas; }
    save() {}
    restore() {}
    scale() {}
    clearRect() {}
    fillRect() {}
    translate() {}
    rotate() {}
    drawImage() {}
    beginPath() {}
    moveTo() {}
    lineTo() {}
    stroke() {}
  }
  HTMLCanvasElement.prototype.getContext = function () {
    return new DummyContext2D(this);
  };
  HTMLCanvasElement.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600 });

  globalThis.fetch = async (resource) => {
    const filePath = path.join(publicDir, resource);
    const text = await readFile(filePath, 'utf8');
    return { text: async () => text };
  };

  await import('../public/main.js');
  // Allow async bootstrap to finish fetching assets
  await new Promise((r) => setTimeout(r, 50));

  const tokens = document.querySelectorAll('#token-palette button');
  assert.ok(tokens.length > 0, 'token buttons populated');
});
