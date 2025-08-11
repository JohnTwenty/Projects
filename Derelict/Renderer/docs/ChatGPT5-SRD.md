# Renderer Module — Software Requirements Specification (SRS)

## 1. Purpose

Provide a **pure rendering library** that draws a `BoardState` onto a `Canvas2D` (or `OffscreenCanvas`). The Renderer has **no UI logic, no event handling, and no BoardState mutations**. It is swappable (e.g., Canvas2D, WebGL/3D, ASCII). An Editor or App layer orchestrates input and calls Renderer methods.

## 2. Scope

- Consume: **BoardState** (read-only) and a **Sprite Manifest**.
- Output: pixels on a provided canvas context.
- Support camera/viewport transforms (pan/zoom) supplied by the caller.
- Optional overlays for debug (segment bounds) provided via flags.

## 3. External Interfaces

- **Inputs:** `BoardState`, `SpriteManifest`, `Viewport`, `RenderOptions`.
- **Outputs:** Drawn frame on a `CanvasRenderingContext2D` or `OffscreenCanvasRenderingContext2D`.
- **No events**, **no DOM manipulation**, **no timers** (caller drives the render loop).

## 4. Definitions

- **Viewport:** mapping from board coordinates to screen pixels.
- **CellSize:** pixels per board cell at scale=1 (float allowed for zoom smoothness).
- **Sprite Manifest:** plain-text file mapping `cellType:int` and `token.type:string` to image files or atlas regions, with offsets and layer ordering.

## 5. Functional Requirements

- **R-001** Render visible **cell terrain** based on `getCellType(x,y)` across the viewport’s bounds.
- **R-002** Render **tokens** by iterating `getTokens()`; for each `token.cells` draw the token sprite with rotation `token.rot` (0/90/180/270) around its specified offset.
- **R-003** Optional **segment bounds overlay** when `options.showSegmentBounds` is true.
- **R-004** **HiDPI**: respect `devicePixelRatio` (provided by caller).
- **R-005** **Culling**: skip drawing cells/tokens outside the viewport.
- **R-006** **Layering**: draw terrain, then tokens in ascending layer order.
- **R-007** **Clear/Background**: configurable background color or transparent.

## 6. Non-Functional Requirements

- **N-001 Performance:** Target 60 FPS for up to \~10k visible cells.
- **N-002 Determinism:** Same state, manifest, and viewport → same pixels.
- **N-003 Testability:** Pure helpers for transforms/culling; support golden-image tests.
- **N-004 Modularity:** No coupling to Editor; no event listeners or DOM queries.

## 7. Sprite Manifest — Text Format

A minimal, hand-editable format; one sprite per line.

```
# string_id file_name x y width height layer xoff yoff
# integer string_id → cellType; otherwise → token type
# file_name: image path or atlas key
# x,y,w,h: pixels within file (0 0 0 0 = whole image)
# layer: integer draw order
# xoff,yoff: pixel offsets from cell center before rotation

0 tiles/wall.png 0 0 0 0 0 0 0
1 tiles/corridor.png 0 0 0 0 0 0 0
marine tokens/marine_atlas.png 64 0 32 32 10 0 0
door tokens/doors.png 0 0 32 32 20 0 -8
```

- Missing entries → magenta fallback.
- Renderer provides a parser: `loadSpriteManifestFromText(text)`.
- Image loading done via an asset resolver hook.

## 8. Public API

```ts
export interface Viewport {
  origin: { x: number; y: number };
  scale: number;
  cellSize: number;
  dpr?: number;
}

export interface RenderOptions {
  clear?: boolean;
  background?: string | null;
  showSegmentBounds?: boolean;
}

export type AssetResolver = (key: string) => HTMLImageElement | ImageBitmap | undefined;

export interface SpriteEntry {
  key: string; file: string; x: number; y: number; w: number; h: number;
  layer: number; xoff: number; yoff: number;
}
export interface SpriteManifest { entries: SpriteEntry[]; }

export interface Renderer {
  setSpriteManifest(manifest: SpriteManifest): void;
  loadSpriteManifestFromText(text: string): void;
  setAssetResolver(resolver: AssetResolver): void;
  resize(widthPx: number, heightPx: number): void;
  render(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
         state: BoardState,
         viewport: Viewport,
         options?: RenderOptions): void;
  boardToScreen(cell: {x:number,y:number}, vp: Viewport): {x:number,y:number,width:number,height:number};
  isCellVisible(cell: {x:number,y:number}, vp: Viewport, canvasPx: {w:number,h:number}): boolean;
}

export function createRenderer(): Renderer;
```

## 9. Coordinate Math

- **Cell rect in pixels**: `(cell.x - vp.origin.x) * vp.cellSize * vp.scale`.
- **Token placement**: offsets applied from cell center before rotation.
- **HiDPI**: adjust backing resolution by `vp.dpr`.

## 10. Error Handling

- Missing sprite → fallback.
- Unknown cell types → transparent.
- Non-integer coords ignored.

## 11. Acceptance Criteria

1. Identical inputs → identical pixels.
2. Correct pan/zoom with HiDPI.
3. Culling skips off-screen.
4. Segment bounds overlay aligns.
5. Fallback visuals for missing sprites.

## 12. Open Questions

- Atlas packing format left to Editor/App.
- Multi-cell token art strategy TBD.
- Optional z-index per-token instance possible via token attrs.

