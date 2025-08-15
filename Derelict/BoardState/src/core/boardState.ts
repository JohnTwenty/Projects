import { BoardState, SegmentInstance, TokenInstance, SegmentDef, TokenDef, Coord, CellType, Id } from './types.js';
import { BoardError, ERR_BAD_COORD, ERR_OVERLAP, ERR_UNKNOWN_SEGMENT_DEF, ERR_UNKNOWN_TOKEN_TYPE } from './errors.js';
import { createIndices, segmentCells, key, Indices } from './indices.js';

const SEGMENT_DEFS = Symbol('segmentDefs');
const TOKEN_DEFS = Symbol('tokenDefs');
const INDICES = Symbol('indices');
const BASE_SEGMENT_ID: Id = 'base';

export interface InternalState extends BoardState {
  [SEGMENT_DEFS]: Map<string, SegmentDef>;
  [TOKEN_DEFS]: Map<string, TokenDef>;
  [INDICES]: Indices;
}

export function createState(size: number, segDefs: Map<string, SegmentDef>, tokDefs: Map<string, TokenDef>): InternalState {
  const idx = createIndices();
  // initialize board with base wall cells (cell type 0)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      idx.segCells.set(key({ x, y }), { instanceId: BASE_SEGMENT_ID, cellType: 0 });
    }
  }

  const state: InternalState = {
    size,
    segments: [],
    tokens: [],
    [SEGMENT_DEFS]: segDefs,
    [TOKEN_DEFS]: tokDefs,
    [INDICES]: idx,
  };
  return state;
}

export function resetBoard(state: InternalState, size: number): void {
  const idx = createIndices();
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      idx.segCells.set(key({ x, y }), { instanceId: BASE_SEGMENT_ID, cellType: 0 });
    }
  }
  state.size = size;
  state.segments = [];
  state.tokens = [];
  state[INDICES] = idx;
}

function assertInBounds(state: InternalState, c: Coord) {
  if (c.x < 0 || c.y < 0 || c.x >= state.size || c.y >= state.size) {
    throw new BoardError(ERR_BAD_COORD, `Coord out of bounds (${c.x},${c.y})`, c);
  }
}

export function placeSegment(state: InternalState, inst: SegmentInstance): void {
  const def = state[SEGMENT_DEFS].get(inst.type);
  if (!def) throw new BoardError(ERR_UNKNOWN_SEGMENT_DEF, `Unknown segment type ${inst.type}`);
  const cells = segmentCells(inst, def);
  const idx = state[INDICES];
  const conflicts: Coord[] = [];
  for (const { coord } of cells) {
    assertInBounds(state, coord);
    const existing = idx.segCells.get(key(coord));
    if (existing && existing.instanceId !== BASE_SEGMENT_ID) conflicts.push(coord);
  }
  if (conflicts.length) {
    throw new BoardError(ERR_OVERLAP, 'segment overlap', conflicts[0]);
  }
  for (const { coord, cellType } of cells) {
    idx.segCells.set(key(coord), { instanceId: inst.instanceId, cellType });
  }
  state.segments.push(inst);
  idx.segmentsById.set(inst.instanceId, inst);
}

export function removeSegmentAtCoordInternal(state: InternalState, coord: Coord): void {
  const idx = state[INDICES];
  const info = idx.segCells.get(key(coord));
  if (!info) return;
  const inst = idx.segmentsById.get(info.instanceId);
  if (!inst) return;
  const def = state[SEGMENT_DEFS].get(inst.type)!;
  const cells = segmentCells(inst, def);
  for (const { coord: c } of cells) {
    idx.segCells.set(key(c), { instanceId: BASE_SEGMENT_ID, cellType: 0 });
  }
  idx.segmentsById.delete(inst.instanceId);
  state.segments = state.segments.filter((s) => s.instanceId !== inst.instanceId);
}

export function placeToken(state: InternalState, tok: TokenInstance): void {
  if (!state[TOKEN_DEFS].has(tok.type)) {
    throw new BoardError(ERR_UNKNOWN_TOKEN_TYPE, `Unknown token type ${tok.type}`);
  }
  const idx = state[INDICES];
  for (const c of tok.cells) {
    assertInBounds(state, c);
  }
  state.tokens.push(tok);
  idx.tokensById.set(tok.instanceId, tok);
  for (const c of tok.cells) {
    const k = key(c);
    const list = idx.tokenCells.get(k) || [];
    list.push(tok.instanceId);
    idx.tokenCells.set(k, list);
  }
}

export function removeTokenInternal(state: InternalState, tokenId: Id): void {
  const idx = state[INDICES];
  const tok = idx.tokensById.get(tokenId);
  if (!tok) return;
  for (const c of tok.cells) {
    const k = key(c);
    const list = idx.tokenCells.get(k);
    if (list) {
      idx.tokenCells.set(k, list.filter((id) => id !== tokenId));
    }
  }
  idx.tokensById.delete(tokenId);
  state.tokens = state.tokens.filter((t) => t.instanceId !== tokenId);
}

// Queries
export function cellTypeAt(state: InternalState, coord: Coord): CellType | -1 {
  const info = state[INDICES].segCells.get(key(coord));
  return info ? info.cellType : -1;
}

export function tokensAt(state: InternalState, coord: Coord): TokenInstance[] {
  const ids = state[INDICES].tokenCells.get(key(coord)) || [];
  return ids.map((id) => state[INDICES].tokensById.get(id)!).filter(Boolean);
}

export function cellsInSameSegment(state: InternalState, coord: Coord): Coord[] {
  const info = state[INDICES].segCells.get(key(coord));
  if (!info) return [];
  const inst = state[INDICES].segmentsById.get(info.instanceId)!;
  const def = state[SEGMENT_DEFS].get(inst.type)!;
  return segmentCells(inst, def).map((c) => c.coord);
}

export function findByIdInternal(state: InternalState, id: Id): SegmentInstance | TokenInstance | undefined {
  return state[INDICES].segmentsById.get(id) || state[INDICES].tokensById.get(id);
}

export function getIndices(state: InternalState): Indices {
  return state[INDICES];
}
