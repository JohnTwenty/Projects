import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GhostOverlay } from '../src/editor/GhostOverlay.js';

describe('GhostOverlay drawing', () => {
  it('draws ghost cells for segments', () => {
    class Ctx {
      ops: any[] = [];
      globalAlpha = 1;
      clearRect() { this.ops.push(['clear']); }
      save() { this.ops.push(['save']); }
      restore() { this.ops.push(['restore']); }
      fillRect(x: number, y: number, w: number, h: number) {
        this.ops.push(['fillRect', x, y, w, h]);
      }
    }
    const ctx = new Ctx();
    const canvas: any = { width: 100, height: 100, getContext: () => ctx };
    const overlay = new GhostOverlay(canvas, 32);
    const state: any = { segmentDefs: [{ segmentId: 's', width: 2, height: 1, grid: [[1, 1]] }] };
    overlay.draw({ kind: 'segment', id: 's', rot: 0, cell: { x: 1, y: 2 } }, state);
    assert.ok(ctx.ops.some((o) => o[0] === 'fillRect' && o[1] === 32 && o[2] === 64));
  });
});
