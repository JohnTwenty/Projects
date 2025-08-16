import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRenderer } from '../src/renderer.js';

class Ctx {
  canvas = { width: 100, height: 100 };
  ops: any[] = [];
  globalAlpha = 1;
  clearRect(x:number,y:number,w:number,h:number){ this.ops.push(['clearRect',x,y,w,h]); }
  save(){ this.ops.push(['save']); }
  restore(){ this.ops.push(['restore']); }
  fillRect(x:number,y:number,w:number,h:number){ this.ops.push(['fillRect',x,y,w,h]); }
}

describe('Renderer.drawGhost', () => {
  it('draws ghost cells for segments', () => {
    const ctx = new Ctx();
    const r = createRenderer();
    const state: any = { size: 10, segments: [], tokens: [], segmentDefs: [{ segmentId: 's', width: 2, height: 1, grid: [[1,1]] }] };
    r.drawGhost(ctx as any, { kind: 'segment', id: 's', rot: 0, cell: { x: 1, y: 2 } }, state, { origin: { x: 0, y: 0 }, scale: 1, cellSize: 32 });
    assert.ok(ctx.ops.some(o => o[0] === 'fillRect' && o[1] === 32 && o[2] === 64));
  });

  it('uses grid dimensions for non-square segments', () => {
    const ctx = new Ctx();
    const r = createRenderer();
    const grid = [
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
    ];
    const state: any = {
      size: 10,
      segments: [],
      tokens: [],
      segmentDefs: [{ segmentId: 's', width: 3, height: 5, grid }],
    };
    r.drawGhost(
      ctx as any,
      { kind: 'segment', id: 's', rot: 0, cell: { x: 0, y: 0 } },
      state,
      { origin: { x: 0, y: 0 }, scale: 1, cellSize: 32 }
    );
    assert.ok(ctx.ops.some(o => o[0] === 'fillRect' && o[1] === 128 && o[2] === 64));
  });
});
