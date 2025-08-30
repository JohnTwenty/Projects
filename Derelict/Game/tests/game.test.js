import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { Game } from '../dist/src/index.js';

test('start validates and runs rules', async () => {
  const board = { size: 5, segments: [], tokens: [] };
  const calls = [];
  const renderer = {
    render: (state) => {
      calls.push('render');
      assert.strictEqual(state, board);
    },
  };
  const rules = {
    validate: (s) => {
      calls.push('validate');
      assert.strictEqual(s, board);
    },
    runGame: async () => {
      calls.push('run');
    },
  };
  const player = {
    choose: async () => ({ type: 'marine', coord: { x: 0, y: 0 } }),
  };
  const game = new Game(board, renderer, rules, player, player);
  await game.start();
  assert.deepEqual(calls, ['render', 'validate', 'run']);
});
