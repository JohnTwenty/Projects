import { Game } from "./index.js";

function createEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}

function showModal(
  title: string,
  body: HTMLElement,
  actions: { label: string; onClick: () => void }[],
) {
  const overlay = createEl("div", "modal-overlay");
  const dlg = createEl("div", "modal");
  const heading = createEl("h2");
  heading.textContent = title;
  dlg.appendChild(heading);
  dlg.appendChild(body);
  const btnRow = createEl("div", "actions");
  for (const act of actions) {
    const btn = createEl("button");
    btn.textContent = act.label;
    btn.addEventListener("click", () => act.onClick());
    btnRow.appendChild(btn);
  }
  dlg.appendChild(btnRow);
  overlay.appendChild(dlg);
  document.body.appendChild(overlay);
  return {
    close() {
      document.body.removeChild(overlay);
    },
  };
}

function readFileAsText(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(f);
  });
}

async function fetchMissionList(): Promise<string[]> {
  const res = await fetch("missions/");
  const text = await res.text();
  const matches = [...text.matchAll(/href="([^"/]+\.txt)"/g)];
  return matches.map((m) => m[1]);
}

async function init() {
  const app = document.getElementById("app");
  if (!app) return;
  const main = document.createElement("div");
  main.id = "main";
  app.appendChild(main);

  const wrap = document.createElement("div");
  wrap.id = "viewport-wrap";
  main.appendChild(wrap);

  const canvas = document.createElement("canvas");
  canvas.id = "viewport";
  wrap.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const [{ createRenderer }, BoardState, Rules, Players] = await Promise.all([
    import(
      new URL("../../../Renderer/dist/src/renderer.js", import.meta.url).href,
    ),
    import(
      new URL("../../../BoardState/dist/api/public.js", import.meta.url).href,
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

  const spriteInfo: Record<string, { file: string; xoff: number; yoff: number }> = {};
  for (const line of manifestText.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const parts = t.split(/\s+/);
    if (parts.length < 9) continue;
    const [key, file, , , , , , xoff, yoff] = parts;
    spriteInfo[key] = {
      file,
      xoff: parseInt(xoff, 10) || 0,
      yoff: parseInt(yoff, 10) || 0,
    };
  }

  const viewport: any = { origin: { x: 0, y: 0 }, scale: 1, cellSize: 32 };
  function render(state: any) {
    const rect = canvas.getBoundingClientRect();
    rendererCore.resize(rect.width, rect.height);
    viewport.dpr = window.devicePixelRatio || 1;
    rendererCore.render(ctx, state, viewport);
  }

  const renderer = { render };

  async function startGameFromText(text: string, twoPlayer: boolean) {
    const board = BoardState.newBoard(40, segLib, tokLib);
    BoardState.importBoardText(board, text);
    const rules = new Rules.BasicRules(board);
    let game!: Game;
    const p1 = new Players.HumanPlayer({
      choose: (options: any) => game.choose(options),
      messageBox: (msg: string) => game.messageBox(msg),
    });
    const p2 = twoPlayer
      ? new Players.HumanPlayer({
          choose: (options: any) => game.choose(options),
          messageBox: (msg: string) => game.messageBox(msg),
        })
      : new Players.RandomAI();
    game = new Game(board, renderer, rules, p1, p2, {
      container: wrap,
      cellToRect: (coord: any) => rendererCore.boardToScreen(coord, viewport),
      sprites: spriteInfo,
    });
    try {
      await game.start();
    } catch (e) {
      await new Promise<void>((resolve) => {
        const body = createEl("div");
        body.textContent = String(e);
        let ref: { close(): void };
        ref = showModal("Error", body, [
          { label: "OK", onClick: () => { ref.close(); resolve(); } },
        ]);
      });
    }
    await newGameDialog();
  }

  async function newGameDialog() {
    const missions = await fetchMissionList();
    const params = new URLSearchParams(window.location.search);
    let selected = params.get("mission") && missions.includes(params.get("mission")!)
      ? params.get("mission")!
      : missions[0] || "";
    let droppedText: string | null = null;

    const body = createEl("div");

    const drop = createEl("div");
    drop.textContent = "Drag and Drop a savegame file here to load it!";
    drop.style.border = "2px dashed #888";
    drop.style.padding = "8px";
    drop.style.marginBottom = "8px";

    const list = createEl("ul");

    drop.addEventListener("dragover", (ev) => {
      ev.preventDefault();
      drop.style.background = "#eef";
    });
    drop.addEventListener("dragleave", () => {
      drop.style.background = "";
    });
    drop.addEventListener("drop", async (ev) => {
      ev.preventDefault();
      drop.style.background = "";
      const file = ev.dataTransfer?.files[0];
      if (file) {
        droppedText = await readFileAsText(file);
        drop.textContent = file.name;
        list.style.opacity = "0.5";
        list.style.pointerEvents = "none";
      }
    });

    const items: HTMLElement[] = [];
    const updateSel = () => {
      for (const li of items) li.classList.remove("selected");
      const idx = missions.indexOf(selected);
      if (idx >= 0) items[idx].classList.add("selected");
    };
    missions.forEach((m) => {
      const li = createEl("li");
      li.textContent = m.replace(/\.mission\.txt$/i, "").replace(/\.txt$/i, "");
      li.addEventListener("click", () => {
        if (list.style.pointerEvents === "none") return;
        selected = m;
        updateSel();
      });
      items.push(li);
      list.appendChild(li);
    });
    updateSel();

    const modeDiv = createEl("div");
    const singleLabel = createEl("label");
    const r1 = createEl("input");
    r1.type = "radio";
    r1.name = "mode";
    r1.value = "single";
    r1.checked = true;
    singleLabel.appendChild(r1);
    singleLabel.appendChild(document.createTextNode("Single Player"));
    const twoLabel = createEl("label");
    const r2 = createEl("input");
    r2.type = "radio";
    r2.name = "mode";
    r2.value = "two";
    twoLabel.appendChild(r2);
    twoLabel.appendChild(document.createTextNode("Two Player"));
    modeDiv.appendChild(singleLabel);
    modeDiv.appendChild(document.createElement("br"));
    modeDiv.appendChild(twoLabel);

    const rulesSel = createEl("select");
    const opt = createEl("option");
    opt.value = "basic";
    opt.textContent = "Derelict";
    rulesSel.appendChild(opt);

    body.appendChild(drop);
    body.appendChild(list);
    body.appendChild(modeDiv);
    body.appendChild(rulesSel);

    let ref: { close(): void };
    ref = showModal("New Game", body, [
      {
        label: "OK",
        onClick: async () => {
          ref.close();
          let text: string;
          if (droppedText) {
            text = droppedText;
          } else {
            text = await fetch(`missions/${selected}`).then((r) => r.text());
          }
          await startGameFromText(text, r2.checked);
        },
      },
    ]);
  }

  await newGameDialog();
}

init();
