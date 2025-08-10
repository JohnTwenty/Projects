import { BoardState, Coord, SegmentInstance, TokenInstance, Id } from '../core/types.js';
import { parseSegmentLibrary } from '../io/segmentLib.parse.js';
import { parseTokenLibrary } from '../io/tokenLib.parse.js';
import { parseMission } from '../io/mission.parse.js';
import { serializeMission } from '../io/mission.serialize.js';
import { createState, placeSegment, removeSegmentAtCoordInternal, placeToken, removeTokenInternal, cellTypeAt, cellsInSameSegment, tokensAt, findByIdInternal } from '../core/boardState.js';

export function newBoard(size: number, segmentLibrary: string, tokenLibrary: string): BoardState {
  const segDefs = parseSegmentLibrary(segmentLibrary);
  const tokDefs = parseTokenLibrary(tokenLibrary);
  return createState(size, segDefs, tokDefs);
}

export function loadBoard(size: number, segmentLibrary: string, tokenLibrary: string, missionFile: string): BoardState {
  const segDefs = parseSegmentLibrary(segmentLibrary);
  const tokDefs = parseTokenLibrary(tokenLibrary);
  const mission = parseMission(missionFile);
  const state = createState(mission.size || size, segDefs, tokDefs);
  for (const s of mission.segments) {
    placeSegment(state, s);
  }
  for (const t of mission.tokens) {
    placeToken(state, t);
  }
  return state;
}

export function saveBoard(state: BoardState, missionName: string): string {
  return serializeMission(state, missionName);
}

// Mutations
export function addSegment(state: BoardState, seg: SegmentInstance): void {
  placeSegment(state as any, seg);
}

export function removeSegmentAtCoord(state: BoardState, coord: Coord): void {
  removeSegmentAtCoordInternal(state as any, coord);
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

export function getSegmentInstances(state: BoardState): SegmentInstance[] {
  return state.segments;
}

export function getTokens(state: BoardState): TokenInstance[] {
  return state.tokens;
}

export function findById(state: BoardState, id: Id): SegmentInstance | TokenInstance | undefined {
  return findByIdInternal(state as any, id);
}
