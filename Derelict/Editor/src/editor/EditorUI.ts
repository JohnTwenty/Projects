import layout from './layout.html.js';
import { EditorCore } from './EditorCore.js';
import { qs, createEl } from '../util/dom.js';
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
        this.core.saveMission();
      },
    });
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
