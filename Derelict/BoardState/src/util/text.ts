import { Coord, Rotation } from '../core/types.js';

export function trimLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));
}

export function parseCoord(str: string): Coord {
  const m = str.match(/\(([-\d]+),([-\d]+)\)/);
  if (!m) throw new Error(`Bad coord: ${str}`);
  return { x: parseInt(m[1], 10), y: parseInt(m[2], 10) };
}

export function parseCoordList(str: string): Coord[] {
  const coords: Coord[] = [];
  const parts = str.split(/\),/);
  for (const p of parts) {
    const t = p.endsWith(')') ? p : p + ')';
    coords.push(parseCoord(t));
  }
  return coords;
}

export function parseRotation(str: string): Rotation {
  const r = parseInt(str, 10) as Rotation;
  if (![0, 90, 180, 270].includes(r)) throw new Error(`Bad rotation: ${str}`);
  return r;
}
