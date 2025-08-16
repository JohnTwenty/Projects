import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EditorCore } from '../src/editor/EditorCore.js';
// @ts-ignore -- use compiled BoardState API
import * as BS from '../../../BoardState/dist/api/public.js';

// ensure that placing a segment via the editor mutates the underlying BoardState

const segLib = `legend: 0=wall, 1=corridor
segment segA 1x1
1
endsegment
`;

const tokLib = `version: 1
type=tokA
`;

describe('segment placement integration', () => {
  it('places segment and updates board state', () => {
    const state = BS.newBoard(5, segLib, tokLib);
    const core = new EditorCore(BS as any, state as any);
    core.selectSegment('segA');
    core.setGhostCell({ x: 2, y: 3 });
    const res = core.placeGhost();
    assert.equal(res.ok, true);
    assert.equal(BS.getCellType(state as any, { x: 2, y: 3 }), 1);
    assert.equal(state.segments.length, 1);
  });
});

