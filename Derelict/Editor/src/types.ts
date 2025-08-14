export interface Renderer {
  setSpriteManifest(manifest: { entries: any[] }): void;
  loadSpriteManifestFromText(text: string): void;
  setAssetResolver(
    resolver: (key: string) => HTMLImageElement | ImageBitmap | undefined,
  ): void;
  resize(w: number, h: number): void;
  render(
    ctx: CanvasRenderingContext2D,
    state: BoardState,
    vp: any,
    opt?: any,
  ): void;
}

export interface BoardState {
  size: number;
  segmentDefs: {
    segmentId: string;
    name?: string;
    width?: number;
    height?: number;
    grid?: number[][];
  }[];
  tokenTypes: { type: string }[];
  segments: any[];
  tokens: any[];
}

export interface BoardStateAPI {
  newBoard(size: number, segLibText: string, tokenLibText: string): BoardState;
  addSegment(
    state: BoardState,
    seg: {
      instanceId: string;
      segmentId: string;
      origin: { x: number; y: number };
      rot: 0 | 90 | 180 | 270;
    },
  ): void;
  updateSegment(state: BoardState, id: string, patch: Partial<any>): void;
  removeSegment(state: BoardState, id: string): void;
  addToken(
    state: BoardState,
    tok: {
      tokenId: string;
      type: string;
      rot: 0 | 90 | 180 | 270;
      cells: { x: number; y: number }[];
    },
  ): void;
  updateToken(state: BoardState, id: string, patch: Partial<any>): void;
  removeToken(state: BoardState, id: string): void;
  importMission(state: BoardState, text: string): void;
  exportMission(state: BoardState): string;
  getCellType(state: BoardState, coord: { x: number; y: number }): number | -1;
}

export type GhostKind = 'segment' | 'token' | null;

export interface EditorState {
  selected?: { kind: 'segment' | 'token'; id: string } | null;
  ghost?: {
    kind: GhostKind;
    id: string;
    rot: 0 | 90 | 180 | 270;
    cell: { x: number; y: number } | null;
  } | null;
}
