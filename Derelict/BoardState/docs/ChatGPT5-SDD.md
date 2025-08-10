## Board State Module — Software Design Document (SDD)

### 1. Introduction

This design implements the Board State module for a square-grid board game. It models **segments** (rectangular terrain blocks) and **tokens** (doors, miniatures, markers, objectives, etc.). Segments cannot overlap; tokens may overlap and may span multiple cells. Rotations are 0/90/180/270. No rendering or rules/LOS logic lives here.

**Simplification (agreed):** A board is always created **with** its segment and token libraries *embedded* in the state. Downstream APIs no longer pass libraries around.

---

### 2. Core Types

```ts
export type Rotation = 0 | 90 | 180 | 270;
export type CellType = number; // e.g., 0=wall, 1=corridor (library-defined)

export interface Coord { x: number; y: number; }
export type Id = string;

export interface SegmentDef {
  segmentId: Id;          // stable key used in missions
  name: string;           // human-friendly label
  width: number;
  height: number;
  grid: CellType[][];     // rectangular [row][col]
  legend?: Record<string, CellType>; // provenance only
  metadata?: Record<string, unknown>; // opaque
}

export interface SegmentInstance {
  instanceId: Id; // unique within board
  segmentId: Id;  // must exist in state.segmentDefs
  origin: Coord;  // top-left before rotation
  rot: Rotation;  // clockwise
}

export interface Token {
  tokenId: Id;
  type: string;  // must exist in tokenTypes if strict mode
  rot: Rotation;
  cells: Coord[]; // non-empty footprint
  attrs?: Record<string, unknown>;
}

export interface TokenTypeDef { type: string; notes?: string }

export interface BoardState {
  size: number;                       // board is size x size
  segments: SegmentInstance[];
  tokens: Token[];
  segmentDefs: SegmentDef[];          // embedded segment library
  tokenTypes: TokenTypeDef[];         // embedded token library
  tokenTypeStrict: boolean;           // default false
}
```

Invariants: segments do not overlap; token footprints within bounds; rotations ∈ {0,90,180,270}.

---

### 3. Libraries & File Formats

#### 3.1 Segment Library (text)

```
legend: 0=wall, 1=corridor
segment <segmentId> <width>x<height> [name="<display name>"]
<row of integers separated by spaces>
...
endsegment
```

- Default legend if omitted: `0=wall, 1=corridor`.
- All integers used must be defined in legend.

**Example**

```
legend: 0=wall, 1=corridor
segment L_room_5x5 5x5 name="L Room 5x5"
0 0 1 0 0
0 1 1 1 0
1 1 1 1 0
0 1 1 1 0
0 0 0 0 0
endsegment
```

#### 3.2 Token Type Library (text)

```
version: 1
type=door       notes="standard door token"
type=marine     notes="armored miniature"
type=blip
```

- Board State treats types as identifiers; extra keys are ignored.

#### 3.3 Mission (board state) text

```
mission: <missionName>
board: <size>x<size>
segments: <path-to-segment-library>   # provenance only
tokenlib: <path-to-token-library>     # provenance only

instances:
  <instanceId>: <segmentId> pos=(x,y) rot=<0|90|180|270>

tokens:
  <tokenId>: type=<typeName> orient=<0|90|180|270> cells=(x1,y1),(x2,y2),... [attrs=<json>]
```

- Import uses the **embedded** libraries in the current `BoardState` instance for validation.
- Export includes the provenance paths as comments/fields if available.

Savegame format remains JSON mirroring `BoardState`.

---

### 4. Public API (simplified)

```ts
// Construction (libraries are required and embedded)
export function newBoard(size: number, segmentLibraryText: string, tokenLibraryText: string): BoardState;

// Library management (optional)
export function replaceSegmentLibrary(state: BoardState, segmentLibraryText: string): void; // re-validate segments
export function replaceTokenLibrary(state: BoardState, tokenLibraryText: string): void;     // re-validate tokens
export function setTokenTypeStrict(state: BoardState, strict: boolean): void;               // default false

// Segments
export function addSegment(state: BoardState, seg: SegmentInstance): void;
export function updateSegment(state: BoardState, id: Id, patch: Partial<SegmentInstance>): void;
export function removeSegment(state: BoardState, id: Id): void;

// Tokens
export function addToken(state: BoardState, tok: Token): void;
export function updateToken(state: BoardState, id: Id, patch: Partial<Token>): void;
export function removeToken(state: BoardState, id: Id): void;

// Queries
export function getCellType(state: BoardState, coord: Coord): CellType | -1;
export function getCellsInSameSegment(state: BoardState, coord: Coord): Coord[];
export function getTokensAt(state: BoardState, coord: Coord): Token[];
export function findById(state: BoardState, id: Id): SegmentInstance | Token | undefined;
export function getBoardDimensions(state: BoardState): { width: number; height: number };
export function getSegmentInstances(state: BoardState): SegmentInstance[];
export function getTokens(state: BoardState): Token[];

// Mission I/O (uses embedded libraries for validation)
export function importMission(state: BoardState, text: string): void;  // mutates state (clears & loads)
export function exportMission(state: BoardState): string;

// Save I/O
export function importSave(json: unknown): BoardState; // returns fresh state
export function exportSave(state: BoardState): unknown;
```

**Validation notes**

- `newBoard` parses both libraries; failure returns/throws with detailed diagnostics.
- `replaceSegmentLibrary` and `replaceTokenLibrary` re-validate current content:
  - segment library: ensure every `segmentId` in `segments[]` still exists; otherwise error or prune (configurable; default error).
  - token library (strict mode only): ensure every token `type` exists.

---

### 5. Algorithms & Indices

- Maintain two indices for O(1) queries:
  1. `cell → {instanceId, cellType}`
  2. `cell → tokenId[]`
- Rebuild/patch indices on mutations and when replacing libraries.
- Overlap check: when adding/updating a segment, compute rotated coverage and test occupancy map.

Rotation mapping for local (r,c) with dims (h,w):

```
0°   : (r,c) → (r,c)
90°  : (r,c) → (c, h-1-r)
180° : (r,c) → (h-1-r, w-1-c)
270° : (r,c) → (w-1-c, r)
```

---

### 6. Inter-Module Boundaries

- **Renderer (read-only):** uses `getBoardDimensions`, `getCellType`, `getTokensAt`, `getSegmentInstances`, `getTokens`.
- **Rules (read/write):** uses all query APIs and segment/token mutation APIs. No LOS/pathfinding helpers provided.

---

### 7. Unit Tests (updates to reflect embedded libraries)

- **Construction**
  - `newBoard` with valid libraries → success, libs embedded.
  - `newBoard` with invalid segment library → parse error with line/column.
  - `newBoard` with empty token lib → still OK (no types) unless strict mode set later.
- **Segment library replace**
  - Replace with a library missing an in-use `segmentId` → error and state unchanged.
- **Token library replace**
  - In strict mode, replacing lib that drops an in-use `type` → error; in non-strict, allow.
- **Placement & rotation** (unchanged)
  - Non-overlap enforced; rotations correct.
- **Queries** (unchanged)
  - `getCellType`, `getCellsInSameSegment`, `getTokensAt` behave as specified.
- **Mission I/O**
  - `importMission(state, text)` uses embedded libs; round-trip export/import stable.
- **Save I/O**
  - JSON round-trip preserves IDs and attrs.

---

### 8. Design Notes

- Embedding libraries in `BoardState` simplifies API calls and reduces risk of passing mismatched definitions.
- Library replacement APIs exist for editor workflows; they are conservative and validate current content.
- Mission files keep library *paths* only for provenance; the Board State relies on its embedded libraries for validation.
- All formats remain line-oriented and diff-friendly; Board State is rendering-agnostic and rules-agnostic.

