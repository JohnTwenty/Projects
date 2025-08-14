import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EditorCore } from '../src/editor/EditorCore.js';
import type { BoardState, BoardStateAPI } from '../src/types.js';

function makeState(): BoardState {
  return {
    size: 10,
    segmentDefs: [{ segmentId: 'segA', name: 'SegA' }],
    tokenTypes: [{ type: 'tokA' }],
    segments: [],
    tokens: [],
  };
}

describe('EditorCore basics', () => {
  it('selecting and clearing', () => {
    const api: BoardStateAPI = {
      newBoard: () => makeState(),
      addSegment: () => {},
      updateSegment: () => {},
      removeSegment: () => {},
      addToken: () => {},
      updateToken: () => {},
      removeToken: () => {},
      importMission: () => {},
      exportMission: () => 'text',
      getCellType: () => -1,
    };
    const core = new EditorCore(api, makeState());
    core.selectSegment('segA');
    assert.equal(core.ui.ghost?.kind, 'segment');
    core.clearSelection();
    assert.equal(core.ui.ghost, null);
  });

  it('rotate ghost cycles', () => {
    const api: any = { newBoard: () => makeState() };
    const core = new EditorCore(api, makeState());
    core.selectSegment('segA');
    core.rotateGhost(1);
    assert.equal(core.ui.ghost?.rot, 90);
    core.rotateGhost(1);
    core.rotateGhost(1);
    core.rotateGhost(1);
    assert.equal(core.ui.ghost?.rot, 0);
    core.rotateGhost(-1);
    assert.equal(core.ui.ghost?.rot, 270);
  });

  it('placeGhost adds via API', () => {
    let added: any = null;
    const api: BoardStateAPI = {
      newBoard: () => makeState(),
      addSegment: (_s, seg) => {
        added = seg;
      },
      updateSegment: () => {},
      removeSegment: () => {},
      addToken: () => {},
      updateToken: () => {},
      removeToken: () => {},
      importMission: () => {},
      exportMission: () => 't',
      getCellType: () => -1,
    };
    const core = new EditorCore(api, makeState());
    core.selectSegment('segA');
    core.setGhostCell({ x: 1, y: 2 });
    const res = core.placeGhost();
    assert.equal(res.ok, true);
    assert.deepEqual(added.origin, { x: 1, y: 2 });
  });

  it('placeGhost adds token via API', () => {
    let added: any = null;
    const api: BoardStateAPI = {
      newBoard: () => makeState(),
      addSegment: () => {},
      updateSegment: () => {},
      removeSegment: () => {},
      addToken: (_s, tok) => {
        added = tok;
      },
      updateToken: () => {},
      removeToken: () => {},
      importMission: () => {},
      exportMission: () => 't',
      getCellType: () => -1,
    };
    const core = new EditorCore(api, makeState());
    core.selectToken('tokA');
    core.setGhostCell({ x: 3, y: 4 });
    const res = core.placeGhost();
    assert.equal(res.ok, true);
    assert.deepEqual(added.cells[0], { x: 3, y: 4 });
  });

  it('placeGhost handles API error', () => {
    const api: BoardStateAPI = {
      newBoard: () => makeState(),
      addSegment: () => {
        throw new Error('bad');
      },
      updateSegment: () => {},
      removeSegment: () => {},
      addToken: () => {},
      updateToken: () => {},
      removeToken: () => {},
      importMission: () => {},
      exportMission: () => 't',
      getCellType: () => -1,
    };
    const core = new EditorCore(api, makeState());
    core.selectSegment('segA');
    core.setGhostCell({ x: 1, y: 1 });
    const res = core.placeGhost();
    assert.equal(res.ok, false);
  });

  it('deleteSelection delegates', () => {
    let removed = '';
    const api: BoardStateAPI = {
      newBoard: () => makeState(),
      addSegment: () => {},
      updateSegment: () => {},
      removeSegment: (_s, id) => {
        removed = id;
      },
      addToken: () => {},
      updateToken: () => {},
      removeToken: () => {},
      importMission: () => {},
      exportMission: () => 't',
      getCellType: () => -1,
    };
    const core = new EditorCore(api, makeState());
    (core as any)._ui.selected = { kind: 'segment', id: 'abc' };
    core.deleteSelection();
    assert.equal(removed, 'abc');
  });
});
