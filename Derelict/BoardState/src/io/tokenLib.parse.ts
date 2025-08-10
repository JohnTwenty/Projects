import { TokenDef } from '../core/types.js';
import { BoardError, ERR_PARSE } from '../core/errors.js';
import { trimLines } from '../util/text.js';

export function parseTokenLibrary(text: string): Map<string, TokenDef> {
  const lines = trimLines(text);
  const map = new Map<string, TokenDef>();
  for (const line of lines) {
    if (line.startsWith('version:')) continue;
    const m = line.match(/^type=(\S+)(?:\s+notes="([^"]*)")?$/);
    if (!m) throw new BoardError(ERR_PARSE, `bad token line: ${line}`);
    const id = m[1];
    const notes = m[2];
    map.set(id, { type: id, notes });
  }
  return map;
}
