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

it('bordningshud-i-botten: keeps soldier status and stance and overwatch next to equipment', () => {
  const setup = compactView();
  const dock = document.querySelector('.boarding-controls')!;
  expect(document.querySelector('.boarding-heading')).toBeNull();
  expect(dock.querySelector('[aria-label="Close boarding"]')).toBeNull();
  expect(dock.querySelector('.boarding-status')).not.toBeNull();
  expect(dock.querySelector('.boarding-team')).not.toBeNull();
  expect(dock.querySelectorAll('.boarding-equipment > button')).toHaveLength(4);
  expect(
    dock.querySelector('.boarding-equipment [aria-label="Crouch"]'),
  ).not.toBeNull();
  expect(
    dock.querySelector('.boarding-equipment [aria-label="Overwatch"]'),
  ).not.toBeNull();
  expect(dock.textContent).toContain('AP');
  setup.view.dispose();
});

it('kontextstyrda-bordningshandlingar: opens rotation actions around the active soldier', () => {
  const setup = compactView();
  setup.select(setup.actor.position, setup.actor.id);
  const menu = document.querySelector('.boarding-context-menu')!;
  expect(menu.querySelector('[aria-label="Turn left 45°"]')).not.toBeNull();
  expect(menu.querySelector('[aria-label="Turn right 45°"]')).not.toBeNull();
  expect(menu.querySelector('[aria-label="Crouch"]')).toBeNull();
  expect(menu.querySelector('[aria-label="Overwatch"]')).toBeNull();
  setup.view.dispose();
});

it('beskrivning-av-vald-bordningsruta: identifies the selected soldier above its actions', () => {
  const setup = compactView();
  setup.select(setup.actor.position, setup.actor.id);
  const menu = document.querySelector('.boarding-context-menu')!;
  // hp-i-valt-mal: the title is followed by the soldier's hit points.
  expect(menu.querySelector('.boarding-context-description')?.textContent).toBe(
    `${setup.actor.label} · ${setup.actor.hitPoints}/${setup.actor.maxHitPoints} HP`,
  );
  setup.view.dispose();
});

it('senaste-raden-i-bordningsloggen: previews new log entries briefly and autoscrolls the open log', () => {
  vi.useFakeTimers();
  try {
    const setup = compactView();
    const details =
      document.querySelector<HTMLDetailsElement>('.boarding-details')!;
    const preview = document.querySelector<HTMLElement>(
      '.boarding-log-preview',
    )!;
    expect(preview.hidden).toBe(true);
    details.open = true;
    Object.defineProperty(details, 'scrollHeight', {
      configurable: true,
      value: 900,
    });
    setup.view.render({
      ...setup.state,
      log: [...setup.state.log, 'First event', 'Latest event'],
    });
    expect(preview.hidden).toBe(false);
    expect(preview.textContent).toBe('Latest event');
    expect(details.scrollTop).toBe(900);
    vi.advanceTimersByTime(3000);
    setup.view.render({
      ...setup.state,
      log: [...setup.state.log, 'First event', 'Latest event', 'Newer event'],
    });
    expect(preview.textContent).toBe('Newer event');
    vi.advanceTimersByTime(3000);
    expect(preview.hidden).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(preview.hidden).toBe(true);
    setup.view.dispose();
  } finally {
    vi.useRealTimers();
  }
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
