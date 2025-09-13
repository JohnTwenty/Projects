import { test } from "node:test";
import assert from "node:assert/strict";
import { Game } from "../dist/src/index.js";

// Ensure that calling dispose clears overlays and listeners

test("dispose clears overlays and listeners", () => {
  const board = { size: 2, segments: [], tokens: [] };
  const renderer = { render() {} };
  const rules = { validate() {}, runGame: async () => {} };
  const player = { choose: async () => ({ type: "action", action: "pass" }) };

  class DummyElement {
    constructor() {
      this.style = {};
      this.children = [];
      this.parent = null;
      this.listeners = {};
      this.classList = { toggle() {}, remove() {}, add() {} };
    }
    appendChild(el) {
      el.parent = this;
      this.children.push(el);
    }
    addEventListener(name, fn) {
      this.listeners[name] = fn;
    }
    removeEventListener(name) {
      delete this.listeners[name];
    }
    remove() {
      if (this.parent) {
        const idx = this.parent.children.indexOf(this);
        if (idx >= 0) this.parent.children.splice(idx, 1);
      }
    }
  }
  class DummyButton extends DummyElement {
    constructor() {
      super();
      this.disabled = false;
    }
  }

  const origDoc = globalThis.document;
  globalThis.document = {
    createElement: () => new DummyElement(),
    addEventListener() {},
    removeEventListener() {},
  };

  const ui = {
    container: new DummyElement(),
    cellToRect: () => ({ x: 0, y: 0, width: 1, height: 1 }),
    buttons: {
      activate: new DummyButton(),
      move: new DummyButton(),
      assault: new DummyButton(),
      turnLeft: new DummyButton(),
      turnRight: new DummyButton(),
      manipulate: new DummyButton(),
      reveal: new DummyButton(),
      deploy: new DummyButton(),
      guard: new DummyButton(),
      reroll: new DummyButton(),
      accept: new DummyButton(),
      pass: new DummyButton(),
    },
  };

  const game = new Game(board, renderer, rules, player, player, ui);
  game.choose([{ type: "action", action: "move", coord: { x: 0, y: 0 } }]);
  assert.ok(ui.container.children.length > 0);

  game.dispose();
  assert.equal(ui.container.children.length, 0);
  assert.equal(Object.keys(ui.buttons.move.listeners).length, 0);

  globalThis.document = origDoc;
});
