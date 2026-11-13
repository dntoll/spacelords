import { describe, expect, it } from 'vitest';
import {
  BoardingBattle,
  type BoardingBattleState,
  type BoardingPerson,
} from '../../src/client/models/boarding/BoardingBattle.js';
import {
  BoardingMap,
  type BoardingTerrain,
} from '../../src/client/models/boarding/BoardingMap.js';

/** A 12×5 deck with a closed door at 8,2 and an open door at 3,1. */
function corridor() {
  const terrain = new Map<string, BoardingTerrain>();
  for (let r = 0; r < 5; r++)
    for (let q = 0; q < 12; q++) terrain.set(`${q},${r}`, 'floor');
  const map = new BoardingMap(
    'Corridor',
    12,
    5,
    terrain,
    new Map(),
    [
      { id: 'far-door', kind: 'door', position: { q: 8, r: 2 } },
      { id: 'near-door', kind: 'door', position: { q: 3, r: 1 } },
    ],
    {
      player: [
        { q: 1, r: 2 },
        { q: 0, r: 4 },
      ],
      defender: [{ q: 11, r: 4 }],
      civilian: [],
    },
  );
  const initial = BoardingBattle.create(map, 17).snapshot;
  const [actor, other] = initial.people.filter(
    (person) => person.side === 'player',
  );
  const enemy = initial.people.find((person) => person.side === 'defender')!;
  const state: BoardingBattleState = {
    ...initial,
    people: initial.people.map((person) => ({ ...person, facing: 0 })),
    features: initial.features.map((feature) =>
      feature.id === 'near-door' ? { ...feature, open: true } : feature,
    ),
    currentActorId: actor!.id,
    activation: { id: actor!.id, remaining: 12 },
    initiativeOrder: [actor!.id, enemy.id, other!.id],
    initiativeIndex: 0,
    postponed: [],
    finishedActors: [],
  };
  const restore = (
    remaining = 12,
    change: (person: BoardingPerson) => BoardingPerson = (person) => person,
  ) =>
    BoardingBattle.restore(map, {
      ...state,
      activation: { id: actor!.id, remaining },
      people: state.people.map(change),
    });
  return { actor: actor!, other: other!, restore };
}

describe('granat-kostar-bara-vid-kast', () => {
  it('keeps AP and grenades when the target tile is out of range', () => {
    const { actor, restore } = corridor();
    const battle = restore();
    const far = { q: 10, r: 2 };
    expect(battle.grenadeReason(actor.id, 'frag', far)).toMatch(/range/);
    expect(() =>
      battle.command({ type: 'grenade', grenade: 'frag', at: far }),
    ).toThrow(/range/);
    expect(battle.snapshot.activation?.remaining).toBe(12);
    expect(
      battle.snapshot.people.find((person) => person.id === actor.id)
        ?.fragGrenades,
    ).toBe(1);
  });

  it('keeps AP when no grenade of that kind remains', () => {
    const { actor, restore } = corridor();
    const battle = restore(12, (person) =>
      person.id === actor.id ? { ...person, smokeGrenades: 0 } : person,
    );
    const near = { q: 3, r: 2 };
    expect(battle.grenadeReason(actor.id, 'smoke', near)).toMatch(/No smoke/);
    expect(() =>
      battle.command({ type: 'grenade', grenade: 'smoke', at: near }),
    ).toThrow(/No smoke/);
    expect(battle.snapshot.activation?.remaining).toBe(12);
    expect(battle.grenadeReason(actor.id, 'frag', near)).toBeNull();
  });
});

describe('stang-oppen-dorr', () => {
  it('closes an adjacent open door for 1 AP', () => {
    const { actor, restore } = corridor();
    const battle = restore(12, (person) =>
      person.id === actor.id ? { ...person, position: { q: 3, r: 2 } } : person,
    );
    expect(battle.doorReason(actor.id, 'near-door', 'close')).toBeNull();
    battle.command({ type: 'door', id: 'near-door', action: 'close' });
    expect(
      battle.snapshot.features.find((feature) => feature.id === 'near-door')
        ?.open,
    ).toBe(false);
    expect(battle.snapshot.activation?.remaining).toBe(11);
  });

  it('refuses to close a door while someone stands in the doorway', () => {
    const { actor, other, restore } = corridor();
    const battle = restore(12, (person) =>
      person.id === actor.id
        ? { ...person, position: { q: 3, r: 2 } }
        : person.id === other.id
          ? { ...person, position: { q: 3, r: 1 } }
          : person,
    );
    expect(battle.doorReason(actor.id, 'near-door', 'close')).toMatch(
      /occupied/,
    );
    expect(() =>
      battle.command({ type: 'door', id: 'near-door', action: 'close' }),
    ).toThrow(/occupied/);
    expect(battle.snapshot.activation?.remaining).toBe(12);
  });

  it('refuses a door that is not adjacent', () => {
    const { actor, restore } = corridor();
    expect(restore().doorReason(actor.id, 'near-door', 'close')).toMatch(
      /adjacent/,
    );
  });
});

describe('gang-mot-avlagset-mal', () => {
  it('stops at the furthest affordable tile on the route', () => {
    const { actor, restore } = corridor();
    const battle = restore(4);
    expect(battle.pathTo(actor.id, { q: 6, r: 2 })!.cost).toBeGreaterThan(4);
    const step = battle.stepTowards(actor.id, { q: 6, r: 2 });
    expect(step).toEqual({ q: 3, r: 2 });
    battle.command({ type: 'move', to: step! });
    expect(
      battle.snapshot.people.find((person) => person.id === actor.id)?.position,
    ).toEqual({ q: 3, r: 2 });
  });

  it('walks towards a closed door and stops beside it', () => {
    const { actor, restore } = corridor();
    expect(restore(8).stepTowards(actor.id, { q: 8, r: 2 })).toEqual({
      q: 5,
      r: 2,
    });
    expect(restore(30).stepTowards(actor.id, { q: 8, r: 2 })).toEqual({
      q: 7,
      r: 2,
    });
  });

  it('returns null when not even one step is affordable', () => {
    const { actor, restore } = corridor();
    expect(restore(1).stepTowards(actor.id, { q: 10, r: 2 })).toBeNull();
  });
});

describe('ingen-rok-i-hela-vaggar', () => {
  function walled(destroyed: boolean) {
    const terrain = new Map<string, BoardingTerrain>();
    for (let r = 0; r < 5; r++)
      for (let q = 0; q < 6; q++)
        terrain.set(`${q},${r}`, q === 3 ? 'wall' : 'floor');
    const map = new BoardingMap(
      'Walled',
      6,
      5,
      terrain,
      new Map(),
      [0, 1, 2, 3, 4].map((r) => ({
        id: `wall-${r}`,
        kind: 'wall' as const,
        position: { q: 3, r },
      })),
      {
        player: [{ q: 1, r: 2 }],
        defender: [{ q: 5, r: 4 }],
        civilian: [],
      },
    );
    const initial = BoardingBattle.create(map, 17).snapshot;
    const actor = initial.people.find((person) => person.side === 'player')!;
    return BoardingBattle.restore(map, {
      ...initial,
      features: initial.features.map((feature) =>
        feature.id === 'wall-2' ? { ...feature, destroyed } : feature,
      ),
      currentActorId: actor.id,
      activation: { id: actor.id, remaining: 12 },
      initiativeOrder: [actor.id],
      initiativeIndex: 0,
      postponed: [],
      finishedActors: [],
    });
  }

  it('keeps grenade smoke out of intact wall tiles', () => {
    const battle = walled(false);
    battle.command({ type: 'grenade', grenade: 'smoke', at: { q: 2, r: 2 } });
    const impact = battle.shot!.to;
    expect(
      battle.snapshot.smoke.filter((entry) => entry.position.q === 3),
    ).toEqual([]);
    expect(battle.snapshot.smoke.length).toBeGreaterThan(0);
    expect(impact.q).not.toBe(3);
  });

  it('lets smoke into a shot-out wall tile', () => {
    const battle = walled(true);
    battle.command({ type: 'grenade', grenade: 'smoke', at: { q: 2, r: 2 } });
    if (Math.abs(battle.shot!.to.q - 3) <= 1)
      expect(
        battle.snapshot.smoke.some(
          (entry) => entry.position.q === 3 && entry.position.r === 2,
        ),
      ).toBe(battle.shot!.to.r >= 1 && battle.shot!.to.r <= 3);
  });
});
