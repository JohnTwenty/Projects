import type { Renderer, BoardStateAPI, BoardState } from './types.js';
import { EditorCore } from './editor/EditorCore.js';
import { EditorUI } from './editor/EditorUI.js';

export function createEditor(
  container: HTMLElement,
  renderer: Renderer,
  api: BoardStateAPI,
  state: BoardState,
) {
  const core = new EditorCore(api, state);
  const ui = new EditorUI(container, core, renderer);
  return { core, ui };
}
