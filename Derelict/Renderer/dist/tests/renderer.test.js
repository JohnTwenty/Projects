import test from 'node:test';
import assert from 'node:assert/strict';
import { createRenderer } from '../src/renderer.js';
import { loadSpriteManifestFromText } from '../src/manifest.js';
function makeCtx() {
    const calls = {
        drawImage: [],
        translate: [],
        rotate: [],
        save: [],
        restore: [],
        fillRect: [],
        clearRect: [],
        strokeRect: [],
        lineWidth: [],
        strokeStyle: [],
        log: [],
    };
    let _fillStyle = '';
    let _strokeStyle = '';
    let _lineWidth = 0;
    const ctx = {
        canvas: { width: 0, height: 0 },
        get fillStyle() {
            return _fillStyle;
        },
        set fillStyle(v) {
            _fillStyle = v;
            calls.fillStyle = calls.fillStyle || [];
            calls.fillStyle.push(v);
        },
        get strokeStyle() {
            return _strokeStyle;
        },
        set strokeStyle(v) {
            _strokeStyle = v;
            calls.strokeStyle.push(v);
        },
        get lineWidth() {
            return _lineWidth;
        },
        set lineWidth(v) {
            _lineWidth = v;
            calls.lineWidth.push(v);
        },
        save: () => calls.save.push([]),
        restore: () => calls.restore.push([]),
        translate: (...a) => calls.translate.push(a),
        rotate: (r) => calls.rotate.push(r),
        drawImage: (...a) => {
            calls.drawImage.push(a);
            calls.log.push('drawImage');
        },
        fillRect: (...a) => calls.fillRect.push(a),
        clearRect: (...a) => calls.clearRect.push(a),
        strokeRect: (...a) => {
            calls.strokeRect.push(a);
            calls.log.push('strokeRect');
        },
        scale: () => { },
    };
    return { ctx, calls };
}
const manifestText = `foo foo.png 0 0 64 64 0 1 2`;
const manifest = loadSpriteManifestFromText(manifestText);
const state = {
    size: 10,
    segments: [],
    tokens: [
        { tokenId: 't1', type: 'foo', rot: 90, cells: [{ x: 0, y: 0 }] },
        { tokenId: 't2', type: 'missing', rot: 0, cells: [{ x: 1, y: 1 }] },
        { tokenId: 't3', type: 'foo', rot: 0, cells: [{ x: 100, y: 100 }] },
    ],
};
const viewport = {
    origin: { x: 0, y: 0 },
    scale: 1,
    cellSize: 32,
};
test('renderer handles missing sprites with fallback', () => {
    const renderer = createRenderer();
    renderer.setSpriteManifest(manifest);
    renderer.setAssetResolver(() => ({ width: 64, height: 64 }));
    renderer.resize(64, 64);
    const { ctx, calls } = makeCtx();
    renderer.render(ctx, state, viewport);
    // missing sprite should set fillStyle to magenta
    assert.ok(calls.fillStyle.includes('magenta'));
});
test('renderer culls off-screen cells', () => {
    const renderer = createRenderer();
    renderer.setSpriteManifest(manifest);
    renderer.setAssetResolver(() => ({ width: 1, height: 1 }));
    renderer.resize(64, 64);
    const { ctx, calls } = makeCtx();
    renderer.render(ctx, state, viewport);
    // only first two tokens are in viewport; third is off-screen
    assert.equal(calls.drawImage.length, 1); // only visible sprite
});
test('renderer applies token offsets and rotation', () => {
    const renderer = createRenderer();
    renderer.setSpriteManifest(manifest);
    renderer.setAssetResolver(() => ({ width: 64, height: 64 }));
    renderer.resize(64, 64);
    const { ctx, calls } = makeCtx();
    renderer.render(ctx, state, viewport);
    // translate called for cell center and for xoff/yoff
    const translateCalls = calls.translate;
    // second translate for offset
    const offsetCall = translateCalls.find((c) => Math.abs(c[0] - 0.5) < 1e-6 && Math.abs(c[1] - 1) < 1e-6);
    assert.ok(offsetCall);
    // rotation applied once with 90 degrees
    assert.equal(calls.rotate.some((r) => Math.abs(r - Math.PI / 2) < 1e-6), true);
});
test('renderer scales tokens to cell size', () => {
    const renderer = createRenderer();
    renderer.setSpriteManifest(manifest);
    renderer.setAssetResolver(() => ({ width: 64, height: 64 }));
    renderer.resize(32, 32);
    const { ctx, calls } = makeCtx();
    const vp = { origin: { x: 0, y: 0 }, scale: 1, cellSize: 32 };
    const st = {
        size: 1,
        segments: [],
        tokens: [{ tokenId: 't', type: 'foo', rot: 0, cells: [{ x: 0, y: 0 }] }],
    };
    renderer.render(ctx, st, vp);
    const args = calls.drawImage[0];
    assert.equal(args[7], 32);
    assert.equal(args[8], 32);
});
test('renderer draws terrain and tokens layered', () => {
    const renderer = createRenderer();
    const manifest = loadSpriteManifestFromText(`0 wall.png 0 0 0 0 0 0 0\nfoo foo.png 0 0 0 0 1 0 0`);
    renderer.setSpriteManifest(manifest);
    renderer.setAssetResolver((key) => ({ width: 1, height: 1, src: key }));
    renderer.resize(64, 64);
    const state = {
        size: 2,
        segments: [],
        tokens: [{ tokenId: 't', type: 'foo', rot: 0, cells: [{ x: 0, y: 0 }] }],
        getCellType: () => 0,
    };
    const { ctx, calls } = makeCtx();
    renderer.render(ctx, state, viewport);
    // 4 cells + 1 token
    assert.equal(calls.drawImage.length, 5);
    // last draw call should be token sprite
    const last = calls.drawImage[calls.drawImage.length - 1][0];
    assert.equal(last.src, 'foo.png');
});
test('renderer draws segment bounds before tokens', () => {
    const renderer = createRenderer();
    const manifest = loadSpriteManifestFromText(`foo foo.png 0 0 0 0 0 0 0`);
    renderer.setSpriteManifest(manifest);
    renderer.setAssetResolver((key) => ({ width: 1, height: 1, src: key }));
    renderer.resize(64, 64);
    const state = {
        size: 4,
        segments: [
            { instanceId: 's1', type: 'seg', origin: { x: 0, y: 0 }, rot: 0 },
        ],
        tokens: [
            { tokenId: 't', type: 'foo', rot: 0, cells: [{ x: 0, y: 0 }] },
        ],
        segmentDefs: [
            { segmentId: 'seg', width: 2, height: 1, grid: [[1, 1]] },
        ],
    };
    const { ctx, calls } = makeCtx();
    renderer.render(ctx, state, viewport);
    assert.equal(calls.strokeRect.length, 1);
    assert.ok(calls.lineWidth.includes(2));
    assert.ok(calls.strokeStyle.includes('gray'));
    const strokeIndex = calls.log.indexOf('strokeRect');
    const tokenIndex = calls.log.lastIndexOf('drawImage');
    assert.ok(strokeIndex < tokenIndex);
});
test('renderer draws bounds for segments without defs', () => {
    const renderer = createRenderer();
    renderer.setSpriteManifest(manifest);
    renderer.setAssetResolver(() => ({ width: 1, height: 1 }));
    renderer.resize(64, 64);
    const state = {
        size: 4,
        segments: [
            { instanceId: 's1', type: 'unknown', origin: { x: 0, y: 0 }, rot: 0 },
        ],
        tokens: [],
    };
    const { ctx, calls } = makeCtx();
    renderer.render(ctx, state, viewport);
    assert.equal(calls.strokeRect.length, 1);
});
const hasOffscreen = typeof OffscreenCanvas !== 'undefined';
const offscreenTest = hasOffscreen ? test : test.skip;
offscreenTest('renderer smoke test with OffscreenCanvas', () => {
    const renderer = createRenderer();
    renderer.setSpriteManifest(manifest);
    renderer.setAssetResolver(() => {
        const c = new OffscreenCanvas(1, 1);
        const ictx = c.getContext('2d');
        ictx.fillStyle = 'white';
        ictx.fillRect(0, 0, 1, 1);
        return c.transferToImageBitmap();
    });
    renderer.resize(64, 64);
    const canvas = new OffscreenCanvas(64, 64);
    const ctx = canvas.getContext('2d');
    renderer.render(ctx, state, viewport);
    const img1 = ctx.getImageData(0, 0, 64, 64).data;
    renderer.render(ctx, state, viewport);
    const img2 = ctx.getImageData(0, 0, 64, 64).data;
    assert.deepEqual(Array.from(img1), Array.from(img2));
});
