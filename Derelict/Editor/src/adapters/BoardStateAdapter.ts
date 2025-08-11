import type { BoardState, BoardStateAPI } from '../types.js';

export class BoardStateAdapter {
  constructor(private api: BoardStateAPI, private state: BoardState) {}

  getState() {
    return this.state;
  }

  newBoard(size: number, segLibText: string, tokenLibText: string) {
    this.state = this.api.newBoard(size, segLibText, tokenLibText);
    return this.state;
  }

  addSegment(seg: {
    instanceId: string;
    segmentId: string;
    origin: { x: number; y: number };
    rot: 0 | 90 | 180 | 270;
  }) {
    this.api.addSegment(this.state, seg);
  }
  updateSegment(id: string, patch: Partial<any>) {
    this.api.updateSegment(this.state, id, patch);
  }
  removeSegment(id: string) {
    this.api.removeSegment(this.state, id);
  }
  addToken(tok: {
    tokenId: string;
    type: string;
    rot: 0 | 90 | 180 | 270;
    cells: { x: number; y: number }[];
  }) {
    this.api.addToken(this.state, tok);
  }
  updateToken(id: string, patch: Partial<any>) {
    this.api.updateToken(this.state, id, patch);
  }
  removeToken(id: string) {
    this.api.removeToken(this.state, id);
  }
  importMission(text: string) {
    this.api.importMission(this.state, text);
  }
  exportMission() {
    return this.api.exportMission(this.state);
  }
  getCellType(coord: { x: number; y: number }) {
    return this.api.getCellType(this.state, coord);
  }
}
