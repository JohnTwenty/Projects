import layout from './layout.html.js';
import { EditorCore } from './EditorCore.js';
import { qs, createEl, showModal } from '../util/dom.js';
import { pixelToCell, clampCell } from '../util/geometry.js';
import { registerShortcuts } from './Shortcuts.js';
import type { Renderer, BoardState } from '../types.js';

export class EditorUI {
  private viewport: HTMLCanvasElement;
  private overlay: HTMLCanvasElement;
  private segPalette: HTMLElement;
  private segItems: Map<string, HTMLElement> = new Map();

  constructor(
    private container: HTMLElement,
    private core: EditorCore,
    private renderer: Renderer,
  ) {
    container.innerHTML = layout;
    this.viewport = qs<HTMLCanvasElement>(container, '#viewport');
    this.overlay = qs<HTMLCanvasElement>(container, '#overlay');
    this.segPalette = qs<HTMLElement>(container, '#segment-palette');
    this.populatePalettes();
    this.wireEvents();
  }

  private populatePalettes() {
    const state = this.core.getState();
    for (const seg of state.segmentDefs) {
      const li = createEl('li');
      li.textContent = seg.name || seg.segmentId;
      li.dataset['seg'] = seg.segmentId;
      li.addEventListener('click', () => {
        this.core.selectSegment(seg.segmentId);
        this.setPaletteSelection(seg.segmentId);
        this.drawGhost();
      });
      this.segPalette.appendChild(li);
      this.segItems.set(seg.segmentId, li);
    }
  }

  private wireEvents() {
    this.viewport.addEventListener('mousemove', (ev) => {
      const rect = this.viewport.getBoundingClientRect();
      const state = this.core.getState();
      const cellSize = this.getCellSize(state);
      const cell = pixelToCell(
        { x: ev.clientX - rect.left, y: ev.clientY - rect.top },
        cellSize,
      );
      const clamped = clampCell(cell, state.size);
      this.core.setGhostCell(clamped);
      this.drawGhost();
    });
    this.viewport.addEventListener('click', () => {
      const res = this.core.placeGhost();
      if (res.ok) {
        this.setPaletteSelection(null);
        this.render();
      }
    });

    const loadBtn = qs<HTMLButtonElement>(this.container, '#btn-load');
    loadBtn.addEventListener('click', () => {
      this.openLoadDialog();
    });

    const saveBtn = qs<HTMLButtonElement>(this.container, '#btn-save');
    saveBtn.addEventListener('click', () => {
      this.openSaveDialog();
    });

    const rotL = qs<HTMLButtonElement>(this.container, '#rot-left');
    rotL.addEventListener('click', () => {
      this.core.rotateGhost(-1);
      this.drawGhost();
    });
    const rotR = qs<HTMLButtonElement>(this.container, '#rot-right');
    rotR.addEventListener('click', () => {
      this.core.rotateGhost(1);
      this.drawGhost();
    });

    registerShortcuts(document, {
      rotate: (d) => {
        this.core.rotateGhost(d);
        this.drawGhost();
      },
      unselect: () => {
        this.core.clearSelection();
        this.setPaletteSelection(null);
        this.drawGhost();
      },
      delete: () => {
        this.core.deleteSelection();
        this.render();
      },
      save: () => {
        this.openSaveDialog();
      },
    });
  }

  private async openLoadDialog() {
    const files = await this.fetchMissionList();
    const list = createEl('ul');
    let modalRef: { close(): void };
    for (const f of files) {
      const li = createEl('li');
      li.textContent = f.replace(/\.txt$/i, '');
      li.addEventListener('click', async () => {
        const text = await fetch(`missions/${f}`).then((r) => r.text());
        this.core.loadMission(text);
        this.setPaletteSelection(null);
        this.render();
        modalRef.close();
      });
      list.appendChild(li);
    }
    modalRef = showModal('Select Mission to Load', list, [
      { label: 'Cancel', onClick: () => modalRef.close() },
    ]);
  }

  private async openSaveDialog() {
    const input = createEl('input');
    input.type = 'text';
    input.value = this.core.getMissionName();
    const body = createEl('div');
    body.appendChild(input);
    let modalRef: { close(): void };
    modalRef = showModal('Save Mission', body, [
      {
        label: 'OK',
        onClick: async () => {
          const name = input.value.trim() || 'Unnamed Mission';
          const saved = await this.performSave(name);
          if (saved) modalRef.close();
        },
      },
      { label: 'Cancel', onClick: () => modalRef.close() },
    ]);
    input.focus();
  }

  private async performSave(name: string): Promise<boolean> {
    const fileName = name.replace(/\s+/g, '-') + '.txt';
    const url = `missions/${encodeURIComponent(fileName)}`;
    let exists = false;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      exists = res.ok;
    } catch {
      exists = false;
    }
    if (exists) {
      const proceed = await new Promise<boolean>((resolve) => {
        const body = createEl('div');
        body.textContent = `${fileName} exists. Overwrite?`;
        let ref: { close(): void };
        ref = showModal('Confirm Overwrite', body, [
          { label: 'OK', onClick: () => { ref.close(); resolve(true); } },
          { label: 'Cancel', onClick: () => { ref.close(); resolve(false); } },
        ]);
      });
      if (!proceed) return false;
    }
    const text = this.core.saveMission(name);
    await fetch(url, { method: 'PUT', body: text });
    return true;
  }

  private async fetchMissionList(): Promise<string[]> {
    const res = await fetch('missions/');
    const text = await res.text();
    const matches = [...text.matchAll(/href="([^"/]+\.txt)"/g)];
    return matches.map((m) => m[1]);
  }

  setPaletteSelection(segId: string | null) {
    for (const [id, el] of this.segItems) {
      if (id === segId) el.classList.add('selected');
      else el.classList.remove('selected');
    }
  }

  drawGhost() {
    const ctx = this.overlay.getContext('2d');
    if (!ctx) return;
    const state = this.core.getState();
    const cellSize = this.getCellSize(state);
    this.renderer.drawGhost(ctx, this.core.ui.ghost || null, state, {
      origin: { x: 0, y: 0 },
      scale: 1,
      cellSize,
    });
  }

  render() {
    const ctx = this.viewport.getContext('2d');
    if (ctx) {
      const state = this.core.getState();
      const cellSize = this.getCellSize(state);
      this.renderer.render(ctx, state, {
        origin: { x: 0, y: 0 },
        scale: 1,
        cellSize,
      });
    }
    this.drawGhost();
  }

  private getCellSize(state: BoardState): number {
    const base = Math.min(this.viewport.width, this.viewport.height) / state.size;
    return Math.min(base, 64);
  }
}
