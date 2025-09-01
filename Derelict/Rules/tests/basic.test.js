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
