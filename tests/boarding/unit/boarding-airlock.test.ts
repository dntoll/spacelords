import { describe, expect, it } from 'vitest';
import {
  BoardingBattle,
  type BoardingBattleState,
} from '../../../src/client/boarding/models/battle/BoardingBattle.js';
import {
  parseBoardingMap,
  type BoardingCell,
} from '../../../src/client/boarding/models/map/BoardingMap.js';

/**
 * A floor corridor between hull rows. `objects` describes the middle row; an
 * `A` there is an airlock on floor, as docking leaves it between ship and
 * gangway. The player and a guard are placed where each test needs them.
 */
function corridor(objects: string) {
  const width = objects.length;
  const row = (symbol: string) => symbol.repeat(width);
  const map = parseBoardingMap(
    [
      '[meta]',
      'name=Airlock',
      `width=${width}`,
      'height=3',
      'rules=campaign',
      '',
      '[terrain]',
      row('H'),
      row('.'),
      row('H'),
      '',
      '[objects]',
      row('-'),
      objects,
      row('-'),
      '',
      '[rooms]',
      row('-'),
      row('-'),
      row('-'),
      '',
      '[spawns]',
      row('-'),
      `P${'-'.repeat(width - 2)}D`,
      row('-'),
      '',
    ].join('\n'),
  );
  const created = BoardingBattle.create(map, 5);
  const player = created.snapshot.people.find(
    (person) => person.side === 'player',
  )!;
  const guard = created.snapshot.people.find(
    (person) => person.side === 'defender',
  )!;
  const at = (playerQ: number, guardQ: number) => {
    const state: BoardingBattleState = {
      ...created.snapshot,
      people: created.snapshot.people.map((person) =>
        person.id === player.id
          ? { ...person, position: { q: playerQ, r: 1 }, facing: 0 }
          : person.id === guard.id
            ? { ...person, position: { q: guardQ, r: 1 } }
            : person,
      ),
      initiativeOrder: [player.id],
      initiativeIndex: 0,
      currentActorId: player.id,
      activation: { id: player.id, remaining: 12 },
    };
    return BoardingBattle.restore(map, state);
  };
  const sees = (battle: BoardingBattle, cell: BoardingCell) =>
    battle
      .sightFrom(player.id)
      .some((entry) => entry.q === cell.q && entry.r === cell.r);
  return { at, sees, player, guard };
}

describe('forseglad-airlock', () => {
  it('airlock-oppnar-at-blickriktning: lets an occupant see through its open door only', () => {
    const map = parseBoardingMap(
      [
        '[meta]',
        'name=Vertical airlock',
        'width=3',
        'height=7',
        'rules=campaign',
        '[terrain]',
        'H.H',
        'H.H',
        'H.H',
        'H.H',
        'H.H',
        'H.H',
        'H.H',
        '[objects]',
        '---',
        '---',
        '---',
        '-A-',
        '---',
        '---',
        '---',
        '[rooms]',
        '---',
        '---',
        '---',
        '---',
        '---',
        '---',
        '---',
        '[spawns]',
        '---',
        '-D-',
        '---',
        '-P-',
        '---',
        '---',
        '---',
      ].join('\n'),
    );
    const initial = BoardingBattle.create(map, 5).snapshot;
    const player = initial.people.find((p) => p.side === 'player')!;
    const guard = initial.people.find((p) => p.side === 'defender')!;
    const facing = (direction: number) =>
      BoardingBattle.restore(map, {
        ...initial,
        people: initial.people.map((p) =>
          p.id === player.id
            ? { ...p, facing: direction }
            : p.id === guard.id
              ? { ...p, facing: 3 }
              : p,
        ),
      });
    expect(facing(1).sightFrom(player.id)).toContainEqual(
      expect.objectContaining({ q: 1, r: 1 }),
    );
    expect(facing(1).sightFrom(guard.id)).toContainEqual(
      expect.objectContaining({ q: 1, r: 3 }),
    );
    expect(facing(3).sightFrom(player.id)).not.toContainEqual(
      expect.objectContaining({ q: 1, r: 1 }),
    );
  });
  it('stops sight and shots through the airlock', () => {
    const open = corridor('-------');
    const sealed = corridor('---A---');
    const guardCell = { q: 6, r: 1 };
    expect(open.sees(open.at(0, 6), guardCell)).toBe(true);
    expect(sealed.sees(sealed.at(0, 6), guardCell)).toBe(false);
    expect(
      sealed.at(0, 6).attackPreview(sealed.player.id, sealed.guard.id).reason,
    ).not.toBeNull();
  });

  it('hides someone inside the airlock from the tile right beside it', () => {
    const scene = corridor('---A---');
    const battle = scene.at(2, 3);
    expect(scene.sees(battle, { q: 3, r: 1 })).toBe(false);
    expect(
      battle.attackPreview(scene.player.id, scene.guard.id).reason,
    ).not.toBeNull();
  });

  it('shows the closed doors from outside without showing who is inside', () => {
    const scene = corridor('---A---');
    const { snapshot } = scene.at(2, 3);
    const has = (cells: readonly BoardingCell[]) =>
      cells.some((cell) => cell.q === 3 && cell.r === 1);
    // Known, so its doors are drawn; not visible, so the guard is not.
    expect(has(snapshot.exploredCells)).toBe(true);
    expect(has(snapshot.visibleCells)).toBe(false);
    // Behind a closed door, the airlock stays unknown.
    const behindDoor = corridor('-D-A---');
    expect(has(behindDoor.at(0, 6).snapshot.exploredCells)).toBe(false);
  });

  it('lets someone inside the airlock see only their own tile', () => {
    const scene = corridor('---A---');
    const sight = scene.at(3, 6).sightFrom(scene.player.id);
    // sightFrom never lists the observer's own tile, so nothing is left.
    expect(sight).toEqual([]);
    const outline = scene.at(3, 6).sightArea(scene.player.id).outline;
    expect(Math.max(...outline.map((point) => point.q))).toBeCloseTo(3.5);
    expect(Math.min(...outline.map((point) => point.q))).toBeCloseTo(2.5);
  });

  it('keeps grenade splinters outside out of the airlock', () => {
    const throwNextTo = (objects: string) => {
      const scene = corridor(objects);
      const battle = scene.at(0, 3);
      const before = battle.snapshot.people.find(
        (person) => person.id === scene.guard.id,
      )!.hitPoints;
      battle.command({ type: 'grenade', grenade: 'frag', at: { q: 2, r: 1 } });
      const after = battle.snapshot.people.find(
        (person) => person.id === scene.guard.id,
      )!.hitPoints;
      return before - after;
    };
    // Control: the same blast hurts a guard standing on plain floor.
    expect(throwNextTo('-------')).toBeGreaterThan(0);
    expect(throwNextTo('---A---')).toBe(0);
  });

  it('costs no extra AP to walk through the airlock', () => {
    const cost = (objects: string) => {
      const scene = corridor(objects);
      return scene.at(0, 6).pathTo(scene.player.id, { q: 5, r: 1 })?.cost;
    };
    expect(cost('---A---')).toBeDefined();
    expect(cost('---A---')).toBe(cost('-------'));
  });
});
