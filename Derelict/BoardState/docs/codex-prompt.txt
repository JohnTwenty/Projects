---
We are going to get started with a new projects in the Projects folder called Derelict.
Derelict will have several components, the first one is the **Board State** module.
Let's start developing this at the location Projects/Derelict/BoardState.


# Implement the Board State module (TypeScript)

## Objective

Implement a **Board State** module for a representing the state of grid-based board games. 

A board is made up of a grid of cells.  Segments are rectangular terrain blocks that come from a segment library and when placed on the board at 90 degree orientation increments to define the state of the cells they overlap.
Segments cannot overlap.  Tokens (defined by a token library) can represent various things may be placed into cells. Tokens can also have an orientation in 90 degree increments. No rendering logic, no rules/LOS logic.

## Language / Tooling

* TypeScript (ES2020+), Node 18+, ESM.
* Test runner: **Vitest** (preferred) or **Jest**.
* Coverage target: ≥ 90%.
* Package scripts: `build`, `test`, `lint`, `format`.

## Deliverables (project layout under Projects/Derelict/BoardState)

```
/src
  /core
    types.ts
    boardState.ts
    indices.ts
    errors.ts
  /io
    segmentLib.parse.ts
    tokenLib.parse.ts
    mission.parse.ts
    mission.serialize.ts
    save.serialize.ts
  /api
    public.ts      // re-exports clean API
  /util
    text.ts        // small helpers (trim, parse int tuples, etc.)
/tests
  segmentLib.spec.ts
  tokenLib.spec.ts
  mission.spec.ts
  placement.spec.ts
  tokens.spec.ts
  queries.spec.ts
  serialization.spec.ts
  performance.spec.ts
package.json
tsconfig.json
vitest.config.ts
README.md
```

## Core Data Model (types.ts)

```ts
export type Rotation = 0 | 90 | 180 | 270;
export type CellType = number; // 0=wall, 1=corridor

export interface Coord { x: number; y: number; }
export type Id = string;

export interface SegmentDef {
  segmentId: Id;
  width: number;
  height: number;
  grid: CellType[][]; // [row][col], rectangular
}

export interface SegmentInstance {
  instanceId: Id;
  type: string;  // must exist in Segment Library
  origin: Coord;  // upper-left in board coords before rotation application
  rot: Rotation;  // clockwise
}

export interface TokenInstance {
  instanceId: Id;
  type: string;        // must exist in Token Library
  rot: Rotation;
  cells: Coord;
  attrs?: Record<string, unknown>;
}

export interface BoardState {
  size: number; // board is size x size (square)
  segments: SegmentInstance[];
  tokens: Token[];
}

export interface TokenDef {
  type: string;
  notes?: string;
}

export interface Diagnostics {
  code: string;
  message: string;
  details?: unknown;
}
```

## Error Codes (errors.ts)

Use `Error` subclasses or tagged objects. Suggested codes:

* `ERR_BAD_GLYPH` (unknown legend glyph)
* `ERR_BAD_COORD` (coord out of bounds)
* `ERR_OVERLAP` (segment overlap)
* `ERR_PARSE` (format errors in text)
* `ERR_DUP_ID` (duplicate id)
* `ERR_UNKNOWN_SEGMENT_DEF` (instance references missing def)
* `ERR_UNKNOWN_TOKEN_TYPE`

## Invariants

* **Segments do not overlap** (each board cell belongs to ≤ 1 segment).
* Tokens may overlap in the sense that there can be more than one token in a cell; 
* All rotations in {0,90,180,270}.
* Stable IDs preserved across import/export.

## Public API (api/public.ts)

```ts
// Construction / configuration
export function newBoard(size: number, segmentLibrary: string, tokenLibrary : string): BoardState;
export function loadBoard(size: number, segmentLibrary: string, tokenLibrary : string, missionFile: string): BoardState;
export function saveBoard(state: BoardState, missionFile: string): string;


// Mutations
export function addSegment(state: BoardState, seg: SegmentInstance): void;
export function removeSegmentAtCoord(state: BoardState, coord : Coord): void;

export function addToken(state: BoardState, tok: TokenInstance): void;
export function removeToken(state: BoardState, tokenId: Id): void;

// Queries
export function getCellType(state: BoardState, coord: Coord): CellType | -1;
export function getCellsInSameSegment(state: BoardState, coord: Coord): Coord[]; // [] if none
export function getTokensAt(state: BoardState, coord: Coord): TokenInstance[];
export function getBoardDimensions(state: BoardState): { width: number; height: number };
export function getSegmentInstances(state: BoardState): SegmentInstance[];
export function getTokens(state: BoardState): TokenInstance[];


## Segment Library — Text Format (segmentLib.parse.ts)

* Line-oriented, human-editable.
* Default legend: `0=wall, 1=corridor`.
* Grammar:

```
legend: 0=wall, 1=corridor        # optional
segment <segmentId> <width>x<height>
<row of integers separated by spaces>
...
endsegment
```

* Validate: rectangular grid; all integers must be in legend; segmentId unique.

**Sample `lib_segments.txt`:**

```
legend: 0=wall, 1=corridor
segment L_room_5x5 5x5
0 0 1 0 0
0 1 1 1 0
1 1 1 1 0
0 1 1 1 0
0 0 0 0 0
endsegment

segment corridor_5 3x5
0 0 0 0 0
1 1 1 1 1
0 0 0 0 0
endsegment

segment endcap 2x2
0 0
0 1
endsegment
```

## Token Type Library — Text Format (tokenLib.parse.ts)

* Minimal registry of valid token **types**.
* No rendering info here.
* Grammar:

```
version: 1
type=<id> [notes="<text>"]
```

* Multiple lines, comments allowed with `#` at column 1.
* Later duplicate `type` overrides earlier.

**Sample `lib_tokens.txt`:**

```
version: 1
type=door notes="standard door token"
type=marine notes="boarded-armored miniature"
type=blip
type=objective notes="mission objective marker"
```

## Mission (board state) — Text Format (mission.parse.ts / mission.serialize.ts)

```
mission: <missionName>
board: <size>x<size>
segments: <path-to-segment-library>        # optional provenance (not parsed here)
tokenlib: <path-to-token-library>          # optional provenance

instances:
  <instanceId>: <segmentId> pos=(x,y) rot=<0|90|180|270>
  ...

tokens:
  <tokenId>: type=<typeName> orient=<0|90|180|270> cells=(x1,y1),(x2,y2),... [attrs=<json>]
```

* `attrs=<json>` is optional single-line JSON.
* Import validates: segment defs exist; no segment overlap; token type validity
* Export is deterministic (stable ordering).

**Sample mission:**

```
mission: Cleanse the Corridor
board: 40x40
segments: lib_segments.txt
tokenlib: lib_tokens.txt

instances:
  S1: L_room_5x5 pos=(10,10) rot=0
  S2: corridor_5  pos=(14,10) rot=90
  S3: endcap      pos=(14,15) rot=180

tokens:
  D1: type=door   orient=90  cells=(13,12)
  M1: type=marine orient=180 cells=(11,12) attrs={"owner":"red","name":"Sergeant"}
```

## Algorithms & Indices (indices.ts)

* Maintain two optional indices for O(1) queries:

  1. **cell→segment occupancy**: `Map<string, { instanceId: Id; cellType: CellType }>`
  2. **cell→token list**: `Map<string, Id[]>`
* Update indices on mutations.
* Rotation mapping (for local↔global) using standard 0/90/180/270 transforms.

## Validation rules

* Segment placement: reject any cell that would cause overlap; return conflict coords in error details.
* Token placement: ensure footprint within board bounds; otherwise OK even if overlapping other tokens.
* unknown token type → `ERR_UNKNOWN_TOKEN_TYPE`.

## Non-Functional

* Deterministic updates.
* Performance: single mutation ≤ 50 ms for boards up to \~10k walkable cells.
* Text formats are diff-friendly; JSON save preserves IDs.

## Tests (Vitest)

Create the following test suites:

**segmentLib.spec.ts**

1. Parses default legend; multiple segments OK.
2. Ragged rows → `ERR_PARSE`.
3. Unknown cell type integer (not in legend) → `ERR_BAD_GLYPH`.

**tokenLib.spec.ts**
4\. Loads types; duplicate type last-write-wins.
5\. unknown token type in mission → `ERR_UNKNOWN_TOKEN_TYPE`.

**placement.spec.ts**
7\. Place non-overlapping segments → success.
8\. Place overlapping segments → `ERR_OVERLAP` with conflict coord.
9\. Rotations 0/90/180/270 map correctly.

**tokens.spec.ts**
10\. Single-cell token appears in `getTokensAt`.
11\. Multi-cell token appears in all covered cells.
12\. Overlapping tokens coexist; `getTokensAt` returns both.
13\. Rotating a token updates `rot` only; `cells` unchanged.

**mission.spec.ts**
14\. Import mission text builds expected BoardState.
15\. Export → Import → deep-equal BoardState (IDs preserved).
16\. Deterministic export ordering.

**queries.spec.ts**
17\. `getCellType` returns `-1` for uncovered cells; correct codes for covered cells.
18\. `getCellsInSameSegment` floods only within the owning instance’s rectangle.
19\. `findById` returns the right object.

**serialization.spec.ts**
20\. Save JSON round-trip preserves IDs/attrs.
21\. Board resize errors when shrinking below existing coords.

**performance.spec.ts**
22\. 50 segment placements + 100 token ops under 1s on CI.
23\. 10k `getCellType` + `getTokensAt` lookups remain O(1) (time budgeted).

## Coding Guidelines

* Prefer pure functions; keep state in plain objects.
* No DOM APIs, no rendering logic.
* Small, composable modules; clear error messages.
* Deterministic export ordering (sort by IDs).

## Out of scope

* Line-of-sight, pathfinding, rule legality.
* Sprites/atlases or any rendering hints (those belong to the renderer).

---

### Seed files for tests (embed as fixtures)

**fixtures/lib\_segments.txt**

```
legend: 0=wall, 1=corridor
segment L_room_5x5 5x5
0 0 1 0 0
0 1 1 1 0
1 1 1 1 0
0 1 1 1 0
0 0 0 0 0
endsegment

segment corridor_5 3x5
0 0 0 0 0
1 1 1 1 1
0 0 0 0 0
endsegment

segment endcap 2x2
0 0
0 1
endsegment
```

**fixtures/lib\_tokens.txt**

```
version: 1
type=door
type=marine
type=blip
type=objective
```

**fixtures/mission.txt**

```
mission: Cleanse the Corridor
board: 40x40
segments: lib_segments.txt
tokenlib: lib_tokens.txt

instances:
  S1: L_room_5x5 pos=(10,10) rot=0
  S2: corridor_5  pos=(14,10) rot=90
  S3: endcap      pos=(14,15) rot=180

tokens:
  D1: type=door   orient=90  cells=(13,12)
  M1: type=marine orient=180 cells=(11,12) attrs={"owner":"red"}
```

---

If anything’s unclear, or you find conflicting requirements, ask before coding. Otherwise, **implement the module and all tests** per the above, and produce a `README.md` explaining how to run tests and showing a short usage snippet.
