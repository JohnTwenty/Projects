import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { EditorCore } from '../src/editor/EditorCore.js';
import { EditorUI } from '../src/editor/EditorUI.js';
import type { BoardState, BoardStateAPI, Renderer } from '../src/types.js';

describe('EditorUI smoke test', () => {
  it('segment palette and placement', () => {
    const dom = new JSDOM(`<!doctype html><html><body><div id="app"></div></body></html>`, {
      pretendToBeVisual: true,
    });
    const { window } = dom;
    (globalThis as any).window = window;
    (globalThis as any).document = window.document;
    (window.HTMLCanvasElement.prototype as any).getContext = () => {
      return {
        clearRect() {},
        fillRect() {},
        save() {},
        restore() {},
        translate() {},
        rotate() {},
        globalAlpha: 1,
      } as any;
    };
    (window.HTMLCanvasElement.prototype as any).getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 640,
      height: 640,
    });

    const state: BoardState = {
      size: 20,
      missionName: 'Unnamed Mission',
      segmentDefs: [{ segmentId: 's1', name: 'Seg1' }],
      tokenTypes: [],
      segments: [],
      tokens: [],
    };
    let added = false;
    let rendered = false;
    let lastCellSize = 0;
    const api: BoardStateAPI = {
      newBoard: () => state,
      addSegment: () => {
        added = true;
      },
      removeSegment: () => {},
      addToken: () => {},
      removeToken: () => {},
      importBoardText: () => {},
      exportBoardText: () => '',
      getCellType: () => -1,
      findById: () => undefined,
    };
    const renderer: Renderer = {
      setSpriteManifest: () => {},
      loadSpriteManifestFromText: () => {},
      setAssetResolver: () => {},
      resize: () => {},
      render: (_ctx: any, _state: any, vp) => {
        rendered = true;
        lastCellSize = vp.cellSize;
      },
      drawGhost: () => {},
    };

    const core = new EditorCore(api, state);
    const container = window.document.getElementById('app')!;
    const ui = new EditorUI(container, core, renderer);

    const li = container.querySelector('#segment-palette li') as HTMLElement;
    li.dispatchEvent(new window.Event('click', { bubbles: true }));
    assert.equal(core.ui.ghost?.kind, 'segment');

    const rotRight = container.querySelector('#rot-right') as HTMLElement;
    rotRight.dispatchEvent(new window.Event('click', { bubbles: true }));
    assert.equal(core.ui.ghost?.rot, 90);
    const rotLeft = container.querySelector('#rot-left') as HTMLElement;
    rotLeft.dispatchEvent(new window.Event('click', { bubbles: true }));
    assert.equal(core.ui.ghost?.rot, 0);

    const canvas = container.querySelector('#viewport') as HTMLCanvasElement;
    canvas.dispatchEvent(
      new window.MouseEvent('mousemove', { clientX: 40, clientY: 40, bubbles: true }),
    );
    assert.deepEqual(core.ui.ghost?.cell, { x: 1, y: 1 });

    canvas.dispatchEvent(
      new window.MouseEvent('click', { clientX: 40, clientY: 40, bubbles: true }),
    );
    assert.ok(added);
    assert.ok(rendered);
    assert.equal(lastCellSize, 32);
    void ui;
  });

  it('cell size capped at 64', () => {
    const dom = new JSDOM(`<!doctype html><html><body><div id="app"></div></body></html>`, {
      pretendToBeVisual: true,
    });
    const { window } = dom;
    (globalThis as any).window = window;
    (globalThis as any).document = window.document;
    (window.HTMLCanvasElement.prototype as any).getContext = () => ({
      clearRect() {},
      fillRect() {},
      save() {},
      restore() {},
      translate() {},
      rotate() {},
      globalAlpha: 1,
    });
    (window.HTMLCanvasElement.prototype as any).getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 5000,
      height: 5000,
    });
    const state: BoardState = {
      size: 40,
      missionName: 'Unnamed Mission',
      segmentDefs: [],
      tokenTypes: [],
      segments: [],
      tokens: [],
    };
    let lastCellSize2 = 0;
    const api: BoardStateAPI = {
      newBoard: () => state,
      addSegment: () => {},
      removeSegment: () => {},
      addToken: () => {},
      removeToken: () => {},
      importBoardText: () => {},
      exportBoardText: () => '',
      getCellType: () => -1,
      findById: () => undefined,
    };
    const renderer: Renderer = {
      setSpriteManifest: () => {},
      loadSpriteManifestFromText: () => {},
      setAssetResolver: () => {},
      resize: () => {},
      render: (_ctx: any, _state: any, vp) => {
        lastCellSize2 = vp.cellSize;
      },
      drawGhost: () => {},
    };
    const core = new EditorCore(api, state);
    const container = window.document.getElementById('app')!;
    const ui = new EditorUI(container, core, renderer);
    const vp = container.querySelector('#viewport') as HTMLCanvasElement;
    vp.width = 5000;
    vp.height = 5000;
    ui.render();
    assert.equal(lastCellSize2, 64);
    void ui;
  });
});
