import type { BoardState, Coord } from 'derelict-boardstate';
import type { Rules } from 'derelict-rules';
import type { Player, GameApi } from 'derelict-players';

export interface RendererLike {
  render(state: BoardState): void;
}

// Core game orchestrator providing the GameApi for human players
export class Game implements GameApi {
  constructor(
    private board: BoardState,
    private renderer: RendererLike,
    private rules: Rules,
    private player1: Player,
    private player2: Player
  ) {}

  async start(): Promise<void> {
    this.renderer.render(this.board);
    this.rules.validate(this.board);
    await this.rules.runGame(this.player1, this.player2);
  }

  async chooseCell(allowed: Coord[]): Promise<Coord> {
    // Placeholder implementation: pick the first allowed coordinate
    return allowed[0];
  }

  async messageBox(_message: string): Promise<boolean> {
    return true;
  }

  highlightCells(_coords: Coord[]): void {
    // no-op for now
  }

  clearHighlights(): void {
    // no-op for now
  }
}
