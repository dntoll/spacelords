import { describe, expect, it } from 'vitest';
import {
  BoardingBattle,
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
    expect(open.defense).toBe(enemy.defense);
    const corner = restore({ q: 5, r: 2 }).attackPreview(shooter.id, enemy.id);
    expect(corner.reason).toBeNull();
    expect(corner.defense).toBe(enemy.defense + 4);
    const beside = restore({ q: 1, r: 1 }).attackPreview(shooter.id, enemy.id);
    expect(beside.reason).toBeNull();
    expect(beside.defense).toBe(enemy.defense + 2);
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
    return preview.defense - enemy.defense;
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
