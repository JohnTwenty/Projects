import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSpriteManifestFromText } from '../src/manifest.js';

test('manifest parsing: parses valid lines and ignores comments/blank', () => {
  const text = `# comment\n\n1 grass.png 0 0 0 0 0 0 0\nfoo token.png 1 2 3 4 5 6 7`;
  const manifest = loadSpriteManifestFromText(text);
  assert.equal(manifest.entries.length, 2);
  assert.equal(manifest.entries[0].key, '1');
  assert.equal(manifest.entries[1].key, 'foo');
});

test('manifest parsing: bad field count throws with line number', () => {
  const text = `1 a.png 0 0 0 0 0 0`; // only 8 fields
  assert.throws(() => loadSpriteManifestFromText(text), /line 1/);
});

test('manifest parsing: non-integer numeric fields throw', () => {
  const text = `1 a.png 0 0 0 nope 0 0 0`;
  assert.throws(() => loadSpriteManifestFromText(text), /line 1/);
});

test('manifest parsing: last write wins for duplicate keys', () => {
  const text = `1 a.png 0 0 0 0 0 0 0\n1 b.png 1 1 1 1 1 1 1`;
  const manifest = loadSpriteManifestFromText(text);
  assert.equal(manifest.entries.length, 1);
  assert.equal(manifest.entries[0].file, 'b.png');
  assert.equal(manifest.entries[0].x, 1);
});
