import { SegmentInstance, TokenInstance, Rotation } from '../core/types.js';
import { parseCoord, parseRotation, trimLines } from '../util/text.js';

export interface MissionData {
  name: string;
  profile: string;
  version: number;
  size: number;
  segments: SegmentInstance[];
  tokens: TokenInstance[];
  rules?: Record<string, unknown>;
}

export function parseMission(text: string): MissionData {
  const lines = trimLines(text);
  let name = '';
  let profile = 'mission';
  let version = 1;
  let size = 0;
  const segments: SegmentInstance[] = [];
  const tokens: TokenInstance[] = [];
  let rules: Record<string, unknown> | undefined;
  let mode: 'instances' | 'tokens' | 'rules' | null = null;

  for (const line of lines) {
    if (line.startsWith('mission:')) {
      name = line.slice(8).trim();
      continue;
    }
    if (line.startsWith('profile:')) {
      profile = line.slice(8).trim();
      continue;
    }
    if (line.startsWith('version:')) {
      version = parseInt(line.slice(8).trim(), 10);
      continue;
    }
    if (line.startsWith('board:')) {
      size = parseInt(line.slice(6).trim(), 10);
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
    if (line.startsWith('rules:')) {
      mode = 'rules';
      rules = {};
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
      const m = line.match(/(\S+):\s+(\S+)\s+pos=(\([^\)]+\))\s+rot=(\d+)(?:\s+attrs=(.+))?/);
      if (!m) continue;
      const tok: TokenInstance = {
        instanceId: m[1],
        type: m[2],
        rot: parseRotation(m[4]) as Rotation,
        cells: [parseCoord(m[3])],
      };
      if (m[5]) tok.attrs = JSON.parse(m[5]);
      tokens.push(tok);
      continue;
    }
    if (mode === 'rules') {
      const m = line.match(/\s*(\S+):\s*(.+)/);
      if (!m || !rules) continue;
      let val: unknown = m[2].trim();
      if (/^-?\d+$/.test(m[2])) {
        val = parseInt(m[2], 10);
      } else if (m[2] === 'true') {
        val = true;
      } else if (m[2] === 'false') {
        val = false;
      }
      rules[m[1]] = val;
      continue;
    }
  }
  return { name, profile, version, size, segments, tokens, rules };
}
