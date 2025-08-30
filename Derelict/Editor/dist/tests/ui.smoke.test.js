import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { EditorCore } from '../src/editor/EditorCore.js';
import { EditorUI } from '../src/editor/EditorUI.js';
describe('EditorUI smoke test', () => {
    it('segment palette and placement', () => {
        const dom = new JSDOM(`<!doctype html><html><body><div id="app"></div></body></html>`, {
            pretendToBeVisual: true,
        });
        const { window } = dom;
        globalThis.window = window;
        globalThis.document = window.document;
        window.HTMLCanvasElement.prototype.getContext = () => {
            return {
                clearRect() { },
                fillRect() { },
                save() { },
                restore() { },
                translate() { },
                rotate() { },
                globalAlpha: 1,
            };
        };
        window.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({
            left: 0,
            top: 0,
            width: 640,
            height: 640,
        });
        const state = {
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
        const api = {
            newBoard: () => state,
            addSegment: () => {
                added = true;
            },
            removeSegment: () => { },
            addToken: () => { },
            removeToken: () => { },
            importBoardText: () => { },
            exportBoardText: () => '',
            getCellType: () => -1,
            findById: () => undefined,
        };
        const renderer = {
            setSpriteManifest: () => { },
            loadSpriteManifestFromText: () => { },
            setAssetResolver: () => { },
            resize: () => { },
            render: (_ctx, _state, vp) => {
                rendered = true;
                lastCellSize = vp.cellSize;
            },
            drawGhost: () => { },
        };
        const core = new EditorCore(api, state);
        const container = window.document.getElementById('app');
        const ui = new EditorUI(container, core, renderer);
        const li = container.querySelector('#segment-palette li');
        li.dispatchEvent(new window.Event('click', { bubbles: true }));
        assert.equal(core.ui.ghost?.kind, 'segment');
        const rotRight = container.querySelector('#rot-right');
        rotRight.dispatchEvent(new window.Event('click', { bubbles: true }));
        assert.equal(core.ui.ghost?.rot, 90);
        const rotLeft = container.querySelector('#rot-left');
        rotLeft.dispatchEvent(new window.Event('click', { bubbles: true }));
        assert.equal(core.ui.ghost?.rot, 0);
        const canvas = container.querySelector('#viewport');
        canvas.dispatchEvent(new window.MouseEvent('mousemove', { clientX: 40, clientY: 40, bubbles: true }));
        assert.deepEqual(core.ui.ghost?.cell, { x: 1, y: 1 });
        canvas.dispatchEvent(new window.MouseEvent('click', { clientX: 40, clientY: 40, bubbles: true }));
        assert.ok(added);
        assert.ok(rendered);
        assert.equal(lastCellSize, 32);
        void ui;
    });
    it('token selection and rotation from selection panel', () => {
        const dom = new JSDOM(`<!doctype html><html><body><div id="app"></div></body></html>`, {
            pretendToBeVisual: true,
        });
        const { window } = dom;
        globalThis.window = window;
        globalThis.document = window.document;
        window.HTMLCanvasElement.prototype.getContext = () => ({
            clearRect() { },
            fillRect() { },
            save() { },
            restore() { },
            translate() { },
            rotate() { },
            globalAlpha: 1,
        });
        window.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({
            left: 0,
            top: 0,
            width: 640,
            height: 640,
        });
        const state = {
            size: 20,
            missionName: 'Unnamed Mission',
            segmentDefs: [
                { segmentId: 's1', name: 'Seg1', width: 1, height: 1, grid: [[1]] },
            ],
            tokenTypes: [{ type: 'tokA' }],
            segments: [
                { instanceId: 'seg1', type: 's1', origin: { x: 1, y: 1 }, rot: 0 },
            ],
            tokens: [
                { instanceId: 't1', type: 'tokA', rot: 0, cells: [{ x: 1, y: 1 }] },
            ],
        };
        const api = {
            newBoard: () => state,
            addSegment: () => { },
            removeSegment: () => { },
            addToken: () => { },
            removeToken: () => { },
            importBoardText: () => { },
            exportBoardText: () => '',
            getCellType: () => -1,
            findById: (_s, id) => state.segments.find((s) => s.instanceId === id) ||
                state.tokens.find((t) => t.instanceId === id),
        };
        const renderer = {
            setSpriteManifest: () => { },
            loadSpriteManifestFromText: () => { },
            setAssetResolver: () => { },
            resize: () => { },
            render: () => { },
            drawGhost: () => { },
        };
        const core = new EditorCore(api, state);
        const container = window.document.getElementById('app');
        new EditorUI(container, core, renderer);
        const canvas = container.querySelector('#viewport');
        canvas.dispatchEvent(new window.MouseEvent('click', { clientX: 40, clientY: 40, bubbles: true }));
        const items = container.querySelectorAll('#selection-list li');
        items[0].dispatchEvent(new window.Event('click', { bubbles: true }));
        assert.equal(core.ui.selected, null);
        items[1].dispatchEvent(new window.Event('click', { bubbles: true }));
        assert.equal(core.ui.selected?.kind, 'token');
        assert.equal(core.ui.selected?.id, 't1');
        assert.equal(items[0].classList.contains('selected'), false);
        assert.equal(items[1].classList.contains('selected'), true);
        const rot = container.querySelector('#rot-right');
        rot.dispatchEvent(new window.Event('click', { bubbles: true }));
        assert.equal(state.tokens[0].rot, 90);
    });
    it('cell size capped at 64', () => {
        const dom = new JSDOM(`<!doctype html><html><body><div id="app"></div></body></html>`, {
            pretendToBeVisual: true,
        });
        const { window } = dom;
        globalThis.window = window;
        globalThis.document = window.document;
        window.HTMLCanvasElement.prototype.getContext = () => ({
            clearRect() { },
            fillRect() { },
            save() { },
            restore() { },
            translate() { },
            rotate() { },
            globalAlpha: 1,
        });
        window.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({
            left: 0,
            top: 0,
            width: 5000,
            height: 5000,
        });
        const state = {
            size: 40,
            missionName: 'Unnamed Mission',
            segmentDefs: [],
            tokenTypes: [],
            segments: [],
            tokens: [],
        };
        let lastCellSize2 = 0;
        const api = {
            newBoard: () => state,
            addSegment: () => { },
            removeSegment: () => { },
            addToken: () => { },
            removeToken: () => { },
            importBoardText: () => { },
            exportBoardText: () => '',
            getCellType: () => -1,
            findById: () => undefined,
        };
        const renderer = {
            setSpriteManifest: () => { },
            loadSpriteManifestFromText: () => { },
            setAssetResolver: () => { },
            resize: () => { },
            render: (_ctx, _state, vp) => {
                lastCellSize2 = vp.cellSize;
            },
            drawGhost: () => { },
        };
        const core = new EditorCore(api, state);
        const container = window.document.getElementById('app');
        const ui = new EditorUI(container, core, renderer);
        const vp = container.querySelector('#viewport');
        vp.width = 5000;
        vp.height = 5000;
        ui.render();
        assert.equal(lastCellSize2, 64);
        void ui;
    });
    it('New button clears board', () => {
        const dom = new JSDOM(`<!doctype html><html><body><div id="app"></div></body></html>`, {
            pretendToBeVisual: true,
        });
        const { window } = dom;
        globalThis.window = window;
        globalThis.document = window.document;
        window.HTMLCanvasElement.prototype.getContext = () => ({
            clearRect() { },
            fillRect() { },
            save() { },
            restore() { },
            translate() { },
            rotate() { },
            globalAlpha: 1,
        });
        const state = {
            size: 20,
            missionName: 'Something',
            segmentDefs: [],
            tokenTypes: [],
            segments: [{}],
            tokens: [{}],
            cellTypes: new Map([['2,3', 1]]),
        };
        const api = {
            newBoard: () => state,
            addSegment: () => { },
            removeSegment: () => { },
            addToken: () => { },
            removeToken: () => { },
            importBoardText: (s) => {
                s.segments = [];
                s.tokens = [];
                s.cellTypes.clear();
            },
            exportBoardText: () => '',
            getCellType: (s, c) => s.cellTypes.get(`${c.x},${c.y}`) ?? 0,
            findById: () => undefined,
        };
        const renderer = {
            setSpriteManifest: () => { },
            loadSpriteManifestFromText: () => { },
            setAssetResolver: () => { },
            resize: () => { },
            render: () => { },
            drawGhost: () => { },
        };
        const core = new EditorCore(api, state);
        const container = window.document.getElementById('app');
        // creates UI
        new EditorUI(container, core, renderer);
        const btn = container.querySelector('#btn-new');
        btn.dispatchEvent(new window.Event('click', { bubbles: true }));
        const ok = window.document.querySelector('.modal button');
        ok.dispatchEvent(new window.Event('click', { bubbles: true }));
        assert.equal(state.missionName, 'Unnamed Mission');
        assert.equal(state.segments.length, 0);
        assert.equal(state.tokens.length, 0);
        assert.equal(api.getCellType(state, { x: 2, y: 3 }), 0);
    });
});
