import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { registerShortcuts } from '../src/editor/Shortcuts.js';
import { showModal, createEl } from '../src/util/dom.js';

describe('registerShortcuts', () => {
  it('ignores keys when typing in input or modal open', () => {
    const dom = new JSDOM(`<!doctype html><html><body><input id="name"></body></html>`, { pretendToBeVisual: true });
    const { window } = dom;
    (globalThis as any).window = window;
    (globalThis as any).document = window.document;

    let rotated = false;
    registerShortcuts(window.document, {
      rotate: () => {
        rotated = true;
      },
    });

    const input = window.document.getElementById('name') as HTMLInputElement;
    input.focus();
    input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'r', bubbles: true }));
    assert.equal(rotated, false);

    rotated = false;
    const body = createEl('div');
    showModal('Test', body, [{ label: 'OK', onClick: () => {} }]);
    window.document.body.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'r', bubbles: true }));
    assert.equal(rotated, false);
  });
});
