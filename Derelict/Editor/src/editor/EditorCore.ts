import type { BoardState, BoardStateAPI, EditorState, GhostKind } from '../types.js';

function nextRot(rot: 0 | 90 | 180 | 270, dir: 1 | -1): 0 | 90 | 180 | 270 {
  const r = (rot + dir * 90 + 360) % 360;
  return r as 0 | 90 | 180 | 270;
}

export class EditorCore {
  private _ui: EditorState = { selected: null, ghost: null };
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
    this._ui.ghost = {
      kind: 'segment',
      id: segmentId,
      rot: 0,
      cell: null,
    };
  }

  selectToken(tokenType: string): void {
    this._ui.selected = null;
    this._ui.ghost = {
      kind: 'token',
      id: tokenType,
      rot: 0,
      cell: null,
    };
  }

  clearSelection(): void {
    this._ui.selected = null;
    this._ui.ghost = null;
  }

  setGhostCell(cell: { x: number; y: number } | null): void {
    if (this._ui.ghost) this._ui.ghost.cell = cell;
  }

  rotateGhost(dir: 1 | -1): void {
    if (this._ui.ghost) {
      this._ui.ghost.rot = nextRot(this._ui.ghost.rot, dir);
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

  deleteSelection(): void {
    const sel = this._ui.selected;
    if (!sel) return;
    if (sel.kind === 'segment') this.api.removeSegment(this.state, sel.id);
    else this.api.removeToken(this.state, sel.id);
    this.clearSelection();
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
