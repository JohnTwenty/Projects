# Renderer Module — Software Requirements Specification (SRS)

## 1. Purpose

Provide a **pure rendering library** that draws a `BoardState` onto a `Canvas2D` (or `OffscreenCanvas`). The Renderer has **no UI logic, no event handling, and no BoardState mutations**. It is swappable (e.g., Canvas2D, WebGL/3D, ASCII). An Editor or App layer orchestrates input and calls Renderer methods.

## 2. Scope

* Consume: **BoardState** (read-only) and a **Sprite Manifest**.
* Output: pixels on a provided canvas context.
* Support camera/viewport transforms (pan/zoom) supplied by the caller.
* Optional overlays for debug (segment bounds) provided via flags.

## 3. External Interfaces

* **Inputs:** `BoardState`, `SpriteManifest`, `Viewport`, `RenderOptions`.
* **Outputs:** Drawn frame on a `CanvasRenderingContext2D` or `OffscreenCanvasRenderingContext2D`.
* **No events**, **no DOM manipulation**, **no timers** (caller drives the render loop).

## 4. Definitions

* **Viewport:** mapping from board coordinates to screen pixels.
* **CellSize:** pixels per board cell at scale=1 (float allowed for zoom smoothness).
* **Sprite Manifest:** a **plain text, line‑oriented** mapping of cell/token identifiers to image sources and atlas rectangles. Not used by BoardState.

## 5. Functional Requirements

* **R-001** Render visible **cell terrain** based on `getCellType(x,y)` across the viewport’s bounds.
* **R-002** Render **tokens** by iterating `getTokens()`; for each `token.cells` draw the token sprite with rotation `token.rot` (0/90/180/270) around a pixel offset defined by the manifest.
* **R-003** Optional **segment bounds overlay**: draw axis-aligned rectangles for each `SegmentInstance` when `options.showSegmentBounds` is true.
* **R-004** **HiDPI**: respect `devicePixelRatio` (provided by caller) to avoid blur.
* **R-005** **Culling**: skip drawing cells/tokens outside the viewport.
* **R-006** **Layering**: draw terrain, then tokens in ascending **layer** order from the manifest, then stable insertion order.
* **R-007** **Clear/Background**: configurable background (solid color or transparent).

## 6. Non-Functional Requirements

* **N-001 Performance:** Target 60 FPS for up to \~10k visible cells; batch draw calls and minimize state changes.
* **N-002 Determinism:** Given the same input state, manifest, and viewport, produced pixels are deterministic.
* **N-003 Testability:** Core math (transforms, culling) exposed as pure helpers; golden-image tests supported via OffscreenCanvas.
* **N-004 Modularity:** No coupling to Editor; no event listeners or DOM queries.

## 7. Sprite Manifest — **Text Format (Atlas-Friendly)**

A minimal, hand-editable text format; one entry per line.

### 7.1 Line Syntax

```
# Comments start with '#'; blank lines ignored
# Fields: string_id file_name x y width height layer xoff yoff
# Types:
#   string_id : token type (string) OR cell type (integer as string)
#   file_name : relative/absolute path OR atlas key
#   x,y,width,height : integers (pixels) within the image; use 0 0 0 0 to mean "use full image"
#   layer : integer draw order (lower draws first)
#   xoff,yoff : integer pixel offsets from the **cell center** before rotation

# examples
0 tiles/wall.png 0 0 0 0 0 0 0            # cellType=0 → whole file
1 tiles/corridor.png 0 0 0 0 0 0 0        # cellType=1 → whole file
marine tokens/marine_atlas.png 64 0 32 32 10 0 0
door tokens/doors.png 0 0 32 32 20 0 -8
```

### 7.2 Semantics

* **Identifier resolution**: if `string_id` parses as an integer → **cell type**; otherwise → **token type**.
* **Atlas rect**: `(x,y,width,height)` cut from `file_name`. If all zeros, the whole image is used.
* **Offsets**: `(xoff,yoff)` are applied relative to the **cell center** in pixels **before rotation**; then rotation is applied around the cell center.
* **Layering**: lower `layer` draws first. Terrain lines (cell types) should typically have smaller layers than tokens.
* **Missing entries**: if an id is not present, Renderer draws a fallback magenta square but does not throw.

### 7.3 Loader Behavior

* The Renderer provides a helper to parse this format and build an in-memory manifest.
* Image loading is performed via an **asset resolver hook**; the manifest stores only keys/paths.

## 8. Public API

```ts
export interface Viewport {
  origin: { x: number; y: number }; // board coord at top-left of canvas
  scale: number;                    // zoom; 1 means 1*cellSize pixels per cell
  cellSize: number;                 // base pixels per cell at scale=1
  dpr?: number;                     // devicePixelRatio (defaults to 1)
}

export interface RenderOptions {
  clear?: boolean;                  // clear before draw (default true)
  background?: string | null;       // CSS color or null for transparent
  showSegmentBounds?: boolean;
}

export type AssetResolver = (key: string) => HTMLImageElement | ImageBitmap | undefined;

export interface SpriteEntry { key: string; file: string; x: number; y: number; w: number; h: number; layer: number; xoff: number; yoff: number; }
export interface SpriteManifest { entries: SpriteEntry[]; }

export interface Renderer {
  setSpriteManifest(manifest: SpriteManifest): void;
  loadSpriteManifestFromText(text: string): void;         // parses the line format above
  setAssetResolver(resolver: AssetResolver): void;         // how to fetch images by key/URL
  resize(widthPx: number, heightPx: number): void;         // handles HiDPI backing store
  render(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
         state: BoardState,
         viewport: Viewport,
         options?: RenderOptions): void;

  // Pure helpers (no drawing):
  boardToScreen(cell: {x:number,y:number}, vp: Viewport): {x:number,y:number,width:number,height:number};
  isCellVisible(cell: {x:number,y:number}, vp: Viewport, canvasPx: {w:number,h:number}): boolean;
}

export function createRenderer(): Renderer;
```

## 9. Coordinate Math

* **Cell rect in pixels**: `xPx = (cell.x - vp.origin.x) * vp.cellSize * vp.scale`, same for y; width/height = `vp.cellSize * vp.scale`.
* **Token placement**: draw at cell center transformed to pixels, then apply `(xoff,yoff)` in pixels in unrotated space, then rotate by `token.rot` around the center.
* **HiDPI**: multiply canvas backing resolution by `vp.dpr`; scale the context or adjust transforms accordingly.

## 10. Error Handling

* Missing sprite keys: draw fallback (e.g., magenta square with diagonal) but do not throw.
* Negative or unknown cell types: treat as transparent.
* Non-integer coords in tokens: Renderer assumes integers and ignores invalid cells.

## 11. Acceptance Criteria

1. With a given BoardState and manifest, repeated `render` calls are pixel-identical.
2. Viewport pan/zoom updates translate/scale output correctly with HiDPI crispness.
3. Culling ensures no draw calls for fully off-screen cells/tokens.
4. Segment bounds overlay appears when enabled and aligns with terrain.
5. Fallback visuals appear for missing sprites without errors.

## 12. Notes on JSON vs Text Manifests

* **Why text**: trivial to hand-edit, diffable, and copy/paste friendly; resilient to minor formatting errors.
* **When JSON helps**: hierarchical options (e.g., multiple atlases, per-rotation art, animations). If those appear later, provide a *converter* from this text format to JSON, keeping the Renderer API unchanged.
