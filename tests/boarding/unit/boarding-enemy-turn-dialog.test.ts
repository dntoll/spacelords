// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import {
  BoardingBattle,
  type BoardingBattleState,
} from '../../../src/client/boarding/models/battle/BoardingBattle.js';
import { BoardingView } from '../../../src/client/boarding/views/battle/BoardingView.js';
import { parseBoardingMap } from '../../../src/client/boarding/models/map/BoardingMap.js';
import transportFixture from '../../fixtures/boarding/transport-boarding-fixture.txt?raw';

const map = parseBoardingMap(transportFixture, 'Transport ship');

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

function turnOf(side: 'player' | 'defender'): BoardingBattleState {
  const created = BoardingBattle.create(map, 0x5a17).snapshot;
  const actor = created.people.find((person) => person.side === side)!;
  return BoardingBattle.restore(map, {
    ...created,
    currentActorId: actor.id,
    activation: { id: actor.id, remaining: 12 },
    initiativeOrder: [actor.id],
    initiativeIndex: 0,
    postponed: [],
    finishedActors: [],
  }).snapshot;
}

function view(): BoardingView {
  return new BoardingView(
    document.body,
    vi.fn(),
    () => ({ render() {}, zoom() {}, fit() {}, dispose() {} }),
    () => map,
  );
}

it('motstandartur-i-mitten: the opponents turn is announced in a centred dialog, not in the action bar', () => {
  const boarding = view();
  boarding.render(turnOf('defender'));
  const notice = document.querySelector<HTMLElement>('.boarding-enemy-turn')!;
  expect(notice.hidden).toBe(false);
  expect(notice.textContent).toBe('Defenders are acting…');
  expect(notice.getAttribute('role')).toBe('status');
  expect(
    document.querySelector('.boarding-controls')!.textContent,
  ).not.toContain('Defenders are acting…');
  boarding.dispose();
});

it('motstandartur-i-mitten: the dialog leaves when a soldier may act again', () => {
  const boarding = view();
  boarding.render(turnOf('defender'));
  boarding.render(turnOf('player'));
  expect(
    document.querySelector<HTMLElement>('.boarding-enemy-turn')!.hidden,
  ).toBe(true);
  expect(
    document.querySelector('[aria-label="End soldier turn"]'),
  ).not.toBeNull();
  boarding.dispose();
});

it('ihopfallbar-bordningslogg: keeps the log control stable during defender updates', () => {
  const boarding = view();
  const state = turnOf('defender');
  boarding.render(state);
  const summary = document.querySelector('.boarding-details summary');
  boarding.render({ ...state, log: [...state.log, 'A defender moves.'] });
  expect(document.querySelector('.boarding-details summary')).toBe(summary);
  boarding.dispose();
});

it('forsvarartur-fastnar-inte: a failed movement presentation releases the defender turn', async () => {
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const initial = turnOf('defender');
  const final = turnOf('player');
  const enemy = initial.people.find((person) => person.side === 'defender')!;
  const moved = {
    ...final,
    people: final.people.map((person) =>
      person.id === enemy.id
        ? {
            ...person,
            position: { q: person.position.q + 1, r: person.position.r },
          }
        : person,
    ),
  };
  const boarding = new BoardingView(
    document.body,
    vi.fn(),
    () => ({
      render() {},
      zoom() {},
      fit() {},
      dispose() {},
      playMotion: () => Promise.reject(new Error('Animation unavailable')),
    }),
    () => map,
  );
  boarding.render(initial);
  boarding.render(moved, null, [moved]);
  const idle = boarding.whenIdle();
  expect(idle).not.toBeNull();
  const completed = await Promise.race([
    idle!.then(() => true),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 50)),
  ]);
  expect(completed).toBe(true);
  expect(
    document.querySelector<HTMLElement>('.boarding-enemy-turn')!.hidden,
  ).toBe(true);
  boarding.dispose();
  warning.mockRestore();
});

it('forsvarartur-fastnar-inte: a stalled movement presentation cannot block the next soldier', async () => {
  vi.useFakeTimers();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  const initial = turnOf('defender');
  const final = turnOf('player');
  const enemy = initial.people.find((person) => person.side === 'defender')!;
  const moved = {
    ...final,
    people: final.people.map((person) =>
      person.id === enemy.id
        ? {
            ...person,
            position: { q: person.position.q + 1, r: person.position.r },
          }
        : person,
    ),
  };
  const cancel = vi.fn();
  const boarding = new BoardingView(
    document.body,
    vi.fn(),
    () => ({
      render() {},
      zoom() {},
      fit() {},
      dispose() {},
      cancelPresentation: cancel,
      playMotion: () => new Promise<void>(() => {}),
    }),
    () => map,
  );
  boarding.render(initial);
  boarding.render(moved, null, [moved]);
  let idle = false;
  void boarding.whenIdle()!.then(() => {
    idle = true;
  });
  await vi.advanceTimersByTimeAsync(6000);
  expect(idle).toBe(true);
  expect(cancel).toHaveBeenCalledOnce();
  expect(
    document.querySelector<HTMLElement>('.boarding-enemy-turn')!.hidden,
  ).toBe(true);
  boarding.dispose();
});
