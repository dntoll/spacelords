import { describe, expect, it } from 'vitest';
import {
  BoardingBattle,
  type BoardingBattleState,
} from '../../../src/client/boarding/models/battle/BoardingBattle.js';
import { parseBoardingMap } from '../../../src/client/boarding/models/map/BoardingMap.js';
import { boardingThinWallCells } from '../../../src/client/boarding/views/rendering/BoardingProjection.js';
import { boardingLightGlass } from '../../../src/client/boarding/views/rendering/BoardingLightMap.js';
import {
  boardingDestructionEffect,
  boardingEffectParticles,
} from '../../../src/client/boarding/views/battle/BoardingEffectParticles.js';

function campaign(terrain: readonly string[], spawns: readonly string[]) {
  const width = terrain[0]!.length;
  const row = (symbol: string) => symbol.repeat(width);
  return [
    '[meta]',
    'name=Windows',
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
  ].join('\n');
}

/** A corridor with the player at its west end and a guard at its east end. */
function corridor(glass: string) {
  const map = parseBoardingMap(
    campaign(
      ['HHHHHHH', `..${glass}....`, 'HHHHHHH'],
      ['-------', 'P-----D', '-------'],
    ),
  );
  let battle = BoardingBattle.create(map, 5);
  const restore = (
    change: (state: BoardingBattleState) => BoardingBattleState,
  ) => {
    battle = BoardingBattle.restore(map, change(battle.snapshot));
  };
  const player = battle.snapshot.people.find(
    (person) => person.side === 'player',
  )!;
  const guard = battle.snapshot.people.find(
    (person) => person.side === 'defender',
  )!;
  const activate = () =>
    restore((state) => ({
      ...state,
      randomState: 10_000,
      people: state.people.map((person) =>
        person.id === player.id ? { ...person, facing: 0 } : person,
      ),
      initiativeOrder: [player.id],
      initiativeIndex: 0,
      currentActorId: player.id,
      activation: { id: player.id, remaining: 12 },
    }));
  activate();
  const glassFeature = () =>
    battle.snapshot.features.find(
      (feature) => feature.position.q === 2 && feature.position.r === 1,
    )!;
  return {
    map,
    get battle() {
      return battle;
    },
    restore,
    activate,
    player,
    guard,
    glassFeature,
  };
}

describe('helhogt-fonster', () => {
  it('reads W as a full-height window that joins the walls around it', () => {
    const map = parseBoardingMap(
      campaign(['HHH', '.W.', '.Q.'], ['---', '---', '---']),
    );
    expect(map.terrainAt({ q: 1, r: 1 })).toBe('window');
    expect(
      map.features.find((feature) => feature.kind === 'window')?.position,
    ).toEqual({ q: 1, r: 1 });
    // Joined to the hull above and the thin wall below: one straight slab.
    expect(map.thinWallPieces({ q: 1, r: 1 })).toEqual([
      { axis: 'q', span: [-0.5, 0.5] },
    ]);
    expect(map.thinWallPieces({ q: 1, r: 2 })?.[0]?.span[0]).toBe(-0.5);
  });

  it('lets sight through, blocks the way until a shot through it breaks it', () => {
    const session = corridor('W');
    const { player, guard } = session;
    expect(session.battle.pathTo(player.id, { q: 4, r: 1 })).toBeNull();
    expect(session.battle.attackPreview(player.id, guard.id).reason).toBeNull();
    expect(
      session.battle.grenadeReason(player.id, 'frag', { q: 4, r: 1 }),
    ).toMatch(/blocked/);
    session.battle.command({ type: 'shoot', targetId: guard.id });
    expect(session.glassFeature()).toMatchObject({
      kind: 'window',
      destroyed: true,
    });
    session.activate();
    expect(session.battle.pathTo(player.id, { q: 4, r: 1 })).not.toBeNull();
  });
});

describe('fonster-pa-halvhog-vagg', () => {
  it('keeps the low wall and its cover when a shot breaks the glass above it', () => {
    const session = corridor('q');
    const { player, guard } = session;
    const before = session.battle.attackPreview(player.id, guard.id);
    expect(before.reason).toBeNull();
    // The glass reaches the ceiling, so nothing is thrown over the wall.
    expect(
      session.battle.grenadeReason(player.id, 'frag', { q: 4, r: 1 }),
    ).toMatch(/blocked/);
    session.battle.command({ type: 'shoot', targetId: guard.id });
    const wall = session.glassFeature();
    expect(wall).toMatchObject({ kind: 'thin-wall', low: true });
    expect(wall.shattered).toBe(true);
    expect(wall.destroyed).toBe(false);
    session.activate();
    expect(session.battle.pathTo(player.id, { q: 4, r: 1 })).toBeNull();
    expect(
      session.battle.grenadeReason(player.id, 'frag', { q: 4, r: 1 }),
    ).toBeNull();
    expect(session.battle.attackPreview(player.id, guard.id).defense).toBe(
      before.defense,
    );
  });

  it('breaks only glass the shot passes through', () => {
    const map = parseBoardingMap(
      campaign(
        ['HHHHHHH', '..q....', '...W...', 'HHHHHHH'],
        ['-------', 'P-----D', '-------', '-------'],
      ),
    );
    let battle = BoardingBattle.create(map, 5);
    const player = battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    const guard = battle.snapshot.people.find(
      (person) => person.side === 'defender',
    )!;
    battle = BoardingBattle.restore(map, {
      ...battle.snapshot,
      randomState: 10_000,
      people: battle.snapshot.people.map((person) =>
        person.id === player.id ? { ...person, facing: 0 } : person,
      ),
      initiativeOrder: [player.id],
      initiativeIndex: 0,
      currentActorId: player.id,
      activation: { id: player.id, remaining: 12 },
    });
    battle.command({ type: 'shoot', targetId: guard.id });
    const at = (q: number, r: number) =>
      battle.snapshot.features.find(
        (feature) => feature.position.q === q && feature.position.r === r,
      )!;
    expect(at(2, 1).shattered).toBe(true);
    expect(at(3, 2).destroyed).toBe(false);
  });
});

describe('glas-tintar-ljus', () => {
  it('tints light only through intact glass', () => {
    const session = corridor('q');
    const intact = boardingLightGlass(session.battle.snapshot, session.map);
    expect(intact).toHaveLength(1);
    expect(intact[0]).toMatchObject({ minR: 0.5, maxR: 1.5 });
    session.battle.command({ type: 'shoot', targetId: session.guard.id });
    expect(boardingLightGlass(session.battle.snapshot, session.map)).toEqual(
      [],
    );
  });
});

describe('krossbart-glas', () => {
  it('rains pale blue shards that fall to the floor', () => {
    expect(boardingDestructionEffect('window')).toBe('glass');
    const early = boardingEffectParticles('glass', { q: 2, r: 2 }, 80);
    const late = boardingEffectParticles('glass', { q: 2, r: 2 }, 500);
    expect(
      early.filter((particle) => particle.shape === 'shard').length,
    ).toBeGreaterThan(8);
    expect(
      early.every((particle) => particle.color[2] > particle.color[0]),
    ).toBe(true);
    const meanY = (particles: typeof early) =>
      particles.reduce((sum, particle) => sum + particle.y, 0) /
      particles.length;
    expect(meanY(late)).toBeGreaterThan(meanY(early));
  });
});

describe('tunna-fonster', () => {
  it('draws a pane far thinner than a thin wall', () => {
    const width = (thickness?: number) => {
      const wall = boardingThinWallCells(
        { q: 0, r: 0 },
        'q',
        [-0.5, 0.5],
        thickness,
      ).wall;
      const qs = wall.map((point) => point.q);
      return Math.max(...qs) - Math.min(...qs);
    };
    expect(width()).toBeCloseTo(1 / 3);
    expect(width(0.02)).toBeCloseTo(0.02);
  });
});
