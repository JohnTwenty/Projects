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
        return options[0]; // choose marine
      }
      if (calls === 2) {
        return options.find((o) => o.action === 'move');
      }
      moved = { ...board.tokens[0].cells[0] };
      // After moving once, exit by selecting other and removing marine
      board.tokens = [];
      return options.find((o) => o.action === 'selectOther');
    },
  };

  await rules.runGame(player, player);

  assert.deepEqual(moved, { x: 0, y: 1 });
});
