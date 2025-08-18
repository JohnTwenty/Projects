import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EditorCore } from '../src/editor/EditorCore.js';
import type { BoardState, BoardStateAPI } from '../src/types.js';

function makeState(): BoardState {
  return {
    size: 10,
    missionName: 'Unnamed Mission',
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
      addSegment: (_s, _seg) => {},
      removeSegment: () => {},
      addToken: () => {},
      removeToken: () => {},
      importBoardText: () => {},
      exportBoardText: () => 'text',
      getCellType: () => -1,
      findById: () => undefined,
    };
    const core = new EditorCore(api, makeState());
    core.selectSegment('segA');
    assert.equal(core.ui.ghost?.kind, 'segment');
    core.clearSelection();
    assert.equal(core.ui.ghost, null);
  });

  it('rotate ghost cycles', () => {
    const api: any = { newBoard: () => makeState(), findById: () => undefined };
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
      removeSegment: () => {},
      addToken: () => {},
      removeToken: () => {},
      importBoardText: () => {},
      exportBoardText: () => 't',
      getCellType: () => -1,
      findById: () => undefined,
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
      addSegment: (_s, _seg) => {},
      removeSegment: () => {},
      addToken: (_s, tok) => {
        added = tok;
      },
      removeToken: () => {},
      importBoardText: () => {},
      exportBoardText: () => 't',
      getCellType: () => -1,
      findById: () => undefined,
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
      removeSegment: () => {},
      addToken: () => {},
      removeToken: () => {},
      importBoardText: () => {},
      exportBoardText: () => 't',
      getCellType: () => -1,
      findById: () => undefined,
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
      addSegment: (_s, _seg) => {},
      removeSegment: (_s, id) => {
        removed = id;
      },
      addToken: () => {},
      removeToken: () => {},
      importBoardText: () => {},
      exportBoardText: () => 't',
      getCellType: () => -1,
      findById: () => undefined,
    };
    const core = new EditorCore(api, makeState());
    (core as any)._ui.selected = { kind: 'segment', id: 'abc' };
    core.deleteSelection();
    assert.equal(removed, 'abc');
  });

  it('clearBoard resets state', () => {
    const state = makeState();
    state.missionName = 'Old';
    state.segments.push({} as any);
    state.tokens.push({} as any);
    const api: BoardStateAPI = {
      newBoard: () => makeState(),
      addSegment: () => {},
      removeSegment: () => {},
      addToken: () => {},
      removeToken: () => {},
      importBoardText: () => {},
      exportBoardText: () => '',
      getCellType: () => -1,
      findById: () => undefined,
    };
    const core = new EditorCore(api, state);
    core.clearBoard();
    assert.equal(state.missionName, 'Unnamed Mission');
    assert.equal(state.segments.length, 0);
    assert.equal(state.tokens.length, 0);
  });

  it('rotate selected segment', () => {
    const state = makeState();
    state.segmentDefs[0].width = 1;
    state.segmentDefs[0].height = 1;
    state.segmentDefs[0].grid = [[1]];
    state.segments.push({
      instanceId: 's1',
      type: 'segA',
      origin: { x: 0, y: 0 },
      rot: 0,
    });
    const api: BoardStateAPI = {
      newBoard: () => state,
      addSegment: (_s, seg) => {
        state.segments.push(seg as any);
      },
      removeSegment: (_s, id) => {
        state.segments = state.segments.filter((s) => s.instanceId !== id);
      },
      addToken: () => {},
      removeToken: () => {},
      importBoardText: () => {},
      exportBoardText: () => '',
      getCellType: () => -1,
      findById: (_s, id) => state.segments.find((s) => s.instanceId === id),
    };
    const core = new EditorCore(api, state);
    core.selectCell({ x: 0, y: 0 });
    core.selectExisting('segment', 's1');
    core.rotate(1);
    assert.equal(state.segments[0].rot, 90);
  });
});
