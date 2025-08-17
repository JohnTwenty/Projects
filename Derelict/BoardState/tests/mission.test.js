import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { newBoard, importBoardText, exportBoardText } from '../dist/api/public.js';

const fixture = (p) => fs.readFileSync(path.join('fixtures', p), 'utf8');

describe('mission import/export', () => {
  const segLib = fixture('lib_segments.txt');
  const tokLib = fixture('lib_tokens.txt');
  const missionText = fixture('mission.txt');

  it('import mission builds expected BoardState', () => {
    const board = newBoard(40, segLib, tokLib);
    importBoardText(board, missionText);
    assert.strictEqual(board.segments.length, 3);
    assert.strictEqual(board.tokens.length, 2);
  });

  it('export -> import preserves IDs', () => {
    const board = newBoard(40, segLib, tokLib);
    importBoardText(board, missionText);
    const text = exportBoardText(board, 'Test');
    const board2 = newBoard(40, segLib, tokLib);
    importBoardText(board2, text);
    delete board.getCellType;
    delete board2.getCellType;
    assert.deepStrictEqual(board2, board);
  });

  it('deterministic export ordering', () => {
    const board = newBoard(40, segLib, tokLib);
    importBoardText(board, missionText);
    const text1 = exportBoardText(board, 'Test');
    const text2 = exportBoardText(board, 'Test');
    assert.strictEqual(text1, text2);
  });

  it('export skips tokens missing instanceId', () => {
    const board = newBoard(40, segLib, tokLib);
    importBoardText(board, missionText);
    board.tokens.push({ type: 'door', rot: 0, cells: [{ x: 0, y: 0 }] });
    assert.doesNotThrow(() => exportBoardText(board, 'Test'));
  });
});

