import type { BoardState, Coord } from 'derelict-boardstate';
import type { Rules } from 'derelict-rules';
import type { Player, GameApi, Choice } from 'derelict-players';

export interface RendererLike {
  render(state: BoardState): void;
}

interface SpriteInfo {
  file: string;
  xoff: number;
  yoff: number;
}

export interface ChooseUI {
  container: HTMLElement;
  cellToRect: (
    coord: Coord,
  ) => { x: number; y: number; width: number; height: number };
  sprites: Record<string, SpriteInfo>;
}

// Core game orchestrator providing the GameApi for human players
export class Game implements GameApi {
  private preselect: Coord | null = null;

  constructor(
    private board: BoardState,
    private renderer: RendererLike,
    private rules: Rules,
    private player1: Player,
    private player2: Player,
    private ui?: ChooseUI,
  ) {}

  async start(): Promise<void> {
    this.renderer.render(this.board);
    this.rules.validate(this.board);
    await this.rules.runGame(this.player1, this.player2);
  }

  async choose(options: Choice[]): Promise<Choice> {
    if (this.preselect) {
      const found = options.find(
        (o) => o.type === 'marine' && o.coord && sameCoord(o.coord, this.preselect!),
      );
      if (found) {
        this.preselect = null;
        return found;
      }
      this.preselect = null;
    }
    if (!this.ui) return options[0];

    return new Promise<Choice>((resolve) => {
      const elements: HTMLElement[] = [];
      const cleanup = () => {
        for (const el of elements) el.remove();
      };

      const { container, cellToRect, sprites } = this.ui!;
      const key = (c: Coord) => `${c.x},${c.y}`;

      const marineMap = new Map<string, Choice>();
      for (const opt of options) {
        if (opt.type === 'marine' && opt.coord) marineMap.set(key(opt.coord), opt);
      }

      const selectOther = options.find(
        (o) => o.type === 'action' && o.action === 'selectOther',
      );

      for (const opt of options) {
        if (opt.type === 'action' && opt.coord && opt.sprite) {
          const rect = cellToRect(opt.coord);
          const info = sprites[opt.sprite] || { file: opt.sprite, xoff: 0, yoff: 0 };
          const img = document.createElement('img');
          img.src = info.file;
          img.style.position = 'absolute';
          const cx = rect.x + rect.width / 2;
          const cy = rect.y + rect.height / 2;
          const rad = ((opt.rot || 0) * Math.PI) / 180;
          const ox = info.xoff * Math.cos(rad) - info.yoff * Math.sin(rad);
          const oy = info.xoff * Math.sin(rad) + info.yoff * Math.cos(rad);
          img.style.left = `${cx + ox}px`;
          img.style.top = `${cy + oy}px`;
          img.style.transform = `translate(-50%, -50%) rotate(${opt.rot || 0}deg)`;
          img.style.cursor = 'pointer';
          img.addEventListener('click', (e) => {
            e.stopPropagation();
            cleanup();
            resolve(opt);
          });
          container.appendChild(img);
          elements.push(img);
        }
      }

      const marines = this.board.tokens.filter((t) => t.type === 'marine');
      for (const t of marines) {
        const coord = t.cells[0];
        const rect = cellToRect(coord);
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.left = `${rect.x}px`;
        div.style.top = `${rect.y}px`;
        div.style.width = `${rect.width}px`;
        div.style.height = `${rect.height}px`;
        div.style.cursor = 'pointer';
        div.addEventListener('click', (e) => {
          e.stopPropagation();
          const m = marineMap.get(key(coord));
          if (m) {
            cleanup();
            resolve(m);
          } else if (selectOther) {
            this.preselect = coord;
            cleanup();
            resolve(selectOther);
          }
        });
        container.appendChild(div);
        elements.push(div);
      }
    });
  }

  async messageBox(_message: string): Promise<boolean> {
    return true;
  }
}

function sameCoord(a: Coord, b: Coord): boolean {
  return a.x === b.x && a.y === b.y;
}
