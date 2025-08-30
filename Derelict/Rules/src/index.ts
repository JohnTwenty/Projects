import type { BoardState, Coord, TokenInstance } from 'derelict-boardstate';
import type { Player } from 'derelict-players';

export interface Rules {
  validate(state: BoardState): void;
  runGame(p1: Player, p2: Player): Promise<void>;
}

// Basic rules implementation allowing a marine to move forward one cell
export class BasicRules implements Rules {
  constructor(private board: BoardState) {}

  validate(state: BoardState): void {
    const hasMarine = state.tokens.some((t) => t.type === 'marine');
    if (!hasMarine) {
      throw new Error('No marines on board');
    }
  }

  async runGame(p1: Player, _p2: Player): Promise<void> {
    const marineTokens = this.board.tokens.filter((t) => t.type === 'marine');
    if (marineTokens.length === 0) return;

    const marineCells = marineTokens.map((t) => t.cells[0]);
    const chosen = await p1.chooseMarine(marineCells);
    const action = await p1.chooseAction(['move', 'turnLeft', 'turnRight', 'selectOther']);
    if (action === 'move') {
      const token = marineTokens.find((t) => sameCoord(t.cells[0], chosen));
      if (token) {
        moveForward(token);
      }
    }
  }
}

function sameCoord(a: Coord, b: Coord): boolean {
  return a.x === b.x && a.y === b.y;
}

// Very small placeholder movement: advance token one cell to the east
function moveForward(token: TokenInstance): void {
  token.cells = token.cells.map((c) => ({ x: c.x + 1, y: c.y }));
}
