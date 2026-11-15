import { describe, expect, it } from 'vitest';
import { BoardingBattle } from '../../../src/client/boarding/models/battle/BoardingBattle.js';
import { parseBoardingMap } from '../../../src/client/boarding/models/map/BoardingMap.js';
import { boardingShotGlassState } from '../../../src/client/boarding/views/battle/BoardingShotGlass.js';

/** A corridor with the player at its west end and a guard at its east end. */
function shootThrough(glass: string) {
  const terrain = ['HHHHHHH', `..${glass}....`, 'HHHHHHH'];
  const row = (symbol: string) => symbol.repeat(7);
  const map = parseBoardingMap(
    [
      '[meta]',
      'name=Windows',
      'width=7',
      'height=3',
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
      '-------',
      'P-----D',
      '-------',
      '',
    ].join('\n'),
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
  const before = battle.snapshot;
  battle.command({ type: 'shoot', targetId: guard.id });
  const pane = before.features.find(
    (feature) => feature.position.q === 2 && feature.position.r === 1,
  )!;
  return { before, shot: battle.shot!, pane };
}

describe('glas-krossas-nar-skottet-passerar', () => {
  it('tells how far along the shot each pane it breaks lies', () => {
    for (const glass of ['W', 'q']) {
      const { shot, pane } = shootThrough(glass);
      expect(shot.panes).toHaveLength(1);
      expect(shot.panes![0]!.id).toBe(pane.id);
      // Two tiles of six from the shooter: a quarter to a half of the way.
      expect(shot.panes![0]!.at).toBeGreaterThan(0.2);
      expect(shot.panes![0]!.at).toBeLessThan(0.5);
    }
  });

  it('shows the pane broken only once the bullet has reached it', () => {
    const window = shootThrough('W');
    const pane = window.shot.panes![0]!;
    const find = (state: typeof window.before) =>
      state.features.find((feature) => feature.id === pane.id)!;
    const early = boardingShotGlassState(
      window.before,
      window.shot.panes!,
      pane.at - 0.05,
    );
    expect(find(early).destroyed).toBe(false);
    expect(early).toBe(window.before);
    const late = boardingShotGlassState(
      window.before,
      window.shot.panes!,
      pane.at,
    );
    expect(find(late)).toMatchObject({ destroyed: true, hitPoints: 0 });

    const low = shootThrough('q');
    const lowPane = low.shot.panes![0]!;
    const broken = boardingShotGlassState(low.before, low.shot.panes!, 1);
    expect(
      broken.features.find((feature) => feature.id === lowPane.id),
    ).toMatchObject({ shattered: true, destroyed: false });
  });
});
