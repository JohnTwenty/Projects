import type { BoardState, Coord } from 'derelict-boardstate';
import type { Rules } from 'derelict-rules';
import type { Player, GameApi, Choice } from 'derelict-players';

export interface RendererLike {
  render(state: BoardState): void;
}

export interface ChooseUI {
  container: HTMLElement;
  cellToRect: (
    coord: Coord,
  ) => { x: number; y: number; width: number; height: number };
  buttons: {
    activate: HTMLButtonElement;
    move: HTMLButtonElement;
    turnLeft: HTMLButtonElement;
    turnRight: HTMLButtonElement;
    manipulate: HTMLButtonElement;
    pass: HTMLButtonElement;
  };
}

// Core game orchestrator providing the GameApi for human players
export class Game implements GameApi {

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
    if (!this.ui) return options[0];

    return new Promise<Choice>((resolve) => {
      const { container, cellToRect, buttons } = this.ui!;
      const key = (c: Coord) => `${c.x},${c.y}`;

      const overlays: { el: HTMLElement; type: 'activate' | 'move' | 'door' }[] = [];

      const activateMap = new Map<string, Choice>();
      for (const opt of options) {
        if (opt.type === 'action' && opt.action === 'activate' && opt.coord) {
          activateMap.set(key(opt.coord), opt);
        }
      }

      const addOverlay = (
        coord: Coord,
        color: string,
        type: 'activate' | 'move' | 'door',
        onClick?: () => void,
      ) => {
        const rect = cellToRect(coord);
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.left = `${rect.x}px`;
        div.style.top = `${rect.y}px`;
        div.style.width = `${rect.width}px`;
        div.style.height = `${rect.height}px`;
        div.style.boxSizing = 'border-box';
        div.style.border = `2px solid ${color}`;
        if (onClick) {
          div.style.cursor = 'pointer';
          div.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick();
          });
        } else {
          div.style.pointerEvents = 'none';
        }
        container.appendChild(div);
        overlays.push({ el: div, type });
      };

      for (const opt of options) {
        if (opt.type === 'action' && opt.action === 'move' && opt.coord) {
          addOverlay(opt.coord, 'green', 'move', () => {
            cleanup();
            resolve(opt);
          });
        }
        if (opt.type === 'action' && opt.action === 'door' && opt.coord) {
          addOverlay(opt.coord, 'blue', 'door', () => {
            cleanup();
            resolve(opt);
          });
        }
      }

      let tokenType: string | null = null;
      for (const opt of options) {
        if (opt.action === 'activate' && opt.coord) {
          const token = this.board.tokens.find((t) =>
            sameCoord(t.cells[0], opt.coord!),
          );
          if (token) {
            tokenType = token.type;
            break;
          }
        }
      }
      const tokens = this.board.tokens.filter(
        (t) => !tokenType || t.type === tokenType,
      );
      for (const t of tokens) {
        const coord = t.cells[0];

        const act = activateMap.get(key(coord));
        if (act) {
          addOverlay(coord, 'purple', 'activate', () => {
            cleanup();
            resolve(act);
          });
        } else {
          addOverlay(coord, 'purple', 'activate');
        }
      }

      let filter: 'activate' | 'move' | 'door' | null = null;
      const setFilter = (f: 'activate' | 'move' | 'door' | null) => {
        filter = f;
        for (const o of overlays) {
          o.el.style.display = !filter || o.type === filter ? 'block' : 'none';
        }
        buttons.activate.classList.toggle('active', filter === 'activate');
        buttons.move.classList.toggle('active', filter === 'move');
        buttons.manipulate.classList.toggle('active', filter === 'door');
      };

      function onActivate() {
        if (buttons.activate.disabled) return;
        setFilter(filter === 'activate' ? null : 'activate');
      }
      function onMove() {
        if (buttons.move.disabled) return;
        setFilter(filter === 'move' ? null : 'move');
      }
      function onManipulate() {
        if (buttons.manipulate.disabled) return;
        setFilter(filter === 'door' ? null : 'door');
      }
      function onTurnLeft() {
        const opt = options.find(
          (o) => o.type === 'action' && o.action === 'turnLeft',
        );
        if (opt) {
          cleanup();
          resolve(opt);
        }
      }
      function onTurnRight() {
        const opt = options.find(
          (o) => o.type === 'action' && o.action === 'turnRight',
        );
        if (opt) {
          cleanup();
          resolve(opt);
        }
      }

      function onPass() {
        const opt = options.find(
          (o) => o.type === 'action' && o.action === 'pass',
        );
        if (opt) {
          cleanup();
          resolve(opt);
        }
      }

      function cleanup() {
        for (const o of overlays) o.el.remove();
        buttons.activate.removeEventListener('click', onActivate);
        buttons.move.removeEventListener('click', onMove);
        buttons.manipulate.removeEventListener('click', onManipulate);
        buttons.turnLeft.removeEventListener('click', onTurnLeft);
        buttons.turnRight.removeEventListener('click', onTurnRight);
        buttons.pass.removeEventListener('click', onPass);
        buttons.activate.classList.remove('active');
        buttons.move.classList.remove('active');
        buttons.manipulate.classList.remove('active');
      }

      buttons.activate.addEventListener('click', onActivate);
      buttons.move.addEventListener('click', onMove);
      buttons.manipulate.addEventListener('click', onManipulate);
      buttons.turnLeft.addEventListener('click', onTurnLeft);
      buttons.turnRight.addEventListener('click', onTurnRight);
      buttons.pass.addEventListener('click', onPass);

      buttons.activate.disabled = activateMap.size === 0;
      buttons.move.disabled = !options.some(
        (o) => o.type === 'action' && o.action === 'move',
      );
      buttons.manipulate.disabled = !options.some(
        (o) => o.type === 'action' && o.action === 'door',
      );
      buttons.turnLeft.disabled = !options.some(
        (o) => o.type === 'action' && o.action === 'turnLeft',
      );
      buttons.turnRight.disabled = !options.some(
        (o) => o.type === 'action' && o.action === 'turnRight',
      );
      buttons.pass.disabled = !options.some(
        (o) => o.type === 'action' && o.action === 'pass',
      );
    });
  }

  async messageBox(_message: string): Promise<boolean> {
    return true;
  }
}

function sameCoord(a: Coord, b: Coord): boolean {
  return a.x === b.x && a.y === b.y;
}
