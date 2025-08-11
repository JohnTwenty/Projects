Implement the Derelict Editor (TypeScript, Canvas2D, node:test)
Goal

Build a browser-based mission editor for the Derelict game, separated cleanly from the Renderer and BoardState modules.

    Renderer: already exists at Projects/Derelict/Renderer; pure library that draws a BoardState onto a Canvas2D using a sprite manifest.

    BoardState: already exists at at Projects/Derelict/BoardState; owns data and mutations; supports import/export of mission/save and embedded segment/token libraries.

    Editor (this task): UI + input controller that manipulates BoardState, calls the Renderer to draw, and provides mission file ops. Supports ghosting, palettes, rotate/unselect/place/delete, and modal dialogs for New / Load / Save / Play.

Hard requirements

    Language: TypeScript

    Tests: node:test (the Node core test runner). Do not use Jest/Vitest/Mocha.

    DOM for tests: use jsdom (in node) where needed, but keep most logic in pure modules testable without a DOM.

    No frameworks required. Plain TS + minimal DOM APIs. Optional: lightweight css.

Project layout under Projects/Derelict/Editor: 

/src
  /editor
    EditorCore.ts           // pure state machine & commands (no DOM)
    EditorUI.ts             // DOM wiring (palettes, buttons, modals)
    GhostOverlay.ts         // ghost drawing on a transparent overlay canvas
    Shortcuts.ts            // keyboard shortcut registration
    layout.html             // minimal HTML skeleton (export string or template fn)
    styles.css              // minimal styling (optional)
  /adapters
    RendererAdapter.ts      // thin adapter to call an injected Renderer instance
    BoardStateAdapter.ts    // thin adapter for BoardState calls (newBoard, add/remove, import/export)
  /types.ts                 // shared types used by Editor (imports BoardState/Renderer types via interfaces)
  /util
    dom.ts                  // qs(), createEl(), modal helpers
    geometry.ts             // cell<->pixel helpers mirrored from SRS
    files.ts                // file input handling, download blob
/index.ts                   // bootstrap: assemble Editor with provided canvas, palettes, etc.
/tests
  core.test.ts              // node:test — EditorCore behaviors (no DOM)
  geometry.test.ts          // node:test — helpers
  ui.smoke.test.ts          // node:test + jsdom — basic DOM wiring works
  ghost.test.ts             // node:test — GhostOverlay math & alpha ops
package.json
tsconfig.json
README.md

SRS → Features to implement
Layout (DOM)

    Top bar: centered text “Derelict Game Editor”.

    Button bar 1: New, Load, Save, Play (each opens a modal).

    Main area:

        Viewport: <canvas id="viewport"> where Renderer draws the current BoardState.

        Segment palette (right): vertical list of segment names (text only for MVP).

    Button bar 2 (below viewport): Rotate Left, Rotate Right, Unselect, Place, Delete, Edit Mission Data.

    Token palette (bottom): horizontal row of token sprites with string labels (sprites lookups from the manifest are part of the App; Editor shows them, falls back to text if image missing).

Provide layout.html as a string export that EditorUI can inject into a container element (the app can also handcraft equivalent DOM — keep EditorUI flexible).
Ghosting

    When a segment or token is selected (from a palette) but not yet placed → ghosting:

        The ghost follows the mouse (snapped to cell).

        Default style: semi-transparent; fallback to outline if perf is insufficient.

        Render the ghost on a second transparent overlay canvas (<canvas id="overlay">) so the Renderer remains pure. Editor clears/redraws overlay on mouse move or param change.

Editing actions

    Segments (from the palette):

        Click a segment name to select for placement (ghosting active).

        Rotate ghost: buttons (Rotate Left/Right) and shortcuts (R, Shift+R).

        Click in viewport to place if valid (BoardState prevents overlap; on error, show toast).

        Select placed segment: click on it; then Delete/Rotate affect the selection.

    Tokens (from bottom palette):

        Click token entry to start ghosting; place onto one/more cells (Editor uses single cell placement per click for MVP).

        Rotate/Unselect/Delete similarly.

    Edit Mission Data: open modal with mission name and optional metadata; store with BoardState export if available.

File operations (modals)

    New: modal prompts for mission name + choose files (segment library, token library, sprite manifest). On confirm:

        Call BoardState.newBoard(size, segmentLibText, tokenLibText)

        Load sprite manifest (text) and hand to Renderer adapter

    Load: pick a mission file (text); call BoardState.importMission(text)

    Save: call BoardState.exportMission() and download as file

    Play: modal to confirm “switch to play mode”; for now just emit an event/callback (Editor doesn’t implement gameplay)

Keyboard shortcuts

    R / Shift+R: rotate ghost (±90°)

    Esc: Unselect (cancel ghost)

    Delete / Backspace: delete selection

    Ctrl/Cmd+S: Save (prevent default)

Rendering loop

    No internal timers. Editor triggers Renderer draw on:

        state changes (add/remove/update in BoardState)

        viewport changes (pan/zoom not required for MVP but leave a hook)

        manifest changes

    Overlay canvas is redrawn only when ghosting state or mouse cell changes.

Interfaces (lightweight)

// Injected from app
export interface Renderer {
  setSpriteManifest(manifest: { entries: any[] }): void;
  loadSpriteManifestFromText(text: string): void;
  setAssetResolver(resolver: (key: string) => HTMLImageElement | ImageBitmap | undefined): void;
  resize(w: number, h: number): void;
  render(ctx: CanvasRenderingContext2D, state: BoardState, vp: Viewport, opt?: RenderOptions): void;
}

export interface BoardState {
  size: number;
  segmentDefs: { segmentId: string; name: string }[];
  tokenTypes: { type: string }[];
  segments: any[];
  tokens: any[];
}
export interface BoardStateAPI {
  newBoard(size: number, segLibText: string, tokenLibText: string): BoardState;
  addSegment(state: BoardState, seg: { instanceId:string; segmentId:string; origin:{x:number;y:number}; rot:0|90|180|270 }): void;
  updateSegment(state: BoardState, id: string, patch: Partial<any>): void;
  removeSegment(state: BoardState, id: string): void;
  addToken(state: BoardState, tok: { tokenId:string; type:string; rot:0|90|180|270; cells:{x:number;y:number}[] }): void;
  updateToken(state: BoardState, id: string, patch: Partial<any>): void;
  removeToken(state: BoardState, id: string): void;
  importMission(state: BoardState, text: string): void;
  exportMission(state: BoardState): string;
  getCellType(state: BoardState, coord: {x:number;y:number}): number | -1;
}

EditorCore (pure)

Implement a small state machine:

type GhostKind = 'segment' | 'token' | null;

interface EditorState {
  selected?: { kind:'segment'|'token'; id:string } | null;
  ghost?: {
    kind: GhostKind;
    id: string;             // segmentId or token type
    rot: 0|90|180|270;
    cell: {x:number;y:number}|null;  // snapped
  } | null;
}

class EditorCore {
  constructor(private bs: BoardStateAPI, private state: BoardState) {}
  get ui(): Readonly<EditorState>; // expose immutable snapshot

  selectSegment(segmentId: string): void;
  selectToken(tokenType: string): void;
  clearSelection(): void;

  setGhostCell(cell: {x:number;y:number}|null): void;
  rotateGhost(dir: 1|-1): void;

  placeGhost(): { ok: true } | { ok: false; error: string };
  deleteSelection(): void;

  // file ops (called by UI after file inputs resolve to text)
  newMission(name: string, size: number, segLibText: string, tokenLibText: string): void;
  loadMission(text: string): void;
  saveMission(): string; // returns text for UI to download
}

EditorUI (DOM)

    Accept a container element and a Renderer + BoardStateAPI, construct the layout (or insert layout.html) and wire events.

    Own two canvases: viewport (Renderer) and overlay (ghost).

    Mousemove over viewport → compute snapped cell from mouse → EditorCore.setGhostCell.

    Click → EditorCore.placeGhost() and re-render.

    Buttons & shortcuts → call EditorCore methods.

    Modals:

        Implement minimal modal helper (create, show, close); inputs for mission name + file inputs.

        File reading via FileReader; pass text to EditorCore.newMission/loadMission.

    Rendering:

        Keep a render() method that calls Renderer.render(ctx, state, vp, …) then draws ghost on overlay.

        Ghost drawing: semi-transparent fill; outline fallback is a toggle (simple boolean).

Tests — node:test

    Use node:test in all test files. No Jest/Vitest.

    Prefer pure tests (EditorCore, geometry) so they run without DOM.

    For minimal DOM smoke tests, use jsdom in node:test.

Test plan

core.test.ts

    Selecting a segment → ghost kind/rot set; clearSelection() resets.

    rotateGhost(±1) cycles through 0/90/180/270.

    placeGhost():

        Calls BoardState.addSegment when ghost kind is segment and cell is set.

        Returns {ok:false} if cell not set or BoardState rejects (simulate error).

    deleteSelection() delegates to BoardState remove.

geometry.test.ts

    Cell snapping math & clamping to board bounds.

ui.smoke.test.ts (with jsdom)

    Inject layout.html into a document; construct EditorUI with stubbed Renderer/BoardStateAPI.

    Simulate clicking segment list item → ghost begins (class toggles).

    Simulate mousemove → overlay ghost cell updates.

    Simulate click → place → Renderer called on next render.

ghost.test.ts

    Given ghost at cell (x,y) with rot=90 and alpha=0.5, ensure overlay draw uses correct transforms (spy ctx calls).

Implementation notes

    Keep EditorUI thin; most logic lives in EditorCore to maximize testability.

    Overlay drawing: set ctx.globalAlpha = 0.5 for ghost; restore after.

    Palette entries: if sprite not available, render a colored square with a text label below.

    No timers: caller (app) triggers initial render and on each state change.

    Accessibility: buttons have aria-label and focus styles; keyboard shortcuts don’t block accessibility.

Deliverables

    All source code + node:test test files passing (node --test).

    README with quick start (dev server with a simple static index.html), how to run tests, and how to wire an existing BoardState + Renderer.

Implement now. If anything is ambiguous, choose the simplest behavior consistent with the SRS and document it briefly in README.