import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { HumanPlayer, RandomAI } from '../dist/src/index.js';

test('HumanPlayer delegates to GameApi.chooseCell', async () => {
  const options = [{ x: 0, y: 0 }];
  let called = false;
  const game = {
    chooseCell: async (allowed) => {
      called = true;
      assert.deepEqual(allowed, options);
      return options[0];
    },
    messageBox: async () => true,
    highlightCells: () => {},
    clearHighlights: () => {},
  };
  const player = new HumanPlayer(game);
  const choice = await player.chooseMarine(options);
  assert.deepEqual(choice, options[0]);
  assert.ok(called);
});

test('RandomAI chooses from options', async () => {
  const options = [{ x: 1, y: 1 }];
  const ai = new RandomAI();
  const choice = await ai.chooseMarine(options);
  assert.deepEqual(choice, options[0]);
});
