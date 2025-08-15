import { BoardState, Coord, SegmentInstance, TokenInstance, Id } from '../core/types.js';
import { parseSegmentLibrary } from '../io/segmentLib.parse.js';
import { parseTokenLibrary } from '../io/tokenLib.parse.js';
import { parseMission } from '../io/mission.parse.js';
import { serializeMission } from '../io/mission.serialize.js';
import { createState, resetBoard, placeSegment, removeSegmentAtCoordInternal, placeToken, removeTokenInternal, cellTypeAt, cellsInSameSegment, tokensAt, findByIdInternal } from '../core/boardState.js';

export function newBoard(size: number, segmentLibrary: string, tokenLibrary: string): BoardState {
  const segDefs = parseSegmentLibrary(segmentLibrary);
  const tokDefs = parseTokenLibrary(tokenLibrary);
  const state = createState(size, segDefs, tokDefs);
  (state as any).getCellType = (coord: Coord) => cellTypeAt(state as any, coord);
  return state;
}

export function importBoardText(state: BoardState, text: string): void {
  const mission = parseMission(text);
  resetBoard(state as any, mission.size || state.size);
  for (const s of mission.segments) {
    placeSegment(state as any, s);
  }
  for (const t of mission.tokens) {
    placeToken(state as any, t);
  }
}

export function exportBoardText(state: BoardState, missionName: string): string {
  return serializeMission(state, missionName);
}

// Mutations
export function addSegment(state: BoardState, seg: SegmentInstance): void {
  placeSegment(state as any, seg);
}

export function removeSegment(state: BoardState, id: Id): void {
  const inst = findByIdInternal(state as any, id) as SegmentInstance | undefined;
  if (inst) {
    removeSegmentAtCoordInternal(state as any, inst.origin);
  }
}

export function addToken(state: BoardState, tok: TokenInstance): void {
  placeToken(state as any, tok);
}

export function removeToken(state: BoardState, tokenId: Id): void {
  removeTokenInternal(state as any, tokenId);
}

// Queries
export function getCellType(state: BoardState, coord: Coord): number {
  return cellTypeAt(state as any, coord);
}

export function getCellsInSameSegment(state: BoardState, coord: Coord): Coord[] {
  return cellsInSameSegment(state as any, coord);
}

export function getTokensAt(state: BoardState, coord: Coord): TokenInstance[] {
  return tokensAt(state as any, coord);
}

export function getBoardDimensions(state: BoardState): { width: number; height: number } {
  return { width: state.size, height: state.size };
}

export function findById(state: BoardState, id: Id): SegmentInstance | TokenInstance | undefined {
  return findByIdInternal(state as any, id);
}
