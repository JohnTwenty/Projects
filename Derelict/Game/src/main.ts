import { Game } from "./index.js";

async function init() {
  const app = document.getElementById("app");
  if (!app) return;

  const canvas = document.createElement("canvas");
  app.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const [{ createRenderer }, BoardState, Rules, Players] = await Promise.all([
    import(
      new URL("../../../Renderer/dist/src/renderer.js", import.meta.url).href
    ),
    import(
      new URL("../../../BoardState/dist/api/public.js", import.meta.url).href
    ),
    import(new URL("../../../Rules/dist/src/index.js", import.meta.url).href),
    import(new URL("../../../Players/dist/src/index.js", import.meta.url).href),
  ]);

  const rendererCore = createRenderer();
  rendererCore.setAssetResolver((key: string) => {
    const img = new Image();
    img.src = key;
    return img;
  });

  const [segLib, tokLib, manifestText] = await Promise.all([
    fetch("assets/segments.txt").then((r) => r.text()),
    fetch("assets/tokens.txt").then((r) => r.text()),
    fetch("assets/sprites.manifest.txt").then((r) => r.text()),
  ]);
  rendererCore.loadSpriteManifestFromText(manifestText);

  const board = BoardState.newBoard(40, segLib, tokLib);
  BoardState.addToken(board, {
    tokenId: "m1",
    type: "marine",
    rot: 0,
    cells: [{ x: 1, y: 1 }],
  });

  const viewport: any = { origin: { x: 0, y: 0 }, scale: 1, cellSize: 32 };
  function render(state: any) {
    const rect = canvas.getBoundingClientRect();
    rendererCore.resize(rect.width, rect.height);
    viewport.dpr = window.devicePixelRatio || 1;
    rendererCore.render(ctx, state, viewport);
  }

  const renderer = { render };
  const rules = new Rules.BasicRules(board);
  const p1 = new Players.RandomAI();
  const p2 = new Players.RandomAI();
  const game = new Game(board, renderer, rules, p1, p2);
  await game.start();
}

init();
