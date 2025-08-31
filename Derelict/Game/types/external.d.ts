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
    getCellType?(coord: Coord): number;
  }
}

declare module 'derelict-players' {
  import type { Coord } from 'derelict-boardstate';
  export interface Choice {
    type: 'marine' | 'action';
    coord?: Coord;
    action?: 'move' | 'turnLeft' | 'turnRight' | 'selectOther';
  }
  export interface GameApi {
    choose(options: Choice[]): Promise<Choice>;
    messageBox(message: string): Promise<boolean>;
  }
  export interface Player {
    choose(options: Choice[]): Promise<Choice>;
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
