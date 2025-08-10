import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { loadBoard, saveBoard } from '../dist/api/public.js';

const fixture = (p) => fs.readFileSync(path.join('fixtures', p), 'utf8');

describe('mission import/export', () => {
  const segLib = fixture('lib_segments.txt');
  const tokLib = fixture('lib_tokens.txt');
  const missionText = fixture('mission.txt');

  it('import mission builds expected BoardState', () => {
    const board = loadBoard(40, segLib, tokLib, missionText);
    assert.strictEqual(board.segments.length, 3);
    assert.strictEqual(board.tokens.length, 2);
  });

  it('export -> import preserves IDs', () => {
    const board = loadBoard(40, segLib, tokLib, missionText);
    const text = saveBoard(board, 'Test');
    const board2 = loadBoard(40, segLib, tokLib, text);
    assert.deepStrictEqual(board2, board);
  });

  it('deterministic export ordering', () => {
    const board = loadBoard(40, segLib, tokLib, missionText);
    const text1 = saveBoard(board, 'Test');
    const text2 = saveBoard(board, 'Test');
    assert.strictEqual(text1, text2);
  });
});

