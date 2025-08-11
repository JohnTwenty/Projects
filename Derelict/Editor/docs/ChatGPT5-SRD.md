# Editor Module — Software Requirements Specification (SRS)

## 1. Purpose
Provide a browser-based **mission editor** for the Derelict game, separated from the Renderer module. The Editor handles all UI, input, and state changes to `BoardState`, while delegating drawing to the Renderer.

## 2. Scope
- UI for creating, loading, editing, and saving missions.
- Palettes for selecting segments and tokens.
- Placement, rotation, and deletion tools.
- File dialogs for New, Load, Save, and Play actions.
- Uses Renderer for all visuals; uses BoardState for all state changes.

## 3. Layout & UI Structure
**Top Bar:**
- Horizontal bar with centered text: **"Derelict Game Editor"**.

**Button Bar 1 (below top bar):**
- Buttons: `New`, `Load`, `Save`, `Play`.
- Opens modal dialogs for required inputs (file pickers, mission metadata, etc.).

**Main Area:**
- **Viewport** (left): Canvas drawn by Renderer.
- **Segment Palette** (right): Vertical list of segment names from the loaded segment library (text-based initially; graphical previews planned for later versions).

**Button Bar 2 (below viewport):**
- Buttons for: Rotate Left, Rotate Right, Unselect, Place, Delete, Edit Mission Data.
- `Edit Mission Data` opens a modal with mission properties.

**Token Palette (bottom):**
- Horizontal row showing token sprites from token library, with labels.

## 4. Functional Requirements
- **R-001** Segment selection from palette.
- **R-002** Token selection from token palette.
- **R-003** Ghosting: selected segment/token follows mouse cursor until placed, displayed semi-transparently (or outlined if performance issues arise).
- **R-004** Placement: clicking a valid location places the ghosted item in BoardState.
- **R-005** Rotation: rotate ghosted item 90° via buttons or keyboard shortcuts.
- **R-006** Unselect: cancel ghosting.
- **R-007** Delete: remove selected segment/token.
- **R-008** File operations via modals (New, Load, Save, Play).
- **R-009** Renderer updates after each change to BoardState.

## 5. Non-Functional Requirements
- **N-001** Responsive layout for desktops and tablets.
- **N-002** Maintain smooth editing experience at 60 FPS.
- **N-003** Low-latency feedback from action to render.
- **N-004** Undo/redo not required for MVP.

## 6. External Interfaces
- Calls Renderer API to draw BoardState.
- Calls BoardState API for all mutations.
- Loads segment library, token library, and sprite manifest from files.

## 7. Acceptance Criteria
1. User can create, edit, and save missions.
2. Ghosting is visible until placement or unselection.
3. Rotation, unselect, and delete work for both segments and tokens.
4. Modals for New/Load/Save/Play collect required inputs and act accordingly.
5. Renderer shows changes immediately.

## 8. Notes
- Ghosting will default to semi-transparent visual style; outlined fallback will be used if performance issues occur.
- Graphical previews for the segment palette are not needed for MVP but design should anticipate them in future versions.

