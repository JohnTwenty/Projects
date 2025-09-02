import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { BasicRules } from '../dist/src/index.js';

test('marine moves forward when choosing move', async () => {
  const board = {
    size: 5,
    segments: [],
    tokens: [
      { instanceId: 'M1', type: 'marine', rot: 0, cells: [{ x: 0, y: 0 }] },
    ],
  };
  const rules = new BasicRules(board);
  rules.validate(board);

  let calls = 0;
  let moved;
  const player = {
    choose: async (options) => {
      calls++;
      if (calls === 1) {
        return options.find((o) => o.action === 'move');
      }
      moved = { ...board.tokens[0].cells[0] };
      board.tokens = [];
      return options[0];
    },
  };

  await rules.runGame(player, player);

  assert.deepEqual(moved, { x: 0, y: 1 });
});

test('door action toggles door', async () => {
  const board = {
    size: 5,
    segments: [],
    tokens: [
      { instanceId: 'M1', type: 'marine', rot: 0, cells: [{ x: 1, y: 1 }] },
      { instanceId: 'D1', type: 'door', rot: 0, cells: [{ x: 1, y: 2 }] },
    ],
  };
  const rules = new BasicRules(board);
  rules.validate(board);

  let calls = 0;
  let doorType;
  const player = {
    choose: async (options) => {
      calls++;
      if (calls === 1) {
        const doorOpt = options.find((o) => o.action === 'door');
        assert.ok(doorOpt);
        return doorOpt;
      }
      doorType = board.tokens.find((t) => t.instanceId === 'D1')?.type;
      board.tokens = [];
      return options[0];
    },
  };

  await rules.runGame(player, player);

  assert.equal(doorType, 'dooropen');
});

test('blocked open door not offered', async () => {
  const board = {
    size: 5,
    segments: [],
    tokens: [
      { instanceId: 'M1', type: 'marine', rot: 0, cells: [{ x: 1, y: 1 }] },
      { instanceId: 'M2', type: 'marine', rot: 0, cells: [{ x: 1, y: 2 }] },
      { instanceId: 'D1', type: 'dooropen', rot: 0, cells: [{ x: 1, y: 2 }] },
    ],
  };
  const rules = new BasicRules(board);
  rules.validate(board);

  let firstOptions;
  const player = {
    choose: async (options) => {
      firstOptions = options;
      board.tokens = [];
      return options[0];
    },
  };

  await rules.runGame(player, player);

  assert.ok(!firstOptions.some((o) => o.action === 'door'));
});

test('pass hands control to second player who can move alien', async () => {
  const board = {
    size: 5,
    segments: [],
    tokens: [
      { instanceId: 'M1', type: 'marine', rot: 0, cells: [{ x: 0, y: 0 }] },
      { instanceId: 'A1', type: 'alien', rot: 0, cells: [{ x: 2, y: 2 }] },
    ],
  };
  const rules = new BasicRules(board);
  rules.validate(board);

  let p1Calls = 0;
  let p2Calls = 0;
  let moved;
  const p1 = {
    choose: async (options) => {
      p1Calls++;
      const passOpt = options.find((o) => o.action === 'pass');
      assert.ok(passOpt);
      return passOpt;
    },
  };
  const p2 = {
    choose: async (options) => {
      p2Calls++;
      if (p2Calls === 1) {
        const moveOpt = options.find((o) => o.action === 'move');
        assert.ok(moveOpt);
        return moveOpt;
      }
      moved = { ...board.tokens.find((t) => t.instanceId === 'A1').cells[0] };
      board.tokens = [];
      return options[0];
    },
  };

  await rules.runGame(p1, p2);

  assert.equal(p1Calls, 1);
  assert.ok(p2Calls >= 1);
  assert.deepEqual(moved, { x: 2, y: 3 });
});

test('pass hands control to second player who can move blip', async () => {
  const board = {
    size: 5,
    segments: [],
    tokens: [
      { instanceId: 'M1', type: 'marine', rot: 0, cells: [{ x: 0, y: 0 }] },
      { instanceId: 'B1', type: 'blip', rot: 0, cells: [{ x: 2, y: 2 }] },
    ],
  };
  const rules = new BasicRules(board);
  rules.validate(board);

  let p1Calls = 0;
  let p2Calls = 0;
  let moved;
  const p1 = {
    choose: async (options) => {
      p1Calls++;
      const passOpt = options.find((o) => o.action === 'pass');
      assert.ok(passOpt);
      return passOpt;
    },
  };
  const p2 = {
    choose: async (options) => {
      p2Calls++;
      if (p2Calls === 1) {
        const moveOpt = options.find((o) => o.action === 'move');
        assert.ok(moveOpt);
        return moveOpt;
      }
      moved = { ...board.tokens.find((t) => t.instanceId === 'B1').cells[0] };
      board.tokens = [];
      return options[0];
    },
  };

  await rules.runGame(p1, p2);

  assert.equal(p1Calls, 1);
  assert.ok(p2Calls >= 1);
  assert.deepEqual(moved, { x: 2, y: 3 });
});

test('marine cannot move into blip', async () => {
  const board = {
    size: 5,
    segments: [],
    tokens: [
      { instanceId: 'M1', type: 'marine', rot: 0, cells: [{ x: 0, y: 0 }] },
      { instanceId: 'B1', type: 'blip', rot: 0, cells: [{ x: 0, y: 1 }] },
    ],
  };
  const rules = new BasicRules(board);
  rules.validate(board);

  let firstOptions;
  const player = {
    choose: async (options) => {
      firstOptions = options;
      board.tokens = [];
      return options[0];
    },
  };

  await rules.runGame(player, player);

  assert.ok(!firstOptions.some((o) => o.action === 'move'));
});

test('blip cannot move into marine', async () => {
  const board = {
    size: 5,
    segments: [],
    tokens: [
      { instanceId: 'M1', type: 'marine', rot: 0, cells: [{ x: 0, y: 0 }] },
      { instanceId: 'B1', type: 'blip', rot: 0, cells: [{ x: 2, y: 2 }] },
      { instanceId: 'M2', type: 'marine', rot: 0, cells: [{ x: 2, y: 3 }] },
    ],
  };
  const rules = new BasicRules(board);
  rules.validate(board);

  let blipOptions;
  const p1 = {
    choose: async (options) => {
      const passOpt = options.find((o) => o.action === 'pass');
      assert.ok(passOpt);
      return passOpt;
    },
  };
  const p2 = {
    choose: async (options) => {
      blipOptions = options;
      board.tokens = [];
      return options[0];
    },
  };

  await rules.runGame(p1, p2);

  assert.ok(!blipOptions.some((o) => o.action === 'move'));
});
