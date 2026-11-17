import { describe, expect, it } from 'vitest';
import {
  BoardingBattle,
  type BoardingBattleState,
} from '../../../src/client/boarding/models/battle/BoardingBattle.js';
import {
  BoardingMap,
  type BoardingTerrain,
} from '../../../src/client/boarding/models/map/BoardingMap.js';

function scene(defender: { q: number; r: number }, defenderFacing: number) {
  const terrain = new Map<string, BoardingTerrain>();
  for (let q = 0; q < 8; q++)
    for (let r = 0; r < 8; r++) terrain.set(`${q},${r}`, 'floor');
  const map = new BoardingMap('Smoke sight', 8, 8, terrain, new Map(), [], {
    player: [{ q: 2, r: 3 }],
    defender: [defender],
    civilian: [],
  });
  const initial = BoardingBattle.create(map, 5).snapshot;
  return (smoke: readonly { q: number; r: number }[]) => {
    const state: BoardingBattleState = {
      ...initial,
      people: initial.people.map((person) => ({
        ...person,
        facing: person.side === 'player' ? 0 : defenderFacing,
      })),
      smoke: smoke.map((position) => ({ position, amount: 1 })),
      smokeCells: [...smoke],
    };
    const battle = BoardingBattle.restore(map, state);
    battle.synchronize();
    return battle;
  };
}

const ids = (people: readonly { id: string }[]) => people.map((p) => p.id);

describe('grannruta-syns-genom-rok', () => {
  it('lets two people on adjacent tiles see each other when both stand in smoke', () => {
    const battle = scene(
      { q: 3, r: 3 },
      2,
    )([
      { q: 2, r: 3 },
      { q: 3, r: 3 },
    ]);
    expect(ids(battle.visibleOpponents('player'))).toEqual(['defender-1']);
    expect(ids(battle.visibleOpponents('defender'))).toEqual(['player-1']);
  });

  it('also sees a diagonal neighbour through smoke on every tile around', () => {
    const smoke = [];
    for (let q = 1; q <= 4; q++)
      for (let r = 2; r <= 5; r++) smoke.push({ q, r });
    const battle = scene({ q: 3, r: 4 }, 5)(smoke);
    expect(ids(battle.visibleOpponents('player'))).toEqual(['defender-1']);
  });

  it('still hides anything beyond the neighbouring tiles behind smoke', () => {
    const battle = scene({ q: 5, r: 3 }, 2)([{ q: 3, r: 3 }]);
    expect(battle.visibleOpponents('player')).toEqual([]);
    const sight = battle.sightFrom('player-1');
    expect(sight).toContainEqual({ q: 3, r: 3 });
    expect(sight).not.toContainEqual({ q: 4, r: 3 });
  });
});
