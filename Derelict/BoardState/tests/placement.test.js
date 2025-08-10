import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { newBoard, addSegment, getCellType } from '../dist/api/public.js';
import { ERR_OVERLAP } from '../dist/core/errors.js';

const fixture = (p) => fs.readFileSync(path.join('fixtures', p), 'utf8');

describe('segment placement', () => {
  const segLib = fixture('lib_segments.txt');
  const tokLib = fixture('lib_tokens.txt');

  it('place non-overlapping segments', () => {
    const board = newBoard(40, segLib, tokLib);
    addSegment(board, { instanceId: 'S1', type: 'L_room_5x5', origin: { x: 0, y: 0 }, rot: 0 });
    addSegment(board, { instanceId: 'S2', type: 'endcap', origin: { x: 10, y: 10 }, rot: 0 });
    assert.strictEqual(board.segments.length, 2);
  });

  it('place overlapping segments -> ERR_OVERLAP with conflict coord', () => {
    const board = newBoard(40, segLib, tokLib);
    addSegment(board, { instanceId: 'S1', type: 'L_room_5x5', origin: { x: 0, y: 0 }, rot: 0 });
    assert.throws(
      () => addSegment(board, { instanceId: 'S2', type: 'endcap', origin: { x: 0, y: 0 }, rot: 0 }),
      (e) => e.code === ERR_OVERLAP
    );
  });

  it('rotations 0/90/180/270 map correctly', () => {
    const origin = { x: 5, y: 5 };
    const positions = [
      { rot: 0, coord: { x: 6, y: 6 } },
      { rot: 90, coord: { x: 5, y: 6 } },
      { rot: 180, coord: { x: 5, y: 5 } },
      { rot: 270, coord: { x: 6, y: 5 } },
    ];
    for (const [i, p] of positions.entries()) {
      const board2 = newBoard(20, segLib, tokLib);
      addSegment(board2, { instanceId: `S${i}`, type: 'endcap', origin, rot: p.rot });
      assert.strictEqual(getCellType(board2, p.coord), 1);
    }
  });
});

