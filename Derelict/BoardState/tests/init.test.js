import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { newBoard, getCellType } from '../dist/api/public.js';

const fixture = (p) => fs.readFileSync(path.join('fixtures', p), 'utf8');

describe('initialization', () => {
  const segLib = fixture('lib_segments.txt');
  const tokLib = fixture('lib_tokens.txt');
  it('new board has 40x40 walls', () => {
    const board = newBoard(40, segLib, tokLib);
    assert.equal(board.size, 40);
    assert.equal(typeof board.getCellType, 'function');
    assert.strictEqual(getCellType(board, { x: 0, y: 0 }), 0);
    assert.strictEqual(getCellType(board, { x: 39, y: 39 }), 0);
  });
});
