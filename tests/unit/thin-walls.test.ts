import { describe, expect, it } from 'vitest';
import { BoardingEditor } from '../../src/client/models/boarding/BoardingEditor.js';
import {
  BoardingBattle,
  type BoardingBattleState,
} from '../../src/client/models/boarding/BoardingBattle.js';
import {
  boardingThinOutsideTerrain,
  parseBoardingMap,
  type BoardingMap,
} from '../../src/client/models/boarding/BoardingMap.js';
import {
  BOARDING_METERS,
  boardingHeight,
} from '../../src/client/views/boarding/BoardingScale.js';
import { BoardingLighting } from '../../src/client/views/boarding/BoardingLighting.js';
import {
  BOARDING_COVER_HEIGHT,
  BOARDING_WALL_HEIGHT,
  boardingThinWallCells,
} from '../../src/client/views/boarding/BoardingProjection.js';
import { BoardingWallVisibility } from '../../src/client/views/boarding/BoardingWallVisibility.js';

function extent(
  points: readonly { readonly q: number; readonly r: number }[],
  axis: 'q' | 'r',
): number {
  const values = points.map((point) => point[axis]);
  return Math.max(...values) - Math.min(...values);
}

function campaign(
  terrain: readonly string[],
  spawns: readonly string[],
  lights?: readonly string[],
): string {
  const width = terrain[0]!.length;
  const row = (symbol: string) => symbol.repeat(width);
  return [
    '[meta]',
    'name=Thin walls',
    `width=${width}`,
    `height=${terrain.length}`,
    'rules=campaign',
    '',
    '[terrain]',
    ...terrain,
    '',
    '[objects]',
    ...terrain.map(() => row('-')),
    '',
    '[rooms]',
    ...terrain.map(() => row('-')),
    '',
    '[spawns]',
    ...spawns,
    '',
    ...(lights ? ['[lights]', ...lights, ''] : []),
  ].join('\n');
}

function battleFor(terrain: readonly string[], spawns: readonly string[]) {
  const map = parseBoardingMap(campaign(terrain, spawns));
  let battle = BoardingBattle.create(map, 5);
  const restore = (
    change: (state: BoardingBattleState) => BoardingBattleState,
  ) => {
    battle = BoardingBattle.restore(map, change(battle.snapshot));
  };
  return {
    map,
    get battle() {
      return battle;
    },
    restore,
  };
}

describe('tunna-innervaggar', () => {
  it('centers a one-third wall and omits the outer floor against Outside', () => {
    const acrossQ = boardingThinWallCells({ q: 2, r: 3 }, 'q');
    expect(extent(acrossQ.wall, 'q')).toBeCloseTo(BOARDING_METERS.thinWall);
    expect(extent(acrossQ.inside, 'q')).toBeCloseTo(BOARDING_METERS.thinWall);
    expect(extent(acrossQ.outside, 'q')).toBeCloseTo(BOARDING_METERS.thinWall);
    expect(extent(acrossQ.wall, 'r')).toBeCloseTo(1);
    expect(
      (Math.min(...acrossQ.wall.map((point) => point.q)) +
        Math.max(...acrossQ.wall.map((point) => point.q))) /
        2,
    ).toBeCloseTo(2);
    expect(
      Math.min(...acrossQ.outside.map((point) => point.q)),
    ).toBeGreaterThan(Math.max(...acrossQ.wall.map((point) => point.q)) - 1e-9);
    const acrossR = boardingThinWallCells({ q: 2, r: 3 }, 'r');
    expect(extent(acrossR.wall, 'r')).toBeCloseTo(BOARDING_METERS.thinWall);
    expect(extent(acrossR.wall, 'q')).toBeCloseTo(1);
    expect(
      Math.min(...acrossR.outside.map((point) => point.r)),
    ).toBeGreaterThan(Math.max(...acrossR.wall.map((point) => point.r)) - 1e-9);
    const map = parseBoardingMap(
      campaign(['.QO', 'R..', '...'], ['---', '---', '---']),
    );
    const outside = (position: { q: number; r: number }, axis: 'q' | 'r') =>
      boardingThinOutsideTerrain((cell) => map.terrainAt(cell), position, axis);
    expect(map.terrainAt({ q: 1, r: 0 })).toBe('thin-wall');
    expect(map.features.find((feature) => feature.axis === 'q')?.low).toBe(
      false,
    );
    expect(map.features.find((feature) => feature.axis === 'r')?.low).toBe(
      false,
    );
    expect(outside({ q: 1, r: 0 }, 'q')).toBeNull();
    expect(outside({ q: 0, r: 1 }, 'r')).toBe('floor');
    expect(map.terrainAt({ q: 2, r: 0 })).toBeNull();
    const solid = parseBoardingMap(campaign(['.Q#', '.QH'], ['---', '---']));
    const beside = (row: number) =>
      boardingThinOutsideTerrain(
        (cell) => solid.terrainAt(cell),
        { q: 1, r: row },
        'q',
      );
    expect(beside(0)).toBeNull();
    expect(beside(1)).toBeNull();
  });

  it('cuts only full-height thin walls and keeps a destroyed wall tile impassable', () => {
    const wall = { q: 4, r: 4 };
    const visibility = new BoardingWallVisibility([{ q: 3, r: 4 }]);
    expect(visibility.height(wall, { axis: 'q' })).toBe(
      boardingHeight(BOARDING_METERS.cutawayWall),
    );
    expect(
      new BoardingWallVisibility([{ q: 4, r: 3 }]).height(wall, { axis: 'r' }),
    ).toBe(boardingHeight(BOARDING_METERS.cutawayWall));
    expect(
      new BoardingWallVisibility([{ q: 5, r: 4 }]).height(wall, { axis: 'q' }),
    ).toBe(BOARDING_WALL_HEIGHT);
    expect(
      new BoardingWallVisibility([{ q: 4, r: 5 }]).height(wall, { axis: 'r' }),
    ).toBe(BOARDING_WALL_HEIGHT);
    const horizontal = battleFor(['.Q..'], ['P--D']);
    const player = horizontal.battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    const defender = horizontal.battle.snapshot.people.find(
      (person) => person.side === 'defender',
    )!;
    const thin = horizontal.battle.snapshot.features.find(
      (feature) => feature.kind === 'thin-wall',
    )!;
    expect(thin.axis).toBe('q');
    expect(thin.maxHitPoints).toBe(10);
    expect(horizontal.battle.pathTo(player.id, { q: 2, r: 0 })).toBeNull();
    expect(horizontal.battle.attackPreview(player.id, defender.id).reason).toBe(
      'The shot is blocked.',
    );
    horizontal.restore((state) => ({
      ...state,
      features: state.features.map((feature) =>
        feature.id === thin.id
          ? { ...feature, destroyed: true, open: true }
          : feature,
      ),
    }));
    expect(horizontal.battle.pathTo(player.id, { q: 2, r: 0 })).toBeNull();
    expect(
      horizontal.battle.attackPreview(player.id, defender.id).reason,
    ).not.toBe('The shot is blocked.');

    const vertical = battleFor(['.', 'R', '.', '.'], ['P', '-', '-', 'D']);
    const climber = vertical.battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    const guard = vertical.battle.snapshot.people.find(
      (person) => person.side === 'defender',
    )!;
    vertical.restore((state) => ({
      ...state,
      people: state.people.map((person) =>
        person.id === climber.id ? { ...person, facing: 3 } : person,
      ),
    }));
    const upright = vertical.battle.snapshot.features.find(
      (feature) => feature.axis === 'r',
    )!;
    expect(upright.maxHitPoints).toBe(10);
    expect(vertical.battle.pathTo(climber.id, { q: 0, r: 2 })).toBeNull();
    expect(vertical.battle.attackPreview(climber.id, guard.id).reason).toBe(
      'The shot is blocked.',
    );
  });

  it('blocks light with a full thin wall until that wall is destroyed', () => {
    const map = parseBoardingMap(campaign(['.....'], ['-----'], ['L----']));
    const feature = {
      id: 'thin',
      kind: 'thin-wall' as const,
      position: { q: 2, r: 0 },
      hitPoints: 10,
      maxHitPoints: 10,
      open: false,
      locked: false,
      destroyed: false,
      exit: null,
      axis: 'q' as const,
    };
    const blocked = new BoardingLighting(map, {
      features: [feature],
      smokeCells: [],
    });
    const clear = new BoardingLighting(map, {
      features: [{ ...feature, destroyed: true }],
      smokeCells: [],
    });
    expect(blocked.tile({ q: 4, r: 0 })).toBeLessThan(
      clear.tile({ q: 4, r: 0 }),
    );
  });
});

describe('halvhog-tunn-vagg', () => {
  it('keeps both directions at half height, grants cover and opens the floor when destroyed', () => {
    const wall = { q: 4, r: 4 };
    expect(
      new BoardingWallVisibility([{ q: 3, r: 4 }]).height(wall, {
        axis: 'q',
        low: true,
      }),
    ).toBe(BOARDING_COVER_HEIGHT);
    expect(
      new BoardingWallVisibility([{ q: 4, r: 3 }]).height(wall, {
        axis: 'r',
        low: true,
      }),
    ).toBe(BOARDING_COVER_HEIGHT);

    const check = (
      terrain: readonly string[],
      spawns: readonly string[],
      facing: number,
      destination: { q: number; r: number },
    ) => {
      const session = battleFor(terrain, spawns);
      const player = session.battle.snapshot.people.find(
        (person) => person.side === 'player',
      )!;
      const defender = session.battle.snapshot.people.find(
        (person) => person.side === 'defender',
      )!;
      session.restore((state) => ({
        ...state,
        people: state.people.map((person) =>
          person.id === player.id ? { ...person, facing } : person,
        ),
      }));
      const low = session.battle.snapshot.features.find(
        (feature) => feature.kind === 'thin-wall',
      )!;
      expect(low.low).toBe(true);
      expect(low.maxHitPoints).toBe(6);
      expect(session.battle.pathTo(player.id, destination)).toBeNull();
      const preview = session.battle.attackPreview(player.id, defender.id);
      expect(preview.reason).not.toBe('The shot is blocked.');
      session.restore((state) => ({
        ...state,
        features: state.features.map((feature) =>
          feature.id === low.id ? { ...feature, destroyed: true } : feature,
        ),
      }));
      expect(session.battle.pathTo(player.id, destination)).not.toBeNull();
      expect(session.battle.attackPreview(player.id, defender.id).defense).toBe(
        preview.defense - 2,
      );
    };
    check(['..q.'], ['P--D'], 0, { q: 2, r: 0 });
    check(['.', '.', 'r', '.'], ['P', '-', '-', 'D'], 3, { q: 0, r: 2 });
  });

  it('lets light pass a low thin wall and removes a ceiling light from its tile', () => {
    const map: BoardingMap = parseBoardingMap(
      campaign(['.....'], ['-----'], ['L----']),
    );
    const low = {
      id: 'low',
      kind: 'thin-wall' as const,
      position: { q: 2, r: 0 },
      hitPoints: 6,
      maxHitPoints: 6,
      open: false,
      locked: false,
      destroyed: false,
      exit: null,
      axis: 'r' as const,
      low: true,
    };
    const withLow = new BoardingLighting(map, {
      features: [low],
      smokeCells: [],
    });
    const without = new BoardingLighting(map, { features: [], smokeCells: [] });
    expect(withLow.tile({ q: 4, r: 0 })).toBe(without.tile({ q: 4, r: 0 }));
    const editor = new BoardingEditor(
      'pirate',
      campaign(['...'], ['---'], ['L--']),
    );
    editor.bindTool('primary', { layer: 'terrain', symbol: 'q' });
    expect(editor.paintStroke('primary', [{ q: 0, r: 0 }])).toBe(true);
    expect(editor.snapshot.layers.terrain[0]).toBe('q..');
    expect(editor.snapshot.layers.lights?.[0]).toBe('---');
  });
});
