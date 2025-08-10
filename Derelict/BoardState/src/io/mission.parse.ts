import { SegmentInstance, TokenInstance, Rotation, Coord } from '../core/types.js';
import { parseCoord, parseCoordList, parseRotation, trimLines } from '../util/text.js';

export interface MissionData {
  name: string;
  size: number;
  segments: SegmentInstance[];
  tokens: TokenInstance[];
}

export function parseMission(text: string): MissionData {
  const lines = trimLines(text);
  let name = '';
  let size = 0;
  const segments: SegmentInstance[] = [];
  const tokens: TokenInstance[] = [];
  let mode: 'instances' | 'tokens' | null = null;

  for (const line of lines) {
    if (line.startsWith('mission:')) {
      name = line.slice(8).trim();
      continue;
    }
    if (line.startsWith('board:')) {
      const m = line.match(/(\d+)x(\d+)/);
      if (m) size = parseInt(m[1], 10);
      continue;
    }
    if (line.startsWith('segments:') || line.startsWith('tokenlib:')) {
      continue; // provenance ignored
    }
    if (line.startsWith('instances:')) {
      mode = 'instances';
      continue;
    }
    if (line.startsWith('tokens:')) {
      mode = 'tokens';
      continue;
    }
    if (mode === 'instances') {
      const m = line.match(/(\S+):\s+(\S+)\s+pos=(\([^\)]+\))\s+rot=(\d+)/);
      if (!m) continue;
      const inst: SegmentInstance = {
        instanceId: m[1],
        type: m[2],
        origin: parseCoord(m[3]),
        rot: parseRotation(m[4]) as Rotation,
      };
      segments.push(inst);
      continue;
    }
    if (mode === 'tokens') {
      const m = line.match(/(\S+):\s+type=(\S+)\s+orient=(\d+)\s+cells=([^\s]+)(?:\s+attrs=(.+))?/);
      if (!m) continue;
      const tok: TokenInstance = {
        instanceId: m[1],
        type: m[2],
        rot: parseRotation(m[3]) as Rotation,
        cells: parseCoordList(m[4]),
      };
      if (m[5]) tok.attrs = JSON.parse(m[5]);
      tokens.push(tok);
      continue;
    }
  }
  return { name, size, segments, tokens };
}
