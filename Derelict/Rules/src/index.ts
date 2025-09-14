import type { BoardState, Coord, TokenInstance, Rotation } from 'derelict-boardstate';
import type { Player, Choice } from 'derelict-players';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function formatRolls(rolls: number[]): string {
  return rolls
    .map((r, i) => `${i === 0 ? RED : GREEN}${r}${RESET}`)
    .join(', ');
}

export interface Rules {
  validate(state: BoardState): void;
  runGame(p1: Player, p2: Player): Promise<void>;
}

// Basic rules implementation allowing a marine to move forward one cell
export class BasicRules implements Rules {
  private nextDeactId = 1;
  private nextAlienId = 1;
  private nextGuardId = 1;
  private turn = 1;
  private activePlayer = 1;
  constructor(
    private board: BoardState,
    private onChange?: (state: BoardState) => void,
    private onStatus?: (info: { turn: number; activePlayer: number; ap?: number }) => void,
    initialState?: { turn?: number; activePlayer?: number },
    private onLog?: (message: string, color?: string) => void,
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
    const hasMarine = state.tokens.some((t) => isMarine(t));
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
        const marines = this.board.tokens.filter((t) => isMarine(t));
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
        this.onLog?.('Blip revealed as alien; choose its orientation');
        await orientAlien(
          p2,
          target,
          [{ type: 'action', action: 'pass', apCost: 0, apRemaining: 0 }],
          this.board,
          this.onChange?.bind(this),
          0,
          this.onLog,
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
          this.onLog?.('Blip reveals additional alien; choose its orientation');
          await orientAlien(
            p2,
            newAlien,
            [{ type: 'action', action: 'pass', apCost: 0, apRemaining: 0 }],
            this.board,
            this.onChange?.bind(this),
            0,
            this.onLog,
          );
          remaining--;
        }
      }
    };
    if (this.activePlayer === 1) {
      if (this.board.tokens.some((t) => t.type === 'guard')) {
        this.board.tokens = this.board.tokens.filter((t) => t.type !== 'guard');
        this.onChange?.(this.board);
      }
    }
    this.emitStatus();
    this.onLog?.(`Player ${this.activePlayer} begins turn ${this.turn}`);
    mainLoop: while (true) {
      const tokens = this.board.tokens.filter((t) =>
        currentSide === 'marine' ? isMarine(t) : t.type === 'alien' || isBlip(t),
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
        const front = forwardCell(active.cells[0], active.rot as Rotation);
        const targetToken = this.board.tokens.find((t) =>
          t.cells.some((c) => sameCoord(c, front)),
        );
        if (
          targetToken &&
          apRemaining >= 1 &&
          ((isMarine(active) &&
            (targetToken.type === 'alien' ||
              targetToken.type === 'door' ||
              targetToken.type === 'dooropen')) ||
            (active.type === 'alien' &&
              (isMarine(targetToken) ||
                targetToken.type === 'door' ||
                targetToken.type === 'dooropen')))
        ) {
          actionChoices.push({
            type: 'action',
            action: 'assault' as any,
            coord: front,
            apCost: 1,
            apRemaining,
          });
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
      if (isMarine(active) && apRemaining >= 2) {
        actionChoices.push({
          type: 'action',
          action: 'guard',
          apCost: 2,
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
      const actionType = action.action as string;
      switch (actionType) {
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
        case 'assault':
          if (active && action.coord && typeof action.apCost === 'number') {
            const target = this.board.tokens.find((t) =>
              t.cells.some((c) => sameCoord(c, action.coord!)),
            );
            if (target) {
              apRemaining -= action.apCost;
              lastMove = false;
              if (target.type === 'door' || target.type === 'dooropen') {
                this.onLog?.(
                  `${active.type} assaults ${target.type} at (${action.coord.x}, ${action.coord.y})`,
                );
                if (isMarine(active) && active.type === 'marine_chain') {
                  this.onLog?.('Chainfist marine destroys the door automatically');
                  removeToken(this.board, target);
                } else {
                  const dice = baseDice(active.type);
                  this.onLog?.(`${active.type} rolls ${dice} dice`);
                  const rolls = rollDice(dice);
                  this.onLog?.(`Rolls: ${formatRolls(rolls)}`);
                  if (rolls.some((r) => r === 6)) {
                    this.onLog?.('Door is destroyed');
                    removeToken(this.board, target);
                  } else {
                    this.onLog?.('Door holds');
                  }
                }
                this.onChange?.(this.board);
                await checkInvoluntaryReveals();
                this.emitStatus(apRemaining);
              } else if (
                (isMarine(active) && target.type === 'alien') ||
                (active.type === 'alien' && isMarine(target))
              ) {
                const attackerPlayer = currentPlayer;
                const defenderPlayer = currentPlayer === p1 ? p2 : p1;
                let marine: TokenInstance;
                let alien: TokenInstance;
                let marinePlayer: Player;
                const marineIsAttacker = isMarine(active);
                if (marineIsAttacker) {
                  marine = active;
                  alien = target;
                  marinePlayer = attackerPlayer;
                } else {
                  marine = target;
                  alien = active;
                  marinePlayer = defenderPlayer;
                }
                const marineFacing = sameCoord(
                  forwardCell(marine.cells[0], marine.rot as Rotation),
                  alien.cells[0],
                );
                let marineDice = baseDice(marine.type);
                let alienDice = baseDice(alien.type);
                if (marineFacing) {
                  if (marine.type === 'marine_hammer') {
                    alienDice--;
                    this.onLog?.('Hammer reduces alien dice by 1');
                  }
                  if (marine.type === 'marine_claws') {
                    marineDice++;
                    this.onLog?.('Claws grant +1 marine die');
                  }
                }
                if (alienDice < 0) alienDice = 0;
                if (marineDice < 0) marineDice = 0;
                this.onLog?.(`Rolling ${marineDice} marine dice vs ${alienDice} alien dice`);
                let marineRolls = rollDice(marineDice);
                let alienRolls = rollDice(alienDice);
                this.onLog?.(`Marine rolls: ${formatRolls(marineRolls)}`);
                this.onLog?.(`Alien rolls: ${formatRolls(alienRolls)}`);
                if (marineFacing) {
                  if (marine.type === 'marine_hammer') {
                    marineRolls = marineRolls.map((r) => r + 2);
                    this.onLog?.('Hammer adds +2 to marine rolls');
                  }
                  if (marine.type === 'marine_claws') {
                    marineRolls = marineRolls.map((r) => r + 1);
                    this.onLog?.('Claws add +1 to marine rolls');
                  }
                  if (marine.type === 'marine_sarge') {
                    marineRolls = marineRolls.map((r) => r + 1);
                    this.onLog?.('Sarge adds +1 to marine rolls');
                  }
                  this.onLog?.(`Modified marine rolls: ${formatRolls(marineRolls)}`);
                }
                let attackerRolls = marineIsAttacker ? marineRolls : alienRolls;
                let defenderRolls = marineIsAttacker ? alienRolls : marineRolls;
                const evaluate = () => {
                  const maxA = attackerRolls.length
                    ? Math.max(...attackerRolls)
                    : 0;
                  const maxD = defenderRolls.length
                    ? Math.max(...defenderRolls)
                    : 0;
                  if (maxA > maxD) return 'attacker';
                  if (maxD > maxA) return 'defender';
                  return 'tie';
                };
                let outcome = evaluate();
                const marineHasGuard = this.board.tokens.some(
                  (t) =>
                    t.type === 'guard' &&
                    t.cells.some((c) => sameCoord(c, marine.cells[0])),
                );
                const marineWon = () =>
                  (marineIsAttacker && outcome === 'attacker') ||
                  (!marineIsAttacker && outcome === 'defender');
                if (
                  marineFacing &&
                  marine.type === 'marine_sarge' &&
                  !marineWon()
                ) {
                  this.onLog?.(
                    'Sarge may reroll the highest alien die or accept the result',
                  );
                  const choice = await marinePlayer.choose([
                    { type: 'action', action: 'reroll' as any, apCost: 0, apRemaining },
                    { type: 'action', action: 'accept' as any, apCost: 0, apRemaining },
                  ]);
                  const cAct = choice.action as string;
                  if (cAct === 'reroll' && alienRolls.length > 0) {
                    this.onLog?.('Sarge rerolls highest alien die');
                    alienRolls.sort((a, b) => b - a);
                    alienRolls[0] = rollDice(1)[0];
                    alienRolls.sort((a, b) => b - a);
                    this.onLog?.(
                      `Alien rolls become: ${formatRolls(alienRolls)}`,
                    );
                    attackerRolls = marineIsAttacker
                      ? marineRolls
                      : alienRolls;
                    defenderRolls = marineIsAttacker
                      ? alienRolls
                      : marineRolls;
                    outcome = evaluate();
                  }
                }
                if (marineFacing && marineHasGuard && !marineWon()) {
                  this.onLog?.(
                    'Marine on guard may reroll all dice or accept the result',
                  );
                  const choice = await marinePlayer.choose([
                    { type: 'action', action: 'reroll' as any, apCost: 0, apRemaining },
                    { type: 'action', action: 'accept' as any, apCost: 0, apRemaining },
                  ]);
                  const cAct2 = choice.action as string;
                  if (cAct2 === 'reroll') {
                    this.onLog?.('Guard rerolls all marine dice');
                    marineRolls = rollDice(marineDice);
                    this.onLog?.(`Marine reroll: ${formatRolls(marineRolls)}`);
                    if (marineFacing) {
                      if (marine.type === 'marine_hammer') {
                        marineRolls = marineRolls.map((r) => r + 2);
                        this.onLog?.('Hammer adds +2 to marine rolls');
                      }
                      if (marine.type === 'marine_claws') {
                        marineRolls = marineRolls.map((r) => r + 1);
                        this.onLog?.('Claws add +1 to marine rolls');
                      }
                      if (marine.type === 'marine_sarge') {
                        marineRolls = marineRolls.map((r) => r + 1);
                        this.onLog?.('Sarge adds +1 to marine rolls');
                      }
                      this.onLog?.(
                        `Modified marine rolls: ${formatRolls(marineRolls)}`,
                      );
                    }
                    attackerRolls = marineIsAttacker
                      ? marineRolls
                      : alienRolls;
                    defenderRolls = marineIsAttacker
                      ? alienRolls
                      : marineRolls;
                    outcome = evaluate();
                  }
                }
                if (outcome === 'attacker') {
                  this.onLog?.('Attacker wins assault');
                  removeToken(this.board, target);
                  this.onChange?.(this.board);
                  await checkInvoluntaryReveals();
                } else if (outcome === 'defender') {
                  this.onLog?.('Defender wins assault');
                  const defFacing = sameCoord(
                    forwardCell(target.cells[0], target.rot as Rotation),
                    active.cells[0],
                  );
                  if (defFacing) {
                    removeToken(this.board, active);
                    active = null;
                    apRemaining = 0;
                    this.onChange?.(this.board);
                    await checkInvoluntaryReveals();
                  } else {
                    this.onLog?.(
                      'Defender may turn to face attacker or accept the outcome',
                    );
                    const choice = await defenderPlayer.choose([
                      { type: 'action', action: 'turn' as any, apCost: 0, apRemaining },
                      { type: 'action', action: 'accept' as any, apCost: 0, apRemaining },
                    ]);
                    const dAct = choice.action as string;
                    if (dAct === 'turn') {
                      this.onLog?.('Defender turns to face attacker');
                      target.rot = rotationTowards(target.cells[0], active.cells[0]);
                      this.onChange?.(this.board);
                      await checkInvoluntaryReveals();
                    }
                  }
                } else {
                  this.onLog?.('Assault tied');
                  const defFacing = sameCoord(
                    forwardCell(target.cells[0], target.rot as Rotation),
                    active.cells[0],
                  );
                  if (!defFacing) {
                    this.onLog?.(
                      'Defender may turn to face attacker or accept the outcome',
                    );
                    const choice = await defenderPlayer.choose([
                      { type: 'action', action: 'turn' as any, apCost: 0, apRemaining },
                      { type: 'action', action: 'accept' as any, apCost: 0, apRemaining },
                    ]);
                    const dAct2 = choice.action as string;
                    if (dAct2 === 'turn') {
                      this.onLog?.('Defender turns to face attacker');
                      target.rot = rotationTowards(target.cells[0], active.cells[0]);
                      this.onChange?.(this.board);
                      await checkInvoluntaryReveals();
                    }
                  }
                }
                this.emitStatus(apRemaining);
              }
            }
          }
          break;
        case 'guard':
          if (active && isMarine(active) && typeof action.apCost === 'number') {
            const coord = { ...active.cells[0] };
            apRemaining -= action.apCost;
            this.board.tokens = this.board.tokens.filter(
              (t) => !(t.type === 'overwatch' && t.cells.some((c) => sameCoord(c, coord))),
            );
            this.board.tokens.push({
              instanceId: `guard-${this.nextGuardId++}`,
              type: 'guard',
              rot: 0,
              cells: [coord],
            });
            this.board.tokens.push({
              instanceId: `deactivated-${this.nextDeactId++}`,
              type: 'deactivated',
              rot: 0,
              cells: [coord],
            });
            active = null;
            apRemaining = 0;
            lastMove = false;
            this.onChange?.(this.board);
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
                      ? isMarine(t)
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
              this.onLog?.(
                'Alien player: orient the current alien or choose another action',
              );
              const choice = await orientAlien(
                currentPlayer,
                current,
                extras,
                this.board,
                this.onChange?.bind(this),
                apRemaining,
                this.onLog,
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
                  this.onLog?.(
                    `Player ${this.activePlayer} activated ${target.type} at (${choice.coord.x}, ${choice.coord.y})`,
                  );
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
                this.onLog?.(`Player ${this.activePlayer} begins turn ${this.turn}`);
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
            this.onLog?.(
              `Player ${this.activePlayer} activated ${target.type} at (${target.cells[0].x}, ${target.cells[0].y})`,
            );
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
          if (this.activePlayer === 1) {
            this.turn++;
            if (this.board.tokens.some((t) => t.type === 'guard')) {
              this.board.tokens = this.board.tokens.filter((t) => t.type !== 'guard');
              this.onChange?.(this.board);
            }
          }
          currentPlayer = currentPlayer === p1 ? p2 : p1;
          currentSide = currentSide === 'marine' ? 'alien' : 'marine';
          active = null;
          apRemaining = 0;
          lastMove = false;
          this.emitStatus();
          this.onLog?.(`Player ${this.activePlayer} begins turn ${this.turn}`);
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
  onLog?: (message: string, color?: string) => void,
): Promise<Choice> {
  onLog?.('Alien player: orient the alien or pass to continue');
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
  if (isMarine(token)) {
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
    const marines = board.tokens.filter((t) => isMarine(t));
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
        const marines = board.tokens.filter((t) => isMarine(t));
        if (marines.some((m) => marineHasLineOfSight(board, m, c))) continue;
      }
      res.push(c);
    }
  }
  return res;
}

function initialAp(token: TokenInstance): number {
  if (isMarine(token)) return 4;
  if (token.type === 'alien' || isBlip(token)) return 6;
  return 0;
}

function getTurnCost(token: TokenInstance, lastMove: boolean): number {
  if (isMarine(token)) return 1;
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

function isMarine(t: { type: string }): boolean {
  return t.type.startsWith('marine');
}

function isUnit(t: { type: string }): boolean {
  return isMarine(t) || t.type === 'alien' || isBlip(t);
}

function blocksMovement(t: TokenInstance): boolean {
  return t.type === 'door' || isUnit(t);
}

function hasDeactivatedToken(board: BoardState, coord: Coord): boolean {
  return board.tokens.some(
    (t) => t.type === 'deactivated' && t.cells.some((c) => sameCoord(c, coord)),
  );
}

function removeToken(board: BoardState, token: TokenInstance) {
  const coord = token.cells[0];
  board.tokens = board.tokens.filter(
    (t) =>
      t !== token &&
      !(t.cells.some((c) => sameCoord(c, coord)) &&
        (t.type === 'guard' || t.type === 'overwatch' || t.type === 'jam')),
  );
}

function baseDice(type: string): number {
  if (type === 'alien') return 3;
  if (type === 'door' || type === 'dooropen') return 0;
  if (type.startsWith('marine')) return 1;
  return 0;
}

function rollDice(n: number): number[] {
  const res: number[] = [];
  for (let i = 0; i < n; i++) {
    res.push(Math.floor(Math.random() * 6) + 1);
  }
  return res.sort((a, b) => b - a);
}

function rotationTowards(from: Coord, to: Coord): Rotation {
  if (to.x === from.x && to.y === from.y + 1) return 0;
  if (to.x === from.x - 1 && to.y === from.y) return 90;
  if (to.x === from.x && to.y === from.y - 1) return 180;
  if (to.x === from.x + 1 && to.y === from.y) return 270;
  return 0;
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
  return t.type === 'door' || isUnit(t);
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
