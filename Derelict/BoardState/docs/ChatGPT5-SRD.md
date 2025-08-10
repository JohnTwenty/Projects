# Board State Module — Software Requirements Specification (SRS)

## 1. Overview
### 1.1 Purpose
Define complete, testable requirements for the **Board State** module that maintains and serializes the game’s abstract tabletop state, supports map editing workflows, and exposes a clear API for rules, GUI, and players. This SRS is implementation-agnostic and sufficient to derive a Software Design Document (SDD).

### 1.2 Scope in System
- Central source of truth for: **segments**, **cells**, **connectors**, **doors**, **pieces** (miniatures and markers), **mission metadata**.
- Consumed by: GUI (rendering), Rules Engine (legal moves & mutations), Players (queries), Tools (editor, save/load).
- Produces: serialized **mission files**, **savegame files**, **event stream** for observers, **query responses**.

### 1.3 Out of Scope
- No enforcement of Space-Hulk-specific legality (that is the Rules Engine’s job).
- No networking or persistence beyond local (e.g., browser storage / file export).
- No audio assets.
- No screen coordinate system — only abstract X-Y tabletop coordinates.

---

## 2. Stakeholders & Interfaces
### 2.1 Stakeholders
- **Game Rules Engine:** reads state, proposes/executes mutations.
- **GUI:** queries state and subscribes to state change events; forwards editor commands.
- **Player Implementations (Human/AI):** read-only queries; send commands via Rules or Editor.
- **Tools:** map editor, test harness, import/export utilities.

### 2.2 External Interfaces (Capabilities)
The module **shall** expose capabilities in three classes:
- **Mutation API** (apply validated changes): e.g., place/remove segment, add/remove doors, add/set/remove pieces.
- **Query API** (pure reads): state snapshots, lookups, spatial queries.
- **Serialization API**: load/save mission and savegame formats; import/export segment libraries.

---

## 3. Definitions
- **Segment:** A reusable tile layout defined by a glyph grid and metadata. Instances are placed/rotated on the global grid.
- **Cell:** The smallest addressable board location inside a segment.
- **Connector:** A cell-edge or special glyph indicating a possible corridor connection between segments.
- **Door:** An object at an edge between two adjacent cells; has state {open, closed}.
- **Piece:** Any object occupying or covering one or more cells — includes miniatures, tokens, and markers.
- **Mission:** A layout plus starting pieces and victory metadata.
- **Global Grid:** Integer coordinate space for all placed cells after segment rotation/translation in an abstract X-Y plane.

---

## 4. Functional Requirements (FR)
### 4.1 Lifecycle
- **BS-FR-001** The module shall initialize to an empty map state with no segments or pieces.
- **BS-FR-002** The module shall support reset/clear to the initial empty state.
- **BS-FR-003** The module shall maintain a monotonically increasing **state version** and **event sequence number**.

### 4.2 Segment Library
- **BS-FR-010** The module shall load one or more **segment libraries** from plaintext and/or JSON representations.
- **BS-FR-011** Each segment definition shall include: **segmentId**, **glyph grid**, and optional metadata (name, tags, default connectors).
- **BS-FR-012** Glyph legend shall be defined in the library and may use any intuitive symbols, but must clearly indicate at least: blocked space, walkable space, and connector points.
- **BS-FR-013** The module shall validate segment grids to be rectangular and non-empty; all glyphs must be declared in the legend.

### 4.3 Mission Layout (Segments on Map)
- **BS-FR-020** The module shall place **segment instances** on the global grid using parameters: {segmentId, instanceId, position (x,y), orientation ∈ {0,1,2,3}}.
- **BS-FR-021** The module shall support **rotate**, **translate**, and **remove** operations on segment instances by `instanceId`.
- **BS-FR-022** The module shall prevent **overlapping walkable cells** from different segments; overlapping blocked cells are allowed if they do not conflict.
- **BS-FR-023** The module shall record explicit attachments between connectors.
- **BS-FR-024** The module shall expose a validation method to check map consistency.

### 4.4 Cells & Coordinates
- **BS-FR-030** The module shall support mapping between local cell coordinates and global (x,y) after rotation/translation.
- **BS-FR-031** The module shall provide **cell lookup** by global coordinates.
- **BS-FR-032** The module shall expose **adjacency** per cell considering walls, doors, and connectors.

### 4.5 Doors
- **BS-FR-040** The module shall allow **door objects** to be added/removed between two adjacent global cells.
- **BS-FR-041** Each door shall have state: **open** or **closed**.
- **BS-FR-042** Door placement must be consistent with terrain.

### 4.6 Pieces (Unified Units/Markers)
- **BS-FR-050** The module shall support **piece** creation with attributes at minimum: `{pieceId, type, owner?, facing?, attributes?}`.
- **BS-FR-051** Each piece shall define a **footprint** as a non-empty set of global cells `{(x,y)+}`; single-cell pieces are a special case.
- **BS-FR-052** The module shall provide **add/set/remove** operations for pieces, including updating the footprint atomically.
- **BS-FR-053** The board state shall **not** enforce exclusive occupancy; multiple pieces may reference the same cell. Optional configuration may set per-type overlap constraints, but default allows overlaps (stacking) for both "miniatures" and "markers".

### 4.7 Queries
- **BS-FR-060** The module shall provide queries for segments, instances, walkability, objects at coordinates, neighbors, and attachments.
- **BS-FR-061** The module shall provide a **bounding box** of all placed walkable cells.

### 4.8 Serialization
- **BS-FR-070** The module shall export/import mission and savegame formats.
- **BS-FR-071** The module shall preserve stable **IDs** across save/load.
- **BS-FR-072** Formats shall be human-readable and diff-friendly.
- **BS-FR-073** Must support round-trip fidelity.

### 4.9 Undo/Redo & Command Log
- **BS-FR-080** The module shall support undo/redo of atomic mutations.
- **BS-FR-081** Mutations shall emit structured events with diffs.

### 4.10 Validation
- **BS-FR-090** The module shall validate inputs and reject invalid mutations.

### 4.11 Modes
- **BS-FR-100** The module shall accept mutations from Editor or Rules.
- **BS-FR-101** The module shall allow a read-only preview mode.

---

## 5. Data Models & Identifiers
- **Identifiers:** `segmentId` (library scope), `instanceId` (map scope), `pieceId`, `doorId`. IDs must be unique within their scope.
- **Coordinate System:** Global coordinates are integer `(x, y)` on an abstract tabletop plane. No screen or compass semantics. Let `x` increase to the right and `y` increase upward. Rotations are defined in degrees `{0, 90, 180, 270}` relative to this abstract frame.
- **Piece:** A generic object representing anything placed on the board (miniatures, blips, markers, objectives, area effects). A piece may:
  - have a **type** (free text), **owner/side** (optional), **attributes** (free-form key–value), and an optional **facing** (`0,90,180,270`) if consumers care.
  - occupy **one or more cells** (a **footprint**: set of global `(x,y)` cells). Overlaps between pieces are permitted unless configuration forbids it; legality is a Rules concern.
- **Object Graph:**
  - Map contains SegmentInstances
  - SegmentInstance contains transformed Cells
  - Cells may be referenced by any number of Piece footprints
  - Doors exist between two adjacent cells

---

## 6. Non-Functional Requirements (NFR)
- Deterministic state progression.
- Performance: ≤ 50 ms per mutation for maps up to 10,000 walkable cells.
- Memory efficiency within browser limits.
- Headless operation for testing.
- Stable, text-first formats for AI tooling.

---

## 7. Open Questions Resolved
- Coordinates are abstract X-Y, no concept of screen or north.
- No LOS helpers — delegated to Rules.
- Pieces cover both miniatures and markers; may span multiple cells and overlap.
- Glyphs are flexible; legend is part of each segment library and can be designed for clarity.

