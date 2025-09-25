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
      assault: new DummyButton(),
      shoot: new DummyButton(),
      turnLeft: new DummyButton(),
      turnRight: new DummyButton(),
      manipulate: new DummyButton(),
      overwatch: new DummyButton(),
      reveal: new DummyButton(),
      deploy: new DummyButton(),
      guard: new DummyButton(),
      command: new DummyButton(),
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

test('move option takes precedence over door option on same cell', async () => {
  const board = { size: 1, segments: [], tokens: [] };
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
      assault: new DummyButton(),
      shoot: new DummyButton(),
      turnLeft: new DummyButton(),
      turnRight: new DummyButton(),
      manipulate: new DummyButton(),
      overwatch: new DummyButton(),
      reveal: new DummyButton(),
      deploy: new DummyButton(),
      guard: new DummyButton(),
      command: new DummyButton(),
      pass: new DummyButton(),
    },
  };

  const game = new Game(board, renderer, rules, player, player, ui);
  const moveOpt = { type: 'action', action: 'move', coord: { x: 0, y: 0 } };
  const doorOpt = { type: 'action', action: 'door', coord: { x: 0, y: 0 } };
  const options = [doorOpt, moveOpt];

  const promise = game.choose(options);
  assert.equal(created.length, 2);

  const moveOverlay = created.find((e) => e.style.border === '2px solid green');
  const doorOverlay = created.find((e) => e.style.border === '2px solid blue');
  assert.ok(moveOverlay && doorOverlay);
  assert.ok(Number(moveOverlay.style.zIndex) > Number(doorOverlay.style.zIndex));

  moveOverlay.listeners.click({ stopPropagation() {} });
  const result = await promise;
  assert.deepEqual(result, moveOpt);

  globalThis.document = origDoc;
});

test('move option takes precedence over assault option on same cell', async () => {
  const board = { size: 1, segments: [], tokens: [] };
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
      assault: new DummyButton(),
      shoot: new DummyButton(),
      turnLeft: new DummyButton(),
      turnRight: new DummyButton(),
      manipulate: new DummyButton(),
      overwatch: new DummyButton(),
      reveal: new DummyButton(),
      deploy: new DummyButton(),
      guard: new DummyButton(),
      command: new DummyButton(),
      pass: new DummyButton(),
    },
  };

  const game = new Game(board, renderer, rules, player, player, ui);
  const assaultOpt = {
    type: 'action',
    action: 'assault',
    coord: { x: 0, y: 0 },
  };
  const moveOpt = { type: 'action', action: 'move', coord: { x: 0, y: 0 } };
  const options = [moveOpt, assaultOpt];

  const promise = game.choose(options);
  assert.equal(created.length, 2);

  const assaultOverlay = created.find(
    (e) => e.style.border === '2px solid red'
  );
  const moveOverlay = created.find(
    (e) => e.style.border === '2px solid green'
  );
  assert.ok(assaultOverlay && moveOverlay);
  assert.ok(
    Number(moveOverlay.style.zIndex) > Number(assaultOverlay.style.zIndex)
  );

  moveOverlay.listeners.click({ stopPropagation() {} });
  const result = await promise;
  assert.deepEqual(result, moveOpt);

  globalThis.document = origDoc;
});

test('door option takes precedence over assault option on same cell', async () => {
  const board = { size: 1, segments: [], tokens: [] };
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
      assault: new DummyButton(),
      shoot: new DummyButton(),
      turnLeft: new DummyButton(),
      turnRight: new DummyButton(),
      manipulate: new DummyButton(),
      overwatch: new DummyButton(),
      reveal: new DummyButton(),
      deploy: new DummyButton(),
      guard: new DummyButton(),
      command: new DummyButton(),
      pass: new DummyButton(),
    },
  };

  const game = new Game(board, renderer, rules, player, player, ui);
  const doorOpt = { type: 'action', action: 'door', coord: { x: 0, y: 0 } };
  const assaultOpt = {
    type: 'action',
    action: 'assault',
    coord: { x: 0, y: 0 },
  };
  const options = [assaultOpt, doorOpt];

  const promise = game.choose(options);
  assert.equal(created.length, 2);

  const doorOverlay = created.find((e) => e.style.border === '2px solid blue');
  const assaultOverlay = created.find((e) => e.style.border === '2px solid red');
  assert.ok(doorOverlay && assaultOverlay);
  assert.ok(Number(doorOverlay.style.zIndex) > Number(assaultOverlay.style.zIndex));

  doorOverlay.listeners.click({ stopPropagation() {} });
  const result = await promise;
  assert.deepEqual(result, doorOpt);

  globalThis.document = origDoc;
});

test('binary action choice uses modal dialog', async () => {
  const board = { size: 1, segments: [], tokens: [] };
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

  const body = new DummyElement();
  const origDoc = globalThis.document;
  globalThis.document = {
    createElement: () => new DummyElement(),
    body,
  };

  const ui = {
    container: new DummyElement(),
    cellToRect: () => ({ x: 0, y: 0, width: 1, height: 1 }),
    buttons: {
      activate: new DummyButton(),
      move: new DummyButton(),
      assault: new DummyButton(),
      shoot: new DummyButton(),
      turnLeft: new DummyButton(),
      turnRight: new DummyButton(),
      manipulate: new DummyButton(),
      reveal: new DummyButton(),
      deploy: new DummyButton(),
      guard: new DummyButton(),
      command: new DummyButton(),
      pass: new DummyButton(),
    },
  };

  const game = new Game(board, renderer, rules, player, player, ui);
  const rerollOpt = { type: 'action', action: 'reroll' };
  const acceptOpt = { type: 'action', action: 'accept' };
  const options = [rerollOpt, acceptOpt];

  const promise = game.choose(options);
  assert.equal(body.children.length, 1);
  const overlay = body.children[0];
  const dlg = overlay.children[0];
  const actions = dlg.children[1];
  const btn = actions.children[0];
  btn.listeners.click({});
  const result = await promise;
  assert.deepEqual(result, rerollOpt);

  globalThis.document = origDoc;
});

