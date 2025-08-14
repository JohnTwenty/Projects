import test from 'node:test';
import assert from 'node:assert/strict';
import { createRenderer } from '../src/renderer.js';
import { loadSpriteManifestFromText } from '../src/manifest.js';
import type { BoardState, Viewport } from '../src/types.js';

function makeCtx() {
  const calls: Record<string, any[]> = {
    drawImage: [],
    translate: [],
    rotate: [],
    save: [],
    restore: [],
    fillRect: [],
    clearRect: [],
  };
  let _fillStyle = '';
  const ctx: any = {
    canvas: { width: 0, height: 0 },
    get fillStyle() {
      return _fillStyle;
    },
    set fillStyle(v: string) {
      _fillStyle = v;
      calls.fillStyle = calls.fillStyle || [];
      calls.fillStyle.push(v);
    },
    save: () => calls.save.push([]),
    restore: () => calls.restore.push([]),
    translate: (...a: any[]) => calls.translate.push(a),
    rotate: (r: number) => calls.rotate.push(r),
    drawImage: (...a: any[]) => calls.drawImage.push(a),
    fillRect: (...a: any[]) => calls.fillRect.push(a),
    clearRect: (...a: any[]) => calls.clearRect.push(a),
    scale: () => {},
  };
  return { ctx, calls };
}

const manifestText = `foo foo.png 0 0 0 0 0 1 2`;
const manifest = loadSpriteManifestFromText(manifestText);

const state: BoardState = {
  size: 10,
  segments: [],
  tokens: [
    { tokenId: 't1', type: 'foo', rot: 90, cells: [{ x: 0, y: 0 }] },
    { tokenId: 't2', type: 'missing', rot: 0, cells: [{ x: 1, y: 1 }] },
    { tokenId: 't3', type: 'foo', rot: 0, cells: [{ x: 100, y: 100 }] },
  ],
};

const viewport: Viewport = {
  origin: { x: 0, y: 0 },
  scale: 1,
  cellSize: 32,
};

test('renderer handles missing sprites with fallback', () => {
  const renderer = createRenderer();
  renderer.setSpriteManifest(manifest);
  renderer.setAssetResolver(() => ({ width: 1, height: 1 } as any));
  renderer.resize(64, 64);
  const { ctx, calls } = makeCtx();
  renderer.render(ctx as any, state, viewport);
  // missing sprite should set fillStyle to magenta
  assert.ok(calls.fillStyle.includes('magenta'));
});

test('renderer culls off-screen cells', () => {
  const renderer = createRenderer();
  renderer.setSpriteManifest(manifest);
  renderer.setAssetResolver(() => ({ width: 1, height: 1 } as any));
  renderer.resize(64, 64);
  const { ctx, calls } = makeCtx();
  renderer.render(ctx as any, state, viewport);
  // only first two tokens are in viewport; third is off-screen
  assert.equal(calls.drawImage.length, 1); // only visible sprite
});

test('renderer applies token offsets and rotation', () => {
  const renderer = createRenderer();
  renderer.setSpriteManifest(manifest);
  renderer.setAssetResolver(() => ({ width: 1, height: 1 } as any));
  renderer.resize(64, 64);
  const { ctx, calls } = makeCtx();
  renderer.render(ctx as any, state, viewport);
  // translate called for cell center and for xoff/yoff
  const translateCalls = calls.translate;
  // second translate for offset
  const offsetCall = translateCalls.find((c) => c[0] === 1 && c[1] === 2);
  assert.ok(offsetCall);
  // rotation applied once with 90 degrees
  assert.equal(
    calls.rotate.some((r) => Math.abs(r - Math.PI / 2) < 1e-6),
    true
  );
});

test('renderer draws terrain and tokens layered', () => {
  const renderer = createRenderer();
  const manifest = loadSpriteManifestFromText(
    `0 wall.png 0 0 0 0 0 0 0\nfoo foo.png 0 0 0 0 1 0 0`
  );
  renderer.setSpriteManifest(manifest);
  renderer.setAssetResolver((key) => ({ width: 1, height: 1, src: key } as any));
  renderer.resize(64, 64);
  const state: BoardState = {
    size: 2,
    segments: [],
    tokens: [{ tokenId: 't', type: 'foo', rot: 0, cells: [{ x: 0, y: 0 }] }],
    getCellType: () => 0,
  } as any;
  const { ctx, calls } = makeCtx();
  renderer.render(ctx as any, state, viewport);
  // 4 cells + 1 token
  assert.equal(calls.drawImage.length, 5);
  // last draw call should be token sprite
  const last = calls.drawImage[calls.drawImage.length - 1][0];
  assert.equal(last.src, 'foo.png');
});

const hasOffscreen = typeof OffscreenCanvas !== 'undefined';
const offscreenTest = hasOffscreen ? test : test.skip;
offscreenTest('renderer smoke test with OffscreenCanvas', () => {
  const renderer = createRenderer();
  renderer.setSpriteManifest(manifest);
  renderer.setAssetResolver(() => {
    const c = new OffscreenCanvas(1, 1);
    const ictx = c.getContext('2d');
    ictx!.fillStyle = 'white';
    ictx!.fillRect(0, 0, 1, 1);
    return c.transferToImageBitmap();
  });
  renderer.resize(64, 64);
  const canvas = new OffscreenCanvas(64, 64);
  const ctx = canvas.getContext('2d')!;
  renderer.render(ctx, state, viewport);
  const img1 = ctx.getImageData(0, 0, 64, 64).data;
  renderer.render(ctx, state, viewport);
  const img2 = ctx.getImageData(0, 0, 64, 64).data;
  assert.deepEqual(Array.from(img1), Array.from(img2));
});
