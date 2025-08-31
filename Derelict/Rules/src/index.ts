import type { BoardState, Coord, TokenInstance, Rotation } from 'derelict-boardstate';
import type { Player, Choice } from 'derelict-players';

export interface Rules {
  validate(state: BoardState): void;
  runGame(p1: Player, p2: Player): Promise<void>;
}

// Basic rules implementation allowing a marine to move forward one cell
export class BasicRules implements Rules {
  constructor(
    private board: BoardState,
    private onChange?: (state: BoardState) => void,
  ) {}

  validate(state: BoardState): void {
    const hasMarine = state.tokens.some((t) => t.type === 'marine');
    if (!hasMarine) {
      throw new Error('No marines on board');
    }
  }

  async runGame(p1: Player, _p2: Player): Promise<void> {
    while (true) {
      const marineTokens = this.board.tokens.filter((t) => t.type === 'marine');
      if (marineTokens.length === 0) return;

      const marineChoices: Choice[] = marineTokens.map((t) => ({
        type: 'marine',
        coord: t.cells[0],
      }));

      const chosen = await p1.choose(marineChoices);
      const token = marineTokens.find((t) => chosen.coord && sameCoord(t.cells[0], chosen.coord));
      if (!token) continue;

      let selecting = true;
      while (selecting) {
        const actionChoices: Choice[] = [];
        if (canMoveForward(this.board, token)) {
          actionChoices.push({
            type: 'action',
            action: 'move',
            coord: forwardCell(token.cells[0], token.rot as Rotation),
            sprite: 'forward',
            rot: token.rot,
          });
        }
        actionChoices.push({
          type: 'action',
          action: 'turnLeft',
          coord: token.cells[0],
          sprite: 'turn',
          rot: (token.rot + 270) % 360,
        });
        actionChoices.push({
          type: 'action',
          action: 'turnRight',
          coord: token.cells[0],
          sprite: 'turn',
          rot: (token.rot + 90) % 360,
        });
        actionChoices.push({ type: 'action', action: 'selectOther' });

        const action = await p1.choose(actionChoices);
        switch (action.action) {
          case 'move':
            moveForward(token);
            this.onChange?.(this.board);
            break;
          case 'turnLeft':
            token.rot = (((token.rot + 270) % 360) as Rotation);
            this.onChange?.(this.board);
            break;
          case 'turnRight':
            token.rot = (((token.rot + 90) % 360) as Rotation);
            this.onChange?.(this.board);
            break;
          case 'selectOther':
            selecting = false;
            break;
        }
      }
    }
  }
}

function sameCoord(a: Coord, b: Coord): boolean {
  return a.x === b.x && a.y === b.y;
}

function forwardCell(cell: Coord, rot: Rotation): Coord {
  switch (rot) {
    case 0:
      return { x: cell.x + 1, y: cell.y };
    case 90:
      return { x: cell.x, y: cell.y + 1 };
    case 180:
      return { x: cell.x - 1, y: cell.y };
    case 270:
      return { x: cell.x, y: cell.y - 1 };
    default:
      return cell;
  }
}

function canMoveForward(board: BoardState, token: TokenInstance): boolean {
  const target = forwardCell(token.cells[0], token.rot as Rotation);
  const cellType = board.getCellType ? board.getCellType(target) : 1;
  if (cellType !== 1) return false; // must be corridor
  const occupied = board.tokens.some((t) =>
    t.cells.some((c) => sameCoord(c, target)),
  );
  if (occupied) return false;
  return true;
}

function moveForward(token: TokenInstance): void {
  token.cells = token.cells.map((c) => forwardCell(c, token.rot as Rotation));
}
