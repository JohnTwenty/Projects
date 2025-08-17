import { loadSpriteManifestFromText } from './manifest.js';
import { boardToScreen, isCellVisible } from './math.js';
import { defaultAssetResolver, type AssetResolver } from './assets.js';
import type {
  Renderer,
  SpriteManifest,
  Viewport,
  RenderOptions,
  BoardState,
  Ghost,
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

  function drawGhost(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    ghost: Ghost | null,
    state: BoardState,
    vp: Viewport,
  ) {
    const canvas = ctx.canvas as HTMLCanvasElement | OffscreenCanvas | undefined;
    const w = canvas?.width ?? 0;
    const h = canvas?.height ?? 0;
    ctx.clearRect(0, 0, w, h);
    if (!ghost || !ghost.cell) return;
    const ts = vp.cellSize * vp.scale;
    ctx.save();
    ctx.globalAlpha = 0.5;
    if (ghost.kind === 'segment') {
      const def = state.segmentDefs?.find((s) => s.segmentId === ghost.id);
      const width = def?.grid?.[0]?.length ?? def?.width ?? 1;
      const height = def?.grid?.length ?? def?.height ?? 1;
      const rotate = (
        local: { x: number; y: number },
        rot: 0 | 90 | 180 | 270,
      ) => {
        const x = local.x;
        const y = local.y;
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
      };
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const rc = rotate({ x, y }, ghost.rot);
          const gx = (ghost.cell.x + rc.x - vp.origin.x) * ts;
          const gy = (ghost.cell.y + rc.y - vp.origin.y) * ts;
          ctx.fillStyle = 'rgba(0,0,255,0.5)';
          ctx.fillRect(gx, gy, ts, ts);
        }
      }
      ctx.restore();
      return;
    }
    const gx = (ghost.cell.x - vp.origin.x) * ts;
    const gy = (ghost.cell.y - vp.origin.y) * ts;
    ctx.fillStyle = 'rgba(0,0,255,0.5)';
    ctx.fillRect(gx, gy, ts, ts);
    ctx.restore();
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

    const terrainCalls: { layer: number; fn: () => void }[] = [];
    const tokenCalls: { layer: number; fn: () => void }[] = [];

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
          terrainCalls.push({ layer: sprite.layer, fn: draw });
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
        tokenCalls.push({ layer: sprite?.layer ?? 0, fn: draw });
      }
    }

    terrainCalls.sort((a, b) => a.layer - b.layer);
    for (const d of terrainCalls) d.fn();

    if (options?.showSegmentBounds) {
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'gray';
      for (const seg of state.segments) {
        const segId = (seg as any).segmentId ?? (seg as any).type;
        const def = state.segmentDefs?.find((s) => s.segmentId === segId);
        const width = def?.grid?.[0]?.length ?? def?.width ?? 1;
        const height = def?.grid?.length ?? def?.height ?? 1;
        let w = width;
        let h = height;
        if (seg.rot === 90 || seg.rot === 270) {
          [w, h] = [h, w];
        }
        const rect = boardToScreen(seg.origin, viewport);
        const px = rect.x;
        const py = rect.y;
        const pw = rect.width * w;
        const ph = rect.height * h;
        if (px + pw <= 0 || py + ph <= 0 || px >= canvasPx.w || py >= canvasPx.h)
          continue;
        ctx.strokeRect(px, py, pw, ph);
      }
      ctx.restore();
    }

    tokenCalls.sort((a, b) => a.layer - b.layer);
    for (const d of tokenCalls) d.fn();

    ctx.restore();
  }

  return {
    setSpriteManifest,
    loadSpriteManifestFromText: loadSpriteManifestFromTextLocal,
    setAssetResolver,
    resize,
    render,
    drawGhost,
    boardToScreen,
    isCellVisible,
  };
}
