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

      buttons.move.textContent = '(M)ove';
      buttons.manipulate.textContent = '(E)manipulate';
      buttons.turnLeft.textContent = 'Turn (L)eft';
      buttons.turnRight.textContent = 'Turn (R)ight';
      buttons.turnLeft.style.color = '';
      buttons.turnRight.style.color = '';

      const overlays: { el: HTMLElement; type: 'activate' | 'move' | 'door' | 'turn' }[] = [];

      const addOverlay = (
        coord: Coord,
        color: string,
        type: 'activate' | 'move' | 'door',
        onClick?: () => void,
        apCost?: number,
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
        if (type === 'move' && typeof apCost === 'number') {
          div.addEventListener('mouseenter', () => {
            buttons.move.textContent = `(M)ove: ${apCost} AP`;
          });
          div.addEventListener('mouseleave', () => {
            buttons.move.textContent = '(M)ove';
          });
        }
        container.appendChild(div);
        overlays.push({ el: div, type });
      };

      const addTurnHighlight = (coord: Coord) => {
        const rect = cellToRect(coord);
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.left = `${rect.x}px`;
        div.style.top = `${rect.y}px`;
        div.style.width = `${rect.width}px`;
        div.style.height = `${rect.height}px`;
        div.style.boxSizing = 'border-box';
        div.style.border = '2px solid white';
        div.style.pointerEvents = 'none';
        container.appendChild(div);
        overlays.push({ el: div, type: 'turn' });
      };

      for (const opt of options) {
        if (opt.type === 'action' && opt.action === 'move' && opt.coord) {
          addOverlay(
            opt.coord,
            'green',
            'move',
            () => {
              cleanup();
              resolve(opt);
            },
            opt.apCost,
          );
        }
        if (opt.type === 'action' && opt.action === 'door' && opt.coord) {
          addOverlay(opt.coord, 'blue', 'door', () => {
            cleanup();
            resolve(opt);
          });
        }
      }

      // Highlight cells that can be activated. The rules already
      // specify which coordinates are valid, so we don't need to
      // inspect the board or filter by token type here.
      for (const opt of options) {
        if (opt.type === 'action' && opt.action === 'activate' && opt.coord) {
          addOverlay(opt.coord, 'purple', 'activate', () => {
            cleanup();
            resolve(opt);
          });
        }
      }

      const doorOpt = options.find(
        (o) => o.type === 'action' && o.action === 'door',
      );
      if (doorOpt) {
        buttons.manipulate.textContent = `(E)manipulate: ${doorOpt.apCost ?? 0} AP`;
      }
      const leftOpt = options.find(
        (o) => o.type === 'action' && o.action === 'turnLeft',
      );
      if (leftOpt) {
        buttons.turnLeft.textContent = `Turn (L)eft: ${leftOpt.apCost ?? 0} AP`;
        buttons.turnLeft.style.color = leftOpt.apCost === 0 ? 'green' : '';
      }
      const rightOpt = options.find(
        (o) => o.type === 'action' && o.action === 'turnRight',
      );
      if (rightOpt) {
        buttons.turnRight.textContent = `Turn (R)ight: ${rightOpt.apCost ?? 0} AP`;
        buttons.turnRight.style.color = rightOpt.apCost === 0 ? 'green' : '';
      }

      let filter: 'activate' | 'move' | 'door' | null = null;
      const setFilter = (f: 'activate' | 'move' | 'door' | null) => {
        filter = f;
        for (const o of overlays) {
          o.el.style.display =
            !filter || o.type === filter || o.type === 'turn' ? 'block' : 'none';
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
        if (buttons.turnLeft.disabled) return;
        const opt = options.find(
          (o) => o.type === 'action' && o.action === 'turnLeft',
        );
        if (opt) {
          cleanup();
          resolve(opt);
        }
      }
      function onTurnRight() {
        if (buttons.turnRight.disabled) return;
        const opt = options.find(
          (o) => o.type === 'action' && o.action === 'turnRight',
        );
        if (opt) {
          cleanup();
          resolve(opt);
        }
      }

      function onPass() {
        if (buttons.pass.disabled) return;
        const opt = options.find(
          (o) => o.type === 'action' && o.action === 'pass',
        );
        if (opt) {
          cleanup();
          resolve(opt);
        }
      }

      const turnRightOpt = options.find(
        (o) => o.type === 'action' && o.action === 'turnRight' && o.coord,
      );
      if (turnRightOpt && turnRightOpt.coord) {
        addTurnHighlight(turnRightOpt.coord);
      }

      function cleanup() {
        for (const o of overlays) o.el.remove();
        buttons.activate.removeEventListener('click', onActivate);
        buttons.move.removeEventListener('click', onMove);
        buttons.manipulate.removeEventListener('click', onManipulate);
        buttons.turnLeft.removeEventListener('click', onTurnLeft);
        buttons.turnRight.removeEventListener('click', onTurnRight);
        buttons.pass.removeEventListener('click', onPass);
        if (document.removeEventListener) {
          document.removeEventListener('keydown', onKey);
        }
        buttons.activate.classList.remove('active');
        buttons.move.classList.remove('active');
        buttons.manipulate.classList.remove('active');
        buttons.move.textContent = '(M)ove';
        buttons.manipulate.textContent = '(E)manipulate';
        buttons.turnLeft.textContent = 'Turn (L)eft';
        buttons.turnRight.textContent = 'Turn (R)ight';
        buttons.turnLeft.style.color = '';
        buttons.turnRight.style.color = '';
      }

      buttons.activate.addEventListener('click', onActivate);
      buttons.move.addEventListener('click', onMove);
      buttons.manipulate.addEventListener('click', onManipulate);
      buttons.turnLeft.addEventListener('click', onTurnLeft);
      buttons.turnRight.addEventListener('click', onTurnRight);
      buttons.pass.addEventListener('click', onPass);

      const keyMap: Record<string, () => void> = {
        n: onActivate,
        m: onMove,
        e: onManipulate,
        l: onTurnLeft,
        r: onTurnRight,
        p: onPass,
      };
      const onKey = (e: KeyboardEvent) => {
        const fn = keyMap[e.key.toLowerCase()];
        if (fn) {
          e.preventDefault();
          fn();
        }
      };
      if (document.addEventListener) {
        document.addEventListener('keydown', onKey);
      }

      const hasActivate = options.some(
        (o) => o.type === 'action' && o.action === 'activate' && o.coord,
      );
      buttons.activate.disabled = !hasActivate;
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
