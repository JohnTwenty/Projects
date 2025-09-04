# BoardState — Combined Specification (SRS+SDD) v2.0

## 1. Purpose & Scope

Single, authoritative specification for the **BoardState** module: data model, file formats, and APIs. BoardState models a square-grid board with **non-overlapping segments** (terrain) and **tokens** (pieces/markers). It is rendering‑ and rules‑agnostic.

This document consolidates previous SRS/SDD, removes the separate JSON savegame format, and standardizes the **single text format** for both authored missions and saved states.

---

## 2. Core Concepts & Invariants

* **Board:** square grid with integer coordinates `(x,y)`, `0 ≤ x,y < size`.
* **Segment:** rectangular template (from a Segment Library) placed at an origin with one of four rotations. Segments **must not overlap**; each cell is covered by **at most one** segment.
* **Token:** a piece/marker on a **single cell** with a rotation; tokens may overlap and do not affect segment occupancy. (Multi‑cell tokens may be added later.)
* **Rotation:** `0 | 90 | 180 | 270` (clockwise). Segment rotation changes which template cell covers which board cell; token rotation is purely metadata for render/rules.

---

## 3. Data Model (TypeScript types)

```ts
export type Rotation = 0 | 90 | 180 | 270;
export type CellType = number; // e.g., 0=wall, 1=corridor (library-defined)
export interface Coord { x: number; y: number; }
export type Id = string;

export interface SegmentDef {
  segmentId: Id;              // stable key used by missions
  name: string;               // human-friendly
  width: number;              // in cells
  height: number;             // in cells
  grid: CellType[][];         // [row][col], rectangular
  legend?: Record<string, CellType>; // provenance only
  metadata?: Record<string, unknown>; // opaque
}

export interface SegmentInstance {
  instanceId: Id;             // unique within board
  segmentId: Id;              // must exist in state.segmentDefs
  origin: Coord;              // top-left before rotation
  rot: Rotation;              // 0/90/180/270
}

export interface Token {
  tokenId: Id;
  type: string;               // must exist in tokenTypes
  pos: Coord;                 // single cell position
  rot: Rotation;
  attrs?: Record<string, unknown>;
}

export interface TokenTypeDef { type: string; notes?: string; }

export interface BoardState {
  size: number;               // board is size x size
  segments: SegmentInstance[];
  tokens: Token[];
  segmentDefs: SegmentDef[];  // embedded segment library
  tokenTypes: TokenTypeDef[]; // embedded token library
}
```

**Invariants**

* Segment coverage never overlaps.
* All `origin` and `pos` are within bounds.
* Rotations are in `{0,90,180,270}`.

---

## 4. Libraries (Text Formats)

Both formats are **line‑oriented**, hand‑editable; `#` starts a comment; blank lines are ignored.

### 4.1 Segment Library (numeric grid)

**Grammar (EBNF)**

```
File        := Legend? SegmentBlock+
Legend      := 'legend:' WS LegendEntry (',' WS LegendEntry)* NEWLINE
LegendEntry := Int '=' Label

SegmentBlock:= 'segment' WS SegmentId WS Size [WS 'name="' Text '"'] NEWLINE
               Row{height} 'endsegment' NEWLINE?
Row         := Int (WS Int){width-1} NEWLINE
Size        := Int 'x' Int
SegmentId   := [A-Za-z0-9_\-]+
Int         := -?[0-9]+
Label       := [^,\n]+
Text        := [^"]*
WS          := ' '+
NEWLINE     := '\n'
```

**Semantics**

* Grid integers are authoritative cell types (legend is documentation/provenance only).
* All rows must have `width` integers; number of rows equals `height`.

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

### 4.2 Token Library (flat list)

**Grammar (EBNF)**

```
File     := ('version:' WS Int NEWLINE)? Line*
Line     := ( 'type=' TypeId (WS 'notes="' Text '"')? )? (COMMENT|NEWLINE)
TypeId   := [A-Za-z0-9_\-]+
Text     := [^"]*
COMMENT  := '#' [^\n]* NEWLINE
WS       := ' '+
Int      := -?[0-9]+
```

**Semantics**

* `type` identifiers must be unique; last‑write‑wins on duplicates.
* No rendering info here; visuals live in the Renderer’s sprite manifest.

**Example**

```
version: 1
type=door        notes="standard door token"
type=marine      notes="armored miniature"
type=blip
type=objective   notes="mission objective"
```

---

## 5. Unified Board Text Format (Mission or Save)

A single, line‑oriented text format for both authored missions and mid‑game snapshots.

**Header**

```
mission: <Name>
profile: mission | save     # default: mission
version: 1
board: <size>
segments: <path-to-segment-library>
tokenlib: <path-to-token-library>
```

**Bodies**

```
instances:
  <instanceId>: <segmentId> pos=(x,y) rot=<0|90|180|270>

tokens:
  <tokenId>: <typeName> pos=(x,y) rot=<0|90|180|270> [attrs=<json>]

rules:
  <key>: <value>
```

**Notes**

* `board:` uses a **single integer** (square board).
* `profile:` lets tools distinguish authored vs saved; BoardState treats both identically.
* `attrs=<json>` is a single‑line JSON object; unknown keys are preserved on round‑trip.
* Token positions are **single‑cell**; multi‑cell tokens are a future extension.
* `rules:` is optional and holds key/value pairs (numbers, booleans, strings) for game rules state such as turn counters.

**Example**

```
mission: Cleanse the Corridor
profile: mission
version: 1
board: 40
segments: assets/lib_segments.txt
tokenlib: assets/lib_tokens.txt

instances:
  S1: L_room_5x5 pos=(10,10) rot=0
  S2: corridor_5 pos=(14,10) rot=90
  S3: endcap     pos=(14,15) rot=180

tokens:
  D1: door   pos=(13,12) rot=90
  M1: marine pos=(11,12) rot=180 attrs={"owner":"red","name":"Sergeant"}

rules:
  turn: 3
  activeplayer: 1
```

---

## 6. APIs (embedded libraries model)

Libraries are **embedded** in the BoardState; callers do not pass them repeatedly.

```ts
// Construction
export function newBoard(size: number, segmentLibraryText: string, tokenLibraryText: string): BoardState;

// Segments
export function addSegment(state: BoardState, seg: SegmentInstance): void;                  // validates non-overlap & bounds
export function removeSegment(state: BoardState, id: Id): void;

// Tokens (single-cell)
export function addToken(state: BoardState, tok: Token): void;                              // bounds only
export function removeToken(state: BoardState, id: Id): void;

// Queries
export function getCellType(state: BoardState, coord: Coord): CellType | -1;
export function getCellsInSameSegment(state: BoardState, coord: Coord): Coord[];            // [] if none
export function getTokensAt(state: BoardState, coord: Coord): Token[];                      // possibly empty
export function findById(state: BoardState, id: Id): SegmentInstance | Token | undefined;
export function getBoardDimensions(state: BoardState): { width: number; height: number };

// Text I/O (single canonical format)
export function importBoardText(state: BoardState, text: string): void;  // clears & loads using embedded libs
export function exportBoardText(state: BoardState, missionName: string): string; // deterministic ordering; filename from missionName (spaces→dashes)
```

**Validation**

* Segment placement rejects overlaps (report conflict cell) and out‑of‑bounds.
* Token placement checks bounds; unknown token types error; overlap allowed.

---

## 7. Algorithms & Mappings

**Rotation mapping** (local `(r,c)` within `h×w` grid → rotated index):

```
0°   : (r,c) → (r,c)
90°  : (r,c) → (c, h-1-r)
180° : (r,c) → (h-1-r, w-1-c)
270° : (r,c) → (w-1-c, r)
```

**Overlap check**

* Maintain occupancy index for segments. When placing/updating, iterate the rotated template’s footprint, test/set occupancy; fail on first conflict.

**Indices**

* `cell → {instanceId, cellType}` for O(1) `getCellType`.
* `cell → tokenId[]` for O(1) `getTokensAt`.

---

## 8. Determinism & Performance

* Deterministic export ordering: segments by `instanceId` ascending, then tokens by `tokenId` ascending (or insertion order; choose and document; tests enforce).
* Ops target ≤ 50ms for boards up to ≈10k cells.

---

## 9. Unit Tests (must‑have)

**Libraries**

1. Segment library parses; ragged rows → error; unknown integers allowed (renderer decides visuals).
2. Token library parses; duplicate `type` last‑write‑wins.

**Placement & Rotation**
3\. Non‑overlapping placement succeeds.
4\. Overlap is rejected with conflict coordinate.
5\. Rotation mapping correct for 0/90/180/270.

**Queries**
6\. `getCellType` returns `-1` for uncovered; correct value when covered.
7\. `getCellsInSameSegment` returns all and only the owner’s cells.
8\. `getTokensAt` returns all tokens at a cell in stable order.

**Text I/O (single format)**
9\. Import → Export → Import round‑trip preserves IDs, coords, rotations, attrs.
10\. `board: size` honored; out‑of‑bounds rejected.
11\. `profile: mission|save` round‑trips with default `mission`.

**Performance**
12\. 50 segment placements + 100 token ops under time budget.
13\. 10k mixed queries remain fast.

---

## 10. Non‑Normative Notes

* IDs are caller‑assigned and preserved; BoardState does not auto‑rename.
* BoardState remains agnostic to LOS/pathfinding/game rules.
