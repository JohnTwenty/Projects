import { BoardState } from '../core/types.js';
import { createState, placeSegment, placeToken } from '../core/boardState.js';

export function serializeSave(state: BoardState): string {
  return JSON.stringify(state, null, 2);
}

export function deserializeSave(text: string, segDefs: Map<string, any>, tokDefs: Map<string, any>): BoardState {
  const obj = JSON.parse(text) as BoardState;
  const state = createState(obj.size, segDefs, tokDefs);
  for (const s of obj.segments) {
    placeSegment(state, s);
  }
  for (const t of obj.tokens) {
    placeToken(state, t);
  }
  return state;
}
