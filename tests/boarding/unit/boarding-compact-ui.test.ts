// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import {
  BoardingBattle,
  type BoardingBattleState,
} from '../../../src/client/boarding/models/battle/BoardingBattle.js';
import { parseBoardingMap } from '../../../src/client/boarding/models/map/BoardingMap.js';
import {
  BoardingView,
  type BoardingMapFactory,
} from '../../../src/client/boarding/views/battle/BoardingView.js';
import transportFixture from '../../fixtures/boarding/transport-boarding-fixture.txt?raw';

const map = parseBoardingMap(transportFixture, 'Transport ship');

afterEach(() => {
  document.body.replaceChildren();
  delete (HTMLElement.prototype as { requestFullscreen?: unknown })
    .requestFullscreen;
  delete (document as { exitFullscreen?: unknown }).exitFullscreen;
  delete (document as { fullscreenElement?: unknown }).fullscreenElement;
});

function compactView(change: Partial<BoardingBattleState> = {}) {
  const initial = BoardingBattle.create(map, 0x5a17).snapshot;
  const actor = initial.people.find((person) => person.side === 'player')!;
  const state: BoardingBattleState = {
    ...initial,
    currentActorId: actor.id,
    activation: { id: actor.id, remaining: 12 },
    initiativeOrder: [actor.id],
    initiativeIndex: 0,
    postponed: [],
    finishedActors: [],
    ...change,
  };
  let select: Parameters<BoardingMapFactory>[1] = () => undefined;
  const emit = vi.fn();
  const view = new BoardingView(
    document.body,
    emit,
    (_container, choose) => {
      select = choose;
      return {
        render() {},
        zoom() {},
        fit() {},
        dispose() {},
        screenPoint: () => ({ x: 120, y: 120 }),
      };
    },
    () => map,
  );
  view.render(state);
  return { actor, select, state, view, emit };
}

it('kontextstyrda-bordningshandlingar: a blocked target walks towards it instead of issuing an invalid move', () => {
  const initial = BoardingBattle.create(map, 0x5a17).snapshot;
  const actor = initial.people.find((person) => person.side === 'player')!;
  const battle = BoardingBattle.restore(map, {
    ...initial,
    currentActorId: actor.id,
    activation: { id: actor.id, remaining: 100 },
  });
  const cell = Array.from({ length: map.width * map.height }, (_, index) => ({
    q: index % map.width,
    r: Math.floor(index / map.width),
  })).find((position) => (battle.pathTo(actor.id, position)?.cost ?? 0) > 4)!;
  const feature = {
    ...initial.features[0]!,
    id: 'reactor-test',
    kind: 'reactor' as const,
    position: cell,
  };
  const setup = compactView({
    currentActorId: actor.id,
    activation: { id: actor.id, remaining: 100 },
    features: [...initial.features, feature],
  });
  setup.select(feature.position);
  const move = document.querySelector<HTMLButtonElement>(
    '.boarding-context-menu [aria-label^="Move"]',
  );
  expect(move).not.toBeNull();
  move!.click();
  expect(setup.emit).toHaveBeenCalledWith({
    type: 'boarding-command',
    command: { type: 'walk', to: feature.position },
  });
  setup.view.dispose();
});

it('bordningshud-i-botten: keeps soldier status and exactly two equipment actions in the bottom dock', () => {
  const setup = compactView();
  const dock = document.querySelector('.boarding-controls')!;
  expect(dock.querySelector('.boarding-heading')).not.toBeNull();
  expect(dock.querySelector('.boarding-status')).not.toBeNull();
  expect(dock.querySelector('.boarding-team')).not.toBeNull();
  expect(dock.querySelectorAll('.boarding-equipment > button')).toHaveLength(2);
  expect(dock.textContent).toContain('AP');
  setup.view.dispose();
});

it('kontextstyrda-bordningshandlingar: opens stance and rotation actions around the active soldier', () => {
  const setup = compactView();
  setup.select(setup.actor.position, setup.actor.id);
  const menu = document.querySelector('.boarding-context-menu')!;
  expect(menu.querySelector('[aria-label="Turn left 45°"]')).not.toBeNull();
  expect(menu.querySelector('[aria-label="Turn right 45°"]')).not.toBeNull();
  expect(menu.querySelector('[aria-label="Crouch"]')).not.toBeNull();
  expect(menu.querySelector('[aria-label="Overwatch"]')).not.toBeNull();
  setup.view.dispose();
});

it('fullscreen-i-bordning: attempts fullscreen automatically and keeps an explicit fallback control', async () => {
  const requestFullscreen = vi.fn().mockRejectedValue(new Error('blocked'));
  Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
    configurable: true,
    value: requestFullscreen,
  });
  const setup = compactView();
  await Promise.resolve();
  expect(requestFullscreen).toHaveBeenCalledTimes(1);
  const control = document.querySelector(
    '[aria-label="Enter fullscreen"]',
  ) as HTMLButtonElement;
  expect(control).not.toBeNull();
  control.click();
  await Promise.resolve();
  expect(requestFullscreen).toHaveBeenCalledTimes(2);
  setup.view.dispose();
});
