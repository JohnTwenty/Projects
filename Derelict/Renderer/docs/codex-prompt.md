Implement the Renderer module (TypeScript, Canvas2D)
Summary

Build a pure rendering library that draws a BoardState to a Canvas2D (or OffscreenCanvas). No UI logic, no DOM events, no BoardState mutations. Inputs: BoardState, SpriteManifest (text-line format), Viewport, RenderOptions. Output: pixels.
Tech

    TypeScript, ESM.

    Vitest for tests.

    Target browser build, but allow unit tests to run in jsdom.

    No frameworks.

Project layout under JohnTwenty/Projects/Derelict/Renderer

/src
  /types.ts              // minimal shared types for Renderer only
  /renderer.ts           // createRenderer(), Renderer implementation
  /manifest.ts           // loadSpriteManifestFromText() + types
  /math.ts               // boardToScreen(), isCellVisible(), helpers
  /assets.ts             // AssetResolver type & default fallback
/tests
  manifest.spec.ts
  math.spec.ts
  renderer.spec.ts       // smoke tests with OffscreenCanvas if available
package.json
tsconfig.json
vitest.config.ts
README.md

Types (copy exactly)

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

export type AssetResolver = (key: string) =>
  HTMLImageElement | ImageBitmap | undefined;

export interface SpriteEntry {
  key: string;           // integer-like string -> cellType, otherwise token type
  file: string;          // image path or atlas key
  x: number; y: number;  // source rect top-left in pixels
  w: number; h: number;  // source rect size in pixels; 0,0,0,0 => whole image
  layer: number;         // draw order (lower first)
  xoff: number; yoff: number; // pixel offsets from cell center BEFORE rotation
}
export interface SpriteManifest { entries: SpriteEntry[]; }

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

  // Pure helpers:
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
export function createRenderer(): Renderer;

    BoardState is read-only here and comes from the existing module:

    interface BoardState {
      size: number;
      segments: { instanceId: string; segmentId: string; origin:{x:number,y:number}; rot:0|90|180|270 }[];
      tokens:   { tokenId: string; type: string; rot:0|90|180|270; cells:{x:number,y:number}[]; attrs?:Record<string,unknown> }[];
    }
    // Access cell types through an injected function:
    // getCellType(state, {x,y}) -> number | -1  (Codex: create an adapter interface)

Manifest text format (must parse exactly)

    One entry per line:
    string_id file_name x y width height layer xoff yoff

    Integer-like string_id → cellType; otherwise → token type

    x=y=w=h=0 means “use whole image”

    Ignore blank lines and lines starting with #

Implement:

export function loadSpriteManifestFromText(text: string): SpriteManifest;

Validation:

    9 fields required; throw with line number if not.

    Integers must parse; allow negative offsets.

    Deduplicate by key using last one wins.

Asset resolver

Provide:

setAssetResolver(resolver: AssetResolver): void;

Renderer never loads images itself; it just asks the resolver for file (atlas key or URL) → HTMLImageElement | ImageBitmap. If resolver returns undefined, draw a magenta fallback rect for that sprite.
Rendering rules

    Compute cell rect in pixels:

    const sizePx = vp.cellSize * (vp.scale || 1);
    xPx = (cell.x - vp.origin.x) * sizePx;
    yPx = (cell.y - vp.origin.y) * sizePx;

    HiDPI: resize(widthPx,heightPx) sets canvas backing store to widthPx * (vp.dpr||1), same for height; scale ctx accordingly.

    Draw order:

        Terrain: iterate visible cells; for each cell with cellType>=0, draw sprite whose key === String(cellType) using its layer (terrain layers typically lowest).

        Tokens: iterate state.tokens in stable order; for each covered cell:

            translate to cell center

            apply (xoff,yoff) before rotation

            rotate by token.rot (0/90/180/270)

            draw source rect (x,y,w,h) from the resolved image; if w=h=0, use full image bounds.

    Culling: skip cells/tokens whose cell rect is fully outside the canvas (use isCellVisible).

    segment bounds overlay: when options.showSegmentBounds, stroke axis-aligned rectangles for each SegmentInstance based on its width/height after rotation (hint: ask caller for a helper OR compute from segment defs if available; for MVP you can omit exact bounds and simply draw a rect per occupied cell to form the outline).

API design notes

    Renderer must be pure w.r.t. state: it holds only manifest + resolver + last-known canvas size. No internal timers.

    No event listeners. The caller drives render().

Tests (Vitest)

    manifest.spec.ts

        Parses valid lines; ignores comments/blank lines

        Bad field count → error with line number

        Non-integer numeric fields → error

        Last-write-wins for duplicate keys

    math.spec.ts

        boardToScreen mapping correctness for multiple scales/dpr/origins

        isCellVisible true/false on edges

    renderer.spec.ts

        With a stub BoardState (few cells and tokens) + fake AssetResolver returning 1×1 white image bitmaps, verify:

            No throw when sprites missing → magenta fallback path visited (spy on ctx.fillStyle)

            Culling: off-screen cells do not invoke drawImage

            Token offset and 90° rotation apply (spy on ctx.transform/rotate calls count)

        If OffscreenCanvas is available in jsdom, do a smoke test: render twice with same inputs and assert same ImageData hash.

Deliverables

    All source + tests passing (pnpm test or npm test).
    README with short usage snippet and the text manifest format.
    No DOM/global side effects.

Now implement the module and tests per above. If a tiny ambiguity blocks implementation, make a conservative choice and document it in README.