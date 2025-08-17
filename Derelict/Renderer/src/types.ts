import type { AssetResolver } from './assets.js';

export interface Viewport {
  origin: { x: number; y: number };
  scale: number;
  cellSize: number;
  dpr?: number;
}

export interface RenderOptions {
  clear?: boolean;
  background?: string | null;
}

export interface BoardState {
  size: number;
  segments: {
    instanceId: string;
    segmentId?: string;
    type?: string;
    origin: { x: number; y: number };
    rot: 0 | 90 | 180 | 270;
  }[];
  tokens: {
    tokenId: string;
    type: string;
    rot: 0 | 90 | 180 | 270;
    cells: { x: number; y: number }[];
    attrs?: Record<string, unknown>;
  }[];
  segmentDefs?: {
    segmentId: string;
    width?: number;
    height?: number;
    grid?: number[][];
  }[];
}

export interface Ghost {
  kind: 'segment' | 'token';
  id: string;
  rot: 0 | 90 | 180 | 270;
  cell: { x: number; y: number } | null;
}

export interface Renderer {
  setSpriteManifest(manifest: SpriteManifest): void;
  loadSpriteManifestFromText(text: string): void;
  setAssetResolver(resolver: AssetResolver): void;
  resize(widthPx: number, heightPx: number): void;
  render(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    state: BoardState,
    viewport: Viewport,
    options?: RenderOptions
  ): void;

  drawGhost(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    ghost: Ghost | null,
    state: BoardState,
    viewport: Viewport,
  ): void;

  boardToScreen(
    cell: { x: number; y: number },
    vp: Viewport
  ): { x: number; y: number; width: number; height: number };

  isCellVisible(
    cell: { x: number; y: number },
    vp: Viewport,
    canvasPx: { w: number; h: number }
  ): boolean;
}

export type { AssetResolver };
export interface SpriteEntry {
  key: string; // integer-like string -> cellType, otherwise token type
  file: string; // image path or atlas key
  x: number; y: number; // source rect top-left in pixels
  w: number; h: number; // source rect size in pixels; 0,0,0,0 => whole image
  layer: number; // draw order (lower first)
  xoff: number; yoff: number; // pixel offsets from cell center BEFORE rotation
}
export interface SpriteManifest { entries: SpriteEntry[]; }
export declare function createRenderer(): Renderer;
