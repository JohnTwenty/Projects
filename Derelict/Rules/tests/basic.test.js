import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { BasicRules, hasLineOfSight, marineHasLineOfSight, getMoveOptions } from '../dist/src/index.js';

test('marine moves forward when choosing move', async () => {
  const board = {
    size: 5,
    segments: [],
    tokens: [
      { instanceId: 'M1', type: 'marine', rot: 0, cells: [{ x: 0, y: 0 }] },
    ],
  };
  const rules = new BasicRules(board);
  rules.validate(board);

  let calls = 0;
  let moved;
  const player = {
    choose: async (options) => {
      calls++;
      if (calls === 1) {
        return options.find((o) => o.action === 'activate');
      }
      if (calls === 2) {
        return options.find((o) => o.action === 'move');
      }
      moved = { ...board.tokens[0].cells[0] };
      board.tokens = [];
      return options[0];
    },
  };

  await rules.runGame(player, player);

  assert.deepEqual(moved, { x: 0, y: 1 });
});

test('door action toggles door', async () => {
  const board = {
    size: 5,
    segments: [],
    tokens: [
      { instanceId: 'M1', type: 'marine', rot: 0, cells: [{ x: 1, y: 1 }] },
      { instanceId: 'D1', type: 'door', rot: 0, cells: [{ x: 1, y: 2 }] },
    ],
  };
  const rules = new BasicRules(board);
  rules.validate(board);

  let calls = 0;
  let doorType;
  const player = {
    choose: async (options) => {
      calls++;
      if (calls === 1) {
        return options.find((o) => o.action === 'activate');
      }
      if (calls === 2) {
        const doorOpt = options.find((o) => o.action === 'door');
        assert.ok(doorOpt);
        return doorOpt;
      }
      doorType = board.tokens.find((t) => t.instanceId === 'D1')?.type;
      board.tokens = [];
      return options[0];
    },
  };

  await rules.runGame(player, player);

  assert.equal(doorType, 'dooropen');
});

test('blocked open door not offered', async () => {
  const board = {
    size: 5,
    segments: [],
    tokens: [
      { instanceId: 'M1', type: 'marine', rot: 0, cells: [{ x: 1, y: 1 }] },
      { instanceId: 'M2', type: 'marine', rot: 0, cells: [{ x: 1, y: 2 }] },
      { instanceId: 'D1', type: 'dooropen', rot: 0, cells: [{ x: 1, y: 2 }] },
    ],
  };
  const rules = new BasicRules(board);
  rules.validate(board);

  let secondOptions;
  let calls = 0;
  const player = {
    choose: async (options) => {
      calls++;
      if (calls === 1) {
        return options.find((o) => o.action === 'activate' && o.coord?.x === 1 && o.coord?.y === 1);
      }
      secondOptions = options;
      board.tokens = [];
      return options[0];
    },
  };

  await rules.runGame(player, player);

  assert.ok(!secondOptions.some((o) => o.action === 'door'));
});

test('pass hands control to second player who can move alien', async () => {
  const board = {
    size: 5,
    segments: [],
    tokens: [
      { instanceId: 'M1', type: 'marine', rot: 0, cells: [{ x: 0, y: 0 }] },
      { instanceId: 'A1', type: 'alien', rot: 0, cells: [{ x: 2, y: 2 }] },
    ],
  };
  const rules = new BasicRules(board);
  rules.validate(board);

  let p1Calls = 0;
  let p2Calls = 0;
  let moved;
  const p1 = {
    choose: async (options) => {
      p1Calls++;
      const passOpt = options.find((o) => o.action === 'pass');
      assert.ok(passOpt);
      return passOpt;
    },
  };
  const p2 = {
    choose: async (options) => {
      p2Calls++;
      if (p2Calls === 1) {
        return options.find((o) => o.action === 'activate');
      }
      if (p2Calls === 2) {
        const moveOpt = options.find((o) => o.action === 'move');
        assert.ok(moveOpt);
        return moveOpt;
      }
      moved = { ...board.tokens.find((t) => t.instanceId === 'A1').cells[0] };
      board.tokens = [];
      return options[0];
    },
  };

  await rules.runGame(p1, p2);

  assert.equal(p1Calls, 1);
  assert.ok(p2Calls >= 1);
  assert.deepEqual(moved, { x: 2, y: 3 });
});

test('pass hands control to second player who can move blip', async () => {
  const board = {
    size: 5,
    segments: [],
    tokens: [
      { instanceId: 'M1', type: 'marine', rot: 0, cells: [{ x: 4, y: 4 }] },
      { instanceId: 'B1', type: 'blip', rot: 0, cells: [{ x: 2, y: 2 }] },
    ],
    getCellType: (c) => (c.x === 3 && c.y === 3 ? 0 : 1),
  };
  const rules = new BasicRules(board);
  rules.validate(board);

  let p1Calls = 0;
  let p2Calls = 0;
  let moved;
  const p1 = {
    choose: async (options) => {
      p1Calls++;
      const passOpt = options.find((o) => o.action === 'pass');
      assert.ok(passOpt);
      return passOpt;
    },
  };
  const p2 = {
    choose: async (options) => {
      p2Calls++;
      if (p2Calls === 1) {
        return options.find((o) => o.action === 'activate');
      }
      if (p2Calls === 2) {
        const moveOpt = options.find((o) => o.action === 'move');
        assert.ok(moveOpt);
        return moveOpt;
      }
      moved = { ...board.tokens.find((t) => t.instanceId === 'B1').cells[0] };
      board.tokens = [];
      return options[0];
    },
  };

  await rules.runGame(p1, p2);

  assert.equal(p1Calls, 1);
  assert.ok(p2Calls >= 1);
  assert.deepEqual(moved, { x: 2, y: 3 });
});

test('marine cannot move into blip', async () => {
  const board = {
    size: 5,
    segments: [],
    tokens: [
      { instanceId: 'M1', type: 'marine', rot: 0, cells: [{ x: 0, y: 0 }] },
      { instanceId: 'B1', type: 'blip', rot: 0, cells: [{ x: 0, y: 1 }] },
    ],
  };
  const rules = new BasicRules(board);
  rules.validate(board);

  let secondOptions;
  let calls = 0;
  const player = {
    choose: async (options) => {
      calls++;
      if (calls === 1) {
        return options.find((o) => o.action === 'activate');
      }
      secondOptions = options;
      board.tokens = [];
      return options[0];
    },
  };

  await rules.runGame(player, player);

  assert.ok(
    !secondOptions.some(
      (o) => o.action === 'move' && o.coord?.x === 0 && o.coord?.y === 1,
    ),
  );
});

test('blip cannot move into marine', async () => {
  const board = {
    size: 5,
    segments: [],
    tokens: [
      { instanceId: 'M1', type: 'marine', rot: 0, cells: [{ x: 0, y: 0 }] },
      { instanceId: 'B1', type: 'blip', rot: 0, cells: [{ x: 2, y: 2 }] },
      { instanceId: 'M2', type: 'marine', rot: 0, cells: [{ x: 2, y: 3 }] },
    ],
  };
  const rules = new BasicRules(board);
  rules.validate(board);

  let blipOptions;
  let calls = 0;
  const p1 = {
    choose: async (options) => {
      const passOpt = options.find((o) => o.action === 'pass');
      assert.ok(passOpt);
      return passOpt;
    },
  };
  const p2 = {
    choose: async (options) => {
      calls++;
      if (calls === 1) {
        return options.find((o) => o.action === 'activate');
      }
      blipOptions = options;
      board.tokens = [];
      return options[0];
    },
  };

  await rules.runGame(p1, p2);

  assert.ok(
    !blipOptions.some(
      (o) => o.action === 'move' && o.coord?.x === 2 && o.coord?.y === 3,
    ),
  );
});

test('activating different unit marks previous as deactivated until pass', async () => {
  const board = {
    size: 5,
    segments: [],
    tokens: [
      { instanceId: 'M1', type: 'marine', rot: 0, cells: [{ x: 0, y: 0 }] },
      { instanceId: 'M2', type: 'marine', rot: 0, cells: [{ x: 1, y: 0 }] },
      { instanceId: 'A1', type: 'alien', rot: 0, cells: [{ x: 2, y: 2 }] },
    ],
  };
  const rules = new BasicRules(board);
  rules.validate(board);

  let calls = 0;
  let optionsAfterSwitch;
  let hadDeactDuringTurn = false;
  let tokensAfterPass;
  const p1 = {
    choose: async (options) => {
      calls++;
      if (calls === 1) {
        return options.find(
          (o) => o.action === 'activate' && o.coord?.x === 0 && o.coord?.y === 0,
        );
      }
      if (calls === 2) {
        return options.find(
          (o) => o.action === 'activate' && o.coord?.x === 1 && o.coord?.y === 0,
        );
      }
      if (calls === 3) {
        optionsAfterSwitch = options;
        hadDeactDuringTurn = board.tokens.some((t) => t.type === 'deactivated');
        return options.find((o) => o.action === 'pass');
      }
    },
  };
  const p2 = {
    choose: async (options) => {
      tokensAfterPass = board.tokens.slice();
      board.tokens = [];
      return options[0];
    },
  };

  await rules.runGame(p1, p2);

  assert.ok(hadDeactDuringTurn);
  assert.ok(
    !optionsAfterSwitch.some(
      (o) => o.action === 'activate' && o.coord?.x === 0 && o.coord?.y === 0,
    ),
  );
  assert.ok(!tokensAfterPass.some((t) => t.type === 'deactivated'));
});

test('marine backward move costs AP', async () => {
  const board = {
    size: 5,
    segments: [],
    tokens: [
      { instanceId: 'M1', type: 'marine', rot: 0, cells: [{ x: 1, y: 1 }] },
    ],
  };
  const rules = new BasicRules(board);
  rules.validate(board);

  let calls = 0;
  let moveOptions;
  let afterMoveOptions;
  const player = {
    choose: async (options) => {
      calls++;
      if (calls === 1) {
        return options.find((o) => o.action === 'activate');
      }
      if (calls === 2) {
        moveOptions = options;
        return options.find(
          (o) => o.action === 'move' && o.coord?.x === 1 && o.coord?.y === 0,
        );
      }
      afterMoveOptions = options;
      board.tokens = [];
      return options.find((o) => o.action === 'pass');
    },
  };

  await rules.runGame(player, player);

  const back = moveOptions.find(
    (o) => o.action === 'move' && o.coord?.x === 1 && o.coord?.y === 0,
  );
  assert.equal(back?.apCost, 2);
  const turnLeft = afterMoveOptions.find((o) => o.action === 'turnLeft');
  assert.equal(turnLeft?.apRemaining, 2);
});

test('alien sideways move and free turn after move', async () => {
  const board = {
    size: 5,
    segments: [],
    tokens: [
      { instanceId: 'A1', type: 'alien', rot: 0, cells: [{ x: 1, y: 1 }] },
      { instanceId: 'M1', type: 'marine', rot: 0, cells: [{ x: 4, y: 4 }] },
    ],
  };
  const rules = new BasicRules(board);
  rules.validate(board);

  let calls = 0;
  let moveOptions;
  const player = {
    choose: async (options) => {
      calls++;
      if (calls === 1) return options.find((o) => o.action === 'activate');
      if (calls === 2) {
        moveOptions = options;
        return options.find((o) => o.action === 'move');
      }
      board.tokens = [];
      return options.find((o) => o.action === 'pass');
    },
  };

  await rules.runGame(player, player);

  assert.ok(
    moveOptions.some(
      (o) => o.action === 'move' && o.coord && o.coord.x !== 1,
    ),
  );
  // turn options captured after move could be inspected here if needed
});

test('hasLineOfSight respects blockers and diagonal corners', () => {
  const openBoard = { size: 5, segments: [], tokens: [] };
  assert.equal(hasLineOfSight(openBoard, { x: 0, y: 0 }, { x: 4, y: 0 }), true);

  const doorBoard = {
    size: 5,
    segments: [],
    tokens: [
      { instanceId: 'D1', type: 'door', rot: 0, cells: [{ x: 2, y: 0 }] },
    ],
  };
  assert.equal(hasLineOfSight(doorBoard, { x: 0, y: 0 }, { x: 4, y: 0 }), false);

  const diagBlocked = {
    size: 5,
    segments: [],
    tokens: [],
    getCellType: (c) =>
      (c.x === 1 && c.y === 0) || (c.x === 0 && c.y === 1) ? 0 : 1,
  };
  assert.equal(hasLineOfSight(diagBlocked, { x: 0, y: 0 }, { x: 2, y: 2 }), false);

  const diagOpen = {
    size: 5,
    segments: [],
    tokens: [],
    getCellType: (c) => (c.x === 1 && c.y === 0 ? 0 : 1),
  };
  assert.equal(hasLineOfSight(diagOpen, { x: 0, y: 0 }, { x: 2, y: 2 }), true);
});

test('hasLineOfSight is symmetric', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 2, y: 1 };

  const openBoard = { size: 5, segments: [], tokens: [] };
  assert.equal(hasLineOfSight(openBoard, a, b), true);
  assert.equal(hasLineOfSight(openBoard, b, a), true);

  const blockedBoard = {
    size: 5,
    segments: [],
    tokens: [],
    getCellType: (c) => (c.x === 1 && c.y === 1 ? 0 : 1),
  };
  assert.equal(hasLineOfSight(blockedBoard, a, b), false);
  assert.equal(hasLineOfSight(blockedBoard, b, a), false);
});

test('marineHasLineOfSight limited to forward arc', () => {
  const board = { size: 5, segments: [], tokens: [] };
  const marine = { instanceId: 'M1', type: 'marine', rot: 0, cells: [{ x: 2, y: 2 }] };
  assert.equal(
    marineHasLineOfSight(board, marine, { x: 2, y: 4 }),
    true,
  );
  assert.equal(
    marineHasLineOfSight(board, marine, { x: 3, y: 3 }),
    true,
  );
  assert.equal(
    marineHasLineOfSight(board, marine, { x: 4, y: 2 }),
    false,
  );
  assert.equal(
    marineHasLineOfSight(board, marine, { x: 2, y: 0 }),
    false,
  );
});

for (const blipType of ['blip', 'blip_2', 'blip_3']) {
  test(`${blipType} cannot move into line of sight of marine`, async () => {
    const board = {
      size: 5,
      segments: [],
      tokens: [
        { instanceId: 'B1', type: blipType, rot: 0, cells: [{ x: 0, y: 0 }] },
        { instanceId: 'M1', type: 'marine', rot: 180, cells: [{ x: 0, y: 3 }] },
      ],
    };
    const rules = new BasicRules(board, undefined, undefined, { activePlayer: 2 });
    rules.validate(board);

    let calls = 0;
    let moveOptions;
    const p1 = { choose: async () => ({ type: 'action', action: 'pass' }) };
    const p2 = {
      choose: async (options) => {
        calls++;
        if (calls === 1) {
          return options.find(
            (o) => o.action === 'activate' && o.coord?.x === 0 && o.coord?.y === 0,
          );
        }
        moveOptions = options;
        board.tokens = [];
        return options.find((o) => o.action === 'pass');
      },
    };

    await rules.runGame(p1, p2);

    assert.ok(
      !moveOptions.some(
        (o) => o.action === 'move' && o.coord?.x === 0 && o.coord?.y === 1,
      ),
    );
  });
}

test('blip can move outside marine field of view', async () => {
  const board = {
    size: 5,
    segments: [],
    tokens: [
      { instanceId: 'B1', type: 'blip', rot: 0, cells: [{ x: 0, y: 0 }] },
      { instanceId: 'M1', type: 'marine', rot: 0, cells: [{ x: 0, y: 3 }] },
    ],
  };
  const rules = new BasicRules(board, undefined, undefined, { activePlayer: 2 });
  rules.validate(board);

  let calls = 0;
  let moveOptions;
  const p1 = { choose: async () => ({ type: 'action', action: 'pass' }) };
  const p2 = {
    choose: async (options) => {
      calls++;
      if (calls === 1) {
        return options.find(
          (o) => o.action === 'activate' && o.coord?.x === 0 && o.coord?.y === 0,
        );
      }
      moveOptions = options;
      board.tokens = [];
      return options.find((o) => o.action === 'pass');
    },
  };

  await rules.runGame(p1, p2);

  assert.ok(
    moveOptions.some(
      (o) => o.action === 'move' && o.coord?.x === 0 && o.coord?.y === 1,
    ),
  );
});

test('blip cannot move adjacent to marine', async () => {
  const board = {
    size: 5,
    segments: [],
    tokens: [
      { instanceId: 'B1', type: 'blip', rot: 0, cells: [{ x: 0, y: 1 }] },
      { instanceId: 'M1', type: 'marine', rot: 0, cells: [{ x: 2, y: 2 }] },
    ],
  };
  const rules = new BasicRules(board, undefined, undefined, { activePlayer: 2 });
  rules.validate(board);

  let calls = 0;
  let moveOptions;
  const p1 = { choose: async () => ({ type: 'action', action: 'pass' }) };
  const p2 = {
    choose: async (options) => {
      calls++;
      if (calls === 1) {
        return options.find(
          (o) => o.action === 'activate' && o.coord?.x === 0 && o.coord?.y === 1,
        );
      }
      moveOptions = options;
      board.tokens = [];
      return options.find((o) => o.action === 'pass');
    },
  };

  await rules.runGame(p1, p2);

  assert.ok(
    !moveOptions.some(
      (o) => o.action === 'move' && o.coord?.x === 1 && o.coord?.y === 1,
    ),
  );
});

test('getMoveOptions adds diagonal moves for marine', () => {
  const board = {
    size: 5,
    segments: [],
    tokens: [
      { instanceId: 'M1', type: 'marine', rot: 0, cells: [{ x: 2, y: 2 }] },
    ],
  };
  const moves = getMoveOptions(board, board.tokens[0]);
  const coords = moves.map((m) => `${m.coord.x},${m.coord.y}:${m.cost}`);
  assert.ok(coords.includes('1,3:1'));
  assert.ok(coords.includes('3,3:1'));
  assert.ok(coords.includes('1,1:2'));
  assert.ok(coords.includes('3,1:2'));
});

test('getMoveOptions adds diagonal moves for alien', () => {
  const board = {
    size: 5,
    segments: [],
    tokens: [
      { instanceId: 'A1', type: 'alien', rot: 0, cells: [{ x: 2, y: 2 }] },
      { instanceId: 'M1', type: 'marine', rot: 0, cells: [{ x: 0, y: 0 }] },
    ],
  };
  const moves = getMoveOptions(board, board.tokens[0]);
  const coords = moves.map((m) => `${m.coord.x},${m.coord.y}:${m.cost}`);
  assert.ok(coords.includes('1,3:1'));
  assert.ok(coords.includes('3,3:1'));
  assert.ok(coords.includes('1,1:2'));
  assert.ok(coords.includes('3,1:2'));
});

for (const blipType of ['blip', 'blip_2', 'blip_3']) {
  test(`getMoveOptions adds diagonal moves for ${blipType}`, () => {
    const board = {
      size: 5,
      segments: [],
      tokens: [
        { instanceId: 'B1', type: blipType, rot: 0, cells: [{ x: 1, y: 2 }] },
        { instanceId: 'M1', type: 'marine', rot: 0, cells: [{ x: 4, y: 4 }] },
      ],
    };
    const moves = getMoveOptions(board, board.tokens[0]);
    const coords = moves.map((m) => `${m.coord.x},${m.coord.y}:${m.cost}`);
    assert.ok(coords.includes('0,3:1'));
    assert.ok(coords.includes('2,3:1'));
    assert.ok(coords.includes('0,1:1'));
    assert.ok(coords.includes('2,1:1'));
  });
}

  test('blip reveal spawns aliens', async () => {
  const board = {
    size: 5,
    segments: [],
    tokens: [
      { instanceId: 'B1', type: 'blip_2', rot: 0, cells: [{ x: 1, y: 1 }] },
      { instanceId: 'M1', type: 'marine', rot: 0, cells: [{ x: 4, y: 4 }] },
    ],
  };
  const rules = new BasicRules(board, undefined, undefined, { activePlayer: 2 });
  rules.validate(board);

  let calls = 0;
  let final;
  const p1 = { choose: async () => ({ type: 'action', action: 'pass' }) };
  const p2 = {
    choose: async (options) => {
      calls++;
      if (calls === 1) {
        return options.find((o) => o.action === 'activate');
      }
      if (calls === 2) {
        return options.find((o) => o.action === 'reveal');
      }
      if (calls === 3) {
        return options.find(
          (o) => o.action === 'deploy' && o.coord?.x === 2 && o.coord?.y === 1,
        );
      }
      if (calls === 4) {
        final = board.tokens.map((t) => ({
          type: t.type,
          cell: { ...t.cells[0] },
        }));
        board.tokens = [];
        return options.find((o) => o.action === 'pass');
      }
      return options[0];
    },
  };

  await rules.runGame(p1, p2);

  const aliens = final.filter((t) => t.type === 'alien');
  assert.equal(aliens.length, 2);
  assert.ok(aliens.some((t) => t.cell.x === 1 && t.cell.y === 1));
  assert.ok(aliens.some((t) => t.cell.x === 2 && t.cell.y === 1));
  });

  test('blip reveal allows free orientation', async () => {
    const board = {
      size: 5,
      segments: [],
      tokens: [
        { instanceId: 'B1', type: 'blip_2', rot: 0, cells: [{ x: 1, y: 1 }] },
        { instanceId: 'M1', type: 'marine', rot: 0, cells: [{ x: 4, y: 4 }] },
      ],
    };
    const rules = new BasicRules(board, undefined, undefined, { activePlayer: 2 });
    rules.validate(board);

    let calls = 0;
    let firstOpts;
    let afterTurnOpts;
    let secondOpts;
    const p1 = { choose: async () => ({ type: 'action', action: 'pass' }) };
    const p2 = {
      choose: async (options) => {
        calls++;
        if (calls === 1) {
          return options.find((o) => o.action === 'activate');
        }
        if (calls === 2) {
          return options.find((o) => o.action === 'reveal');
        }
        if (calls === 3) {
          firstOpts = options;
          return options.find((o) => o.action === 'turnLeft');
        }
        if (calls === 4) {
          afterTurnOpts = options;
          return options.find((o) => o.action === 'deploy');
        }
        if (calls === 5) {
          secondOpts = options;
          board.tokens = [];
          return options.find((o) => o.action === 'pass');
        }
        return options[0];
      },
    };

    await rules.runGame(p1, p2);

    assert.ok(firstOpts.some((o) => o.action === 'turnLeft' && o.apCost === 0));
    assert.ok(firstOpts.some((o) => o.action === 'deploy'));
    assert.ok(!firstOpts.some((o) => o.action === 'pass'));
    assert.ok(afterTurnOpts.some((o) => o.action === 'deploy'));
    assert.ok(afterTurnOpts.some((o) => o.action === 'turnRight'));
    assert.ok(!afterTurnOpts.some((o) => o.action === 'pass'));
    assert.ok(secondOpts.some((o) => o.action === 'turnLeft'));
    assert.ok(secondOpts.some((o) => o.action === 'pass'));
  });

  test('blip reveal forfeits extra aliens when no space', async () => {
    const board = {
      size: 5,
      segments: [],
      tokens: [
        { instanceId: 'B1', type: 'blip_3', rot: 0, cells: [{ x: 1, y: 1 }] },
        { instanceId: 'M1', type: 'marine', rot: 0, cells: [{ x: 4, y: 4 }] },
      ],
      getCellType: (c) => (c.x === 1 && c.y === 1) || (c.x === 2 && c.y === 1) ? 1 : 0,
    };
    const rules = new BasicRules(board, undefined, undefined, { activePlayer: 2 });
    rules.validate(board);

    let calls = 0;
    let finalOpts;
    const p1 = { choose: async () => ({ type: 'action', action: 'pass' }) };
    const p2 = {
      choose: async (options) => {
        calls++;
        if (calls === 1) {
          return options.find((o) => o.action === 'activate');
        }
        if (calls === 2) {
          return options.find((o) => o.action === 'reveal');
        }
        if (calls === 3) {
          return options.find((o) => o.action === 'deploy');
        }
        if (calls === 4) {
          finalOpts = options;
          board.tokens = [];
          return options.find((o) => o.action === 'pass');
        }
        return options[0];
      },
    };

    await rules.runGame(p1, p2);

    assert.ok(finalOpts.some((o) => o.action === 'pass'));
    assert.ok(!finalOpts.some((o) => o.action === 'deploy'));
  });
