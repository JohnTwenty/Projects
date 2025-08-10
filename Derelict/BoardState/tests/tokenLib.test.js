import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { parseTokenLibrary } from '../dist/io/tokenLib.parse.js';
import { newBoard, addToken } from '../dist/api/public.js';
import { ERR_UNKNOWN_TOKEN_TYPE } from '../dist/core/errors.js';

const fixture = (p) => fs.readFileSync(path.join('fixtures', p), 'utf8');

describe('token library', () => {
  it('loads types; duplicate last-write-wins', () => {
    const text = 'version: 1\ntype=a notes="x"\ntype=a notes="y"';
    const lib = parseTokenLibrary(text);
    assert.strictEqual(lib.get('a').notes, 'y');
  });

  it('unknown token type in mission -> ERR_UNKNOWN_TOKEN_TYPE', () => {
    const segLib = fixture('lib_segments.txt');
    const tokLib = 'version:1\ntype=marine';
    const board = newBoard(10, segLib, tokLib);
    const token = { instanceId: 'T1', type: 'door', rot: 0, cells: [{ x: 0, y: 0 }] };
    assert.throws(() => addToken(board, token), (e) => e.code === ERR_UNKNOWN_TOKEN_TYPE);
  });
});

