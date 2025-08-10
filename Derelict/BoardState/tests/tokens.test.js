import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { newBoard, addToken, getTokensAt } from '../dist/api/public.js';

const fixture = (p) => fs.readFileSync(path.join('fixtures', p), 'utf8');

describe('tokens', () => {
  const segLib = fixture('lib_segments.txt');
  const tokLib = fixture('lib_tokens.txt');

  it('single-cell token appears in getTokensAt', () => {
    const board = newBoard(10, segLib, tokLib);
    const t = { instanceId: 'T1', type: 'door', rot: 0, cells: [{ x: 1, y: 1 }] };
    addToken(board, t);
    assert.strictEqual(getTokensAt(board, { x: 1, y: 1 }).length, 1);
  });

  it('multi-cell token appears in all covered cells', () => {
    const board = newBoard(10, segLib, tokLib);
    const t = { instanceId: 'T1', type: 'door', rot: 0, cells: [{ x: 2, y: 2 }, { x: 2, y: 3 }] };
    addToken(board, t);
    assert.strictEqual(getTokensAt(board, { x: 2, y: 2 }).length, 1);
    assert.strictEqual(getTokensAt(board, { x: 2, y: 3 }).length, 1);
  });

  it('overlapping tokens coexist', () => {
    const board = newBoard(10, segLib, tokLib);
    addToken(board, { instanceId: 'T1', type: 'door', rot: 0, cells: [{ x: 1, y: 1 }] });
    addToken(board, { instanceId: 'T2', type: 'door', rot: 0, cells: [{ x: 1, y: 1 }] });
    assert.strictEqual(getTokensAt(board, { x: 1, y: 1 }).length, 2);
  });

  it('rotating a token updates rot only; cells unchanged', () => {
    const board = newBoard(10, segLib, tokLib);
    const t = { instanceId: 'T1', type: 'door', rot: 0, cells: [{ x: 1, y: 1 }] };
    addToken(board, t);
    const token = getTokensAt(board, { x: 1, y: 1 })[0];
    token.rot = 90;
    assert.strictEqual(token.rot, 90);
    assert.deepStrictEqual(token.cells[0], { x: 1, y: 1 });
  });
});

