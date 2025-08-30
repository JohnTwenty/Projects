import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EditorCore } from '../src/editor/EditorCore.js';
// @ts-ignore -- use compiled BoardState API
import * as BS from '../../../BoardState/dist/api/public.js';
// ensure that placing a segment via the editor mutates the underlying BoardState
const segLib = `legend: 0=wall, 1=corridor
segment corridor_5 3x5
0 0 0 0 0
1 1 1 1 1
0 0 0 0 0
endsegment
`;
const tokLib = `version: 1
type=tokA
`;
describe('segment placement integration', () => {
    it('places rotated segment and updates board state', () => {
        const state = BS.newBoard(10, segLib, tokLib);
        const core = new EditorCore(BS, state);
        core.selectSegment('corridor_5');
        core.rotateGhost(1);
        core.setGhostCell({ x: 0, y: 0 });
        const res = core.placeGhost();
        assert.equal(res.ok, true);
        assert.equal(BS.getCellType(state, { x: 1, y: 0 }), 1);
        assert.equal(BS.getCellType(state, { x: 0, y: 1 }), 0);
        assert.equal(state.segments.length, 1);
        assert.equal(state.segments[0].rot, 90);
    });
});
