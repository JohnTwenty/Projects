import type { BoardState, Coord, TokenInstance, Rotation } from 'derelict-boardstate';
import type { Player, Choice } from 'derelict-players';

export interface Rules {
  validate(state: BoardState): void;
  runGame(p1: Player, p2: Player): Promise<void>;
}

// Basic rules implementation allowing a marine to move forward one cell
export class BasicRules implements Rules {
  private nextDeactId = 1;
  private nextAlienId = 1;
  private turn = 1;
  private activePlayer = 1;
  constructor(
    private board: BoardState,
    private onChange?: (state: BoardState) => void,
    private onStatus?: (info: { turn: number; activePlayer: number; ap?: number }) => void,
    initialState?: { turn?: number; activePlayer?: number },
  ) {
    if (initialState) {
      if (typeof initialState.turn === 'number') this.turn = initialState.turn;
      if (typeof initialState.activePlayer === 'number') this.activePlayer = initialState.activePlayer;
    }
  }

  getState() {
    return { turn: this.turn, activePlayer: this.activePlayer };
  }

  private emitStatus(ap?: number, activePlayer = this.activePlayer) {
    this.onStatus?.({ turn: this.turn, activePlayer, ap });
  }

  validate(state: BoardState): void {
    const hasMarine = state.tokens.some((t) => t.type === 'marine');
    if (!hasMarine) {
      throw new Error('No marines on board');
    }
  }

  async runGame(p1: Player, p2: Player): Promise<void> {
    let currentPlayer: Player = this.activePlayer === 1 ? p1 : p2;
    let currentSide: 'marine' | 'alien' = this.activePlayer === 1 ? 'marine' : 'alien';
    let active: TokenInstance | null = null;
    let apRemaining = 0;
    let lastMove = false;
    const checkInvoluntaryReveals = async () => {
      while (true) {
        const marines = this.board.tokens.filter((t) => t.type === 'marine');
        const blips = this.board.tokens.filter((t) => isBlip(t));
        const target = blips.find((b) =>
          marines.some((m) => marineHasLineOfSight(this.board, m, b.cells[0])),
        );
        if (!target) break;
        const blipType = target.type;
        const existingAliens = this.board.tokens.filter(
          (t) => t.type === 'alien',
        ).length;
        const maxTotal = Math.min(
          blipType === 'blip'
            ? 1
            : blipType === 'blip_2'
            ? 2
            : 3,
          22 - existingAliens,
        );
        target.type = 'alien';
        const origin = { ...target.cells[0] };
        const hadDeact = hasDeactivatedToken(this.board, origin);
        this.onChange?.(this.board);
        this.emitStatus(undefined, 2);
        await orientAlien(
          p2,
          target,
          [{ type: 'action', action: 'pass', apCost: 0, apRemaining: 0 }],
          this.board,
          this.onChange?.bind(this),
          0,
        );
        let remaining = maxTotal - 1;
        while (remaining > 0) {
          const deployCells = getDeployCells(this.board, origin, true);
          if (deployCells.length === 0) break;
          this.emitStatus(undefined, 1);
          const choice = await p1.choose(
            deployCells.map((c) => ({
              type: 'action' as const,
              action: 'deploy' as const,
              coord: c,
              apCost: 0,
              apRemaining: 0,
            })),
          );
          if (choice.action !== 'deploy' || !choice.coord) break;
          const newAlien: TokenInstance = {
            instanceId: `alien-${this.nextAlienId++}`,
            type: 'alien',
            rot: target.rot,
            cells: [{ ...choice.coord }],
          };
          this.board.tokens.push(newAlien);
          if (hadDeact) {
            this.board.tokens.push({
              instanceId: `deactivated-${this.nextDeactId++}`,
              type: 'deactivated',
              rot: 0,
              cells: [{ ...choice.coord }],
            });
          }
          this.onChange?.(this.board);
          this.emitStatus(undefined, 2);
          await orientAlien(
            p2,
            newAlien,
            [{ type: 'action', action: 'pass', apCost: 0, apRemaining: 0 }],
            this.board,
            this.onChange?.bind(this),
            0,
          );
          remaining--;
        }
      }
    };
    this.emitStatus();
    mainLoop: while (true) {
      const tokens = this.board.tokens.filter((t) =>
        currentSide === 'marine' ? t.type === 'marine' : t.type === 'alien' || isBlip(t),
      );
      if (tokens.length === 0) return;
      if (!active || !tokens.includes(active) || hasDeactivatedToken(this.board, active.cells[0])) {
        active = null;
        apRemaining = 0;
        lastMove = false;
      }

      const availableTokens = tokens.filter(
        (t) => !hasDeactivatedToken(this.board, t.cells[0]),
      );

      const actionChoices: Choice[] = [
        { type: 'action', action: 'pass', apCost: 0, apRemaining },
      ];
      if (active) {
        const moves = getMoveOptions(this.board, active);
        for (const mv of moves) {
          if (apRemaining >= mv.cost) {
            actionChoices.push({
              type: 'action',
              action: 'move',
              coord: mv.coord,
              apCost: mv.cost,
              apRemaining,
            });
          }
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
            } else if (apRemaining >= 1) {
              actionChoices.push({
                type: 'action',
                action: 'door',
                coord: cell,
                apCost: 1,
                apRemaining,
              });
            }
          }
        }
        const tCost = getTurnCost(active, lastMove);
        if (apRemaining >= tCost) {
          actionChoices.push({
            type: 'action',
            action: 'turnLeft',
            coord: active.cells[0],
            apCost: tCost,
            apRemaining,
          });
          actionChoices.push({
            type: 'action',
            action: 'turnRight',
            coord: active.cells[0],
            apCost: tCost,
            apRemaining,
          });
        }
        if (
          isBlip(active) &&
          apRemaining >= 6 &&
          this.board.tokens.filter((t) => t.type === 'alien').length < 22
        ) {
          actionChoices.push({
            type: 'action',
            action: 'reveal',
            apCost: 6,
            apRemaining,
          });
        }
        for (const t of availableTokens) {
          if (t !== active) {
            actionChoices.push({
              type: 'action',
              action: 'activate',
              coord: t.cells[0],
              apCost: 0,
              apRemaining: initialAp(t),
            });
          }
        }
      } else {
        for (const t of availableTokens) {
          actionChoices.push({
            type: 'action',
            action: 'activate',
            coord: t.cells[0],
            apCost: 0,
            apRemaining: initialAp(t),
          });
        }
      }

      const action = await currentPlayer.choose(actionChoices);
      switch (action.action) {
        case 'move':
          if (active && action.coord && typeof action.apCost === 'number') {
            moveToken(active, action.coord);
            apRemaining -= action.apCost;
            lastMove = true;
            this.onChange?.(this.board);
            await checkInvoluntaryReveals();
            this.emitStatus(apRemaining);
          }
          break;
        case 'turnLeft':
          if (active && typeof action.apCost === 'number') {
            active.rot = (((active.rot + 270) % 360) as Rotation);
            apRemaining -= action.apCost;
            lastMove = false;
            this.onChange?.(this.board);
            await checkInvoluntaryReveals();
            this.emitStatus(apRemaining);
          }
          break;
        case 'turnRight':
          if (active && typeof action.apCost === 'number') {
            active.rot = (((active.rot + 90) % 360) as Rotation);
            apRemaining -= action.apCost;
            lastMove = false;
            this.onChange?.(this.board);
            await checkInvoluntaryReveals();
            this.emitStatus(apRemaining);
          }
          break;
        case 'reveal':
          if (active && isBlip(active) && typeof action.apCost === 'number') {
            apRemaining -= action.apCost;
            const blipType = active.type;
            const existingAliens = this.board.tokens.filter(
              (t) => t.type === 'alien',
            ).length;
            const maxTotal = Math.min(
              blipType === 'blip'
                ? 1
                : blipType === 'blip_2'
                ? 2
                : 3,
              22 - existingAliens,
            );
            active.type = 'alien';
            this.onChange?.(this.board);
            const origin = { ...active.cells[0] };
            let remaining = maxTotal - 1;
            let current = active;
            while (true) {
              const deployCells =
                remaining > 0 ? getDeployCells(this.board, origin) : [];
              const extras: Choice[] = [];
              if (deployCells.length > 0 && remaining > 0) {
                extras.push(
                  ...deployCells.map((c) => ({
                    type: 'action' as const,
                    action: 'deploy' as const,
                    coord: c,
                    apCost: 0,
                    apRemaining,
                  })),
                );
              }
              if (remaining === 0 || deployCells.length === 0) {
                // allow activating allies or passing only when no more aliens can be deployed
                const avail = this.board.tokens.filter(
                  (t) =>
                    (currentSide === 'marine'
                      ? t.type === 'marine'
                      : t.type === 'alien' || isBlip(t)) &&
                    !hasDeactivatedToken(this.board, t.cells[0]),
                );
                for (const t of avail) {
                  if (t !== current) {
                    extras.push({
                      type: 'action' as const,
                      action: 'activate' as const,
                      coord: t.cells[0],
                      apCost: 0,
                      apRemaining: initialAp(t),
                    });
                  }
                }
                extras.push({
                  type: 'action' as const,
                  action: 'pass' as const,
                  apCost: 0,
                  apRemaining,
                });
              }
              const choice = await orientAlien(
                currentPlayer,
                current,
                extras,
                this.board,
                this.onChange?.bind(this),
                apRemaining,
              );
              if (choice.action === 'deploy' && choice.coord) {
                const newAlien = {
                  instanceId: `alien-${this.nextAlienId++}`,
                  type: 'alien',
                  rot: current.rot,
                  cells: [{ ...choice.coord }],
                };
                this.board.tokens.push(newAlien);
                this.onChange?.(this.board);
                current = newAlien;
                remaining--;
                continue;
              }
              if (choice.action === 'activate' && choice.coord) {
                const target = this.board.tokens.find((t) =>
                  sameCoord(t.cells[0], choice.coord!),
                );
                if (target) {
                  active = target;
                  apRemaining = initialAp(target);
                  lastMove = false;
                  this.emitStatus(apRemaining);
                }
                continue mainLoop;
              }
              if (choice.action === 'pass') {
                if (this.board.tokens.some((t) => t.type === 'deactivated')) {
                  this.board.tokens = this.board.tokens.filter(
                    (t) => t.type !== 'deactivated',
                  );
                  this.onChange?.(this.board);
                }
                this.activePlayer = this.activePlayer === 1 ? 2 : 1;
                if (this.activePlayer === 1) this.turn++;
                currentPlayer = currentPlayer === p1 ? p2 : p1;
                currentSide = currentSide === 'marine' ? 'alien' : 'marine';
                active = null;
                apRemaining = 0;
                lastMove = false;
                this.emitStatus();
                continue mainLoop;
              }
              break;
            }
            active = null;
            lastMove = false;
            this.emitStatus(apRemaining);
          }
          break;
        case 'activate': {
          const target = tokens.find(
            (t) => action.coord && sameCoord(t.cells[0], action.coord),
          );
          if (target) {
            if (active) {
              const coord = active.cells[0];
              if (!hasDeactivatedToken(this.board, coord)) {
                this.board.tokens.push({
                  instanceId: `deactivated-${this.nextDeactId++}`,
                  type: 'deactivated',
                  rot: 0,
                  cells: [{ ...coord }],
                });
                this.onChange?.(this.board);
              }
            }
            active = target;
            apRemaining = initialAp(target);
            lastMove = false;
            this.emitStatus(apRemaining);
          }
          break;
        }
        case 'door': {
          const cell = action.coord;
          if (cell && typeof action.apCost === 'number') {
            const doorToken = this.board.tokens.find((t) =>
              t.cells.some((c) => sameCoord(c, cell)) &&
              (t.type === 'door' || t.type === 'dooropen'),
            );
            if (doorToken) {
              doorToken.type = doorToken.type === 'door' ? 'dooropen' : 'door';
              apRemaining -= action.apCost;
              lastMove = false;
              this.onChange?.(this.board);
              await checkInvoluntaryReveals();
              this.emitStatus(apRemaining);
            }
          }
          break;
        }
        case 'pass':
          if (this.board.tokens.some((t) => t.type === 'deactivated')) {
            this.board.tokens = this.board.tokens.filter(
              (t) => t.type !== 'deactivated',
            );
            this.onChange?.(this.board);
          }
          this.activePlayer = this.activePlayer === 1 ? 2 : 1;
          if (this.activePlayer === 1) this.turn++;
          currentPlayer = currentPlayer === p1 ? p2 : p1;
          currentSide = currentSide === 'marine' ? 'alien' : 'marine';
          active = null;
          apRemaining = 0;
          lastMove = false;
          this.emitStatus();
          break;
      }
    }
  }
}

function sameCoord(a: Coord, b: Coord): boolean {
  return a.x === b.x && a.y === b.y;
}

function isAdjacent(a: Coord, b: Coord): boolean {
  return Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1;
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

function backwardCell(cell: Coord, rot: Rotation): Coord {
  return forwardCell(cell, ((rot + 180) % 360) as Rotation);
}

function canMoveTo(board: BoardState, target: Coord): boolean {
  const cellType = board.getCellType ? board.getCellType(target) : 1;
  if (cellType !== 1) return false;
  const occupied = board.tokens.some(
    (t) => blocksMovement(t) && t.cells.some((c) => sameCoord(c, target)),
  );
  return !occupied;
}

function moveToken(token: TokenInstance, target: Coord): void {
  const dx = target.x - token.cells[0].x;
  const dy = target.y - token.cells[0].y;
  token.cells = token.cells.map((c) => ({ x: c.x + dx, y: c.y + dy }));
}

async function orientAlien(
  player: Player,
  token: TokenInstance,
  extras: Choice[],
  board: BoardState,
  onChange?: (state: BoardState) => void,
  apRemaining = 0,
): Promise<Choice> {
  while (true) {
    const choice = await player.choose([
      ...extras,
      {
        type: 'action',
        action: 'turnLeft',
        coord: token.cells[0],
        apCost: 0,
        apRemaining,
      },
      {
        type: 'action',
        action: 'turnRight',
        coord: token.cells[0],
        apCost: 0,
        apRemaining,
      },
    ]);
    if (choice.action === 'turnLeft') {
      token.rot = (((token.rot + 270) % 360) as Rotation);
      onChange?.(board);
      continue;
    }
    if (choice.action === 'turnRight') {
      token.rot = (((token.rot + 90) % 360) as Rotation);
      onChange?.(board);
      continue;
    }
    return choice;
  }
}

export function getMoveOptions(board: BoardState, token: TokenInstance): { coord: Coord; cost: number }[] {
  const rot = token.rot as Rotation;
  const pos = token.cells[0];
  let res: { coord: Coord; cost: number }[] = [];
  const forward = forwardCell(pos, rot);
  const forwardLeft = leftCell(forward, rot);
  const forwardRight = rightCell(forward, rot);
  if (canMoveTo(board, forward)) res.push({ coord: forward, cost: 1 });
  if (canMoveTo(board, forwardLeft)) res.push({ coord: forwardLeft, cost: 1 });
  if (canMoveTo(board, forwardRight)) res.push({ coord: forwardRight, cost: 1 });
  const backward = backwardCell(pos, rot);
  const backwardLeft = leftCell(backward, rot);
  const backwardRight = rightCell(backward, rot);
  if (token.type === 'marine') {
    if (canMoveTo(board, backward)) res.push({ coord: backward, cost: 2 });
    if (canMoveTo(board, backwardLeft)) res.push({ coord: backwardLeft, cost: 2 });
    if (canMoveTo(board, backwardRight)) res.push({ coord: backwardRight, cost: 2 });
  } else if (token.type === 'alien') {
    if (canMoveTo(board, backward)) res.push({ coord: backward, cost: 2 });
    if (canMoveTo(board, backwardLeft)) res.push({ coord: backwardLeft, cost: 2 });
    if (canMoveTo(board, backwardRight)) res.push({ coord: backwardRight, cost: 2 });
  } else if (isBlip(token)) {
    if (canMoveTo(board, backward)) res.push({ coord: backward, cost: 1 });
    if (canMoveTo(board, backwardLeft)) res.push({ coord: backwardLeft, cost: 1 });
    if (canMoveTo(board, backwardRight)) res.push({ coord: backwardRight, cost: 1 });
  }
  if (token.type === 'alien' || isBlip(token)) {
    const left = leftCell(pos, rot);
    if (canMoveTo(board, left)) res.push({ coord: left, cost: 1 });
    const right = rightCell(pos, rot);
    if (canMoveTo(board, right)) res.push({ coord: right, cost: 1 });
  }
  if (isBlip(token)) {
    const marines = board.tokens.filter((t) => t.type === 'marine');
    res = res.filter(
      (mv) =>
        !marines.some(
          (m) =>
            isAdjacent(m.cells[0], mv.coord) ||
            marineHasLineOfSight(board, m, mv.coord, [token]),
        ),
    );
  }
  return res;
}

function getDeployCells(
  board: BoardState,
  origin: Coord,
  allowVisible = false,
): Coord[] {
  const res: Coord[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const c = { x: origin.x + dx, y: origin.y + dy };
      const cellType = board.getCellType ? board.getCellType(c) : 1;
      if (cellType !== 1) continue;
      if (
        board.tokens.some(
          (t) => blocksMovement(t) && t.cells.some((cc) => sameCoord(cc, c)),
        )
      )
        continue;
      if (!allowVisible) {
        const marines = board.tokens.filter((t) => t.type === 'marine');
        if (marines.some((m) => marineHasLineOfSight(board, m, c))) continue;
      }
      res.push(c);
    }
  }
  return res;
}

function initialAp(token: TokenInstance): number {
  if (token.type === 'marine') return 4;
  if (token.type === 'alien' || isBlip(token)) return 6;
  return 0;
}

function getTurnCost(token: TokenInstance, lastMove: boolean): number {
  if (token.type === 'marine') return 1;
  if (token.type === 'alien') return lastMove ? 0 : 1;
  if (isBlip(token)) return 0;
  return 1;
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

function isBlip(t: { type: string }): boolean {
  return t.type.startsWith('blip');
}

function isUnit(t: { type: string }): boolean {
  return t.type === 'marine' || t.type === 'alien' || isBlip(t);
}

function blocksMovement(t: TokenInstance): boolean {
  return t.type === 'door' || isUnit(t);
}

function hasDeactivatedToken(board: BoardState, coord: Coord): boolean {
  return board.tokens.some(
    (t) => t.type === 'deactivated' && t.cells.some((c) => sameCoord(c, coord)),
  );
}

function hasLineOfSightOneWay(
  board: BoardState,
  from: Coord,
  to: Coord,
  ignore: TokenInstance[] = [],
): boolean {
  let x0 = from.x;
  let y0 = from.y;
  const x1 = to.x;
  const y1 = to.y;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  while (x !== x1 || y !== y1) {
    const prevX = x;
    const prevY = y;
    const e2 = err * 2;
    let movedX = false;
    let movedY = false;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
      movedX = true;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
      movedY = true;
    }
    const current = { x, y };
    if (!(x === x1 && y === y1) && isObstructed(board, current, ignore)) return false;
    if (movedX && movedY) {
      const c1 = { x, y: prevY };
      const c2 = { x: prevX, y };
      if (isObstructed(board, c1, ignore) && isObstructed(board, c2, ignore)) {
        return false;
      }
    }
  }
  return true;
}

export function hasLineOfSight(
  board: BoardState,
  from: Coord,
  to: Coord,
  ignore: TokenInstance[] = [],
): boolean {
  return (
    hasLineOfSightOneWay(board, from, to, ignore) &&
    hasLineOfSightOneWay(board, to, from, ignore)
  );
}

function isObstructed(
  board: BoardState,
  coord: Coord,
  ignore: TokenInstance[],
): boolean {
  const cellType = board.getCellType ? board.getCellType(coord) : 1;
  if (cellType !== 1) return true;
  return board.tokens.some(
    (t) => !ignore.includes(t) && blocksSight(t) && t.cells.some((c) => sameCoord(c, coord)),
  );
}

function blocksSight(t: TokenInstance): boolean {
  return t.type === 'door' || t.type === 'marine' || t.type === 'alien' || isBlip(t);
}

function rotVector(rot: Rotation): { x: number; y: number } {
  switch (rot) {
    case 0:
      return { x: 0, y: 1 };
    case 90:
      return { x: -1, y: 0 };
    case 180:
      return { x: 0, y: -1 };
    case 270:
      return { x: 1, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
}

function withinFov(from: Coord, rot: Rotation, to: Coord): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return true;
  const f = rotVector(rot);
  const dot = dx * f.x + dy * f.y;
  if (dot <= 0) return false;
  const dist2 = dx * dx + dy * dy;
  return dot * dot >= dist2 / 2;
}

export function marineHasLineOfSight(
  board: BoardState,
  marine: TokenInstance,
  to: Coord,
  ignore: TokenInstance[] = [],
): boolean {
  if (!withinFov(marine.cells[0], marine.rot as Rotation, to)) return false;
  return hasLineOfSight(board, marine.cells[0], to, ignore);
}
