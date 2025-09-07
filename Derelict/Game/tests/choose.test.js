import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../dist/src/index.js';

test('choose highlights activation options for different token types', async () => {
  const board = {
    size: 2,
    segments: [],
    tokens: [
      { id: 'a', type: 'alien', facing: 'north', cells: [{ x: 0, y: 0 }] },
      { id: 'b', type: 'blip', facing: 'north', cells: [{ x: 1, y: 0 }] },
    ],
  };

  const renderer = { render() {} };
  const rules = { validate() {}, runGame: async () => {} };
  const player = { choose: async () => ({ type: 'action', action: 'pass' }) };

  class DummyElement {
    constructor() {
      this.style = {};
      this.children = [];
      this.listeners = {};
      this.classList = { toggle() {}, remove() {}, add() {} };
    }
    appendChild(el) {
      this.children.push(el);
    }
    addEventListener(name, fn) {
      this.listeners[name] = fn;
    }
    removeEventListener(name) {
      delete this.listeners[name];
    }
    remove() {}
  }
  class DummyButton extends DummyElement {
    constructor() {
      super();
      this.disabled = false;
    }
  }

  const created = [];
  const origDoc = globalThis.document;
  globalThis.document = {
    createElement: () => {
      const el = new DummyElement();
      created.push(el);
      return el;
    },
  };

  const ui = {
    container: new DummyElement(),
    cellToRect: () => ({ x: 0, y: 0, width: 1, height: 1 }),
    buttons: {
      activate: new DummyButton(),
      move: new DummyButton(),
      turnLeft: new DummyButton(),
      turnRight: new DummyButton(),
      manipulate: new DummyButton(),
      reveal: new DummyButton(),
      deploy: new DummyButton(),
      pass: new DummyButton(),
    },
  };

  const game = new Game(board, renderer, rules, player, player, ui);
  const options = [
    { type: 'action', action: 'activate', coord: { x: 0, y: 0 } },
    { type: 'action', action: 'activate', coord: { x: 1, y: 0 } },
  ];

  const promise = game.choose(options);
  assert.equal(created.length, 2);

  created[1].listeners.click({ stopPropagation() {} });
  const result = await promise;
  assert.deepEqual(result, options[1]);

  globalThis.document = origDoc;
});

