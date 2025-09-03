import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function getPngSize(relPath: string) {
  const data = readFileSync(new URL(relPath, import.meta.url));
  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
  };
}

test('sprite image dimensions', () => {
  const alien = getPngSize('../../../public/assets/images/alien.png');
  const deactivated = getPngSize('../../../public/assets/images/deactivated.png');
  assert.equal(alien.width, 64);
  assert.equal(alien.height, 64);
  assert.equal(deactivated.width, 16);
  assert.equal(deactivated.height, 16);
});
