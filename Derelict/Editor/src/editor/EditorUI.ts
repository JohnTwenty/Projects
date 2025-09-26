import layout from './layout.html.js';
import { EditorCore } from './EditorCore.js';
import { qs, createEl, showModal } from '../util/dom.js';
import { pixelToCell, clampCell } from '../util/geometry.js';
import { registerShortcuts } from './Shortcuts.js';
import { downloadText, readFileAsText } from '../util/files.js';
import type { Renderer, BoardState } from '../types.js';

export class EditorUI {
  private viewport: HTMLCanvasElement;
  private overlay: HTMLCanvasElement;
  private segPalette: HTMLElement;
  private segItems: Map<string, HTMLElement> = new Map();
  private selectionList: HTMLElement;

  constructor(
    private container: HTMLElement,
    private core: EditorCore,
    private renderer: Renderer,
  ) {
    container.innerHTML = layout;
    this.viewport = qs<HTMLCanvasElement>(container, '#viewport');
    this.overlay = qs<HTMLCanvasElement>(container, '#overlay');
    this.segPalette = qs<HTMLElement>(container, '#segment-palette');
     this.selectionList = qs<HTMLElement>(container, '#selection-list');
    this.populatePalettes();
    this.wireEvents();
    this.updateSelectionBar();
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
        this.updateSelectionBar();
      });
      this.segPalette.appendChild(li);
      this.segItems.set(seg.segmentId, li);
    }
  }

  private wireEvents() {
    this.viewport.addEventListener('mousemove', (ev) => {
      if (!this.core.ui.ghost) return;
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
    this.viewport.addEventListener('click', (ev) => {
      const rect = this.viewport.getBoundingClientRect();
      const state = this.core.getState();
      const cellSize = this.getCellSize(state);
      const cell = pixelToCell(
        { x: ev.clientX - rect.left, y: ev.clientY - rect.top },
        cellSize,
      );
      const clamped = clampCell(cell, state.size);
      if (this.core.ui.ghost) {
        this.core.setGhostCell(clamped);
        const res = this.core.placeGhost();
        if (res.ok) {
          this.render();
          this.updateSelectionBar();
        }
      } else {
        this.core.selectCell(clamped);
        this.updateSelectionBar();
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

    const newBtn = qs<HTMLButtonElement>(this.container, '#btn-new');
    newBtn.addEventListener('click', () => {
      const body = createEl('div');
      body.textContent = 'Start a new mission?';
      let ref: { close(): void };
      ref = showModal('Confirm New', body, [
        {
          label: 'OK',
          onClick: () => {
            this.core.clearBoard();
            this.setPaletteSelection(null);
            this.render();
            this.updateSelectionBar();
            this.drawGhost();
            ref.close();
          },
        },
        { label: 'Cancel', onClick: () => ref.close() },
      ]);
    });

    const rotL = qs<HTMLButtonElement>(this.container, '#rot-left');
    rotL.addEventListener('click', () => {
      this.core.rotate(-1);
      this.render();
      this.updateSelectionBar();
    });
    const rotR = qs<HTMLButtonElement>(this.container, '#rot-right');
    rotR.addEventListener('click', () => {
      this.core.rotate(1);
      this.render();
      this.updateSelectionBar();
    });

    registerShortcuts(document, {
      rotate: (d) => {
        this.core.rotate(d);
        this.render();
        this.updateSelectionBar();
      },
      unselect: () => {
        this.core.clearSelection();
        this.setPaletteSelection(null);
        this.updateSelectionBar();
        this.drawGhost();
      },
      delete: () => {
        this.core.deleteSelection();
        this.render();
        this.updateSelectionBar();
      },
      save: () => {
        this.openSaveDialog();
      },
    });

    this.container.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      this.container.classList.add('drag-over');
      this.container.style.outline = '2px dashed #66f';
    });
    this.container.addEventListener('dragleave', () => {
      this.container.classList.remove('drag-over');
      this.container.style.outline = '';
    });
    this.container.addEventListener('drop', (ev) => {
      ev.preventDefault();
      this.container.classList.remove('drag-over');
      this.container.style.outline = '';
      const file = ev.dataTransfer?.files[0];
      if (file && file.name.endsWith('.mission.txt')) {
        const body = createEl('div');
        body.textContent = `Load ${file.name}?`;
        let ref: { close(): void };
        ref = showModal('Load Mission', body, [
          {
            label: 'OK',
            onClick: async () => {
              const text = await readFileAsText(file);
              this.core.loadMission(text);
              this.setPaletteSelection(null);
              this.render();
              this.updateSelectionBar();
              ref.close();
            },
          },
          { label: 'Cancel', onClick: () => ref.close() },
        ]);
      }
    });
  }

  private async openLoadDialog() {
    const server = await this.fetchMissionList();
    const local = this.getLocalMissionNames();
    const list = createEl('ul');
    let modalRef: { close(): void };

    const addItem = (label: string, loader: () => void | Promise<void>) => {
      const li = createEl('li');
      li.textContent = label.replace(/\.mission\.txt$/i, '').replace(/\.txt$/i, '');
      li.addEventListener('click', async () => {
        await loader();
        this.setPaletteSelection(null);
        this.render();
        this.updateSelectionBar();
        modalRef.close();
      });
      list.appendChild(li);
    };

    for (const f of server) {
      addItem(f, async () => {
        const text = await fetch(`missions/${f}`).then((r) => r.text());
        this.core.loadMission(text);
      });
    }

    if (local.length) {
      const sep = createEl('li', 'section');
      sep.textContent = 'Local Missions';
      list.appendChild(sep);
      for (const f of local) {
        addItem(f, () => {
          const text = localStorage.getItem('mission:' + f) || '';
          this.core.loadMission(text);
        });
      }
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
    const base = name.replace(/\s+/g, '-');
    const fileName = base.endsWith('.mission.txt') ? base : base + '.mission.txt';
    const key = 'mission:' + fileName;
    if (typeof localStorage !== 'undefined' && localStorage.getItem(key)) {
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
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, text);
      } catch {
        /* ignore */
      }
    }
    downloadText(fileName, text);
    return true;
  }

  private async fetchMissionList(): Promise<string[]> {
    const res = await fetch('missions/');
    const text = await res.text();
    const matches = [...text.matchAll(/href="([^"/]+\.txt)"/g)];
    return matches.map((m) => m[1]);
  }

  private getLocalMissionNames(): string[] {
    if (typeof localStorage === 'undefined') return [];
    const names: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('mission:')) names.push(k.slice(8));
    }
    return names;
  }

  setPaletteSelection(segId: string | null) {
    for (const [id, el] of this.segItems) {
      if (id === segId) el.classList.add('selected');
      else el.classList.remove('selected');
    }
  }

  private refreshSelectionHighlight() {
    const sel = this.core.ui.selected;
    const items = Array.from(this.selectionList.querySelectorAll('li'));
    for (const li of items) {
      if (
        sel &&
        li.dataset['id'] === sel.id &&
        li.dataset['kind'] === sel.kind
      )
        li.classList.add('selected');
      else li.classList.remove('selected');
    }
  }

  updateSelectionBar() {
    this.selectionList.innerHTML = '';
    const ui = this.core.ui;
    if (ui.ghost) {
      const li = createEl('li');
      li.textContent = ui.ghost.id + ' ';
      const del = createEl('span', 'del');
      del.textContent = 'X';
      del.addEventListener('click', () => {
        this.core.clearSelection();
        this.setPaletteSelection(null);
        this.updateSelectionBar();
        this.drawGhost();
      });
      li.appendChild(del);
      this.selectionList.appendChild(li);
      return;
    }
    const contents = this.core.getSelectionContents();
    if (contents.segment) {
      const def = this.core
        .getState()
        .segmentDefs.find((d) => d.segmentId === contents.segment.type);
      const name = def?.name || contents.segment.type;
      const li = this.makeSelectionItem(
        'segment',
        contents.segment.instanceId,
        name,
      );
      this.selectionList.appendChild(li);
    }
    for (const t of contents.tokens) {
      const li = this.makeSelectionItem('token', t.instanceId, t.type);
      this.selectionList.appendChild(li);
    }
    this.refreshSelectionHighlight();
  }

  private makeSelectionItem(
    kind: 'segment' | 'token',
    id: string,
    label: string,
  ): HTMLElement {
    const li = createEl('li');
    li.textContent = label;
    li.dataset['kind'] = kind;
    li.dataset['id'] = id;
    const del = createEl('span', 'del');
    del.textContent = 'X';
    del.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.core.deleteItem(kind, id);
      this.updateSelectionBar();
      this.render();
    });
    li.textContent += ' ';
    li.appendChild(del);
    if (kind === 'token') {
      li.addEventListener('click', () => {
        this.core.selectExisting('token', id);
        this.refreshSelectionHighlight();
      });
    } else {
      li.classList.add('no-select');
    }
    return li;
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
