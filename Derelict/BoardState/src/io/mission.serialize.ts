import { BoardState } from '../core/types.js';

export function serializeMission(
  state: BoardState,
  missionName = 'Untitled',
  extras?: { rules?: Record<string, unknown> },
): string {
  const lines: string[] = [];
  lines.push(`mission: ${missionName}`);
  lines.push(`profile: mission`);
  lines.push(`version: 1`);
  lines.push(`board: ${state.size}`);
  lines.push('');
  lines.push('instances:');
  const segs = [...state.segments].sort((a, b) => a.instanceId.localeCompare(b.instanceId));
  for (const s of segs) {
    lines.push(`  ${s.instanceId}: ${s.type} pos=(${s.origin.x},${s.origin.y}) rot=${s.rot}`);
  }
  lines.push('');
  lines.push('tokens:');
  const toks = state.tokens
    .filter((t) => t.instanceId)
    .sort((a, b) => a.instanceId.localeCompare(b.instanceId));
  for (const t of toks) {
    const pos = t.cells[0];
    const attr = t.attrs ? ` attrs=${JSON.stringify(t.attrs)}` : '';
    lines.push(`  ${t.instanceId}: ${t.type} pos=(${pos.x},${pos.y}) rot=${t.rot}${attr}`);
  }
  if (extras?.rules && Object.keys(extras.rules).length > 0) {
    lines.push('');
    lines.push('rules:');
    const keys = Object.keys(extras.rules).sort();
    for (const key of keys) {
      lines.push(`  ${key}: ${extras.rules[key]}`);
    }
  }
  return lines.join('\n');
}
