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
  export type Rotation = 0 | 90 | 180 | 270;
}

declare module 'derelict-players' {
  import type { Coord } from 'derelict-boardstate';
  export interface Choice {
    type: 'marine' | 'action';
    coord?: Coord;
    action?:
      | 'move'
      | 'turnLeft'
      | 'turnRight'
      | 'activate'
      | 'door'
      | 'shoot'
      | 'reveal'
      | 'deploy'
      | 'guard'
      | 'overwatch'
      | 'pass';
    apCost?: number;
    apRemaining?: number;
  }
  export interface Player {
    choose(options: Choice[]): Promise<Choice>;
  }
}
