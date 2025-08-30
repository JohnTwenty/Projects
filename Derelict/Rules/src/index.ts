import type { BoardState, Coord, TokenInstance } from 'derelict-boardstate';
import { getCellType as boardGetCellType } from 'derelict-boardstate';
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
    const token = marineTokens.find((t) => sameCoord(t.cells[0], chosen));
    if (!token) return;

    if (action === 'move') {
      const target = forwardCell(token);
      if (isMoveAllowed(this.board, target)) {
        token.cells = token.cells.map(() => target);
      }
    } else if (action === 'turnLeft') {
      token.rot = rotateLeft(token.rot as any);
    } else if (action === 'turnRight') {
      token.rot = rotateRight(token.rot as any);
    }
  }
}

function sameCoord(a: Coord, b: Coord): boolean {
  return a.x === b.x && a.y === b.y;
}

function forwardCell(token: TokenInstance): Coord {
  const c = token.cells[0];
  const rot = (token.rot ?? 0) as 0 | 90 | 180 | 270;
  switch (rot) {
    case 0:
      return { x: c.x + 1, y: c.y };
    case 90:
      return { x: c.x, y: c.y + 1 };
    case 180:
      return { x: c.x - 1, y: c.y };
    case 270:
      return { x: c.x, y: c.y - 1 };
  }
}

function isMoveAllowed(state: BoardState, target: Coord): boolean {
  // Check board bounds
  if (target.x < 0 || target.y < 0 || target.x >= state.size || target.y >= state.size) {
    return false;
  }
  // Check terrain if available (1=corridor)
  const type = (state as any).getCellType
    ? (state as any).getCellType(target)
    : boardGetCellType
    ? boardGetCellType(state as any, target)
    : 1;
  if (typeof type === 'number' && type !== 1) return false;
  // Check occupancy
  for (const t of state.tokens) {
    if (t.cells.some((c) => sameCoord(c, target))) return false;
  }
  return true;
}

function rotateLeft(rot: 0 | 90 | 180 | 270): 0 | 90 | 180 | 270 {
  switch (rot) {
    case 0:
      return 270;
    case 90:
      return 0;
    case 180:
      return 90;
    case 270:
      return 180;
  }
}

function rotateRight(rot: 0 | 90 | 180 | 270): 0 | 90 | 180 | 270 {
  switch (rot) {
    case 0:
      return 90;
    case 90:
      return 180;
    case 180:
      return 270;
    case 270:
      return 0;
  }
}
