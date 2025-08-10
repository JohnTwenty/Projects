import { Coord, Rotation, SegmentDef, SegmentInstance, CellType, Id, TokenInstance } from './types.js';

export interface SegmentCell { instanceId: Id; cellType: CellType }

export interface Indices {
  segCells: Map<string, SegmentCell>;
  tokenCells: Map<string, Id[]>;
  tokensById: Map<Id, TokenInstance>;
  segmentsById: Map<Id, SegmentInstance>;
}

export function createIndices(): Indices {
  return { segCells: new Map(), tokenCells: new Map(), tokensById: new Map(), segmentsById: new Map() };
}

export function key(c: Coord): string {
  return `${c.x},${c.y}`;
}

export function rotate(local: Coord, rot: Rotation, def: SegmentDef): Coord {
  const { width, height } = def;
  const x = local.x;
  const y = local.y;
  switch (rot) {
    case 0:
      return { x, y };
    case 90:
      return { x: height - 1 - y, y: x };
    case 180:
      return { x: width - 1 - x, y: height - 1 - y };
    case 270:
      return { x: y, y: width - 1 - x };
  }
}

export function segmentCells(inst: SegmentInstance, def: SegmentDef): { coord: Coord; cellType: CellType }[] {
  const cells: { coord: Coord; cellType: CellType }[] = [];
  for (let y = 0; y < def.height; y++) {
    for (let x = 0; x < def.width; x++) {
      const rotCoord = rotate({ x, y }, inst.rot, def);
      const global = { x: inst.origin.x + rotCoord.x, y: inst.origin.y + rotCoord.y };
      const cellType = def.grid[y][x];
      cells.push({ coord: global, cellType });
    }
  }
  return cells;
}
