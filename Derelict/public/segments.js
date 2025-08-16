export function parseSegmentDefs(text) {
  const lines = text.split(/\r?\n/);
  const defs = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^segment\s+(\S+)\s+(\d+)x(\d+)/);
    if (m) {
      const id = m[1];
      const h = parseInt(m[2], 10);
      const w = parseInt(m[3], 10);
      const grid = [];
      for (let r = 0; r < h; r++) {
        const row = lines[++i];
        grid.push(row.trim().split(/\s+/).map(Number));
      }
      i++; // skip endsegment line
      defs.push({ segmentId: id, width: w, height: h, grid });
    }
  }
  return defs;
}
