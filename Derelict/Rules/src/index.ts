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
  private nextBlipId = 1;
  private nextGuardId = 1;
  private nextOverwatchId = 1;
  private nextJamId = 1;
  private nextFlameId = 1;
  private turn = 1;
  private activePlayer = 1;
  private commandPoints = 0;
  private flamerFuel = 6;
  private marineTurnStarted = false;
  private alienTurnStarted = false;
  private marineDeploymentDone = false;
  private overwatchHistory = new Map<string, string | null>();
  constructor(
    private board: BoardState,
    private onChange?: (state: BoardState) => void,
    private onStatus?: (info: {
      turn: number;
      activePlayer: number;
      ap?: number;
      commandPoints?: number;
      flamerFuel?: number;
    }) => void,
    initialState?: {
      turn?: number;
      activePlayer?: number;
      commandPoints?: number;
      flamerFuel?: number;
    },
    private onLog?: (message: string, color?: string) => void,
  ) {
    if (initialState) {
      if (typeof initialState.turn === 'number') this.turn = initialState.turn;
      if (typeof initialState.activePlayer === 'number') this.activePlayer = initialState.activePlayer;
      if (typeof initialState.commandPoints === 'number') {
        this.commandPoints = initialState.commandPoints;
        if (this.activePlayer === 1) {
          this.marineTurnStarted = true;
        }
      }
      if (typeof initialState.flamerFuel === 'number') {
        this.flamerFuel = initialState.flamerFuel;
      }
    }
    const existingBlipIds = this.board.tokens
      .map((t) => t.instanceId)
      .filter((id): id is string => typeof id === 'string' && id.startsWith('blip-'))
      .map((id) => Number.parseInt(id.slice(5), 10))
      .filter((n) => Number.isFinite(n));
    if (existingBlipIds.length > 0) {
      this.nextBlipId = Math.max(...existingBlipIds) + 1;
    }
    const flamerMarine = this.board.tokens.find((t) => t.type === 'marine_flame');
    if (flamerMarine) {
      const ammo = getFlamerAmmoRemaining(flamerMarine);
      if (typeof ammo === 'number') {
        this.flamerFuel = ammo;
      }
      if (!flamerMarine.attrs) {
        flamerMarine.attrs = {};
      }
      (flamerMarine.attrs as Record<string, unknown>).flamerAmmo = this.flamerFuel;
    }
    this.alienTurnStarted = this.activePlayer === 2;
    if (this.turn > 1 || this.activePlayer !== 1 || this.marineTurnStarted) {
      this.marineDeploymentDone = true;
    }
  }

  getState() {
    return {
      turn: this.turn,
      activePlayer: this.activePlayer,
      commandPoints: this.commandPoints,
      flamerFuel: this.flamerFuel,
    };
  }

  private evaluateVictoryConditions(): { winner: 'marine' | 'alien'; reason: string } | null {
    const tokens = this.board.tokens;
    const marines = tokens.filter((t) => isMarine(t));
    if (marines.length === 0) {
      return { winner: 'alien', reason: 'All marines have been eliminated' };
    }

    const objectiveCells = tokens
      .filter((t) => t.type === 'objective')
      .flatMap((t) => t.cells);
    if (objectiveCells.length === 0) {
      return null;
    }

    const objectiveOnFire = objectiveCells.some((cell) =>
      tokens.some(
        (tok) => tok.type === 'flame' && tok.cells.some((c) => sameCoord(c, cell)),
      ),
    );
    if (objectiveOnFire) {
      return { winner: 'marine', reason: 'Objective ignited by flames' };
    }

    const flamerMarine = marines.find((t) => t.type === 'marine_flame');
    if (!flamerMarine) {
      return { winner: 'alien', reason: 'Flamer marine destroyed' };
    }

    const flamerAmmoAttr = getFlamerAmmoRemaining(flamerMarine);
    const flamerAmmo =
      typeof flamerAmmoAttr === 'number' ? flamerAmmoAttr : this.flamerFuel;
    if (typeof flamerAmmo === 'number' && flamerAmmo <= 0) {
      return { winner: 'alien', reason: 'Flamer marine is out of fuel' };
    }

    return null;
  }

  private checkVictory(): boolean {
    const result = this.evaluateVictoryConditions();
    if (!result) return false;
    const winner = result.winner === 'marine' ? 'Marine' : 'Alien';
    const color = result.winner === 'marine' ? GREEN : RED;
    this.onLog?.(`${winner} victory! ${result.reason}`, color);
    return true;
  }

  private emitStatus(ap?: number, activePlayer = this.activePlayer) {
    this.onStatus?.({
      turn: this.turn,
      activePlayer,
      ap,
      commandPoints: activePlayer === 1 ? this.commandPoints : 0,
      flamerFuel: activePlayer === 1 ? this.flamerFuel : 0,
    });
  }

  private removeMarineStatusTokens(marine: TokenInstance): boolean {
    const coord = marine.cells[0];
    let removed = false;
    let removedOverwatch = false;
    this.board.tokens = this.board.tokens.filter((token) => {
      if (
        (token.type === 'guard' || token.type === 'overwatch') &&
        token.cells.some((c) => sameCoord(c, coord))
      ) {
        removed = true;
        if (token.type === 'overwatch') {
          removedOverwatch = true;
        }
        return false;
      }
      return true;
    });
    if (removedOverwatch) {
      this.overwatchHistory.delete(marine.instanceId);
    }
    return removed;
  }

  private moveJamTokens(origin: Coord, destination: Coord): void {
    for (const token of this.board.tokens) {
      if (
        token.type === 'jam' &&
        token.cells.some((c) => sameCoord(c, origin))
      ) {
        moveToken(token, destination);
      }
    }
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
    let lastAction: 'move' | 'turn' | 'shoot' | null = null;
    let lastShotTargetId: string | null = null;
    const clearMarineStatusTokens = () => {
      let removed = false;
      const removedOverwatch = new Set<string>();
      this.board.tokens = this.board.tokens.filter((t) => {
        if (t.type === 'overwatch') {
          removed = true;
          removedOverwatch.add(coordKey(t.cells[0]));
          return false;
        }
        if (t.type === 'guard' || t.type === 'jam' || t.type === 'flame') {
          removed = true;
          return false;
        }
        return true;
      });
      if (removedOverwatch.size > 0) {
        for (const marine of this.board.tokens.filter((t) => isMarine(t))) {
          if (removedOverwatch.has(coordKey(marine.cells[0]))) {
            this.overwatchHistory.delete(marine.instanceId);
          }
        }
      }
      return removed;
    };
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
    const startAlienTurn = async () => {
      if (this.alienTurnStarted) return;
      this.alienTurnStarted = true;
      const reinforcements = this.turn === 1 ? 4 : 2;
      if (reinforcements <= 0) {
        return;
      }
      const reinforcementCount: number = reinforcements;
      this.onLog?.(
        `Alien player receives ${reinforcementCount} reinforcement blip${
          reinforcementCount === 1 ? '' : 's'
        }`,
      );
      for (let i = 0; i < reinforcements; i++) {
        const candidates = getReinforcementCells(this.board);
        if (candidates.length === 0) {
          this.onLog?.('No valid lurk tokens available; reinforcement blip is forfeited');
          continue;
        }
        this.emitStatus(undefined, 2);
        const options = candidates.map((coord) => ({
          type: 'action' as const,
          action: 'deploy' as const,
          coord,
          apCost: 0,
          apRemaining: 0,
        }));
        const choice = await p2.choose(options);
        const chosenCoord = choice.coord
          ? candidates.find((c) => sameCoord(c, choice.coord as Coord))
          : undefined;
        if (!chosenCoord) {
          this.onLog?.('Invalid reinforcement selection; blip is forfeited');
          continue;
        }
        if (!isReinforcementCellAvailable(this.board, chosenCoord)) {
          this.onLog?.('Chosen lurk token is occupied; reinforcement blip is forfeited');
          continue;
        }
        const blipType = chooseRandomBlipType();
        const newBlip: TokenInstance = {
          instanceId: `blip-${this.nextBlipId++}`,
          type: blipType,
          rot: 0,
          cells: [{ ...chosenCoord }],
        };
        this.board.tokens.push(newBlip);
        this.onChange?.(this.board);
        this.onLog?.(
          `${blipType} reinforcement placed at (${chosenCoord.x}, ${chosenCoord.y})`,
        );
        await checkInvoluntaryReveals();
      }
      this.emitStatus(undefined, 2);
    };
    const startMarineTurn = async () => {
      const removed = clearMarineStatusTokens();
      if (removed) {
        this.onChange?.(this.board);
        await checkInvoluntaryReveals();
      }
      if (!this.marineTurnStarted) {
        this.commandPoints = 0;
        const roll = rollDice(1);
        let result = roll[0];
        this.onLog?.(`Marine command point roll: ${formatRolls(roll)}`);
        const hasLeader = this.board.tokens.some(
          (t) =>
            isMarine(t) &&
            (t.type === 'marine_sarge' || t.type === 'marine_hammer'),
        );
        if (hasLeader) {
          this.onLog?.(
            'Sarge or Hammer present; marine player may reroll the command point die',
          );
          const choice = await p1.choose([
            {
              type: 'action',
              action: 'reroll' as any,
              apCost: 0,
              apRemaining: 0,
              commandPointsRemaining: result,
            },
            {
              type: 'action',
              action: 'accept' as any,
              apCost: 0,
              apRemaining: 0,
              commandPointsRemaining: result,
            },
          ]);
          const cAct = choice?.action as string | undefined;
          if (cAct === 'reroll') {
            this.onLog?.('Marine player rerolls command point die');
            const reroll = rollDice(1);
            result = reroll[0];
            this.onLog?.(
              `Command point reroll result: ${formatRolls(reroll)}`,
            );
          } else {
            this.onLog?.('Marine player accepts command point roll');
          }
        }
        this.commandPoints = result;
        this.marineTurnStarted = true;
        this.onLog?.(
          `Marine player receives ${result} command point${result === 1 ? '' : 's'}`,
        );
      }
      this.emitStatus(undefined, 1);
    };
    const resolveOverwatchShots = async (alien: TokenInstance) => {
      const targetCoord = { ...alien.cells[0] };
      const targetId = alien.instanceId;
      const marines = this.board.tokens.filter(
        (t) =>
          isMarine(t) &&
          getMarineWeapon(t.type) === 'bolter' &&
          hasTokenAt(this.board, 'overwatch', t.cells[0]),
      );
      const eligible = marines.filter(
        (marine) =>
          chebyshevDistance(marine.cells[0], targetCoord) <= 12 &&
          marineHasLineOfSight(this.board, marine, targetCoord, [alien]),
      );
      if (eligible.length === 0) {
        return this.board.tokens.some((t) => t.instanceId === targetId);
      }
      let boardChanged = false;
      let targetRemoved = false;
      for (const marine of eligible) {
        this.onLog?.(
          `${marine.type} on overwatch fires at ${alien.type} in (${targetCoord.x}, ${targetCoord.y})`,
        );
        const lastTarget = this.overwatchHistory.get(marine.instanceId);
        const sustained = lastTarget === targetId;
        const threshold = sustained ? 5 : 6;
        if (sustained) {
          this.onLog?.('Sustained fire bonus applies (needs 5+)');
        } else {
          this.onLog?.('Needs 6+ on at least one die to hit');
        }
        const rolls = rollDice(2);
        this.onLog?.(`Rolls: ${formatRolls(rolls)}`);
        const hit = rolls.some((r) => r >= threshold);
        if (hit) {
          const currentTarget = this.board.tokens.find((t) => t.instanceId === targetId);
          if (currentTarget) {
            this.onLog?.('Shot hits! Target destroyed');
            removeToken(this.board, currentTarget);
            boardChanged = true;
            targetRemoved = true;
          } else {
            this.onLog?.('Target already destroyed by previous overwatch shot');
          }
        } else {
          this.onLog?.('Shot misses');
        }
        const jammed = rolls.length >= 2 && rolls[0] === rolls[1];
        const marineCoord = { ...marine.cells[0] };
        if (jammed) {
          this.onLog?.('Bolter jams! Overwatch token is replaced with jam token');
          this.board.tokens = this.board.tokens.filter(
            (t) =>
              !(
                (t.type === 'overwatch' || t.type === 'jam') &&
                t.cells.some((c) => sameCoord(c, marineCoord))
              ),
          );
          const jamToken: TokenInstance = {
            instanceId: `jam-${this.nextJamId++}`,
            type: 'jam',
            rot: 0,
            cells: [marineCoord],
          };
          this.board.tokens.push(jamToken);
          this.overwatchHistory.delete(marine.instanceId);
          boardChanged = true;
          if (this.commandPoints > 0 && currentSide === 'alien') {
            this.onLog?.(
              'Marine player may spend 1 command point to immediately unjam the bolter',
            );
            const choice = await p1.choose([
              {
                type: 'action' as const,
                action: 'unjam' as any,
                apCost: 0,
                apRemaining: 0,
                commandPointsRemaining: this.commandPoints,
              },
              {
                type: 'action' as const,
                action: 'decline' as any,
                apCost: 0,
                apRemaining: 0,
                commandPointsRemaining: this.commandPoints,
              },
            ]);
            const decision = (choice?.action as string) || '';
            if (decision === 'unjam') {
              this.commandPoints -= 1;
              this.board.tokens = this.board.tokens.filter(
                (t) => t.instanceId !== jamToken.instanceId,
              );
              this.board.tokens.push({
                instanceId: `overwatch-${this.nextOverwatchId++}`,
                type: 'overwatch',
                rot: 0,
                cells: [marineCoord],
              });
              this.overwatchHistory.set(marine.instanceId, null);
              this.onLog?.(
                `Marine spends a command point to unjam (remaining command points: ${this.commandPoints})`,
              );
              this.emitStatus(undefined, 1);
            }
          }
        } else {
          this.overwatchHistory.set(marine.instanceId, targetId);
        }
      }
      if (boardChanged) {
        this.onChange?.(this.board);
      }
      if (targetRemoved) {
        await checkInvoluntaryReveals();
      }
      return this.board.tokens.some((t) => t.instanceId === targetId);
    };
    const afterAlienAction = async () => {
      if (currentSide === 'alien' && active && active.type === 'alien') {
        const alive = await resolveOverwatchShots(active);
        if (!alive) {
          active = null;
          apRemaining = 0;
          lastMove = false;
          lastAction = null;
          lastShotTargetId = null;
          this.emitStatus(apRemaining);
        }
      }
    };
    const performMarineDeployment = async () => {
      if (this.marineDeploymentDone) return;
      const hasStartSpots = this.board.tokens.some((t) => t.type === 'start_marine');
      const hasDropMarines = this.board.tokens.some(
        (t) => isMarine(t) && hasTokenAt(this.board, 'drop_marine', t.cells[0]),
      );
      if (!hasStartSpots || !hasDropMarines) {
        this.marineDeploymentDone = true;
        return;
      }
      this.onLog?.('Marine deployment phase begins');
      while (true) {
        const availableMarines = this.board.tokens
          .filter((t) => isMarine(t) && hasTokenAt(this.board, 'drop_marine', t.cells[0]))
          .sort((a, b) => compareCoords(a.cells[0], b.cells[0]));
        const availableStarts = this.board.tokens
          .filter((t) => t.type === 'start_marine')
          .filter(
            (start) =>
              !this.board.tokens.some(
                (m) => isMarine(m) && m.cells.some((c) => sameCoord(c, start.cells[0])),
              ),
          )
          .sort((a, b) => compareCoords(a.cells[0], b.cells[0]));
        if (availableMarines.length === 0 || availableStarts.length === 0) {
          break;
        }
        this.emitStatus(undefined, 1);
        const marineChoice = await p1.choose(
          availableMarines.map((marine) => ({
            type: 'action' as const,
            action: 'activate' as const,
            coord: { ...marine.cells[0] },
            apCost: 0,
            apRemaining: 0,
            commandPointsRemaining: this.commandPoints,
          })),
        );
        if (marineChoice.action !== 'activate' || !marineChoice.coord) {
          continue;
        }
        const chosenMarine = availableMarines.find((m) =>
          sameCoord(m.cells[0], marineChoice.coord as Coord),
        );
        if (!chosenMarine) {
          continue;
        }
        const startChoice = await p1.choose(
          availableStarts.map((spot) => ({
            type: 'action' as const,
            action: 'move' as const,
            coord: { ...spot.cells[0] },
            apCost: 0,
            apRemaining: 0,
            commandPointsRemaining: this.commandPoints,
          })),
        );
        if (startChoice.action !== 'move' || !startChoice.coord) {
          continue;
        }
        const targetSpot = availableStarts.find((spot) =>
          sameCoord(spot.cells[0], startChoice.coord as Coord),
        );
        if (!targetSpot) {
          continue;
        }
        const targetCoord = { ...targetSpot.cells[0] };
        chosenMarine.cells = [targetCoord];
        chosenMarine.rot = targetSpot.rot as Rotation;
        this.overwatchHistory.delete(chosenMarine.instanceId);
        this.board.tokens = this.board.tokens.filter(
          (t) =>
            !(
              t.type === 'deactivated' &&
              t.cells.length > 0 &&
              sameCoord(t.cells[0], targetCoord)
            ),
        );
        this.onChange?.(this.board);
        this.emitStatus(undefined, 1);
        this.onLog?.(
          `${chosenMarine.type} deploys to (${targetCoord.x}, ${targetCoord.y}) facing ${targetSpot.rot}°`,
        );
        await checkInvoluntaryReveals();
      }
      this.marineDeploymentDone = true;
      this.onLog?.('Marine deployment phase complete');
    };
    if (this.activePlayer === 1) {
      await performMarineDeployment();
      await startMarineTurn();
    } else {
      await startAlienTurn();
    }
    this.emitStatus();
    this.onLog?.(`Player ${this.activePlayer} begins turn ${this.turn}`);
    mainLoop: while (true) {
      const tokens = this.board.tokens.filter((t) =>
        currentSide === 'marine' ? isMarine(t) : t.type === 'alien' || isBlip(t),
      );
      if (tokens.length === 0) {
        if (this.checkVictory()) return;
        return;
      }
      if (!active || !tokens.includes(active) || hasDeactivatedToken(this.board, active.cells[0])) {
        active = null;
        apRemaining = 0;
        lastMove = false;
        lastAction = null;
        lastShotTargetId = null;
      }

      const availableTokens = tokens.filter((t) => {
        const hasDeact = hasDeactivatedToken(this.board, t.cells[0]);
        if (!hasDeact) {
          return true;
        }
        if (currentSide === 'marine' && isMarine(t)) {
          return this.commandPoints > 0;
        }
        return false;
      });

      const entryMoveTargets = new Set<string>();
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
        if ((isBlip(active) || active.type === 'alien') && apRemaining >= 1) {
          const entryTarget = getEntryMoveTarget(this.board, active.cells[0]);
          if (entryTarget) {
            const key = coordKey(entryTarget);
            entryMoveTargets.add(key);
            const alreadyOffered = actionChoices.some(
              (opt) => opt.action === 'move' && opt.coord && sameCoord(opt.coord, entryTarget),
            );
            if (!alreadyOffered) {
              actionChoices.push({
                type: 'action',
                action: 'move',
                coord: entryTarget,
                apCost: 1,
                apRemaining,
              });
            }
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
        const targetToken = getAssaultTarget(this.board, front, active);
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
        if (isMarine(active)) {
          if (this.commandPoints > 0) {
            actionChoices.push({
              type: 'action',
              action: 'command',
              apCost: 0,
              apRemaining,
              commandPointsRemaining: this.commandPoints,
            });
          }
          const weapon = getMarineWeapon(active.type);
          if (weapon === 'bolter') {
            const shotCost = lastAction === 'move' || lastAction === 'turn' ? 0 : 1;
            if (apRemaining >= shotCost) {
              const targets = getShootTargets(this.board, active);
              for (const target of targets) {
                actionChoices.push({
                  type: 'action',
                  action: 'shoot',
                  coord: target.cells[0],
                  apCost: shotCost,
                  apRemaining,
                });
              }
            }
            if (apRemaining >= 2) {
              actionChoices.push({
                type: 'action',
                action: 'overwatch',
                apCost: 2,
                apRemaining,
              });
            }
          } else if (weapon === 'flamer') {
            if (apRemaining >= 2 && this.flamerFuel > 0) {
              const targets = getFlamerTargets(this.board, active);
              for (const target of targets) {
                actionChoices.push({
                  type: 'action',
                  action: 'shoot',
                  coord: target.coord,
                  apCost: 2,
                  apRemaining,
                  flamerFuelRemaining: this.flamerFuel,
                });
              }
            }
          }
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
            const startAp =
              currentSide === 'marine' &&
              isMarine(t) &&
              hasDeactivatedToken(this.board, t.cells[0])
                ? 0
                : initialAp(t);
            actionChoices.push({
              type: 'action',
              action: 'activate',
              coord: t.cells[0],
              apCost: 0,
              apRemaining: startAp,
            });
          }
        }
      } else {
        for (const t of availableTokens) {
          const startAp =
            currentSide === 'marine' &&
            isMarine(t) &&
            hasDeactivatedToken(this.board, t.cells[0])
              ? 0
              : initialAp(t);
          actionChoices.push({
            type: 'action',
            action: 'activate',
            coord: t.cells[0],
            apCost: 0,
            apRemaining: startAp,
          });
        }
      }

      if (currentSide === 'marine') {
        for (const opt of actionChoices) {
          opt.commandPointsRemaining = this.commandPoints;
        }
      }

      const action = await currentPlayer.choose(actionChoices);
      const actionType = action.action as string;
      const statusTokensRemoved =
        active && isMarine(active) && actionType !== 'unjam'
          ? this.removeMarineStatusTokens(active)
          : false;
      if (statusTokensRemoved) {
        this.onChange?.(this.board);
      }
      switch (actionType) {
        case 'move':
          if (active && action.coord && typeof action.apCost === 'number') {
            const fromCoord = { ...active.cells[0] };
            const isEntryMove =
              (isBlip(active) || active.type === 'alien') &&
              entryMoveTargets.has(coordKey(action.coord));
            const originHasFlame = hasFlameToken(this.board, fromCoord);
            const targetHasFlame = hasFlameToken(this.board, action.coord);
            if (!originHasFlame && targetHasFlame) {
              this.onLog?.('Cannot move into flames from a safe cell');
              break;
            }
            apRemaining -= action.apCost;
            let destroyedByFlames = false;
            if (originHasFlame && targetHasFlame) {
              this.onLog?.(
                `${active.type} attempts to move through flames; needs 1 to survive`,
              );
              const roll = rollDice(1);
              this.onLog?.(`Roll: ${formatRolls(roll)}`);
              if (roll[0] >= 2) {
                this.onLog?.(`${active.type} is destroyed moving through flames`);
                if (isMarine(active)) {
                  this.overwatchHistory.delete(active.instanceId);
                }
                removeToken(this.board, active);
                destroyedByFlames = true;
              } else {
                this.onLog?.(`${active.type} survives the flames`);
              }
            }
            if (!destroyedByFlames) {
              if (isEntryMove) {
                const entryActor = isBlip(active) ? 'Blip' : 'Alien';
                this.onLog?.(
                  `${entryActor} uses entry action to move to (${action.coord.x}, ${action.coord.y})`,
                );
              }
              moveToken(active, action.coord);
              this.moveJamTokens(fromCoord, action.coord);
              lastMove = true;
              lastAction = 'move';
              lastShotTargetId = null;
            } else {
              active = null;
              apRemaining = 0;
              lastMove = false;
              lastAction = null;
              lastShotTargetId = null;
            }
            this.onChange?.(this.board);
            await checkInvoluntaryReveals();
            this.emitStatus(apRemaining);
            if (!destroyedByFlames) {
              await afterAlienAction();
            }
          }
          break;
        case 'turnLeft':
          if (active && typeof action.apCost === 'number') {
            active.rot = (((active.rot + 270) % 360) as Rotation);
            apRemaining -= action.apCost;
            lastMove = false;
            lastAction = 'turn';
            lastShotTargetId = null;
            this.onChange?.(this.board);
            await checkInvoluntaryReveals();
            this.emitStatus(apRemaining);
            await afterAlienAction();
          }
          break;
        case 'turnRight':
          if (active && typeof action.apCost === 'number') {
            active.rot = (((active.rot + 90) % 360) as Rotation);
            apRemaining -= action.apCost;
            lastMove = false;
            lastAction = 'turn';
            lastShotTargetId = null;
            this.onChange?.(this.board);
            await checkInvoluntaryReveals();
            this.emitStatus(apRemaining);
            await afterAlienAction();
          }
          break;
        case 'command':
          if (
            currentSide === 'marine' &&
            active &&
            isMarine(active) &&
            this.commandPoints > 0
          ) {
            this.commandPoints -= 1;
            apRemaining += 1;
            this.onLog?.(
              `Marine spends a command point for +1 AP (remaining command points: ${this.commandPoints})`,
            );
            this.emitStatus(apRemaining);
          }
          break;
        case 'shoot':
          if (active && isMarine(active) && action.coord) {
            const targetCoord = action.coord;
            const weapon = getMarineWeapon(active.type);
            if (weapon === 'bolter') {
              const previousAction = lastAction;
              const shotCost = previousAction === 'move' || previousAction === 'turn' ? 0 : 1;
              if (apRemaining >= shotCost) {
                const target = findShootTarget(this.board, targetCoord);
                if (target) {
                  const targetId = target.instanceId;
                  const sustained = previousAction === 'shoot' && lastShotTargetId === targetId;
                  apRemaining -= shotCost;
                  lastMove = false;
                  this.onLog?.(
                    `${active.type} fires bolter at ${target.type} in (${targetCoord.x}, ${targetCoord.y})`,
                  );
                  if (shotCost === 0) {
                    this.onLog?.('Bolter shot is free immediately after moving or turning');
                  }
                  const diceCount = 2;
                  const threshold = sustained ? 5 : 6;
                  if (sustained) {
                    this.onLog?.('Sustained fire bonus applies (needs 5+)');
                  } else {
                    this.onLog?.('Needs 6+ on at least one die to hit');
                  }
                  const rolls = rollDice(diceCount);
                  this.onLog?.(`Rolls: ${formatRolls(rolls)}`);
                  if (rolls.some((r) => r >= threshold)) {
                    this.onLog?.('Shot hits! Target destroyed');
                    removeToken(this.board, target);
                    this.onChange?.(this.board);
                    await checkInvoluntaryReveals();
                  } else {
                    this.onLog?.('Shot misses');
                  }
                  lastAction = 'shoot';
                  lastShotTargetId = targetId;
                  this.emitStatus(apRemaining);
                }
              }
            } else if (weapon === 'flamer') {
              const flameCost = 2;
              if (apRemaining >= flameCost && this.flamerFuel > 0) {
                const targets = getFlamerTargets(this.board, active);
                const targetInfo = targets.find((t) => sameCoord(t.coord, targetCoord));
                if (targetInfo) {
                  apRemaining -= flameCost;
                  lastMove = false;
                  lastAction = 'shoot';
                  lastShotTargetId = null;
                  this.onLog?.(
                    `${active.type} fires flamer at (${targetCoord.x}, ${targetCoord.y})`,
                  );
                  this.flamerFuel = Math.max(0, this.flamerFuel - 1);
                  if (!active.attrs) {
                    active.attrs = {};
                  }
                  (active.attrs as Record<string, unknown>).flamerAmmo = this.flamerFuel;
                  this.onLog?.(
                    `Flamer fuel remaining: ${this.flamerFuel}`,
                  );
                  const newFlameCells: Coord[] = [];
                  let boardChanged = false;
                  let removedTokens = false;
                  for (const cell of targetInfo.cells) {
                    const cellType = this.board.getCellType
                      ? this.board.getCellType(cell)
                      : 1;
                    if (cellType !== 1) continue;
                    if (hasTokenAt(this.board, 'door', cell)) continue;
                    if (!hasTokenAt(this.board, 'flame', cell)) {
                      const flameCoord = { ...cell };
                      this.board.tokens.push({
                        instanceId: `flame-${this.nextFlameId++}`,
                        type: 'flame',
                        rot: 0,
                        cells: [flameCoord],
                      });
                      newFlameCells.push(flameCoord);
                      boardChanged = true;
                    }
                  }
                  for (const cell of newFlameCells) {
                    const victims = this.board.tokens.filter(
                      (t) =>
                        (isMarine(t) || t.type === 'alien' || isBlip(t)) &&
                        t.cells.some((c) => sameCoord(c, cell)),
                    );
                    for (const victim of victims) {
                      this.onLog?.(
                        `Flamer attack on ${victim.type} in (${cell.x}, ${cell.y}); needs 2+`,
                      );
                      const roll = rollDice(1);
                      this.onLog?.(`Roll: ${formatRolls(roll)}`);
                      if (roll[0] >= 2) {
                        this.onLog?.(`${victim.type} is destroyed by flames`);
                        if (isMarine(victim)) {
                          this.overwatchHistory.delete(victim.instanceId);
                        }
                        removeToken(this.board, victim);
                        boardChanged = true;
                        removedTokens = true;
                      } else {
                        this.onLog?.(`${victim.type} survives the flames`);
                      }
                    }
                  }
                  if (boardChanged) {
                    this.onChange?.(this.board);
                  }
                  if (removedTokens) {
                    await checkInvoluntaryReveals();
                  }
                  if (active && !this.board.tokens.includes(active)) {
                    active = null;
                    apRemaining = 0;
                    lastAction = null;
                    lastShotTargetId = null;
                  }
                  this.emitStatus(apRemaining);
                }
              }
            }
          }
          break;
        case 'assault':
          if (active && action.coord && typeof action.apCost === 'number') {
            lastAction = null;
            lastShotTargetId = null;
            const target = getAssaultTarget(
              this.board,
              action.coord,
              active,
            );
            let assaultExecuted = false;
            if (target) {
              apRemaining -= action.apCost;
              lastMove = false;
              assaultExecuted = true;
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
                  let modified = false;
                  if (marine.type === 'marine_hammer') {
                    marineRolls = marineRolls.map((r) => r + 2);
                    this.onLog?.('Hammer adds +2 to marine rolls');
                    modified = true;
                  }
                  if (marine.type === 'marine_claws') {
                    marineRolls = marineRolls.map((r) => r + 1);
                    this.onLog?.('Claws add +1 to marine rolls');
                    modified = true;
                  }
                  if (marine.type === 'marine_sarge') {
                    marineRolls = marineRolls.map((r) => r + 1);
                    this.onLog?.('Sarge adds +1 to marine rolls');
                    modified = true;
                  }
                  if (modified)
                    this.onLog?.(
                      `Modified marine rolls: ${formatRolls(marineRolls)}`,
                    );
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
                  if (isMarine(target)) {
                    this.overwatchHistory.delete(target.instanceId);
                  }
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
                    if (isMarine(active)) {
                      this.overwatchHistory.delete(active.instanceId);
                    }
                    removeToken(this.board, active);
                    active = null;
                    apRemaining = 0;
                    lastAction = null;
                    lastShotTargetId = null;
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
            if (assaultExecuted) {
              await afterAlienAction();
            }
          }
          break;
        case 'overwatch':
          if (active && isMarine(active) && typeof action.apCost === 'number') {
            if (getMarineWeapon(active.type) === 'bolter') {
              const coord = { ...active.cells[0] };
              apRemaining -= action.apCost;
              this.board.tokens = this.board.tokens.filter(
                (t) =>
                  !(
                    (t.type === 'guard' || t.type === 'overwatch') &&
                    t.cells.some((c) => sameCoord(c, coord))
                  ),
              );
              this.board.tokens.push({
                instanceId: `overwatch-${this.nextOverwatchId++}`,
                type: 'overwatch',
                rot: 0,
                cells: [coord],
              });
              this.overwatchHistory.set(active.instanceId, null);
              this.board.tokens.push({
                instanceId: `deactivated-${this.nextDeactId++}`,
                type: 'deactivated',
                rot: 0,
                cells: [coord],
              });
              active = null;
              apRemaining = 0;
              lastMove = false;
              lastAction = null;
              lastShotTargetId = null;
              this.onChange?.(this.board);
              this.emitStatus(apRemaining);
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
            this.overwatchHistory.delete(active.instanceId);
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
            lastAction = null;
            lastShotTargetId = null;
            this.onChange?.(this.board);
            this.emitStatus(apRemaining);
          }
          break;
        case 'reveal':
          if (active && isBlip(active) && typeof action.apCost === 'number') {
            lastAction = null;
            lastShotTargetId = null;
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
                if (this.activePlayer === 1) {
                  this.turn++;
                  await startMarineTurn();
                }
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
            lastAction = null;
            lastShotTargetId = null;
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
            const hadDeact = hasDeactivatedToken(this.board, target.cells[0]);
            if (hadDeact && currentSide === 'marine' && isMarine(target)) {
              this.board.tokens = this.board.tokens.filter(
                (t) =>
                  !(
                    t.type === 'deactivated' &&
                    t.cells.some((c) => sameCoord(c, target.cells[0]))
                  ),
              );
              this.onChange?.(this.board);
            }
            apRemaining =
              hadDeact && currentSide === 'marine' && isMarine(target)
                ? 0
                : initialAp(target);
            lastMove = false;
            lastAction = null;
            lastShotTargetId = null;
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
              lastAction = null;
              lastShotTargetId = null;
              this.onChange?.(this.board);
              await checkInvoluntaryReveals();
              this.emitStatus(apRemaining);
              await afterAlienAction();
            }
          }
          break;
        }
        case 'pass': {
          if (this.board.tokens.some((t) => t.type === 'deactivated')) {
            this.board.tokens = this.board.tokens.filter(
              (t) => t.type !== 'deactivated',
            );
            this.onChange?.(this.board);
          }
          if (this.checkVictory()) {
            return;
          }
          const wasMarine = this.activePlayer === 1;
          this.activePlayer = this.activePlayer === 1 ? 2 : 1;
          if (wasMarine) {
            this.commandPoints = 0;
            this.marineTurnStarted = false;
            this.alienTurnStarted = false;
          }
          if (this.activePlayer === 1) {
            this.turn++;
            this.commandPoints = 0;
            this.marineTurnStarted = false;
            await startMarineTurn();
          } else {
            this.alienTurnStarted = false;
            await startAlienTurn();
          }
          currentPlayer = currentPlayer === p1 ? p2 : p1;
          currentSide = currentSide === 'marine' ? 'alien' : 'marine';
          active = null;
          apRemaining = 0;
          lastMove = false;
          lastAction = null;
          lastShotTargetId = null;
          this.emitStatus();
          this.onLog?.(`Player ${this.activePlayer} begins turn ${this.turn}`);
          break;
        }
      }
    }
  }
}

function sameCoord(a: Coord, b: Coord): boolean {
  return a.x === b.x && a.y === b.y;
}

function compareCoords(a: Coord, b: Coord): number {
  if (a.y !== b.y) return a.y - b.y;
  return a.x - b.x;
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

function hasTokenAt(board: BoardState, type: string, coord: Coord): boolean {
  return board.tokens.some(
    (t) => t.type === type && t.cells.some((c) => sameCoord(c, coord)),
  );
}

function hasFlameToken(board: BoardState, coord: Coord): boolean {
  return hasTokenAt(board, 'flame', coord);
}

function getFlamerAmmoRemaining(token: TokenInstance): number | undefined {
  if (!token.attrs) return undefined;
  const attrs = token.attrs as Record<string, unknown>;
  const keys = ['flamerAmmo', 'flameAmmo', 'ammo', 'ammoRemaining'];
  for (const key of keys) {
    const value = attrs[key];
    if (typeof value === 'number') {
      return value;
    }
  }
  return undefined;
}

function coordKey(coord: Coord): string {
  return `${coord.x},${coord.y}`;
}

function coordFromKey(key: string): Coord {
  const [xStr, yStr] = key.split(',');
  return { x: Number(xStr), y: Number(yStr) };
}

function chebyshevDistance(a: Coord, b: Coord): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

interface FlamerTarget {
  coord: Coord;
  cells: Coord[];
  segmentId: string;
  distance: number;
}

function getFlamerTargets(board: BoardState, marine: TokenInstance): FlamerTarget[] {
  const origin = marine.cells[0];
  const segments = new Map<string, FlamerTarget>();
  for (let dx = -12; dx <= 12; dx++) {
    for (let dy = -12; dy <= 12; dy++) {
      const target = { x: origin.x + dx, y: origin.y + dy };
      const distance = chebyshevDistance(origin, target);
      if (distance > 12) continue;
      if (!isWithinBoard(board, target)) continue;
      const cellType = board.getCellType ? board.getCellType(target) : 1;
      if (cellType !== 1) continue;
      if (hasTokenAt(board, 'door', target)) continue;
      const ignore = board.tokens.filter(
        (t) => isUnit(t) && t.cells.some((c) => sameCoord(c, target)),
      );
      if (!marineHasLineOfSight(board, marine, target, ignore)) continue;
      const seg = getSegmentInfo(board, target);
      if (!seg) continue;
      const existing = segments.get(seg.id);
      if (
        !existing ||
        distance < existing.distance ||
        (distance === existing.distance &&
          (target.y < existing.coord.y ||
            (target.y === existing.coord.y && target.x < existing.coord.x)))
      ) {
        segments.set(seg.id, {
          coord: { ...target },
          cells: seg.cells.map((c) => ({ ...c })),
          segmentId: seg.id,
          distance,
        });
      }
    }
  }
  return Array.from(segments.values()).sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    if (a.coord.y !== b.coord.y) return a.coord.y - b.coord.y;
    return a.coord.x - b.coord.x;
  });
}

interface SegmentInfo {
  id: string;
  cells: Coord[];
}

function getSegmentInfo(board: BoardState, coord: Coord): SegmentInfo | null {
  const direct = (board as any).getCellsInSameSegment?.(coord);
  if (Array.isArray(direct) && direct.length > 0) {
    const cells = direct.map((c: Coord) => ({ ...c }));
    const id = direct
      .map((c: Coord) => coordKey(c))
      .sort()
      .join('|');
    return { id, cells };
  }
  const indices = getBoardIndices(board);
  if (indices) {
    const info = indices.segCells.get(coordKey(coord));
    if (info && info.instanceId !== 'base') {
      const cells: Coord[] = [];
      for (const [key, cellInfo] of indices.segCells.entries()) {
        if (cellInfo.instanceId === info.instanceId) {
          cells.push(coordFromKey(key));
        }
      }
      return { id: info.instanceId, cells };
    }
  }
  return { id: coordKey(coord), cells: [{ ...coord }] };
}

type BoardIndicesLike = {
  segCells: Map<string, { instanceId: string; cellType: number }>;
  tokenCells?: Map<string, string[]>;
};

function getBoardIndices(board: BoardState): BoardIndicesLike | null {
  if (!board) return null;
  const symbols = Object.getOwnPropertySymbols(board);
  for (const sym of symbols) {
    const value = (board as any)[sym];
    if (
      value &&
      typeof value === 'object' &&
      value.segCells instanceof Map &&
      value.tokenCells instanceof Map
    ) {
      return value as BoardIndicesLike;
    }
  }
  return null;
}

function isWithinBoard(board: BoardState, coord: Coord): boolean {
  return coord.x >= 0 && coord.y >= 0 && coord.x < board.size && coord.y < board.size;
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
  const originHasFlame = hasFlameToken(board, pos);
  const considerMove = (coord: Coord, cost: number) => {
    if (!canMoveTo(board, coord)) return;
    if (!originHasFlame && hasFlameToken(board, coord)) return;
    res.push({ coord, cost });
  };
  const forward = forwardCell(pos, rot);
  const forwardLeft = leftCell(forward, rot);
  const forwardRight = rightCell(forward, rot);
  considerMove(forward, 1);
  considerMove(forwardLeft, 1);
  considerMove(forwardRight, 1);
  const backward = backwardCell(pos, rot);
  const backwardLeft = leftCell(backward, rot);
  const backwardRight = rightCell(backward, rot);
  if (isMarine(token)) {
    considerMove(backward, 2);
    considerMove(backwardLeft, 2);
    considerMove(backwardRight, 2);
  } else if (token.type === 'alien') {
    considerMove(backward, 2);
    considerMove(backwardLeft, 2);
    considerMove(backwardRight, 2);
  } else if (isBlip(token)) {
    considerMove(backward, 1);
    considerMove(backwardLeft, 1);
    considerMove(backwardRight, 1);
  }
  if (token.type === 'alien' || isBlip(token)) {
    const left = leftCell(pos, rot);
    considerMove(left, 1);
    const right = rightCell(pos, rot);
    considerMove(right, 1);
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

function getEntryMoveTarget(board: BoardState, origin: Coord): Coord | null {
  if (!hasTokenAt(board, 'lurk', origin)) {
    return null;
  }
  let best: { coord: Coord; distance: number } | null = null;
  for (const token of board.tokens) {
    if (token.type !== 'alien_entry') continue;
    for (const cell of token.cells) {
      if (sameCoord(cell, origin)) continue;
      if (!isEntryCellAvailable(board, cell)) continue;
      const distance = chebyshevDistance(origin, cell);
      if (
        !best ||
        distance < best.distance ||
        (distance === best.distance && compareCoords(cell, best.coord) < 0)
      ) {
        best = { coord: { ...cell }, distance };
      }
    }
  }
  return best ? best.coord : null;
}

function getReinforcementCells(board: BoardState): Coord[] {
  const coords: Coord[] = [];
  for (const token of board.tokens) {
    if (token.type !== 'lurk') continue;
    for (const cell of token.cells) {
      if (!isReinforcementCellAvailable(board, cell)) continue;
      if (coords.some((c) => sameCoord(c, cell))) continue;
      coords.push({ ...cell });
    }
  }
  return coords.sort(compareCoords);
}

function isReinforcementCellAvailable(board: BoardState, coord: Coord): boolean {
  if (!hasTokenAt(board, 'lurk', coord)) return false;
  return !board.tokens.some(
    (t) => blocksMovement(t) && t.cells.some((c) => sameCoord(c, coord)),
  );
}

function isEntryCellAvailable(board: BoardState, coord: Coord): boolean {
  if (!hasTokenAt(board, 'alien_entry', coord)) return false;
  return !board.tokens.some(
    (t) => blocksMovement(t) && t.cells.some((c) => sameCoord(c, coord)),
  );
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

function getMarineWeapon(type: string): 'bolter' | 'cannon' | 'flamer' | 'none' {
  switch (type) {
    case 'marine':
    case 'marine_chain':
    case 'marine_sarge':
    case 'marine_axe':
      return 'bolter';
    case 'marine_flame':
      return 'flamer';
    case 'marine_cannon':
      return 'cannon';
    default:
      return 'none';
  }
}

function getShootTargets(board: BoardState, marine: TokenInstance): TokenInstance[] {
  return board.tokens.filter(
    (t) =>
      (t.type === 'alien' || t.type === 'door') &&
      marineHasLineOfSight(board, marine, t.cells[0], [t]),
  );
}

function findShootTarget(board: BoardState, coord: Coord): TokenInstance | undefined {
  return board.tokens.find(
    (t) =>
      (t.type === 'alien' || t.type === 'door') &&
      t.cells.some((c) => sameCoord(c, coord)),
  );
}

function getAssaultTarget(
  board: BoardState,
  coord: Coord,
  active: TokenInstance,
): TokenInstance | undefined {
  const tokensAt = board.tokens.filter((t) =>
    t.cells.some((c) => sameCoord(c, coord)),
  );
  const enemy = isMarine(active)
    ? tokensAt.find((t) => t.type === 'alien')
    : active.type === 'alien'
    ? tokensAt.find((t) => isMarine(t))
    : undefined;
  return (
    enemy || tokensAt.find((t) => t.type === 'door' || t.type === 'dooropen')
  );
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

function chooseRandomBlipType(): 'blip' | 'blip_2' | 'blip_3' {
  const roll = Math.floor(Math.random() * 22) + 1;
  if (roll <= 9) return 'blip';
  if (roll <= 13) return 'blip_2';
  return 'blip_3';
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
  return t.type === 'door' || t.type === 'flame' || isUnit(t);
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
