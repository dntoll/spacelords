// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BoardingBattle,
  type BoardingBattleState,
} from '../../../src/client/boarding/models/battle/BoardingBattle.js';
import {
  BoardingView,
  type BoardingMapFactory,
} from '../../../src/client/boarding/views/battle/BoardingView.js';
import { parseBoardingMap } from '../../../src/client/boarding/models/map/BoardingMap.js';
import {
  boardingContextLiftMeters,
  boardingContextMenuPosition,
  boardingContextTitle,
  boardingIsDoubleTap,
} from '../../../src/client/boarding/views/battle/BoardingContextMenuLayout.js';
import {
  BOARDING_METERS,
  BOARDING_SELECTED_TILE_STROKE,
  BOARDING_SIGHT_STROKE,
} from '../../../src/client/boarding/views/rendering/BoardingScale.js';
import transportFixture from '../../fixtures/boarding/transport-boarding-fixture.txt?raw';

const map = parseBoardingMap(transportFixture, 'Transport ship');

afterEach(() => document.body.replaceChildren());

/** A boarder's turn with one defender placed where the boarder can shoot it. */
function shootingView() {
  const created = BoardingBattle.create(map, 0x5a17).snapshot;
  const player = created.people.find((person) => person.side === 'player')!;
  const enemy = created.people.find((person) => person.side === 'defender')!;
  const base = (position: { q: number; r: number }): BoardingBattleState => ({
    ...created,
    people: created.people.map((person) =>
      person.id === enemy.id ? { ...person, position } : person,
    ),
    currentActorId: player.id,
    activation: { id: player.id, remaining: 12 },
    initiativeOrder: [player.id],
    initiativeIndex: 0,
    postponed: [],
    finishedActors: [],
  });
  let state: BoardingBattleState | null = null;
  for (let r = 0; r < map.height && !state; r++)
    for (let q = 0; q < map.width && !state; q++) {
      if (map.terrainAt({ q, r }) !== 'floor') continue;
      if (q === player.position.q && r === player.position.r) continue;
      const battle = BoardingBattle.restore(map, base({ q, r }));
      if (battle.attackPreview(player.id, enemy.id).reason === null)
        state = battle.snapshot;
    }
  if (!state) throw new Error('No shootable tile in the fixture.');
  const target = state.people.find((person) => person.id === enemy.id)!;
  let select: Parameters<BoardingMapFactory>[1] = () => undefined;
  const emit = vi.fn();
  const view = new BoardingView(
    document.body,
    emit,
    (_container, choose) => {
      select = choose;
      return { render() {}, zoom() {}, fit() {}, dispose() {} };
    },
    () => map,
  );
  view.render(state);
  return { emit, select, target, view };
}

describe('skott-genom-dubbelklick', () => {
  it('fires at an enemy chosen with a double click', () => {
    const { emit, select, target, view } = shootingView();
    select(target.position, target.id, 'shoot');
    expect(emit).toHaveBeenCalledWith({
      type: 'boarding-command',
      command: { type: 'shoot', targetId: target.id },
    });
    view.dispose();
  });

  it('only opens the menu on a single click', () => {
    const { emit, select, target, view } = shootingView();
    select(target.position, target.id);
    // A single click may turn the soldier towards the enemy, but never fires.
    const fired = emit.mock.calls.some((call) =>
      JSON.stringify(call).includes('"type":"shoot"'),
    );
    expect(fired).toBe(false);
    view.dispose();
  });

  it('counts two taps as a double click only when they come quickly', () => {
    expect(boardingIsDoubleTap(1000, 1300)).toBe(true);
    expect(boardingIsDoubleTap(1000, 1900)).toBe(false);
  });
});

describe('hp-i-valt-mal', () => {
  it('shows the hit points after the selected enemy title', () => {
    const { select, target, view } = shootingView();
    select(target.position, target.id);
    expect(
      document.querySelector('.boarding-context-description')?.textContent,
    ).toBe(`${target.label} · ${target.hitPoints}/${target.maxHitPoints} HP`);
    view.dispose();
  });

  it('leaves the title of floor and hull without hit points', () => {
    expect(boardingContextTitle('floor', undefined)).toBe('floor');
    const hull = map.features.find((feature) => feature.kind === 'hull');
    if (hull)
      expect(
        boardingContextTitle('hull', {
          ...hull,
          hitPoints: 5,
          maxHitPoints: 5,
          open: false,
          locked: false,
          destroyed: false,
          exit: null,
        }),
      ).toBe('hull');
  });
});

describe('meny-ovanfor-valt-mal', () => {
  it('lifts the menu over a standing figure and a door, not over bare floor', () => {
    const position = (liftPx: number) =>
      boardingContextMenuPosition({
        point: { x: 400, y: 400 },
        liftPx,
        width: 120,
        height: 60,
        canvasWidth: 800,
        maxBottom: 560,
      });
    const standing = 90;
    expect(position(standing).top + 60).toBeLessThanOrEqual(400 - standing);
    expect(position(standing).top).toBeLessThan(position(0).top);
  });

  it('measures doors as taller than a standing soldier', () => {
    const { target } = shootingView();
    expect(boardingContextLiftMeters(target)).toBe(BOARDING_METERS.person);
    const door = map.features.find((feature) => feature.kind === 'door')!;
    expect(
      boardingContextLiftMeters({
        ...door,
        hitPoints: 10,
        maxHitPoints: 10,
        open: false,
        locked: false,
        destroyed: false,
        exit: null,
      }),
    ).toBeGreaterThan(BOARDING_METERS.person);
    expect(boardingContextLiftMeters(undefined)).toBe(0);
  });
});

describe('tunn-ram-kring-vald-ruta', () => {
  it('frames the selected tile with a line as thin as the sight outline', () => {
    expect(BOARDING_SELECTED_TILE_STROKE).toBe(BOARDING_SIGHT_STROKE);
    expect(BOARDING_SELECTED_TILE_STROKE).toBeLessThan(2);
  });
});
