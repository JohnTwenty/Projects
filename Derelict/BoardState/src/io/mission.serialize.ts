import { BoardState } from '../core/types.js';

export function serializeMission(state: BoardState, missionName = 'Untitled'): string {
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
  const toks = [...state.tokens].sort((a, b) => a.instanceId.localeCompare(b.instanceId));
  for (const t of toks) {
    const pos = t.cells[0];
    const attr = t.attrs ? ` attrs=${JSON.stringify(t.attrs)}` : '';
    lines.push(`  ${t.instanceId}: ${t.type} pos=(${pos.x},${pos.y}) rot=${t.rot}${attr}`);
  }
  return lines.join('\n');
}
