import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { newBoard, addSegment, addToken } from '../dist/api/public.js';
import { serializeSave, deserializeSave } from '../dist/io/save.serialize.js';
import { parseSegmentLibrary } from '../dist/io/segmentLib.parse.js';
import { parseTokenLibrary } from '../dist/io/tokenLib.parse.js';
import { ERR_BAD_COORD } from '../dist/core/errors.js';

const fixture = (p) => fs.readFileSync(path.join('fixtures', p), 'utf8');

describe('serialization', () => {
  const segLibText = fixture('lib_segments.txt');
  const tokLibText = fixture('lib_tokens.txt');
  const segDefs = parseSegmentLibrary(segLibText);
  const tokDefs = parseTokenLibrary(tokLibText);

  it('save JSON round-trip preserves IDs/attrs', () => {
    const board = newBoard(40, segLibText, tokLibText);
    addSegment(board, { instanceId: 'S1', type: 'endcap', origin: { x: 1, y: 1 }, rot: 0 });
    addToken(board, { instanceId: 'T1', type: 'door', rot: 0, cells: [{ x: 2, y: 2 }], attrs: { a: 1 } });
    const json = serializeSave(board);
    const board2 = deserializeSave(json, segDefs, tokDefs);
    delete board.getCellType;
    delete board2.getCellType;
    assert.deepStrictEqual(board2, board);
  });

  it('board resize errors when shrinking below existing coords', () => {
    const board = newBoard(40, segLibText, tokLibText);
    addSegment(board, { instanceId: 'S1', type: 'endcap', origin: { x: 10, y: 10 }, rot: 0 });
    const json = serializeSave(board);
    const small = JSON.stringify({ ...JSON.parse(json), size: 5 });
    assert.throws(() => deserializeSave(small, segDefs, tokDefs), (e) => e.code === ERR_BAD_COORD);
  });
});

