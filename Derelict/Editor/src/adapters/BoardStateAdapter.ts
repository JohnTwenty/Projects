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
  removeToken(id: string) {
    this.api.removeToken(this.state, id);
  }
  importBoardText(text: string) {
    this.api.importBoardText(this.state, text);
  }
  exportBoardText(missionName = 'Untitled') {
    return this.api.exportBoardText(this.state, missionName);
  }
  getCellType(coord: { x: number; y: number }) {
    return this.api.getCellType(this.state, coord);
  }
}
