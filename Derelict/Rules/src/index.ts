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

  async runGame(p1: Player, p2: Player): Promise<void> {
    let currentPlayer: Player = p1;
    let currentSide: 'marine' | 'alien' = 'marine';
    let active: TokenInstance | null = null;
    while (true) {
      const tokens = this.board.tokens.filter((t) =>
        currentSide === 'marine' ? t.type === 'marine' : t.type === 'alien' || t.type === 'blip',
      );
      if (tokens.length === 0) return;
      if (!active || !tokens.includes(active)) {
        active = null;
      }

      const actionChoices: Choice[] = [{ type: 'action', action: 'pass' }];
      if (active) {
        if (canMoveForward(this.board, active)) {
          actionChoices.push({
            type: 'action',
            action: 'move',
            coord: forwardCell(active.cells[0], active.rot as Rotation),
          });
        }
        for (const cell of forwardAndDiagonalCells(
          active.cells[0],
          active.rot as Rotation,
        )) {
          const doorToken = this.board.tokens.find((t) =>
            t.cells.some((c) => sameCoord(c, cell)) &&
            (t.type === 'door' || t.type === 'dooropen'),
          );
          if (doorToken) {
            if (
              doorToken.type === 'dooropen' &&
              this.board.tokens.some(
                (t) =>
                  t !== doorToken &&
                  t.cells.some((c) => sameCoord(c, cell)) &&
                  isUnit(t),
              )
            ) {
              // blocked open door, cannot close
            } else {
              actionChoices.push({
                type: 'action',
                action: 'door',
                coord: cell,
              });
            }
          }
        }
        actionChoices.push({
          type: 'action',
          action: 'turnLeft',
          coord: active.cells[0],
        });
        actionChoices.push({
          type: 'action',
          action: 'turnRight',
          coord: active.cells[0],
        });
        for (const t of tokens) {
          if (t !== active) {
            actionChoices.push({
              type: 'action',
              action: 'activate',
              coord: t.cells[0],
            });
          }
        }
      } else {
        for (const t of tokens) {
          actionChoices.push({
            type: 'action',
            action: 'activate',
            coord: t.cells[0],
          });
        }
      }

      const action = await currentPlayer.choose(actionChoices);
      switch (action.action) {
        case 'move':
          if (active) {
            moveForward(active);
            this.onChange?.(this.board);
          }
          break;
        case 'turnLeft':
          if (active) {
            active.rot = (((active.rot + 270) % 360) as Rotation);
            this.onChange?.(this.board);
          }
          break;
        case 'turnRight':
          if (active) {
            active.rot = (((active.rot + 90) % 360) as Rotation);
            this.onChange?.(this.board);
          }
          break;
        case 'activate': {
          const target = tokens.find(
            (t) => action.coord && sameCoord(t.cells[0], action.coord),
          );
          if (target) active = target;
          break;
        }
        case 'door': {
          const cell = action.coord;
          if (cell) {
            const doorToken = this.board.tokens.find((t) =>
              t.cells.some((c) => sameCoord(c, cell)) &&
              (t.type === 'door' || t.type === 'dooropen'),
            );
            if (doorToken) {
              doorToken.type = doorToken.type === 'door' ? 'dooropen' : 'door';
              this.onChange?.(this.board);
            }
          }
          break;
        }
        case 'pass':
          currentPlayer = currentPlayer === p1 ? p2 : p1;
          currentSide = currentSide === 'marine' ? 'alien' : 'marine';
          active = null;
          break;
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
      return { x: cell.x, y: cell.y + 1 };
    case 90:
      return { x: cell.x - 1, y: cell.y };
    case 180:
      return { x: cell.x, y: cell.y - 1 };
    case 270:
      return { x: cell.x + 1, y: cell.y };
    default:
      return cell;
  }
}

function canMoveForward(board: BoardState, token: TokenInstance): boolean {
  const target = forwardCell(token.cells[0], token.rot as Rotation);
  const cellType = board.getCellType ? board.getCellType(target) : 1;
  if (cellType !== 1) return false; // must be corridor
  const occupied = board.tokens.some(
    (t) => blocksMovement(t) && t.cells.some((c) => sameCoord(c, target)),
  );
  if (occupied) return false;
  return true;
}

function moveForward(token: TokenInstance): void {
  token.cells = token.cells.map((c) => forwardCell(c, token.rot as Rotation));
}

function forwardAndDiagonalCells(cell: Coord, rot: Rotation): Coord[] {
  const f = forwardCell(cell, rot);
  const fl = leftCell(f, rot);
  const fr = rightCell(f, rot);
  return [f, fl, fr];
}

function leftCell(cell: Coord, rot: Rotation): Coord {
  switch (rot) {
    case 0:
      return { x: cell.x - 1, y: cell.y };
    case 90:
      return { x: cell.x, y: cell.y - 1 };
    case 180:
      return { x: cell.x + 1, y: cell.y };
    case 270:
      return { x: cell.x, y: cell.y + 1 };
    default:
      return cell;
  }
}

function rightCell(cell: Coord, rot: Rotation): Coord {
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

function isUnit(t: { type: string }): boolean {
  return t.type === 'marine' || t.type === 'alien' || t.type === 'blip';
}

function blocksMovement(t: TokenInstance): boolean {
  return t.type === 'door' || isUnit(t);
}
