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

afterEach(() => document.body.replaceChildren());

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
