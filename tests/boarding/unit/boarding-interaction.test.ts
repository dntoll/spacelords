import { describe, expect, it } from 'vitest';
import {
  BoardingBattle,
  boardingRangeDefense,
  type BoardingBattleState,
} from '../../../src/client/boarding/models/battle/BoardingBattle.js';
import {
  BoardingMap,
  type BoardingTerrain,
} from '../../../src/client/boarding/models/map/BoardingMap.js';

function arena(blocked = false) {
  const terrain = new Map<string, BoardingTerrain>();
  for (let r = 0; r < 7; r++)
    for (let q = 0; q < 7; q++) terrain.set(`${q},${r}`, 'floor');
  if (blocked) terrain.set('3,2', 'hull');
  const map = new BoardingMap('Arena', 7, 7, terrain, new Map(), [], {
    player: [
      { q: 2, r: 2 },
      { q: 1, r: 1 },
    ],
    defender: [{ q: 5, r: 2 }],
    civilian: [],
  });
  const initial = BoardingBattle.create(map, 17).snapshot;
  const [actor, other] = initial.people.filter(
    (person) => person.side === 'player',
  );
  const enemy = initial.people.find((person) => person.side === 'defender')!;
  const state: BoardingBattleState = {
    ...initial,
    people: initial.people.map((person) => ({ ...person, facing: 0 })),
    currentActorId: actor!.id,
    activation: { id: actor!.id, remaining: 12 },
    initiativeOrder: [actor!.id, enemy.id, other!.id],
    initiativeIndex: 0,
    postponed: [],
    finishedActors: [],
  };
  return {
    map,
    state,
    actor: actor!,
    other: other!,
    enemy,
    restore: (change: Partial<BoardingBattleState> = {}) =>
      BoardingBattle.restore(map, { ...state, ...change }),
  };
}

describe('actionpoints-och-riktad-forflyttning', () => {
  it('preserves saved cardinal directions and adds four diagonal forward steps', () => {
    expect(
      Array.from({ length: 8 }, (_, facing) =>
        BoardingBattle.forward({ q: 0, r: 0 }, facing),
      ),
    ).toEqual([
      { q: 1, r: 0 },
      { q: 0, r: -1 },
      { q: -1, r: 0 },
      { q: 0, r: 1 },
      { q: 1, r: -1 },
      { q: -1, r: -1 },
      { q: -1, r: 1 },
      { q: 1, r: 1 },
    ]);
  });
  it('billig-vandning: charges a quarter AP per 45-degree turn and three per standing diagonal', () => {
    const { restore, actor } = arena();
    const battle = restore();
    battle.command({ type: 'turn', direction: 1 });
    expect(
      battle.snapshot.people.find((person) => person.id === actor.id)?.facing,
    ).toBe(4);
    expect(battle.snapshot.activation?.remaining).toBe(11.75);
    const path = battle.pathTo(actor.id, { q: 3, r: 1 });
    expect(path?.cost).toBe(3);
    battle.command({ type: 'move', to: { q: 3, r: 1 } });
    expect(battle.snapshot.activation?.remaining).toBe(8.75);
  });
  it('billig-vandning: a route that turns pays a quarter AP per turn', () => {
    const { restore, actor } = arena();
    const battle = restore();
    // Facing east, reaching the tile behind needs four turns and one step.
    const path = battle.pathTo(actor.id, { q: 1, r: 2 });
    expect(path?.turns).toBe(4);
    expect(path?.cost).toBe(3);
    battle.command({ type: 'move', to: { q: 1, r: 2 } });
    expect(battle.snapshot.activation?.remaining).toBe(9);
  });
  it('does not cut a blocked corner', () => {
    const { restore, actor } = arena(true);
    const battle = restore();
    expect(battle.pathTo(actor.id, { q: 3, r: 1 })!.cost).toBeGreaterThan(4);
  });
});

describe('automatisk-bordningstur-vid-tom-ap', () => {
  it('advances once to the next initiative actor after the final AP is spent', () => {
    const { restore, actor, enemy } = arena();
    const battle = restore({ activation: { id: actor.id, remaining: 1 } });
    battle.command({ type: 'crouch' });
    expect(battle.snapshot.currentActorId).toBe(enemy.id);
    expect(battle.snapshot.finishedActors).toEqual([actor.id]);
  });
  it('resumes a postponed soldier with their saved AP', () => {
    const { restore, actor, other } = arena();
    const battle = restore({
      activation: { id: actor.id, remaining: 0.25 },
      postponed: [{ id: other.id, remaining: 3 }],
    });
    battle.command({ type: 'turn', direction: -1 });
    expect(battle.snapshot.activation).toEqual({ id: other.id, remaining: 3 });
  });
  it('does not advance when an action is rejected or AP remains', () => {
    const { restore, actor, enemy } = arena();
    const battle = restore({ activation: { id: actor.id, remaining: 2 } });
    expect(() => battle.command({ type: 'shoot', targetId: enemy.id })).toThrow(
      /AP/,
    );
    expect(battle.snapshot.activation).toEqual({ id: actor.id, remaining: 2 });
    battle.command({ type: 'crouch' });
    expect(battle.snapshot.activation).toEqual({ id: actor.id, remaining: 1 });
  });
});

describe('hukning-minskar-skottchans', () => {
  it('adds two rifle defense in the open without changing melee defense', () => {
    const { restore, state, actor, enemy } = arena();
    const standing = restore();
    const crouched = restore({
      people: state.people.map((person) =>
        person.id === enemy.id ? { ...person, crouched: true } : person,
      ),
    });
    expect(crouched.attackPreview(actor.id, enemy.id).defense).toBe(
      standing.attackPreview(actor.id, enemy.id).defense + 2,
    );
    expect(crouched.attackPreview(actor.id, enemy.id).chance).toBeLessThan(
      standing.attackPreview(actor.id, enemy.id).chance,
    );
    expect(crouched.meleePreview(actor.id, enemy.id).defense).toBe(
      standing.meleePreview(actor.id, enemy.id).defense,
    );
  });
});

describe('traffchans-vid-synliga-fiender', () => {
  it('shows personal sight only, even when an ally sees the enemy', () => {
    const { restore, state, actor, enemy } = arena();
    const battle = restore({
      people: state.people.map((person) =>
        person.id === actor.id ? { ...person, facing: 2 } : person,
      ),
    });
    expect(battle.snapshot.visibleCells).toBeDefined();
    expect(
      battle
        .targetIndicators(actor.id)
        .some((target) => target.id === enemy.id),
    ).toBe(false);
  });
  it('personer-som-pelare-i-sikt: gives no crosshair to an enemy hidden behind a standing person', () => {
    const { restore, state, actor, other, enemy } = arena();
    const battle = restore({
      people: state.people.map((person) =>
        person.id === other.id
          ? { ...person, position: { q: 3, r: 2 } }
          : person,
      ),
    });
    expect(battle.targetIndicators(actor.id)).toEqual([]);
    expect(battle.attackPreview(actor.id, enemy.id).reason).toBe(
      'The shot is blocked.',
    );
  });
  it('reports insufficient AP separately from the hit probability and excludes civilians and dead enemies', () => {
    const { restore, state, actor, enemy } = arena();
    const battle = restore({ activation: { id: actor.id, remaining: 3 } });
    expect(battle.targetIndicators(actor.id)).toEqual([
      expect.objectContaining({
        id: enemy.id,
        affordable: false,
        chance: battle.attackPreview(actor.id, enemy.id).chance,
      }),
    ]);
    expect(
      restore({
        people: state.people.map((person) =>
          person.id === enemy.id ? { ...person, status: 'dead' } : person,
        ),
      }).targetIndicators(actor.id),
    ).toEqual([]);
  });
  it('utslagen-fiende-utan-sikte: gives a knocked-out enemy no crosshair', () => {
    const { restore, state, actor, enemy } = arena();
    expect(
      restore({
        people: state.people.map((person) =>
          person.id === enemy.id
            ? { ...person, status: 'incapacitated', hitPoints: 0 }
            : person,
        ),
      }).targetIndicators(actor.id),
    ).toEqual([]);
  });
});

describe('automatisk-bordningstur-vid-tom-ap', () => {
  it('resolves victory before advancing after a final-AP rifle shot', () => {
    const { restore, state, actor, enemy } = arena();
    const battle = restore({
      randomState: 123456,
      activation: { id: actor.id, remaining: 4 },
      people: state.people.map((person) =>
        person.id === actor.id
          ? { ...person, accuracy: 100 }
          : person.id === enemy.id
            ? { ...person, hitPoints: 1 }
            : person,
      ),
    });
    battle.command({ type: 'shoot', targetId: enemy.id });
    expect(battle.snapshot.phase).toBe('complete');
    expect(battle.snapshot.outcome).toBe('victory');
    expect(battle.snapshot.currentActorId).toBeNull();
    expect(battle.shot).not.toBeNull();
  });
  it('keeps the final movement frame on the acting soldier before selecting the next', () => {
    const { restore, actor, enemy } = arena();
    const battle = restore({ activation: { id: actor.id, remaining: 2 } });
    battle.command({ type: 'move', to: { q: 3, r: 2 } });
    expect(battle.presentation.at(-1)?.currentActorId).toBe(actor.id);
    expect(battle.presentation.at(-1)?.activation?.remaining).toBe(0);
    expect(battle.snapshot.currentActorId).toBe(enemy.id);
  });
});

describe('valbar-bordningssoldat', () => {
  it('preserves AP through repeated manual switches and rejects an exhausted soldier', () => {
    const { restore, actor, other } = arena();
    const battle = restore();
    battle.command({ type: 'crouch' });
    battle.command({ type: 'select', id: other.id });
    battle.command({ type: 'turn', direction: 1 });
    const otherRemaining = battle.actionPointsRemaining(other.id);
    battle.command({ type: 'select', id: actor.id });
    expect(battle.snapshot.activation).toEqual({ id: actor.id, remaining: 11 });
    expect(battle.actionPointsRemaining(other.id)).toBe(otherRemaining);
    const exhausted = restore({ postponed: [{ id: other.id, remaining: 0 }] });
    expect(() => exhausted.command({ type: 'select', id: other.id })).toThrow(
      /no AP/i,
    );
  });
});

describe('hukning-minskar-skottchans', () => {
  it('keeps total crouched Half cover defense at five and stacks smoke separately', () => {
    const { restore, state, actor, enemy } = arena();
    const battle = restore({
      people: state.people.map((person) =>
        person.id === enemy.id ? { ...person, crouched: true } : person,
      ),
      features: [
        {
          id: 'cover',
          kind: 'cover',
          position: { q: 4, r: 2 },
          hitPoints: 10,
          maxHitPoints: 10,
          open: false,
          locked: false,
          destroyed: false,
          exit: null,
        },
      ],
      smoke: [{ position: enemy.position, amount: 1 }],
      smokeCells: [enemy.position],
    });
    // Shooter (2,2) to enemy (5,2) is three tiles: +1 for avstand-paverkar-traffchans.
    expect(battle.attackPreview(actor.id, enemy.id).defense).toBe(
      enemy.defense + 7 + boardingRangeDefense(3),
    );
  });
  it('uses the preview defense in an actual rifle attack', () => {
    const { restore, state, actor, enemy } = arena();
    const battle = restore({
      people: state.people.map((person) =>
        person.id === enemy.id ? { ...person, crouched: true } : person,
      ),
    });
    const preview = battle.attackPreview(actor.id, enemy.id);
    battle.command({ type: 'shoot', targetId: enemy.id });
    expect(battle.snapshot.log.join('\n')).toContain(`vs ${preview.defense};`);
  });
});

describe('avstamning-sparkompatibilitet', () => {
  it('restores old cardinal and new diagonal facings without changing AP or random state', () => {
    const { map, state, actor } = arena();
    for (let facing = 0; facing < 8; facing++) {
      const saved = JSON.parse(
        JSON.stringify({
          ...state,
          people: state.people.map((person) =>
            person.id === actor.id ? { ...person, facing } : person,
          ),
        }),
      ) as BoardingBattleState;
      const restored = BoardingBattle.restore(map, saved).snapshot;
      expect(restored).toEqual(saved);
      expect(
        restored.people.find((person) => person.id === actor.id)?.facing,
      ).toBe(facing);
    }
  });
});

describe('fiende-syns-till-sin-tur', () => {
  const lookAway = () => {
    const { restore, state, other, enemy } = arena();
    const battle = restore({
      people: state.people.map((person) =>
        person.id === other.id ? { ...person, facing: 2 } : person,
      ),
    });
    // Four 45-degree turns take the actor from east to west.
    for (let turn = 0; turn < 4; turn++)
      battle.command({ type: 'turn', direction: 1 });
    return { battle, enemy };
  };
  const shown = (battle: BoardingBattle, id: string) =>
    battle.visibleSnapshot.people.some((person) => person.id === id);

  it('keeps a seen enemy on the map after the squad looks away', () => {
    const { battle, enemy } = lookAway();
    expect(
      battle.snapshot.visibleCells.some(
        (cell) => cell.q === enemy.position.q && cell.r === enemy.position.r,
      ),
    ).toBe(false);
    expect(shown(battle, enemy.id)).toBe(true);
  });
  it('hides the enemy once its own activation begins out of sight', () => {
    const { battle, enemy } = lookAway();
    battle.command({ type: 'end-activation' });
    expect(battle.snapshot.currentActorId).toBe(enemy.id);
    expect(shown(battle, enemy.id)).toBe(false);
    expect(battle.snapshot.lastKnownEnemies).toContainEqual({
      id: enemy.id,
      position: enemy.position,
    });
  });
  it('never shows an enemy the squad has not seen', () => {
    const { restore, state, enemy } = arena();
    const battle = restore({
      people: state.people.map((person) =>
        person.side === 'player' ? { ...person, facing: 2 } : person,
      ),
      lastKnownEnemies: [],
      lingeringPersonIds: [],
    });
    battle.command({ type: 'turn', direction: 1 });
    expect(shown(battle, enemy.id)).toBe(false);
  });
});

describe('fiende-syns-till-sin-tur: civilians', () => {
  it('keeps a seen civilian on the map until the civilian phase', () => {
    const terrain = new Map<string, BoardingTerrain>();
    for (let r = 0; r < 7; r++)
      for (let q = 0; q < 7; q++) terrain.set(`${q},${r}`, 'floor');
    const map = new BoardingMap('Arena', 7, 7, terrain, new Map(), [], {
      player: [{ q: 2, r: 2 }],
      defender: [{ q: 0, r: 6 }],
      civilian: [{ q: 5, r: 3 }],
    });
    const initial = BoardingBattle.create(map, 17).snapshot;
    const actor = initial.people.find((person) => person.side === 'player')!;
    const enemy = initial.people.find((person) => person.side === 'defender')!;
    const civilian = initial.people.find(
      (person) => person.side === 'civilian',
    )!;
    const battle = BoardingBattle.restore(map, {
      ...initial,
      people: initial.people.map((person) =>
        person.id === actor.id
          ? { ...person, facing: 0 }
          : person.id === enemy.id
            ? { ...person, facing: 2 }
            : person,
      ),
      currentActorId: actor.id,
      activation: { id: actor.id, remaining: 12 },
      initiativeOrder: [actor.id, enemy.id],
      initiativeIndex: 0,
      postponed: [],
      finishedActors: [],
      lastKnownEnemies: [],
      lingeringPersonIds: [],
    });
    const shown = () =>
      battle.visibleSnapshot.people.some((person) => person.id === civilian.id);
    for (let turn = 0; turn < 4; turn++)
      battle.command({ type: 'turn', direction: 1 });
    expect(shown()).toBe(true);
    battle.command({ type: 'end-activation' });
    expect(battle.snapshot.currentActorId).toBe(enemy.id);
    expect(shown()).toBe(true);
    const round = battle.snapshot.round;
    battle.command({ type: 'end-activation' });
    expect(battle.snapshot.round).toBe(round + 1);
    expect(shown()).toBe(false);
  });
});
