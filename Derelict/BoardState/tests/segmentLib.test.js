import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { parseSegmentLibrary } from '../dist/io/segmentLib.parse.js';
import { ERR_BAD_GLYPH, ERR_PARSE } from '../dist/core/errors.js';

const fixture = (p) => fs.readFileSync(path.join('fixtures', p), 'utf8');

describe('segment library', () => {
  it('parses default legend and multiple segments', () => {
    const lib = parseSegmentLibrary(fixture('lib_segments.txt'));
    assert.strictEqual(lib.size, 3);
    assert.strictEqual(lib.get('L_room_5x5').width, 5);
  });

  it('ragged rows -> ERR_PARSE', () => {
    const text = 'segment bad 2x2\n0 1 2\n0 1\nendsegment';
    assert.throws(() => parseSegmentLibrary(text), (e) => e.code === ERR_PARSE);
  });

  it('unknown cell type integer -> ERR_BAD_GLYPH', () => {
    const text = 'segment bad 1x1\n9\nendsegment';
    assert.throws(() => parseSegmentLibrary(text), (e) => e.code === ERR_BAD_GLYPH);
  });
});

