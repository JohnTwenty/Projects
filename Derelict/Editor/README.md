# Derelict Editor

A minimal browser-based mission editor for the Derelict game. This package only
contains the bare pieces required for tests: a pure `EditorCore`, basic DOM
wiring through `EditorUI`, geometry helpers and a small ghost overlay renderer.

## Development

```sh
npm install
npm test
```

The tests use the Node `node:test` runner and currently do not require a DOM environment.

## Usage

`createEditor(container, renderer, boardStateApi, initialState)` will build the
editor in the given container element. Rendering and board state logic are
provided by the caller via the lightweight interfaces in `src/types.ts`.
