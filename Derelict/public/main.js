import * as BoardState from '../BoardState/dist/api/public.js';
import { createRenderer } from '../Renderer/dist/src/renderer.js';
import { createEditor } from '../Editor/dist/src/index.js';

async function init() {
  const app = document.getElementById('app');
  if (!app) return;

  const [segLib, tokLib, spriteManifestText] = await Promise.all([
    fetch('assets/segments.txt').then((r) => r.text()),
    fetch('assets/tokens.txt').then((r) => r.text()),
    fetch('assets/sprites.manifest.txt').then((r) => r.text()),
  ]);

  const renderer = createRenderer();
  renderer.loadSpriteManifestFromText(spriteManifestText);

  // Build a simple lookup of sprite file paths for token types
  const spriteMap = new Map();
  for (const line of spriteManifestText.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2 && !line.startsWith('#')) {
      spriteMap.set(parts[0], parts[1]);
    }
  }

  // Extract segment definitions for editor palettes and ghost rendering
  const segmentDefs = [];
  const segLines = segLib.split(/\r?\n/);
  for (let i = 0; i < segLines.length; i++) {
    const line = segLines[i];
    const m = line.match(/^segment\s+(\S+)\s+(\d+)x(\d+)/);
    if (m) {
      const id = m[1];
      const w = parseInt(m[2], 10);
      const h = parseInt(m[3], 10);
      const grid = [];
      for (let r = 0; r < h; r++) {
        const row = segLines[++i];
        grid.push(row.trim().split(/\s+/).map(Number));
      }
      // skip endsegment line
      i++;
      segmentDefs.push({ segmentId: id, width: w, height: h, grid });
    }
  }
  const tokenTypes = tokLib
    .split(/\r?\n/)
    .filter((l) => l.startsWith('type='))
    .map((l) => l.split('=')[1]);

  const state = BoardState.newBoard(40, segLib, tokLib);
  // Augment state for Editor expectations
  state.segmentDefs = segmentDefs;
  state.tokenTypes = tokenTypes.map((t) => ({ type: t }));

  const { core, ui } = createEditor(app, renderer, BoardState, state);

  const imageCache = new Map();
  renderer.setAssetResolver((key) => {
    let img = imageCache.get(key);
    if (!img) {
      img = document.createElement('img');
      img.src = key;
      img.addEventListener('load', () => ui.render());
      imageCache.set(key, img);
    }
    return img;
  });

  const tokenPalette = document.getElementById('token-palette');
  if (tokenPalette) {
    for (const t of state.tokenTypes) {
      const btn = document.createElement('button');
      const img = document.createElement('img');
      const file = spriteMap.get(t.type);
      if (file) img.src = file;
      const label = document.createElement('div');
      label.textContent = t.type;
      btn.appendChild(img);
      btn.appendChild(label);
      btn.addEventListener('click', () => {
        core.selectToken(t.type);
        ui.setPaletteSelection(null);
      });
      tokenPalette.appendChild(btn);
    }
  }

  function resize() {
    const vp = document.getElementById('viewport');
    const overlay = document.getElementById('overlay');
    if (!vp || !overlay) return;
    const rect = vp.getBoundingClientRect();
    vp.width = overlay.width = rect.width;
    vp.height = overlay.height = rect.height;
    renderer.resize(rect.width, rect.height);
  }

  window.addEventListener('resize', () => {
    resize();
    ui.render();
  });

  resize();
  ui.render();
}

init();
