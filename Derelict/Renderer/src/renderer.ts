import { loadSpriteManifestFromText } from './manifest.js';
import { boardToScreen, isCellVisible } from './math.js';
import { defaultAssetResolver, type AssetResolver } from './assets.js';
import type {
  Renderer,
  SpriteManifest,
  Viewport,
  RenderOptions,
  BoardState,
} from './types.js';

export function createRenderer(): Renderer {
  let manifest: SpriteManifest = { entries: [] };
  let resolver: AssetResolver = defaultAssetResolver;
  let canvasPx = { w: 0, h: 0 };

  function setSpriteManifest(m: SpriteManifest) {
    manifest = m;
  }

  function loadSpriteManifestFromTextLocal(text: string) {
    manifest = loadSpriteManifestFromText(text);
  }

  function setAssetResolver(r: AssetResolver) {
    resolver = r;
  }

  function resize(widthPx: number, heightPx: number) {
    canvasPx = { w: widthPx, h: heightPx };
  }

  function render(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    state: BoardState,
    viewport: Viewport,
    options?: RenderOptions
  ): void {
    const dpr = viewport.dpr || 1;
    const canvas = ctx.canvas as HTMLCanvasElement | OffscreenCanvas;
    if (canvas) {
      if (canvas.width !== canvasPx.w * dpr) canvas.width = canvasPx.w * dpr;
      if (canvas.height !== canvasPx.h * dpr) canvas.height = canvasPx.h * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    if (options?.clear !== false) {
      if (options?.background !== undefined) {
        if (options.background !== null) {
          ctx.fillStyle = options.background;
          ctx.fillRect(0, 0, canvasPx.w, canvasPx.h);
        } else {
          ctx.clearRect(0, 0, canvasPx.w, canvasPx.h);
        }
      } else {
        ctx.clearRect(0, 0, canvasPx.w, canvasPx.h);
      }
    }

    const entryMap = new Map<string, typeof manifest.entries[number]>();
    for (const e of manifest.entries) entryMap.set(e.key, e);

    const drawCalls: { layer: number; fn: () => void }[] = [];

    // Terrain drawing omitted unless getCellType available.
    const getCellType = (state as any).getCellType as
      | ((cell: { x: number; y: number }) => number)
      | undefined;
    if (getCellType) {
      for (let y = 0; y < state.size; y++) {
        for (let x = 0; x < state.size; x++) {
          const type = getCellType({ x, y });
          if (type < 0) continue;
          const sprite = entryMap.get(String(type));
          if (!sprite) continue;
          const cell = { x, y };
          if (!isCellVisible(cell, viewport, canvasPx)) continue;
          const rect = boardToScreen(cell, viewport);
          const image = resolver(sprite.file);
          const draw = () => {
            ctx.save();
            ctx.translate(rect.x, rect.y);
            const img = image;
            if (img) {
              const sw = sprite.w || (img as any).width || rect.width;
              const sh = sprite.h || (img as any).height || rect.height;
              ctx.drawImage(
                img as any,
                sprite.x,
                sprite.y,
                sw,
                sh,
                0,
                0,
                rect.width,
                rect.height
              );
            } else {
              ctx.fillStyle = 'magenta';
              ctx.fillRect(0, 0, rect.width, rect.height);
            }
            ctx.restore();
          };
          drawCalls.push({ layer: sprite.layer, fn: draw });
        }
      }
    }

    for (const token of state.tokens) {
      const sprite = entryMap.get(token.type);
      for (const cell of token.cells) {
        if (!isCellVisible(cell, viewport, canvasPx)) continue;
        const rect = boardToScreen(cell, viewport);
        const image = sprite ? resolver(sprite.file) : undefined;
        const draw = () => {
          ctx.save();
          ctx.translate(rect.x + rect.width / 2, rect.y + rect.height / 2);
          if (image && sprite) {
            const sw = sprite.w || (image as any).width || rect.width;
            const sh = sprite.h || (image as any).height || rect.height;
            const scaleX = rect.width / sw;
            const scaleY = rect.height / sh;
            ctx.translate((sprite.xoff || 0) * scaleX, (sprite.yoff || 0) * scaleY);
            if (token.rot) {
              ctx.rotate((token.rot * Math.PI) / 180);
            }
            ctx.drawImage(
              image as any,
              sprite.x,
              sprite.y,
              sw,
              sh,
              -rect.width / 2,
              -rect.height / 2,
              rect.width,
              rect.height
            );
          } else {
            if (token.rot) {
              ctx.rotate((token.rot * Math.PI) / 180);
            }
            ctx.fillStyle = 'magenta';
            ctx.fillRect(-rect.width / 2, -rect.height / 2, rect.width, rect.height);
          }
          ctx.restore();
        };
        drawCalls.push({ layer: sprite?.layer ?? 0, fn: draw });
      }
    }

    drawCalls.sort((a, b) => a.layer - b.layer);
    for (const d of drawCalls) d.fn();

    ctx.restore();
  }

  return {
    setSpriteManifest,
    loadSpriteManifestFromText: loadSpriteManifestFromTextLocal,
    setAssetResolver,
    resize,
    render,
    boardToScreen,
    isCellVisible,
  };
}
