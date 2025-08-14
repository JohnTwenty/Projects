import type { EditorState, BoardState } from '../types.js';

function rotate(
  local: { x: number; y: number },
  rot: 0 | 90 | 180 | 270,
  def: { width: number; height: number },
) {
  const { width, height } = def;
  const x = local.x;
  const y = local.y;
  switch (rot) {
    case 0:
      return { x, y };
    case 90:
      return { x: height - 1 - y, y: x };
    case 180:
      return { x: width - 1 - x, y: height - 1 - y };
    case 270:
      return { x: y, y: width - 1 - x };
  }
}

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

  draw(ghost: EditorState['ghost'] | null, state: BoardState): void {
    this.clear();
    if (!ghost || !ghost.cell) return;

    const ts = this.tileSize;
    this.ctx.save();
    this.ctx.globalAlpha = 0.5;

    if (ghost.kind === 'segment') {
      const def = state.segmentDefs.find((s) => s.segmentId === ghost.id) as any;
      if (def && def.grid && def.width && def.height) {
        for (let y = 0; y < def.height; y++) {
          for (let x = 0; x < def.width; x++) {
            const rotCoord = rotate({ x, y }, ghost.rot, def);
            const gx = (ghost.cell.x + rotCoord.x) * ts;
            const gy = (ghost.cell.y + rotCoord.y) * ts;
            this.ctx.fillStyle = 'rgba(0,0,255,0.5)';
            this.ctx.fillRect(gx, gy, ts, ts);
          }
        }
        this.ctx.restore();
        return;
      }
    }

    this.ctx.fillStyle = 'rgba(0,0,255,0.5)';
    this.ctx.fillRect(ghost.cell.x * ts, ghost.cell.y * ts, ts, ts);
    this.ctx.restore();
  }
}
