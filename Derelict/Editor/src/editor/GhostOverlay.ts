import type { EditorState } from '../types.js';

export class GhostOverlay {
  private ctx: CanvasRenderingContext2D;
  constructor(private canvas: HTMLCanvasElement, private tileSize = 32) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no ctx');
    this.ctx = ctx;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  draw(ghost: EditorState['ghost'] | null): void {
    this.clear();
    if (!ghost || !ghost.cell) return;
    this.ctx.save();
    this.ctx.globalAlpha = 0.5;
    const { x, y } = ghost.cell;
    const ts = this.tileSize;
    this.ctx.translate((x + 0.5) * ts, (y + 0.5) * ts);
    this.ctx.rotate((ghost.rot * Math.PI) / 180);
    this.ctx.translate(-ts / 2, -ts / 2);
    this.ctx.fillStyle = 'rgba(0,0,255,0.5)';
    this.ctx.fillRect(0, 0, ts, ts);
    this.ctx.restore();
  }
}
