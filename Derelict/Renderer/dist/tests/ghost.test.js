import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRenderer } from '../src/renderer.js';
class Ctx {
    constructor() {
        this.canvas = { width: 100, height: 100 };
        this.ops = [];
        this.globalAlpha = 1;
    }
    clearRect(x, y, w, h) {
        this.ops.push(['clearRect', x, y, w, h]);
    }
    save() {
        this.ops.push(['save']);
    }
    restore() {
        this.ops.push(['restore']);
    }
    fillRect(x, y, w, h) {
        this.ops.push(['fillRect', x, y, w, h]);
    }
    translate(x, y) {
        this.ops.push(['translate', x, y]);
    }
    rotate(a) {
        this.ops.push(['rotate', a]);
    }
    drawImage(...args) {
        this.ops.push(['drawImage', this.globalAlpha, ...args]);
    }
}
describe('Renderer.drawGhost', () => {
    it('draws token ghosts with sprite and alpha', () => {
        const ctx = new Ctx();
        const r = createRenderer();
        r.setSpriteManifest({
            entries: [
                { key: 't', file: 'img', x: 0, y: 0, w: 0, h: 0, layer: 0, xoff: 0, yoff: 0 },
            ],
        });
        r.setAssetResolver(() => ({ width: 32, height: 32 }));
        const state = { size: 10, segments: [], tokens: [], segmentDefs: [] };
        r.drawGhost(ctx, { kind: 'token', id: 't', rot: 0, cell: { x: 1, y: 2 } }, state, { origin: { x: 0, y: 0 }, scale: 1, cellSize: 32 });
        assert.ok(ctx.ops.some((o) => o[0] === 'drawImage' &&
            o[1] === 0.5 &&
            o[o.length - 4] === -16 &&
            o[o.length - 3] === -16));
        assert.ok(ctx.ops.some((o) => o[0] === 'translate' && o[1] === 48 && o[2] === 80));
    });
    it('draws segment ghosts using terrain sprites with alpha', () => {
        const ctx = new Ctx();
        const r = createRenderer();
        r.setSpriteManifest({
            entries: [
                { key: '1', file: 'img', x: 0, y: 0, w: 0, h: 0, layer: 0, xoff: 0, yoff: 0 },
            ],
        });
        r.setAssetResolver(() => ({ width: 32, height: 32 }));
        const state = {
            size: 10,
            segments: [],
            tokens: [],
            segmentDefs: [{ segmentId: 's', grid: [[1]] }],
        };
        r.drawGhost(ctx, { kind: 'segment', id: 's', rot: 0, cell: { x: 1, y: 2 } }, state, { origin: { x: 0, y: 0 }, scale: 1, cellSize: 32 });
        assert.ok(ctx.ops.some((o) => o[0] === 'drawImage' &&
            o[1] === 0.5 &&
            o[o.length - 4] === 0 &&
            o[o.length - 3] === 0));
        assert.ok(ctx.ops.some((o) => o[0] === 'translate' && o[1] === 32 && o[2] === 64));
    });
});
