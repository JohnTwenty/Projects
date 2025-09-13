import type { BoardState, Coord } from "derelict-boardstate";
import type { Rules } from "derelict-rules";
import type { Player, GameApi, Choice } from "derelict-players";

export interface RendererLike {
  render(state: BoardState): void;
}

export interface ChooseUI {
  container: HTMLElement;
  cellToRect: (coord: Coord) => {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  buttons: {
    activate: HTMLButtonElement;
    move: HTMLButtonElement;
    turnLeft: HTMLButtonElement;
    turnRight: HTMLButtonElement;
    manipulate: HTMLButtonElement;
    reveal: HTMLButtonElement;
    deploy: HTMLButtonElement;
    guard: HTMLButtonElement;
    pass: HTMLButtonElement;
  };
}

// Core game orchestrator providing the GameApi for human players
export class Game implements GameApi {
  private cleanup?: () => void;

  constructor(
    private board: BoardState,
    private renderer: RendererLike,
    private rules: Rules,
    private player1: Player,
    private player2: Player,
    private ui?: ChooseUI,
    private logger?: (msg: string, color?: string) => void,
  ) {}

  async start(): Promise<void> {
    this.renderer.render(this.board);
    this.rules.validate(this.board);
    await this.rules.runGame(this.player1, this.player2);
  }

  async choose(options: Choice[]): Promise<Choice> {
    if (!this.ui) return options[0];

    // Ensure any previous selection overlays or listeners are removed
    this.cleanup?.();

    return new Promise<Choice>((resolve) => {
      const { container, cellToRect, buttons } = this.ui!;

      buttons.move.textContent = "(M)ove";
      buttons.manipulate.textContent = "(E)manipulate";
      buttons.turnLeft.textContent = "Turn (L)eft";
      buttons.turnRight.textContent = "Turn (R)ight";
      buttons.turnLeft.style.color = "";
      buttons.turnRight.style.color = "";
      buttons.reveal.textContent = "(V)reveal";
      buttons.deploy.textContent = "(D)eploy";
      buttons.guard.textContent = "(G)uard";

      const overlays: {
        el: HTMLElement;
        type: "activate" | "move" | "door" | "turn" | "deploy";
      }[] = [];

      const addOverlay = (
        coord: Coord,
        color: string,
        type: "activate" | "move" | "door" | "deploy",
        onClick?: () => void,
        apCost?: number,
      ) => {
        const rect = cellToRect(coord);
        const div = document.createElement("div");
        div.style.position = "absolute";
        div.style.left = `${rect.x}px`;
        div.style.top = `${rect.y}px`;
        div.style.width = `${rect.width}px`;
        div.style.height = `${rect.height}px`;
        div.style.boxSizing = "border-box";
        div.style.border = `2px solid ${color}`;
        const zMap: Record<"activate" | "move" | "door" | "deploy", number> = {
          activate: 3,
          move: 2,
          door: 1,
          deploy: 0,
        };
        div.style.zIndex = String(zMap[type]);
        if (onClick) {
          div.style.cursor = "pointer";
          div.addEventListener("click", (e) => {
            e.stopPropagation();
            onClick();
          });
        } else {
          div.style.pointerEvents = "none";
        }
        if (type === "move" && typeof apCost === "number") {
          div.addEventListener("mouseenter", () => {
            buttons.move.textContent = `(M)ove: ${apCost} AP`;
          });
          div.addEventListener("mouseleave", () => {
            buttons.move.textContent = "(M)ove";
          });
        }
        container.appendChild(div);
        overlays.push({ el: div, type });
      };

      const addTurnHighlight = (coord: Coord) => {
        const rect = cellToRect(coord);
        const div = document.createElement("div");
        div.style.position = "absolute";
        div.style.left = `${rect.x}px`;
        div.style.top = `${rect.y}px`;
        div.style.width = `${rect.width}px`;
        div.style.height = `${rect.height}px`;
        div.style.boxSizing = "border-box";
        div.style.border = "2px solid white";
        div.style.pointerEvents = "none";
        container.appendChild(div);
        overlays.push({ el: div, type: "turn" });
      };

      for (const opt of options) {
        if (opt.type === "action" && opt.action === "move" && opt.coord) {
          addOverlay(
            opt.coord,
            "green",
            "move",
            () => {
              cleanup();
              resolve(opt);
            },
            opt.apCost,
          );
        }
        if (opt.type === "action" && opt.action === "door" && opt.coord) {
          addOverlay(opt.coord, "blue", "door", () => {
            cleanup();
            resolve(opt);
          });
        }
        if (opt.type === "action" && opt.action === "deploy" && opt.coord) {
          addOverlay(opt.coord, "green", "deploy", () => {
            cleanup();
            resolve(opt);
          });
        }
      }

      // Highlight cells that can be activated. The rules already
      // specify which coordinates are valid, so we don't need to
      // inspect the board or filter by token type here.
      for (const opt of options) {
        if (opt.type === "action" && opt.action === "activate" && opt.coord) {
          addOverlay(opt.coord, "purple", "activate", () => {
            cleanup();
            resolve(opt);
          });
        }
      }

      const doorOpt = options.find(
        (o) => o.type === "action" && o.action === "door",
      );
      if (doorOpt) {
        buttons.manipulate.textContent = `(E)manipulate: ${doorOpt.apCost ?? 0} AP`;
      }
      const leftOpt = options.find(
        (o) => o.type === "action" && o.action === "turnLeft",
      );
      if (leftOpt) {
        buttons.turnLeft.textContent = `Turn (L)eft: ${leftOpt.apCost ?? 0} AP`;
        buttons.turnLeft.style.color = leftOpt.apCost === 0 ? "green" : "";
      }
      const rightOpt = options.find(
        (o) => o.type === "action" && o.action === "turnRight",
      );
      if (rightOpt) {
        buttons.turnRight.textContent = `Turn (R)ight: ${rightOpt.apCost ?? 0} AP`;
        buttons.turnRight.style.color = rightOpt.apCost === 0 ? "green" : "";
      }

      let filter: "activate" | "move" | "door" | "deploy" | null = null;
      const setFilter = (f: "activate" | "move" | "door" | "deploy" | null) => {
        filter = f;
        for (const o of overlays) {
          o.el.style.display =
            !filter || o.type === filter || o.type === "turn"
              ? "block"
              : "none";
        }
        buttons.activate.classList.toggle("active", filter === "activate");
        buttons.move.classList.toggle("active", filter === "move");
        buttons.manipulate.classList.toggle("active", filter === "door");
        buttons.deploy.classList.toggle("active", filter === "deploy");
      };

      function onActivate() {
        if (buttons.activate.disabled) return;
        setFilter(filter === "activate" ? null : "activate");
      }
      function onMove() {
        if (buttons.move.disabled) return;
        setFilter(filter === "move" ? null : "move");
      }
      function onManipulate() {
        if (buttons.manipulate.disabled) return;
        setFilter(filter === "door" ? null : "door");
      }
      function onReveal() {
        if (buttons.reveal.disabled) return;
        const opt = options.find(
          (o) => o.type === "action" && o.action === "reveal",
        );
        if (opt) {
          cleanup();
          resolve(opt);
        }
      }
      function onDeploy() {
        if (buttons.deploy.disabled) return;
        setFilter(filter === "deploy" ? null : "deploy");
      }
      function onGuard() {
        if (buttons.guard.disabled) return;
        const opt = options.find(
          (o) => o.type === "action" && o.action === "guard",
        );
        if (opt) {
          cleanup();
          resolve(opt);
        }
      }
      function onTurnLeft() {
        if (buttons.turnLeft.disabled) return;
        const opt = options.find(
          (o) => o.type === "action" && o.action === "turnLeft",
        );
        if (opt) {
          cleanup();
          resolve(opt);
        }
      }
      function onTurnRight() {
        if (buttons.turnRight.disabled) return;
        const opt = options.find(
          (o) => o.type === "action" && o.action === "turnRight",
        );
        if (opt) {
          cleanup();
          resolve(opt);
        }
      }

      function onPass() {
        if (buttons.pass.disabled) return;
        const opt = options.find(
          (o) => o.type === "action" && o.action === "pass",
        );
        if (opt) {
          cleanup();
          resolve(opt);
        }
      }

      const turnRightOpt = options.find(
        (o) => o.type === "action" && o.action === "turnRight" && o.coord,
      );
      if (turnRightOpt && turnRightOpt.coord) {
        addTurnHighlight(turnRightOpt.coord);
      }

      const cleanup = () => {
        for (const o of overlays) o.el.remove();
        buttons.activate.removeEventListener("click", onActivate);
        buttons.move.removeEventListener("click", onMove);
        buttons.manipulate.removeEventListener("click", onManipulate);
        buttons.reveal.removeEventListener("click", onReveal);
        buttons.deploy.removeEventListener("click", onDeploy);
        buttons.guard.removeEventListener("click", onGuard);
        buttons.turnLeft.removeEventListener("click", onTurnLeft);
        buttons.turnRight.removeEventListener("click", onTurnRight);
        buttons.pass.removeEventListener("click", onPass);
        if (document.removeEventListener) {
          document.removeEventListener("keydown", onKey);
        }
        buttons.activate.classList.remove("active");
        buttons.move.classList.remove("active");
        buttons.manipulate.classList.remove("active");
        buttons.deploy.classList.remove("active");
        buttons.guard.classList.remove("active");
        buttons.move.textContent = "(M)ove";
        buttons.manipulate.textContent = "(E)manipulate";
        buttons.turnLeft.textContent = "Turn (L)eft";
        buttons.turnRight.textContent = "Turn (R)ight";
        buttons.turnLeft.style.color = "";
        buttons.turnRight.style.color = "";
        this.cleanup = undefined;
      };
      this.cleanup = cleanup;

      buttons.activate.addEventListener("click", onActivate);
      buttons.move.addEventListener("click", onMove);
      buttons.manipulate.addEventListener("click", onManipulate);
      buttons.reveal.addEventListener("click", onReveal);
      buttons.deploy.addEventListener("click", onDeploy);
      buttons.guard.addEventListener("click", onGuard);
      buttons.turnLeft.addEventListener("click", onTurnLeft);
      buttons.turnRight.addEventListener("click", onTurnRight);
      buttons.pass.addEventListener("click", onPass);

      const keyMap: Record<string, () => void> = {
        n: onActivate,
        m: onMove,
        e: onManipulate,
        v: onReveal,
        d: onDeploy,
        g: onGuard,
        l: onTurnLeft,
        r: onTurnRight,
        p: onPass,
      };
      const onKey = (e: KeyboardEvent) => {
        const fn = keyMap[e.key.toLowerCase()];
        if (fn) {
          e.preventDefault();
          fn();
        }
      };
      if (document.addEventListener) {
        document.addEventListener("keydown", onKey);
      }

      const hasActivate = options.some(
        (o) => o.type === "action" && o.action === "activate" && o.coord,
      );
      buttons.activate.disabled = !hasActivate;
      buttons.move.disabled = !options.some(
        (o) => o.type === "action" && o.action === "move",
      );
      buttons.manipulate.disabled = !options.some(
        (o) => o.type === "action" && o.action === "door",
      );
      buttons.turnLeft.disabled = !options.some(
        (o) => o.type === "action" && o.action === "turnLeft",
      );
      buttons.turnRight.disabled = !options.some(
        (o) => o.type === "action" && o.action === "turnRight",
      );
      buttons.reveal.disabled = !options.some(
        (o) => o.type === "action" && o.action === "reveal",
      );
      buttons.deploy.disabled = !options.some(
        (o) => o.type === "action" && o.action === "deploy",
      );
      buttons.guard.disabled = !options.some(
        (o) => o.type === "action" && o.action === "guard",
      );
      buttons.pass.disabled = !options.some(
        (o) => o.type === "action" && o.action === "pass",
      );
    });
  }

  // Clean up any in-progress UI interactions
  dispose(): void {
    this.cleanup?.();
  }

  log(message: string, color?: string): void {
    this.logger?.(message, color);
  }

  async messageBox(_message: string): Promise<boolean> {
    return true;
  }
}
