import { beforeEach, describe, expect, it } from 'vitest';
import transportMap from '../../src/client/maps/transport-boarding.txt?raw';
import { parseBoardingMap } from '../../src/client/models/BoardingMap.js';
import {
  BoardingBattle,
  type BoardingBattleState,
} from '../../src/client/models/BoardingBattle.js';

const map = parseBoardingMap(transportMap);
let battle: BoardingBattle;

beforeEach(() => {
  battle = BoardingBattle.create(map, 73);
});

function restore(change: (state: BoardingBattleState) => BoardingBattleState) {
  battle = BoardingBattle.restore(map, change(battle.snapshot));
}

describe('forsvarare-och-civilister', () => {
  it('never runs AI for the player actor', () => {
    const player = battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    restore((state) => ({
      ...state,
      currentActorId: player.id,
      activation: { id: player.id, remaining: 12 },
    }));
    const before = battle.snapshot;
    expect(battle.actAutomatically(true)).toBe(false);
    expect(battle.snapshot).toBe(before);
  });

  it('uses shared current sight to shoot a boarder through the public command path', () => {
    const player = battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    const defender = battle.snapshot.people.find(
      (person) => person.side === 'defender',
    )!;
    restore((state) => ({
      ...state,
      randomState: 10_000,
      people: state.people.map((person) => {
        if (person.id === defender.id)
          return { ...person, position: { q: 4, r: 5 }, facing: 0 };
        if (person.id === player.id)
          return { ...person, position: { q: 6, r: 5 }, facing: 3 };
        return person;
      }),
      initiativeOrder: [defender.id],
      initiativeIndex: 0,
      currentActorId: defender.id,
      activation: { id: defender.id, remaining: 12 },
    }));
    expect(battle.actAutomatically(true)).toBe(true);
    expect(battle.snapshot.log.join(' ')).toMatch(/Rifle by Defender.*D20/i);
  });

  it('moves civilians toward escape pods after all soldiers have acted', () => {
    const player = battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    const before = battle.snapshot.people
      .filter((person) => person.side === 'civilian')
      .map((person) => `${person.position.q},${person.position.r}`);
    restore((state) => ({
      ...state,
      initiativeOrder: [player.id],
      initiativeIndex: 0,
      currentActorId: player.id,
      activation: { id: player.id, remaining: 12 },
    }));
    battle.command({ type: 'end-activation' });
    const after = battle.snapshot.people
      .filter((person) => person.side === 'civilian')
      .map((person) => `${person.position.q},${person.position.r}`);
    expect(after).not.toEqual(before);
  });
});
