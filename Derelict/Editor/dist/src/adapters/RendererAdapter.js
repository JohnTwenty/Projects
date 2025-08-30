export class RendererAdapter {
    constructor(renderer) {
        this.renderer = renderer;
    }
    loadManifest(text) {
        this.renderer.loadSpriteManifestFromText(text);
    }
    render(ctx, state) {
        this.renderer.render(ctx, state, { x: 0, y: 0 });
    }
}
