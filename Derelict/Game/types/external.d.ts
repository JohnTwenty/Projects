declare module 'derelict-boardstate' {
  export interface Coord { x: number; y: number; }
  export interface TokenInstance {
    instanceId: string;
    type: string;
    rot: number;
    cells: Coord[];
    attrs?: Record<string, unknown>;
  }
  export interface BoardState {
    size: number;
    segments: any[];
    tokens: TokenInstance[];
  }
}

declare module 'derelict-players' {
  import type { Coord } from 'derelict-boardstate';
  export interface GameApi {
    chooseCell(allowed: Coord[]): Promise<Coord>;
    messageBox(message: string): Promise<boolean>;
    highlightCells(coords: Coord[]): void;
    clearHighlights(): void;
  }
  export interface Player {
    chooseMarine(options: Coord[]): Promise<Coord>;
    chooseAction(options: string[]): Promise<string>;
  }
}

declare module 'derelict-rules' {
  import type { BoardState } from 'derelict-boardstate';
  import type { Player } from 'derelict-players';
  export interface Rules {
    validate(state: BoardState): void;
    runGame(p1: Player, p2: Player): Promise<void>;
  }
}
