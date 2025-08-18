import type {
  BoardState,
  BoardStateAPI,
  EditorState,
  GhostKind,
} from '../types.js';

function nextRot(rot: 0 | 90 | 180 | 270, dir: 1 | -1): 0 | 90 | 180 | 270 {
  const r = (rot + dir * 90 + 360) % 360;
  return r as 0 | 90 | 180 | 270;
}

function rotateLocal(
  local: { x: number; y: number },
  rot: 0 | 90 | 180 | 270,
  def: { width: number; height: number },
): { x: number; y: number } {
  const { width, height } = def;
  const { x, y } = local;
  switch (rot) {
    case 0:
      return { x, y };
    case 90:
      return { x: height - 1 - y, y: x };
    case 180:
      return { x: width - 1 - x, y: height - 1 - y };
    case 270:
      return { x: y, y: width - 1 - x };
  }
}

function segmentContains(
  cell: { x: number; y: number },
  inst: { origin: { x: number; y: number }; rot: 0 | 90 | 180 | 270; type: string },
  def: { width: number; height: number },
): boolean {
  for (let y = 0; y < def.height; y++) {
    for (let x = 0; x < def.width; x++) {
      const r = rotateLocal({ x, y }, inst.rot, def);
      if (inst.origin.x + r.x === cell.x && inst.origin.y + r.y === cell.y) {
        return true;
      }
    }
  }
  return false;
}

export class EditorCore {
  private _ui: EditorState = { selected: null, ghost: null, cell: null };
  private missionName: string;

  constructor(private api: BoardStateAPI, private state: BoardState) {
    this.missionName = state.missionName || 'Unnamed Mission';
    this.state.missionName = this.missionName;
  }

  get ui(): Readonly<EditorState> {
    return JSON.parse(JSON.stringify(this._ui));
  }

  getState(): BoardState {
    return this.state;
  }

  getMissionName(): string {
    return this.missionName;
  }

  private setMissionName(name: string) {
    this.missionName = name;
    this.state.missionName = name;
  }

  selectSegment(segmentId: string): void {
    this._ui.selected = null;
    this._ui.cell = null;
    this._ui.ghost = {
      kind: 'segment',
      id: segmentId,
      rot: 0,
      cell: null,
    };
  }

  selectToken(tokenType: string): void {
    this._ui.selected = null;
    this._ui.cell = null;
    this._ui.ghost = {
      kind: 'token',
      id: tokenType,
      rot: 0,
      cell: null,
    };
  }

  selectCell(cell: { x: number; y: number }): void {
    this._ui.ghost = null;
    this._ui.selected = null;
    this._ui.cell = cell;
  }

  clearSelection(): void {
    this._ui.selected = null;
    this._ui.ghost = null;
    this._ui.cell = null;
  }

  setGhostCell(cell: { x: number; y: number } | null): void {
    if (this._ui.ghost) this._ui.ghost.cell = cell;
  }

  rotateGhost(dir: 1 | -1): void {
    if (this._ui.ghost) {
      this._ui.ghost.rot = nextRot(this._ui.ghost.rot, dir);
    }
  }

  rotate(dir: 1 | -1): void {
    if (this._ui.ghost) {
      this.rotateGhost(dir);
      return;
    }
    const sel = this._ui.selected;
    if (!sel) return;
    const inst = this.api.findById(this.state, sel.id) as any;
    if (!inst) return;
    if (sel.kind === 'segment') {
      const def = this.state.segmentDefs.find((d) => d.segmentId === inst.type);
      if (!def || def.width === undefined || def.height === undefined) return;
      const orig = { ...inst };
      inst.rot = nextRot(inst.rot, dir);
      this.api.removeSegment(this.state, inst.instanceId);
      try {
        this.api.addSegment(this.state, inst);
      } catch {
        this.api.addSegment(this.state, orig);
      }
    } else {
      inst.rot = nextRot(inst.rot, dir);
    }
  }

  placeGhost(): { ok: true } | { ok: false; error: string } {
    const g = this._ui.ghost;
    if (!g || !g.cell) return { ok: false, error: 'no-ghost' };
    try {
      if (g.kind === 'segment') {
        const id = `seg-${Date.now()}`;
        this.api.addSegment(this.state, {
          instanceId: id,
          type: g.id,
          origin: g.cell,
          rot: g.rot,
        });
        this._ui.selected = { kind: 'segment', id };
      } else if (g.kind === 'token') {
        const id = `tok-${Date.now()}`;
        this.api.addToken(this.state, {
          instanceId: id,
          type: g.id,
          rot: g.rot,
          cells: [g.cell],
        });
        this._ui.selected = { kind: 'token', id };
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: String(e.message || e) };
    }
  }

  deleteItem(kind: 'segment' | 'token', id: string): void {
    if (kind === 'segment') this.api.removeSegment(this.state, id);
    else this.api.removeToken(this.state, id);
    if (this._ui.selected && this._ui.selected.id === id) this._ui.selected = null;
  }

  deleteSelection(): void {
    const sel = this._ui.selected;
    if (!sel) return;
    this.deleteItem(sel.kind, sel.id);
    this._ui.selected = null;
  }

  selectExisting(kind: 'segment' | 'token', id: string): void {
    this._ui.selected = { kind, id };
  }

  getSelectionContents(): {
    segment: any | null;
    tokens: any[];
  } {
    const cell = this._ui.cell;
    if (!cell) return { segment: null, tokens: [] };
    let segment: any = null;
    for (const s of this.state.segments) {
      const def = this.state.segmentDefs.find((d) => d.segmentId === s.type);
      if (!def || def.width === undefined || def.height === undefined) continue;
      if (segmentContains(cell, s, def as { width: number; height: number })) {
        segment = s;
        break;
      }
    }
    const tokens = this.state.tokens.filter((t: any) =>
      t.cells.some((c: any) => c.x === cell.x && c.y === cell.y),
    );
    return { segment, tokens };
  }

  newMission(name: string, size: number, segLibText: string, tokenLibText: string): void {
    this.state = this.api.newBoard(size, segLibText, tokenLibText);
    this.setMissionName(name || 'Unnamed Mission');
    this.clearSelection();
  }

  loadMission(text: string): void {
    const m = text.match(/^mission:\s*(.+)$/m);
    this.setMissionName(m ? m[1].trim() : 'Unnamed Mission');
    this.api.importBoardText(this.state, text);
    this.clearSelection();
  }

  saveMission(name = this.missionName): string {
    this.setMissionName(name);
    return this.api.exportBoardText(this.state, this.missionName);
  }
}
