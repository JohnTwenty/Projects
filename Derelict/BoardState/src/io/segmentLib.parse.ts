import { SegmentDef, CellType, Id } from '../core/types.js';
import { BoardError, ERR_BAD_GLYPH, ERR_PARSE, ERR_DUP_ID } from '../core/errors.js';
import { trimLines } from '../util/text.js';

export function parseSegmentLibrary(text: string): Map<Id, SegmentDef> {
  const lines = trimLines(text);
  const legend: Set<number> = new Set([0, 1]);
  const segments = new Map<Id, SegmentDef>();
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('legend:')) {
      const part = line.slice(7);
      for (const entry of part.split(',')) {
        const m = entry.trim().match(/(\d+)=/);
        if (m) legend.add(parseInt(m[1], 10));
      }
      i++;
      continue;
    }
    if (line.startsWith('segment')) {
      const m = line.match(/^segment\s+(\S+)\s+(\d+)x(\d+)$/);
      if (!m) throw new BoardError(ERR_PARSE, 'bad segment header');
      const id = m[1];
      const h = parseInt(m[2], 10);
      const w = parseInt(m[3], 10);
      if (segments.has(id)) throw new BoardError(ERR_DUP_ID, `duplicate segment id ${id}`);
      const grid: CellType[][] = [];
      i++;
      for (let r = 0; r < h; r++, i++) {
        if (i >= lines.length) throw new BoardError(ERR_PARSE, 'unexpected EOF');
        const row = lines[i].split(/\s+/).map((n) => parseInt(n, 10));
        if (row.length !== w) throw new BoardError(ERR_PARSE, 'ragged row');
        for (const cell of row) {
          if (!legend.has(cell)) throw new BoardError(ERR_BAD_GLYPH, `unknown glyph ${cell}`);
        }
        grid.push(row);
      }
      if (lines[i] !== 'endsegment') throw new BoardError(ERR_PARSE, 'missing endsegment');
      segments.set(id, { segmentId: id, width: w, height: h, grid });
      i++;
      continue;
    }
    throw new BoardError(ERR_PARSE, `unrecognized line: ${line}`);
  }
  return segments;
}
