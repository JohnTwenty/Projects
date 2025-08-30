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
  export interface Player {
    chooseMarine(options: Coord[]): Promise<Coord>;
    chooseAction(options: string[]): Promise<string>;
  }
}
