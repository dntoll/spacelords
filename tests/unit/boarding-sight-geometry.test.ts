import { describe, expect, it } from 'vitest';
import {
  BoardingBattle,
  boardingRangeDefense,
  type BoardingBattleState,
} from '../../src/client/models/boarding/BoardingBattle.js';
import {
  BoardingMap,
  type BoardingFeatureDefinition,
  type BoardingTerrain,
} from '../../src/client/models/boarding/BoardingMap.js';
import { boardingVisibleShare } from '../../src/client/models/boarding/BoardingSightGeometry.js';

/** A 12×7 open deck with the shooter at (1,3) facing east. */
function deck(features: readonly BoardingFeatureDefinition[] = []) {
  const terrain = new Map<string, BoardingTerrain>();
  for (let r = 0; r < 7; r++)
    for (let q = 0; q < 12; q++) terrain.set(`${q},${r}`, 'floor');
  const map = new BoardingMap('Deck', 12, 7, terrain, new Map(), features, {
    player: [{ q: 1, r: 3 }],
    defender: [{ q: 5, r: 2 }],
    civilian: [],
  });
  const initial = BoardingBattle.create(map, 17).snapshot;
  const shooter = initial.people.find((person) => person.side === 'player')!;
  const enemy = initial.people.find((person) => person.side === 'defender')!;
  const restore = (
    enemyAt: { q: number; r: number },
    change: Partial<BoardingBattleState> = {},
    crouched = false,
  ) =>
    BoardingBattle.restore(map, {
      ...initial,
      people: initial.people.map((person) =>
        person.id === shooter.id
          ? { ...person, facing: 0 }
          : { ...person, position: enemyAt, facing: 2, crouched },
      ),
      currentActorId: shooter.id,
      activation: { id: shooter.id, remaining: 12 },
      initiativeOrder: [shooter.id, enemy.id],
      initiativeIndex: 0,
      postponed: [],
      finishedActors: [],
      lastKnownEnemies: [],
      lingeringPersonIds: [],
      ...change,
    });
  return { shooter, enemy, restore };
}

const wall: BoardingFeatureDefinition = {
  id: 'wall',
  kind: 'wall',
  position: { q: 3, r: 3 },
};

describe('geometrisk-sikt', () => {
  it('measures the visible share of a tile with rays instead of whole tiles', () => {
    const open = () => false;
    const eye = { q: 3, r: 3 };
    const east = { q: 1, r: 0 };
    expect(boardingVisibleShare(eye, east, { q: 5, r: 3 }, open)).toBe(1);
    expect(boardingVisibleShare(eye, east, { q: 1, r: 3 }, open)).toBe(0);
    // A tile straight beside the soldier is cut in half by the 180° edge.
    const beside = boardingVisibleShare(eye, east, { q: 3, r: 1 }, open);
    expect(beside).toBeGreaterThan(0.4);
    expect(beside).toBeLessThan(0.7);
    const blocked = (q: number, r: number) => q === 3 && r === 3;
    const from = { q: 1, r: 3 };
    expect(boardingVisibleShare(from, east, { q: 5, r: 3 }, blocked)).toBe(0);
    expect(boardingVisibleShare(from, east, { q: 5, r: 1 }, blocked)).toBe(1);
    const corner = boardingVisibleShare(from, east, { q: 5, r: 2 }, blocked);
    expect(corner).toBeGreaterThan(0);
    expect(corner).toBeLessThan(0.5);
  });

  it('only reveals an enemy when at least a tenth of its tile is visible', () => {
    const { enemy, restore } = deck([wall]);
    const shown = (at: { q: number; r: number }) => {
      const battle = restore(at);
      battle.synchronize();
      return battle.visibleSnapshot.people.some(
        (person) => person.id === enemy.id,
      );
    };
    expect(shown({ q: 5, r: 2 })).toBe(true);
    expect(shown({ q: 5, r: 3 })).toBe(false);
  });

  it('draws the sight outline around the wall and marks half cover in sight', () => {
    const crate: BoardingFeatureDefinition = {
      id: 'crate',
      kind: 'cover',
      position: { q: 4, r: 1 },
    };
    const { shooter, restore } = deck([wall, crate]);
    const area = restore({ q: 8, r: 6 }).sightArea(shooter.id);
    expect(area.outline[0]).toEqual({ q: 1, r: 3 });
    // No outline corner reaches past the wall's near face along its row.
    expect(
      area.outline.some(
        (point) => Math.abs(point.r - 3) < 0.2 && point.q > 2.6,
      ),
    ).toBe(false);
    // Open directions reach the full sight range.
    expect(
      area.outline.some((point) => Math.hypot(point.q - 1, point.r - 3) > 8.4),
    ).toBe(true);
    expect(area.halfCover).toContainEqual({ q: 4, r: 1 });
  });
});

describe('delvis-synligt-mal', () => {
  it('adds four defense below half visibility and two below full visibility', () => {
    const { shooter, enemy, restore } = deck([wall]);
    const open = restore({ q: 5, r: 1 }).attackPreview(shooter.id, enemy.id);
    expect(open.reason).toBeNull();
    // Shooter at (1,3); avstand-paverkar-traffchans is added on its own.
    const range = (q: number, r: number) =>
      boardingRangeDefense(Math.hypot(q - 1, r - 3));
    expect(open.defense).toBe(enemy.defense + range(5, 1));
    const corner = restore({ q: 5, r: 2 }).attackPreview(shooter.id, enemy.id);
    expect(corner.reason).toBeNull();
    expect(corner.defense).toBe(enemy.defense + 4 + range(5, 2));
    const beside = restore({ q: 1, r: 1 }).attackPreview(shooter.id, enemy.id);
    expect(beside.reason).toBeNull();
    expect(beside.defense).toBe(enemy.defense + 2 + range(1, 1));
    const hidden = restore({ q: 5, r: 3 }).attackPreview(shooter.id, enemy.id);
    expect(hidden.reason).not.toBeNull();
  });
});

describe('halvskydd-skuggar-delvis', () => {
  const crate: BoardingFeatureDefinition = {
    id: 'crate',
    kind: 'cover',
    position: { q: 4, r: 3 },
  };
  const defense = (at: { q: number; r: number }, crouched = false): number => {
    const { shooter, enemy, restore } = deck([crate]);
    const preview = restore(at, {}, crouched).attackPreview(
      shooter.id,
      enemy.id,
    );
    expect(preview.reason).toBeNull();
    // avstand-paverkar-traffchans is measured on its own.
    return (
      preview.defense -
      enemy.defense -
      boardingRangeDefense(Math.hypot(at.q - 1, at.r - 3))
    );
  };

  it('gives full cover to a target mostly in the shadow right behind half cover', () => {
    expect(defense({ q: 5, r: 3 })).toBe(2);
    expect(defense({ q: 5, r: 3 }, true)).toBe(5);
  });
  it('gives half the cover bonus to a partly shadowed target', () => {
    expect(defense({ q: 5, r: 2 })).toBe(1);
    expect(defense({ q: 5, r: 2 }, true)).toBe(3);
  });
  it('gives no cover outside the shadow or far behind the half cover', () => {
    expect(defense({ q: 5, r: 1 })).toBe(0);
    expect(defense({ q: 7, r: 3 })).toBe(0);
  });
  it('draws the shadow behind half cover in sight', () => {
    const { shooter, restore } = deck([crate]);
    const area = restore({ q: 8, r: 6 }).sightArea(shooter.id);
    expect(area.coverShadows).toHaveLength(1);
    const shadow = area.coverShadows[0]!;
    // The shadow starts at the crate and reaches into the tile behind it.
    expect(Math.min(...shadow.map((point) => point.q))).toBeGreaterThan(3.4);
    expect(Math.max(...shadow.map((point) => point.q))).toBeGreaterThan(5);
    expect(Math.max(...shadow.map((point) => point.q))).toBeLessThan(6.2);
  });
});

describe('avstand-paverkar-traffchans', () => {
  it('adds one defense per begun two tiles beyond two tiles', () => {
    expect(boardingRangeDefense(1)).toBe(0);
    expect(boardingRangeDefense(2)).toBe(0);
    expect(boardingRangeDefense(2.5)).toBe(1);
    expect(boardingRangeDefense(4)).toBe(1);
    expect(boardingRangeDefense(5)).toBe(2);
    expect(boardingRangeDefense(8)).toBe(3);
  });
  it('makes a distant open target harder to hit than a close one', () => {
    const { shooter, enemy, restore } = deck();
    const close = restore({ q: 3, r: 3 }).attackPreview(shooter.id, enemy.id);
    const far = restore({ q: 8, r: 3 }).attackPreview(shooter.id, enemy.id);
    expect(close.defense).toBe(enemy.defense);
    expect(far.defense).toBe(enemy.defense + 3);
    expect(far.chance).toBeLessThan(close.chance);
  });
});

describe('personer-som-pelare-i-sikt', () => {
  /** Adds a bystander copied from the enemy at `at`. */
  const withBystander = (
    at: { q: number; r: number },
    crouched: boolean,
    enemyAt: { q: number; r: number },
  ) => {
    const { shooter, enemy, restore } = deck();
    const base = restore(enemyAt).snapshot;
    const placed = base.people.find((person) => person.id === enemy.id)!;
    const battle = restore(enemyAt, {
      people: [
        ...base.people,
        { ...placed, id: 'bystander', position: at, crouched },
      ],
    });
    battle.synchronize();
    return { battle, shooter, enemy: placed };
  };
  const range = (q: number, r: number) =>
    boardingRangeDefense(Math.hypot(q - 1, r - 3));

  it('lets a standing person hide what is straight behind them', () => {
    const { battle, enemy } = withBystander({ q: 3, r: 3 }, false, {
      q: 5,
      r: 3,
    });
    expect(
      battle.visibleSnapshot.people.some((person) => person.id === enemy.id),
    ).toBe(false);
  });
  it('allows a shot past a standing person when a tenth of the target shows', () => {
    const { battle, shooter, enemy } = withBystander({ q: 2, r: 3 }, false, {
      q: 5,
      r: 4,
    });
    const preview = battle.attackPreview(shooter.id, enemy.id);
    expect(preview.reason).toBeNull();
    expect(
      preview.defense - enemy.defense - range(5, 4),
    ).toBeGreaterThanOrEqual(2);
  });
  it('lets a crouched person give half cover without blocking sight', () => {
    const { battle, shooter, enemy } = withBystander({ q: 4, r: 3 }, true, {
      q: 5,
      r: 3,
    });
    const preview = battle.attackPreview(shooter.id, enemy.id);
    expect(preview.reason).toBeNull();
    expect(
      preview.defense - enemy.defense - range(5, 3),
    ).toBeGreaterThanOrEqual(1);
    expect(battle.sightArea(shooter.id).coverShadows).toHaveLength(1);
  });
  it('cuts the sight outline behind a standing person', () => {
    const { battle, shooter } = withBystander({ q: 3, r: 3 }, false, {
      q: 8,
      r: 6,
    });
    const outline = battle.sightArea(shooter.id).outline;
    expect(
      outline.some((point) => Math.abs(point.r - 3) < 0.05 && point.q > 3.3),
    ).toBe(false);
  });
});

describe('granat-over-halvskydd-inte-genom-vagg', () => {
  const far = { q: 10, r: 0 };
  const reason = (
    features: readonly BoardingFeatureDefinition[],
    target = { q: 5, r: 3 },
    change: Partial<BoardingBattleState> = {},
  ) => {
    const { shooter, restore } = deck(features);
    return restore(far, change).grenadeReason(shooter.id, 'frag', target);
  };
  const bystander = (crouched: boolean): Partial<BoardingBattleState> => {
    const { enemy, restore } = deck();
    const base = restore(far).snapshot;
    const placed = base.people.find((person) => person.id === enemy.id)!;
    return {
      people: [
        ...base.people,
        { ...placed, id: 'bystander', position: { q: 3, r: 3 }, crouched },
      ],
    };
  };

  it('refuses a throw whose path crosses a wall', () => {
    expect(reason([wall])).toMatch(/wall/);
    expect(reason([wall], { q: 5, r: 1 })).toBeNull();
    const door: BoardingFeatureDefinition = {
      id: 'door',
      kind: 'door',
      position: { q: 3, r: 3 },
    };
    expect(reason([door])).toMatch(/wall/);
  });
  it('lets a grenade fly over half cover, a low wall and smoke', () => {
    expect(
      reason([{ id: 'crate', kind: 'cover', position: { q: 3, r: 3 } }]),
    ).toBeNull();
    expect(
      reason([
        { id: 'low', kind: 'thin-wall', low: true, position: { q: 3, r: 3 } },
      ]),
    ).toBeNull();
    expect(
      reason(
        [],
        { q: 5, r: 3 },
        {
          smoke: [{ position: { q: 3, r: 3 }, amount: 4 }],
        },
      ),
    ).toBeNull();
  });
  it('lets a grenade fly over a crouched person but not a standing one', () => {
    expect(reason([], { q: 5, r: 3 }, bystander(true))).toBeNull();
    expect(reason([], { q: 5, r: 3 }, bystander(false))).toMatch(/blocked/);
  });
  it('never lets a missed grenade scatter through a wall', () => {
    const column: BoardingFeatureDefinition[] = Array.from(
      { length: 7 },
      (_, r) => ({ id: `wall-${r}`, kind: 'wall', position: { q: 5, r } }),
    );
    const { shooter, restore } = deck(column);
    let missed = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const battle = restore(far, { randomState: seed });
      battle.command({ type: 'grenade', grenade: 'smoke', at: { q: 4, r: 3 } });
      const line = battle.snapshot.log.at(-1)!;
      const [, q] = /impact (-?\d+),(-?\d+)/.exec(line)!.map(Number);
      expect(q).toBeLessThanOrEqual(4);
      if (!line.endsWith('impact 4,3.')) missed++;
    }
    expect(missed).toBeGreaterThan(0);
    expect(shooter.smokeGrenades).toBe(1);
  });
});

describe('dorrar-som-tunna-vaggar', () => {
  /** A wall line along r at q = 4 with a door or thin wall at (4,3). */
  const wallLine = (middle: BoardingFeatureDefinition) => [
    ...[0, 1, 2, 4, 5, 6].map((r): BoardingFeatureDefinition => ({
      id: `wall-${r}`,
      kind: 'wall',
      position: { q: 4, r },
    })),
    middle,
  ];
  const door: BoardingFeatureDefinition = {
    id: 'door',
    kind: 'door',
    position: { q: 4, r: 3 },
  };
  /** Outline corners straight ahead along row 3 from the shooter at (1,3). */
  const reachAlongRow = (middle: BoardingFeatureDefinition) => {
    const { shooter, restore } = deck(wallLine(middle));
    const outline = restore({ q: 8, r: 0 }).sightArea(shooter.id).outline;
    return Math.max(
      ...outline
        .filter((point) => Math.abs(point.r - 3) < 0.05)
        .map((point) => point.q),
    );
  };

  it('turns a door to lie along the wall line it stands in', () => {
    const map = new BoardingMap(
      'Deck',
      12,
      7,
      new Map(),
      new Map(),
      wallLine(door),
      { player: [{ q: 1, r: 3 }], defender: [], civilian: [] },
    );
    // Walls above and below: a slab thin along q, like the thin wall Q.
    expect(map.doorAxis({ q: 4, r: 3 })).toBe('q');
    const across = new BoardingMap(
      'Deck',
      12,
      7,
      new Map(),
      new Map(),
      [
        { id: 'w', kind: 'wall', position: { q: 3, r: 3 } },
        { id: 'e', kind: 'wall', position: { q: 5, r: 3 } },
        door,
      ],
      { player: [{ q: 1, r: 1 }], defender: [], civilian: [] },
    );
    expect(across.doorAxis({ q: 4, r: 3 })).toBe('r');
  });
  it('cuts sight at the slab of a closed door, as at a thin wall', () => {
    const slab = 4 - 1 / 6;
    expect(reachAlongRow(door)).toBeCloseTo(slab, 2);
    expect(
      reachAlongRow({
        id: 'thin',
        kind: 'thin-wall',
        position: { q: 4, r: 3 },
        axis: 'q',
      }),
    ).toBeCloseTo(slab, 2);
  });
  it('hides what stands behind a closed door', () => {
    const { enemy, restore } = deck(wallLine(door));
    const battle = restore({ q: 6, r: 3 });
    battle.synchronize();
    expect(
      battle.visibleSnapshot.people.some((person) => person.id === enemy.id),
    ).toBe(false);
  });
});
