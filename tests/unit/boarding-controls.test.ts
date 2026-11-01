// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import {
  createTestBoardingBattle,
  testBoardingMap,
} from '../../src/client/models/TestBoarding.js';
import { BoardingBattle } from '../../src/client/models/BoardingBattle.js';
import {
  BoardingView,
  type BoardingMapFactory,
} from '../../src/client/views/BoardingView.js';
import type { AppIntent } from '../../src/client/views/ViewContracts.js';

afterEach(() => document.body.replaceChildren());

it('actionpoints-och-riktad-forflyttning: exposes turn buttons and a destination path without mutating during render', () => {
  const created = createTestBoardingBattle();
  const player = created.snapshot.people.findLast(
    (person) => person.side === 'player',
  )!;
  const state = {
    ...created.snapshot,
    initiativeOrder: [player.id],
    initiativeIndex: 0,
    currentActorId: player.id,
    activation: { id: player.id, remaining: 12 },
  };
  const battle = BoardingBattle.restore(testBoardingMap, state);
  let selectHex: (position: { q: number; r: number }) => void = () => {};
  const map: BoardingMapFactory = (_container, select) => {
    selectHex = select;
    return { render() {}, zoom() {}, fit() {}, dispose() {} };
  };
  const emit = vi.fn<(intent: AppIntent) => void>();
  const view = new BoardingView(document.body, emit, map);
  view.render(battle.visibleSnapshot);
  const left = document.querySelector<HTMLButtonElement>(
    '[aria-label="Turn left 60°"]',
  )!;
  const right = document.querySelector<HTMLButtonElement>(
    '[aria-label="Turn right 60°"]',
  )!;
  expect(left).not.toBeNull();
  expect(right).not.toBeNull();
  left.click();
  expect(emit).toHaveBeenCalledWith({
    type: 'boarding-command',
    command: { type: 'turn', direction: -1 },
  });
  selectHex({ q: player.position.q + 1, r: player.position.r });
  expect(document.body.textContent).toContain('Destination');
  expect(battle.snapshot).toStrictEqual(state);
  view.dispose();
});

it('miljomal-och-forstorelse: selects a door as a direct rifle target', () => {
  const created = createTestBoardingBattle();
  const player = created.snapshot.people.find(
    (person) => person.side === 'player',
  )!;
  const door = created.snapshot.features.find(
    (feature) => feature.kind === 'door',
  )!;
  const state = {
    ...created.snapshot,
    people: created.snapshot.people.map((person) =>
      person.id === player.id
        ? {
            ...person,
            position: { q: door.position.q - 1, r: door.position.r },
            facing: 0,
          }
        : person,
    ),
    initiativeOrder: [player.id],
    initiativeIndex: 0,
    currentActorId: player.id,
    activation: { id: player.id, remaining: 12 },
  };
  let selectHex: (position: { q: number; r: number }) => void = () => {};
  const emit = vi.fn<(intent: AppIntent) => void>();
  const view = new BoardingView(document.body, emit, (_container, select) => {
    selectHex = select;
    return { render() {}, zoom() {}, fit() {}, dispose() {} };
  });
  view.render(BoardingBattle.restore(testBoardingMap, state).snapshot);
  selectHex(door.position);
  const shoot = document.querySelector<HTMLButtonElement>(
    '[aria-label^="Shoot"]',
  )!;
  expect(shoot.disabled).toBe(false);
  shoot.click();
  expect(emit).toHaveBeenCalledWith({
    type: 'boarding-command',
    command: { type: 'shoot', targetId: door.id },
  });
  view.dispose();
});
