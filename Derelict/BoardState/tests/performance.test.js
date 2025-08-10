import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { newBoard, addSegment, addToken, getCellType, getTokensAt } from '../dist/api/public.js';

const fixture = (p) => fs.readFileSync(path.join('fixtures', p), 'utf8');

describe('performance', () => {
  const segLib = fixture('lib_segments.txt');
  const tokLib = fixture('lib_tokens.txt');

  it('50 segment placements + 100 token ops under 1s', () => {
    const board = newBoard(100, segLib, tokLib);
    const start = performance.now();
    for (let i = 0; i < 50; i++) {
      addSegment(board, { instanceId: `S${i}`, type: 'endcap', origin: { x: i * 2, y: i * 2 }, rot: 0 });
    }
    for (let i = 0; i < 100; i++) {
      addToken(board, { instanceId: `T${i}`, type: 'door', rot: 0, cells: [{ x: i, y: i }] });
    }
    const elapsed = performance.now() - start;
    assert.ok(elapsed < 1000);
  });

  it('10k getCellType + getTokensAt lookups remain fast', () => {
    const board = newBoard(40, segLib, tokLib);
    addSegment(board, { instanceId: 'S', type: 'endcap', origin: { x: 0, y: 0 }, rot: 0 });
    addToken(board, { instanceId: 'T', type: 'door', rot: 0, cells: [{ x: 0, y: 0 }] });
    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      const x = i % 40;
      const y = Math.floor(i / 40);
      getCellType(board, { x, y });
      getTokensAt(board, { x, y });
    }
    const elapsed = performance.now() - start;
    assert.ok(elapsed < 1000);
  });
});

