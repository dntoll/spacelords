// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import {
  BoardingBattle,
  type BoardingBattleState,
} from '../../../src/client/boarding/models/battle/BoardingBattle.js';
import {
  BoardingView,
  type BoardingMapFactory,
} from '../../../src/client/boarding/views/battle/BoardingView.js';
import { parseBoardingMap } from '../../../src/client/boarding/models/map/BoardingMap.js';
import transportFixture from '../../fixtures/boarding/transport-boarding-fixture.txt?raw';
import {
  boardingActionArtwork,
  boardingActionBackgroundPosition,
  boardingActionSource,
} from '../../../src/client/boarding/views/rendering/BoardingActionArtwork.js';

const map = parseBoardingMap(transportFixture, 'Transport ship');

afterEach(() => document.body.replaceChildren());

it('ap-kostnad-och-handlingssymbol-pa-bordningsruta: reuses the Move button artwork for tile guidance', () => {
  expect(boardingActionArtwork('Move · 4 AP')).toBe('Move');
  expect(boardingActionBackgroundPosition('Move')).toBe(`${(2 / 3) * 100}% 0%`);
  expect(boardingActionSource('Move', 1448, 1086)).toEqual({
    x: 724,
    y: 0,
    width: 362,
    height: 362,
  });
});

function guidanceView(change: Partial<BoardingBattleState> = {}) {
  const created = BoardingBattle.create(map, 0x5a17).snapshot;
  const player = created.people.find((person) => person.side === 'player')!;
  const state: BoardingBattleState = {
    ...created,
    currentActorId: player.id,
    activation: { id: player.id, remaining: 12 },
    initiativeOrder: [player.id],
    initiativeIndex: 0,
    postponed: [],
    finishedActors: [],
    ...change,
  };
  const snapshot = BoardingBattle.restore(map, state).snapshot;
  let select: Parameters<BoardingMapFactory>[1] = () => undefined;
  const render = vi.fn<ReturnType<BoardingMapFactory>['render']>();
  const view = new BoardingView(
    document.body,
    vi.fn(),
    (_container, choose) => {
      select = choose;
      return { render, zoom() {}, fit() {}, dispose() {} };
    },
    () => map,
  );
  view.render(snapshot);
  return { player, render, select, snapshot, view };
}

it('ap-kostnad-och-handlingssymbol-pa-bordningsruta: marks a repeated destination tap with the Move artwork', () => {
  const setup = guidanceView();
  const battle = BoardingBattle.restore(map, setup.snapshot);
  let destination = setup.player.position;
  for (let r = 0; r < map.height; r++) {
    for (let q = 0; q < map.width; q++) {
      const route = battle.pathTo(setup.player.id, { q, r });
      if (route && route.cost > 0 && route.cost <= 12) destination = { q, r };
    }
  }
  setup.select(destination);
  const call = setup.render.mock.calls.at(-1)!;
  expect(call[3].every((mark) => mark.cost > 0)).toBe(true);
  expect(call[6]).toEqual({ position: destination, action: 'Move' });
  setup.view.dispose();
});

it('ap-kostnad-och-handlingssymbol-pa-bordningsruta: shows the action a second tap performs on an adjacent door', () => {
  const door = map.features.find((feature) => feature.kind === 'door')!;
  const created = BoardingBattle.create(map, 0x5a17).snapshot;
  const player = created.people.find((person) => person.side === 'player')!;
  const position = [
    { q: door.position.q - 1, r: door.position.r },
    { q: door.position.q + 1, r: door.position.r },
    { q: door.position.q, r: door.position.r - 1 },
    { q: door.position.q, r: door.position.r + 1 },
  ].find((cell) => map.terrainAt(cell) === 'floor')!;
  const setup = guidanceView({
    people: created.people.map((person) =>
      person.id === player.id ? { ...person, position } : person,
    ),
  });
  setup.select(door.position);
  expect(setup.render.mock.calls.at(-1)?.[6]).toEqual({
    position: door.position,
    action: door.locked ? 'Hack door' : 'Open door',
  });
  setup.view.dispose();
});
