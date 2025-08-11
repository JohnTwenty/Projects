import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GhostOverlay } from '../src/editor/GhostOverlay.js';

describe('GhostOverlay drawing', () => {
  it('applies rotation and alpha', () => {
    class Ctx {
      ops: any[] = [];
      _alpha = 1;
      set globalAlpha(v: number) {
        this._alpha = v;
        this.ops.push(['alpha', v]);
      }
      get globalAlpha() {
        return this._alpha;
      }
      clearRect() {
        this.ops.push(['clear']);
      }
      save() {
        this.ops.push(['save']);
      }
      restore() {
        this.ops.push(['restore']);
      }
      translate(x: number, y: number) {
        this.ops.push(['translate', x, y]);
      }
      rotate(a: number) {
        this.ops.push(['rotate', a]);
      }
      fillRect(x: number, y: number, w: number, h: number) {
        this.ops.push(['fillRect', x, y, w, h]);
      }
    }
    const ctx = new Ctx();
    const canvas: any = { width: 100, height: 100, getContext: () => ctx };
    const overlay = new GhostOverlay(canvas, 32);
    overlay.draw({ kind: 'segment', id: 's', rot: 90, cell: { x: 1, y: 2 } });
    assert.deepEqual(ctx.ops[1], ['save']);
    assert.deepEqual(ctx.ops[2], ['alpha', 0.5]);
    assert.deepEqual(ctx.ops[3], ['translate', 48, 80]);
    assert.equal(ctx.ops[4][0], 'rotate');
    assert.ok(Math.abs(ctx.ops[4][1] - Math.PI / 2) < 1e-6);
    assert.deepEqual(ctx.ops[5], ['translate', -16, -16]);
    assert.ok(ctx.ops.some((o) => o[0] === 'fillRect'));
  });
});
