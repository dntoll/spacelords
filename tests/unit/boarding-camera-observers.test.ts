import { describe, expect, it } from 'vitest';
import { BoardingCameraController } from '../../src/client/views/boarding/BoardingCameraController.js';
import {
  BoardingBattle,
  type BoardingBattleState,
} from '../../src/client/models/boarding/BoardingBattle.js';
import {
  BoardingMap,
  type BoardingTerrain,
} from '../../src/client/models/boarding/BoardingMap.js';

function scene() {
  const terrain = new Map<string, BoardingTerrain>();
  for (let q = 0; q < 8; q++)
    for (let r = 0; r < 8; r++) terrain.set(`${q},${r}`, 'floor');
  const map = new BoardingMap('Camera test', 8, 8, terrain, new Map(), [], {
    player: [
      { q: 1, r: 3 },
      { q: 5, r: 3 },
      { q: 3, r: 6 },
    ],
    defender: [{ q: 3, r: 3 }],
    civilian: [{ q: 3, r: 4 }],
  });
  const initial = BoardingBattle.create(map, 17).snapshot;
  const people = initial.people.map((person) => ({
    ...person,
    facing: person.id === 'player-2' ? 2 : person.id === 'player-3' ? 3 : 0,
  }));
  const restore = (change: Partial<BoardingBattleState> = {}) => {
    const battle = BoardingBattle.restore(map, {
      ...initial,
      people,
      ...change,
    });
    battle.synchronize();
    return battle;
  };
  return {
    map,
    restore,
    state: restore().snapshot,
    camera: new BoardingCameraController(),
  };
}

describe('kameraoverblick-vid-synlig-bordningsrorelse', () => {
  it('uses all actual active observers, excluding people looking away or unable to act', () => {
    const { restore, state } = scene();
    expect(
      restore()
        .playerObserversOf({ q: 3, r: 3 })
        .map((person) => person.id),
    ).toEqual(['player-1', 'player-2']);
    const downed = restore({
      people: state.people.map((person) =>
        person.id === 'player-2'
          ? { ...person, status: 'incapacitated' }
          : person,
      ),
    });
    expect(
      downed.playerObserversOf({ q: 3, r: 3 }).map((person) => person.id),
    ).toEqual(['player-1']);
    const smoke = restore({
      smoke: [{ position: { q: 2, r: 3 }, amount: 1 }],
      smokeCells: [{ q: 2, r: 3 }],
    });
    expect(
      smoke.playerObserversOf({ q: 3, r: 3 }).map((person) => person.id),
    ).toEqual(['player-2']);
    const wall = restore({
      features: [
        {
          id: 'wall',
          kind: 'wall',
          position: { q: 4, r: 3 },
          hitPoints: 10,
          maxHitPoints: 10,
          open: false,
          locked: false,
          destroyed: false,
          exit: null,
        },
      ],
    });
    expect(
      wall.playerObserversOf({ q: 3, r: 3 }).map((person) => person.id),
    ).toEqual(['player-1']);
  });
  for (const id of ['defender-1', 'civilian-1'])
    it(`frames the visible mover ${id} and observers at both visible endpoints`, () => {
      const { map, state, restore, camera } = scene();
      const to = restore({
        people: state.people.map((person) =>
          person.id === id ? { ...person, position: { q: 3, r: 2 } } : person,
        ),
      }).snapshot;
      const subjects = camera.movementSubjects(map, state, to);
      expect(new Set(subjects.map((person) => person.id))).toEqual(
        new Set([id, 'player-1', 'player-2']),
      );
      expect(
        subjects
          .filter((person) => person.id === id)
          .map((person) => person.position),
      ).toEqual([
        state.people.find((person) => person.id === id)!.position,
        { q: 3, r: 2 },
      ]);
    });
  it('ignores hidden movement and never includes a hidden starting position on entry', () => {
    const { map, state, restore, camera } = scene();
    const hidden = { ...state, visibleCells: [], currentActorId: 'defender-1' };
    const to = restore({
      currentActorId: 'defender-1',
      people: state.people.map((person) =>
        person.id === 'defender-1'
          ? { ...person, position: { q: 3, r: 2 } }
          : person,
      ),
    }).snapshot;
    expect(
      camera.movementSubjects(map, hidden, { ...to, visibleCells: [] }),
    ).toEqual([]);
    expect(
      camera
        .movementSubjects(map, hidden, to)
        .filter((person) => person.id === 'defender-1')
        .map((person) => person.position),
    ).toEqual([{ q: 3, r: 2 }]);
    expect(
      camera.movementSubjects(map, state, { ...to, visibleCells: [] }),
    ).toEqual([]);
  });
  it('ignores stationary turns and figures newly revealed by a player turning', () => {
    const { map, state, camera } = scene();
    const turning = {
      ...state,
      people: state.people.map((person) =>
        person.id === 'defender-1' ? { ...person, facing: 2 } : person,
      ),
    };
    expect(camera.movementSubjects(map, state, turning)).toEqual([]);
    const ownTurning = {
      ...state,
      people: state.people.map((person) =>
        person.id === 'player-1' ? { ...person, facing: 1 } : person,
      ),
    };
    expect(
      camera.movementSubjects(map, { ...state, visibleCells: [] }, ownTurning),
    ).toEqual([]);
  });
});
