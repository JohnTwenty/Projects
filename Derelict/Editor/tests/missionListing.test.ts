import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseMissionListing } from '../src/util/missionListing.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const missionsDir = join(__dirname, '..', '..', '..', 'public', 'missions');

function createListing(items: string[]): string {
  return [
    '<html>',
    '<body>',
    '<UL>',
    ...items.map((item, idx) =>
      idx % 2 === 0
        ? `<LI><A HREF="${item}">${item}</A></LI>`
        : `<li><a href='${item}'>${item}</a></li>`
    ),
    '</UL>',
    '</body>',
    '</html>',
  ].join('\n');
}

test('parseMissionListing finds mission files', () => {
  const files = readdirSync(missionsDir).filter((file: string) => /\.txt$/i.test(file));
  assert.ok(files.length >= 3, 'expected at least 3 mission files in public/missions');

  const listing = createListing(files);
  const parsed = parseMissionListing(listing);

  assert.deepEqual(parsed.sort(), files.sort());
  assert.ok(parsed.length >= 3);
});
