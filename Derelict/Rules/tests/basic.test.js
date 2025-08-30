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

  const player = {
    chooseMarine: async (options) => options[0],
    chooseAction: async () => 'move',
  };

  await rules.runGame(player, player);

  assert.deepEqual(board.tokens[0].cells[0], { x: 1, y: 0 });
});
