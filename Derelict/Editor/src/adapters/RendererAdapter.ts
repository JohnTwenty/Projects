import type { Renderer, BoardState } from '../types.js';

export class RendererAdapter {
  constructor(private renderer: Renderer) {}

  loadManifest(text: string) {
    this.renderer.loadSpriteManifestFromText(text);
  }

  render(ctx: CanvasRenderingContext2D, state: BoardState) {
    this.renderer.render(ctx, state, { x: 0, y: 0 });
  }
}
