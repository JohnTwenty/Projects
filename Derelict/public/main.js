import * as BoardState from '../BoardState/dist/api/public.js';
import { createRenderer } from '../Renderer/dist/src/renderer.js';
import { createEditor } from '../Editor/dist/src/index.js';

async function init() {
  const app = document.getElementById('app');
  if (!app) return;

  const [segLib, tokLib, spriteManifest] = await Promise.all([
    fetch('assets/segments.txt').then((r) => r.text()),
    fetch('assets/tokens.txt').then((r) => r.text()),
    fetch('assets/sprites.manifest.txt').then((r) => r.text()),
  ]);

  const renderer = createRenderer();
  renderer.loadSpriteManifestFromText(spriteManifest);

  const state = BoardState.newBoard(40, segLib, tokLib);
  const { core, ui } = createEditor(app, renderer, BoardState, state);

  const tokenPalette = document.getElementById('token-palette');
  if (tokenPalette) {
    for (const t of state.tokenTypes) {
      const btn = document.createElement('button');
      btn.textContent = t.type;
      btn.addEventListener('click', () => core.selectToken(t.type));
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
