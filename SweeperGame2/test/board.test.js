import test from 'node:test';
import assert from 'node:assert/strict';
import Board from '../board.js';

test('board initializes with bombs and counts', () => {
  const bombs = [[0,0],[2,2],[4,4],[1,3],[3,1]];
  const board = new Board(5, bombs.length, undefined, bombs);
  let bombCount = 0;
  board.forEachCell(cell => { if (cell.bomb) bombCount++; });
  assert.equal(bombCount, bombs.length);
  assert.equal(board.cells[0][1].count, 1);
  assert.equal(board.cells[1][1].count, 2);
});

test('reveal and revealAllBombs', () => {
  const bombs = [[0,0]];
  const board = new Board(2, bombs.length, undefined, bombs);
  const hit = board.reveal(0,0);
  assert.equal(hit.bomb, true);
  board.revealAllBombs();
  assert.equal(board.cells[0][0].revealed, true);
});

test('checkWin detects win', () => {
  const bombs = [[0,0]];
  const board = new Board(2, bombs.length, undefined, bombs);
  board.reveal(0,1);
  board.reveal(1,0);
  board.reveal(1,1);
  assert.equal(board.checkWin(), true);
});

test('random bomb placement uses rng', () => {
  const board = new Board(2, 1, () => 0);
  assert.equal(board.cells[0][0].bomb, true);
});

test('checkWin false when unfinished', () => {
  const board = new Board(2, 1, undefined, [[0,0]]);
  board.reveal(1,1);
  assert.equal(board.checkWin(), false);
});
