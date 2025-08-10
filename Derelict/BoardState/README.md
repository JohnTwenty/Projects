# Derelict Board State

Utilities for representing and mutating grid based board states for the game *Derelict*.

## Development

```
npm install
npm test
```

### Scripts

- `npm run build` – compile TypeScript
- `npm test` – run node:test
- `npm run lint` – eslint
- `npm run format` – prettier

## Example

```ts
import { newBoard, addSegment } from './src/api/public.js';
// assuming `segText` and `tokText` hold library text
const state = newBoard(40, segText, tokText);
addSegment(state, { instanceId: 'S1', type: 'room', origin: { x: 0, y: 0 }, rot: 0 });
```
