import { Game } from "./index.js";
import { parseSegmentDefs } from "./segments.js";

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

function downloadText(name: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name.endsWith(".mission.txt") ? name : name + ".mission.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
  const topBar = document.createElement("div");
  topBar.id = "top-bar";
  topBar.textContent = "Derelict Game";
  app.appendChild(topBar);

  const btnBar = document.createElement("div");
  btnBar.id = "buttons";
  app.appendChild(btnBar);

  const newBtn = document.createElement("button");
  newBtn.textContent = "New Game";
  btnBar.appendChild(newBtn);

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save Game";
  btnBar.appendChild(saveBtn);

  const editorBtn = document.createElement("button");
  editorBtn.textContent = "Editor";
  btnBar.appendChild(editorBtn);

  const main = document.createElement("div");
  main.id = "main";
  app.appendChild(main);

  const play = document.createElement("div");
  play.id = "play-area";
  main.appendChild(play);

  const wrap = document.createElement("div");
  wrap.id = "viewport-wrap";
  play.appendChild(wrap);

  const canvas = document.createElement("canvas");
  canvas.id = "viewport";
  canvas.width = 2560;
  canvas.height = 2560;
  wrap.appendChild(canvas);

  const logArea = document.createElement("div");
  logArea.id = "log";
  play.appendChild(logArea);

  const side = document.createElement("div");
  side.id = "side-bar";
  main.appendChild(side);

  const actionButtons = document.createElement("div");
  actionButtons.id = "action-buttons";
  side.appendChild(actionButtons);

  const btnMove = document.createElement("button");
  btnMove.textContent = "(M)ove";
  actionButtons.appendChild(btnMove);

  const btnTurnLeft = document.createElement("button");
  btnTurnLeft.textContent = "Turn (L)eft";
  actionButtons.appendChild(btnTurnLeft);

  const btnTurnRight = document.createElement("button");
  btnTurnRight.textContent = "Turn (R)ight";
  actionButtons.appendChild(btnTurnRight);

  const btnManipulate = document.createElement("button");
  btnManipulate.textContent = "Manipulat(e)";
  actionButtons.appendChild(btnManipulate);

  const btnAssault = document.createElement("button");
  btnAssault.textContent = "(A)ssault";
  actionButtons.appendChild(btnAssault);

  const btnShoot = document.createElement("button");
  btnShoot.textContent = "(S)hoot";
  actionButtons.appendChild(btnShoot);

  const btnActivate = document.createElement("button");
  btnActivate.textContent = "Activate Ally (N)";
  actionButtons.appendChild(btnActivate);

  const btnReveal = document.createElement("button");
  btnReveal.textContent = "(V)reveal";
  actionButtons.appendChild(btnReveal);

  const btnDeploy = document.createElement("button");
  btnDeploy.textContent = "(D)eploy";
  actionButtons.appendChild(btnDeploy);

  const btnGuard = document.createElement("button");
  btnGuard.textContent = "(G)uard";
  actionButtons.appendChild(btnGuard);
  const btnPass = document.createElement("button");
  btnPass.textContent = "(P)ass";
  actionButtons.appendChild(btnPass);

  const status = document.createElement("div");
  status.id = "status-region";
  const statusTurn = document.createElement("div");
  const statusPlayer = document.createElement("div");
  const statusAP = document.createElement("div");
  status.appendChild(statusTurn);
  status.appendChild(statusPlayer);
  status.appendChild(statusAP);
  side.appendChild(status);

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

  const [segLib, tokLib, manifestText] = await Promise.all([
    fetch("assets/segments.txt").then((r) => r.text()),
    fetch("assets/tokens.txt").then((r) => r.text()),
    fetch("assets/sprites.manifest.txt").then((r) => r.text()),
  ]);

  // Renderer expects embedded segment definitions on the board state so it
  // can compute multi-cell segment bounds. The BoardState API does not expose
  // these, so parse them here and attach to the state manually.
  const segmentDefs = parseSegmentDefs(segLib);
  const rendererCore = createRenderer();
  rendererCore.loadSpriteManifestFromText(manifestText);

  const viewport: any = { origin: { x: 0, y: 0 }, scale: 1, cellSize: 32 };
  let currentState: any = null;
  let currentBoard: any = null;
  let currentRules: any = null;
  let currentGame: Game | null = null;

  const appendAnsiColored = (el: HTMLElement, text: string) => {
    const regex = /\x1b\[(\d+)m/g;
    let last = 0;
    let match: RegExpExecArray | null;
    let current: string | undefined;
    while ((match = regex.exec(text))) {
      const chunk = text.slice(last, match.index);
      if (chunk) {
        const span = document.createElement("span");
        if (current) span.style.color = current;
        span.textContent = chunk;
        el.appendChild(span);
      }
      current =
        match[1] === "31"
          ? "red"
          : match[1] === "32"
          ? "green"
          : undefined;
      last = regex.lastIndex;
    }
    const tail = text.slice(last);
    if (tail) {
      const span = document.createElement("span");
      if (current) span.style.color = current;
      span.textContent = tail;
      el.appendChild(span);
    }
  };

  const logMessage = (text: string, color?: string) => {
    const line = document.createElement("div");
    if (color) line.style.color = color;
    appendAnsiColored(line, text);
    logArea.appendChild(line);
    logArea.scrollLeft = logArea.scrollWidth;
    logArea.scrollTop = logArea.scrollHeight;
  };

  const updateStatus = (info: {
    turn: number;
    activePlayer: number;
    ap?: number;
  }) => {
    statusTurn.textContent = `Turn: ${info.turn}`;
    statusPlayer.textContent =
      info.activePlayer === 1
        ? "Active Player: 1 (Marines)"
        : "Active Player: 2 (Aliens)";
    statusAP.textContent =
      typeof info.ap === "number" ? `AP remaining: ${info.ap}` : "";
  };
  function render(state: any) {
    currentState = state;
    const size = 2560;
    canvas.width = size;
    canvas.height = size;
    rendererCore.resize(size, size);
    viewport.dpr = window.devicePixelRatio || 1;
    const base = size / state.size;
    viewport.cellSize = Math.min(base, 64);
    rendererCore.render(ctx, state, viewport);
  }

  const imageCache = new Map<string, HTMLImageElement>();
  rendererCore.setAssetResolver((key: string) => {
    let img = imageCache.get(key);
    if (!img) {
      img = new Image();
      img.src = key;
      img.addEventListener("load", () => {
        if (currentState) render(currentState);
      });
      imageCache.set(key, img);
    }
    return img;
  });

  window.addEventListener("resize", () => {
    if (currentState) render(currentState);
  });

  const renderer = { render };

  async function startGameFromText(text: string, twoPlayer: boolean) {
    currentGame?.dispose();
    logArea.textContent = "";
    const board: any = BoardState.newBoard(40, segLib, tokLib);
    // ensure renderer knows dimensions for each segment
    board.segmentDefs = segmentDefs;
    const mission = BoardState.importBoardText(board, text);
    currentBoard = board;
    const initTurn =
      typeof mission.rules?.turn === "number" ? mission.rules.turn : 1;
    const initPlayer =
      typeof mission.rules?.activeplayer === "number"
        ? mission.rules.activeplayer
        : 1;
    const rules = new Rules.BasicRules(
      board,
      () => renderer.render(board),
      updateStatus,
      { turn: initTurn, activePlayer: initPlayer },
      logMessage,
    );
    currentRules = rules;
    updateStatus(rules.getState());
    let game!: Game;
    const p1 = new Players.HumanPlayer({
      choose: (options: any) => game.choose(options),
      messageBox: (msg: string) => game.messageBox(msg),
      log: (msg: string, color?: string) => game.log(msg, color),
    });
    const p2 = twoPlayer
      ? new Players.HumanPlayer({
          choose: (options: any) => game.choose(options),
          messageBox: (msg: string) => game.messageBox(msg),
          log: (msg: string, color?: string) => game.log(msg, color),
        })
      : new Players.RandomAI();
    game = new Game(board, renderer, rules, p1, p2, {
      container: wrap,
      cellToRect: (coord: any) => rendererCore.boardToScreen(coord, viewport),
      buttons: {
        activate: btnActivate,
        move: btnMove,
        assault: btnAssault,
        shoot: btnShoot,
        turnLeft: btnTurnLeft,
        turnRight: btnTurnRight,
        manipulate: btnManipulate,
        reveal: btnReveal,
        deploy: btnDeploy,
        guard: btnGuard,
        pass: btnPass,
      },
    }, logMessage);
    currentGame = game;
    try {
      await game.start();
    } catch (e) {
      await new Promise<void>((resolve) => {
        const body = createEl("div");
        body.textContent = String(e);
        let ref: { close(): void };
        ref = showModal("Error", body, [
          {
            label: "OK",
            onClick: () => {
              ref.close();
              resolve();
            },
          },
        ]);
      });
    }
    await newGameDialog();
  }

  async function newGameDialog() {
    const missions = await fetchMissionList();
    const params = new URLSearchParams(window.location.search);
    let selected =
      params.get("mission") && missions.includes(params.get("mission")!)
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
    r1.checked = false;
    singleLabel.appendChild(r1);
    singleLabel.appendChild(document.createTextNode("Single Player"));
    const twoLabel = createEl("label");
    const r2 = createEl("input");
    r2.type = "radio";
    r2.name = "mode";
    r2.value = "two";
    r2.checked = true;
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

  newBtn.addEventListener("click", () => {
    const body = createEl("div");
    body.textContent = "Start a new game?";
    let ref: { close(): void };
    ref = showModal("Confirm", body, [
      {
        label: "OK",
        onClick: () => {
          ref.close();
          currentGame?.dispose();
          currentGame = null;
          currentState = null;
          currentBoard = null;
          currentRules = null;
          newGameDialog();
        },
      },
      { label: "Cancel", onClick: () => ref.close() },
    ]);
  });

  saveBtn.addEventListener("click", () => {
    if (!currentBoard) return;
    const rulesState = currentRules?.getState();
    const text = BoardState.exportBoardText(currentBoard, "savegame", {
      rules: rulesState
        ? { turn: rulesState.turn, activeplayer: rulesState.activePlayer }
        : undefined,
    });
    downloadText("savegame.mission.txt", text);
  });

  editorBtn.addEventListener("click", () => {
    const body = createEl("div");
    body.textContent = "Leave to editor? Unsaved progress will be lost.";
    let ref: { close(): void };
    ref = showModal("Confirm", body, [
      {
        label: "OK",
        onClick: () => {
          ref.close();
          window.location.href = "index.html";
        },
      },
      { label: "Cancel", onClick: () => ref.close() },
    ]);
  });

  await newGameDialog();
}

init();
