import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { HumanPlayer, RandomAI } from '../dist/src/index.js';

test('HumanPlayer delegates to GameApi.choose', async () => {
  const options = [{ type: 'marine', coord: { x: 0, y: 0 } }];
  let called = false;
  const game = {
    choose: async (allowed) => {
      called = true;
      assert.deepEqual(allowed, options);
      return options[0];
    },
    messageBox: async () => true,
  };
  const player = new HumanPlayer(game);
  const choice = await player.choose(options);
  assert.deepEqual(choice, options[0]);
  assert.ok(called);
});

test('RandomAI chooses from options', async () => {
  const options = [{ type: 'marine', coord: { x: 1, y: 1 } }];
  const ai = new RandomAI();
  const choice = await ai.choose(options);
  assert.deepEqual(choice, options[0]);
});
