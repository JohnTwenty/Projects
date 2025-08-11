import layout from './layout.html.js';
import { EditorCore } from './EditorCore.js';
import { GhostOverlay } from './GhostOverlay.js';
import { qs, createEl } from '../util/dom.js';
import { pixelToCell, clampCell } from '../util/geometry.js';
import { registerShortcuts } from './Shortcuts.js';
import type { Renderer, BoardState } from '../types.js';

export class EditorUI {
  private viewport: HTMLCanvasElement;
  private overlay: HTMLCanvasElement;
  private overlayDrawer: GhostOverlay;
  private segPalette: HTMLElement;

  constructor(
    private container: HTMLElement,
    private core: EditorCore,
    private renderer: Renderer,
  ) {
    container.innerHTML = layout;
    this.viewport = qs<HTMLCanvasElement>(container, '#viewport');
    this.overlay = qs<HTMLCanvasElement>(container, '#overlay');
    this.segPalette = qs<HTMLElement>(container, '#segment-palette');
    this.overlayDrawer = new GhostOverlay(this.overlay);
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
        this.drawGhost();
      });
      this.segPalette.appendChild(li);
    }
  }

  private wireEvents() {
    this.viewport.addEventListener('mousemove', (ev) => {
      const rect = this.viewport.getBoundingClientRect();
      const cell = pixelToCell({ x: ev.clientX - rect.left, y: ev.clientY - rect.top });
      const clamped = clampCell(cell, this.core.getState().size);
      this.core.setGhostCell(clamped);
      this.drawGhost();
    });
    this.viewport.addEventListener('click', () => {
      const res = this.core.placeGhost();
      if (res.ok) this.render();
    });

    registerShortcuts(document, {
      rotate: (d) => {
        this.core.rotateGhost(d);
        this.drawGhost();
      },
      unselect: () => {
        this.core.clearSelection();
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

  drawGhost() {
    this.overlayDrawer.draw(this.core.ui.ghost || null);
  }

  render() {
    const ctx = this.viewport.getContext('2d');
    if (ctx) this.renderer.render(ctx, this.core.getState(), { x: 0, y: 0 });
    this.drawGhost();
  }
}
