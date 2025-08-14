export type Rotation = 0 | 90 | 180 | 270;
export type CellType = number; // 0=wall, 1=corridor

export interface Coord { x: number; y: number; }
export type Id = string;

export interface SegmentDef {
  segmentId: Id;
  width: number;
  height: number;
  grid: CellType[][]; // [row][col], rectangular
}

export interface SegmentInstance {
  instanceId: Id;
  type: string;  // must exist in Segment Library
  origin: Coord;  // upper-left in board coords before rotation application
  rot: Rotation;  // clockwise
}

export interface TokenInstance {
  instanceId: Id;
  type: string;        // must exist in Token Library
  rot: Rotation;
  cells: Coord[];
  attrs?: Record<string, unknown>;
}

export interface BoardState {
  size: number; // board is size x size (square)
  segments: SegmentInstance[];
  tokens: TokenInstance[];
  getCellType?(coord: Coord): CellType | -1;
}

export interface TokenDef {
  type: string;
  notes?: string;
}

export interface Diagnostics {
  code: string;
  message: string;
  details?: unknown;
}
