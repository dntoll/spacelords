import { describe, expect, it } from 'vitest';
import {
  BoardingBattle,
  type BoardingBattleState,
} from '../../../src/client/boarding/models/battle/BoardingBattle.js';
import { parseBoardingMap } from '../../../src/client/boarding/models/map/BoardingMap.js';

/**
 * A corridor with the player at its west end and a guard at its east end;
 * `terrain` and `objects` describe the middle row.
 */
function corridor(terrain: string, objects: string) {
  const width = terrain.length;
  const row = (symbol: string) => symbol.repeat(width);
  const map = parseBoardingMap(
    [
      '[meta]',
      'name=Crouched sight',
      `width=${width}`,
      'height=3',
      'rules=campaign',
      '',
      '[terrain]',
      row('H'),
      terrain,
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
  const as = (crouched: boolean) => {
    const state: BoardingBattleState = {
      ...created.snapshot,
      people: created.snapshot.people.map((person) =>
        person.id === player.id ? { ...person, facing: 0, crouched } : person,
      ),
      initiativeOrder: [player.id],
      initiativeIndex: 0,
      currentActorId: player.id,
      activation: { id: player.id, remaining: 12 },
    };
    return BoardingBattle.restore(map, state);
  };
  const seesGuard = (crouched: boolean) =>
    as(crouched)
      .sightFrom(player.id)
      .some(
        (cell) => cell.q === guard.position.q && cell.r === guard.position.r,
      );
  const shotReason = (crouched: boolean) =>
    as(crouched).attackPreview(player.id, guard.id).reason;
  return { seesGuard, shotReason };
}

describe('hukad-ser-inte-over-halvskydd', () => {
  it('hides what lies beyond a distant crate from a crouched soldier only', () => {
    const scene = corridor('.......', '---C---');
    expect(scene.seesGuard(false)).toBe(true);
    expect(scene.shotReason(false)).toBeNull();
    expect(scene.seesGuard(true)).toBe(false);
    expect(scene.shotReason(true)).not.toBeNull();
  });

  it('hides what lies beyond a distant low wall from a crouched soldier', () => {
    const scene = corridor('...q...', '-------');
    expect(scene.seesGuard(false)).toBe(true);
    expect(scene.seesGuard(true)).toBe(false);
  });

  it('lets a crouched soldier see and shoot over the half cover right beside them', () => {
    const crate = corridor('.......', '-C-----');
    expect(crate.seesGuard(true)).toBe(true);
    expect(crate.shotReason(true)).toBeNull();
    const wall = corridor('.q.....', '-------');
    expect(wall.seesGuard(true)).toBe(true);
  });
});
