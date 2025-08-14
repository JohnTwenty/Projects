import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { loadBoard, getCellType, getCellsInSameSegment, findById } from '../dist/api/public.js';

const fixture = (p) => fs.readFileSync(path.join('fixtures', p), 'utf8');

describe('queries', () => {
  const segLib = fixture('lib_segments.txt');
  const tokLib = fixture('lib_tokens.txt');
  const missionText = fixture('mission.txt');
  const board = loadBoard(40, segLib, tokLib, missionText);

  it('getCellType returns base cell type and correct for covered', () => {
    assert.strictEqual(getCellType(board, { x: 0, y: 0 }), 0);
    assert.strictEqual(getCellType(board, { x: 12, y: 12 }), 1);
  });

  it('getCellsInSameSegment floods within owning rectangle', () => {
    const cells = getCellsInSameSegment(board, { x: 12, y: 12 });
    assert.strictEqual(cells.length, 25);
    assert.ok(cells.some((c) => c.x === 10 && c.y === 10));
    assert.ok(!cells.some((c) => c.x === 0 && c.y === 0));
  });

  it('findById returns correct object', () => {
    assert.strictEqual(findById(board, 'S1').type, 'L_room_5x5');
    assert.strictEqual(findById(board, 'D1').type, 'door');
  });
});

