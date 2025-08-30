import { EditorCore } from './editor/EditorCore.js';
import { EditorUI } from './editor/EditorUI.js';
export function createEditor(container, renderer, api, state) {
    const core = new EditorCore(api, state);
    const ui = new EditorUI(container, core, renderer);
    return { core, ui };
}
