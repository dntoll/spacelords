// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BattleView,
  type BattleMapFactory,
} from '../../src/client/views/BattleView.js';
import {
  TacticalBattle,
  type BattleState,
  type BattleHex,
} from '../../src/client/models/TacticalBattle.js';
import type { AppIntent } from '../../src/client/views/ViewContracts.js';

afterEach(() => document.body.replaceChildren());

function state(phase: BattleState['phase'] = 'fighting'): BattleState {
  const initial = TacticalBattle.create(
    'selection',
    { q: 0, r: 0 },
    [
      {
        id: 'friendly',
        side: 'player',
        retreat: null,
        ships: [
          { id: 'first', type: 'Fighter', ion: false },
          { id: 'second', type: 'Fighter', ion: false },
        ],
      },
      {
        id: 'enemy',
        side: 'enemy',
        retreat: null,
        ships: [{ id: 'enemy', type: 'Space pirate', ion: false }],
      },
    ],
    1,
  ).snapshot;
  return {
    ...initial,
    phase,
    turn: 'player',
    asteroids: [],
    pieces: initial.pieces.map((piece, index) => ({
      ...piece,
      position: { q: index + 1, r: 4 },
    })),
  };
}

function setup(initial = state()) {
  let selectHex: (position: BattleHex) => void = () => {};
  const map: BattleMapFactory = (_container, select) => {
    selectHex = select;
    return { render() {}, fit() {}, zoom() {}, dispose() {} };
  };
  const emit = vi.fn<(intent: AppIntent) => void>();
  const view = new BattleView(document.body, emit, map);
  view.render(initial);
  const select = (id: string) => {
    const input = document.querySelector<HTMLSelectElement>(
      'select[aria-label="Your ship"]',
    )!;
    input.value = id;
    input.dispatchEvent(new Event('change'));
  };
  return { view, emit, select, selectHex: (hex: BattleHex) => selectHex(hex) };
}

describe('skeppsval-startar-stridstur', () => {
  it.each(['list', 'map'] as const)(
    'selecting an eligible ship through the %s starts exactly one activation intent',
    (source) => {
      const { view, emit, select, selectHex } = setup();
      expect(emit).not.toHaveBeenCalled();
      expect(document.querySelector('[aria-label="Activate ship"]')).toBeNull();
      if (source === 'list') select('second');
      else selectHex({ q: 2, r: 4 });
      expect(emit).toHaveBeenCalledExactlyOnceWith({
        type: 'battle-command',
        command: { type: 'activate', id: 'second' },
      });
      view.dispose();
    },
  );
  it.each(['enemy turn', 'already used', 'another activation'] as const)(
    'does not activate an ineligible ship during %s',
    (condition) => {
      let initial = state();
      if (condition === 'enemy turn') initial = { ...initial, turn: 'enemy' };
      if (condition === 'already used')
        initial = {
          ...initial,
          pieces: initial.pieces.map((piece) =>
            piece.id === 'second' ? { ...piece, activated: true } : piece,
          ),
        };
      if (condition === 'another activation')
        initial = {
          ...initial,
          activation: {
            id: 'first',
            remaining: 3,
            fired: false,
            moved: true,
            movementClosed: false,
          },
        };
      const { view, emit, selectHex } = setup(initial);
      selectHex({ q: 2, r: 4 });
      expect(emit).not.toHaveBeenCalled();
      if (condition === 'another activation')
        expect(
          document.querySelector<HTMLSelectElement>('[aria-label="Your ship"]')!
            .value,
        ).toBe('first');
      view.dispose();
    },
  );
  it('keeps deployment selection free and resumes a saved activation without issuing it again', () => {
    const { view, emit, select } = setup(state('deployment'));
    select('second');
    expect(emit).not.toHaveBeenCalled();
    const initial = state();
    view.render({
      ...initial,
      activation: {
        id: 'first',
        remaining: 2,
        fired: true,
        moved: false,
        movementClosed: false,
      },
    });
    expect(emit).not.toHaveBeenCalled();
    expect(
      document.querySelector<HTMLSelectElement>('[aria-label="Your ship"]')!
        .value,
    ).toBe('first');
    view.dispose();
  });
});

it('stridsorder-utan-mobilscroll: puts all combat commands ahead of the board and keeps long information in a separate disclosure', () => {
  const initial = state();
  const { view } = setup({
    ...initial,
    activation: {
      id: 'first',
      remaining: 4,
      fired: false,
      moved: false,
      movementClosed: false,
    },
  });
  const orders = document.querySelector('.battle-controls')!;
  const board = document.querySelector('.battle-board')!;
  expect(
    orders.compareDocumentPosition(board) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  for (const label of [
    'Turn left 60°',
    'Turn right 60°',
    'Forward / escape',
    'Weapon',
    'Fire weapon',
    'End ship turn',
  ])
    expect(
      orders.querySelector(`[aria-label="${label}"]`),
      label,
    ).not.toBeNull();
    expect(orders.querySelector('[aria-label="Target"]')).toBeNull();
    expect(orders.querySelector('.battle-log')).toBeNull();
  expect(document.querySelector('.battle-details .battle-log')).not.toBeNull();
  view.dispose();
});

it('traffhex-istallet-for-mallista: fires at the hex chosen on the map and has no target list', () => {
  const initial = state();
  const { view, emit, selectHex } = setup({
    ...initial,
    activation: {
      id: 'first',
      remaining: 4,
      fired: false,
      moved: false,
      movementClosed: false,
    },
  });
  expect(document.querySelector('[aria-label="Target"]')).toBeNull();
  const fire = () =>
    document.querySelector<HTMLButtonElement>('[aria-label="Fire weapon"]')!;
  expect(fire().disabled).toBe(true);
  selectHex({ q: 8, r: 4 });
  expect(fire().disabled).toBe(true);
  expect(document.body.textContent).toContain('enemy ship');
  selectHex({ q: 3, r: 4 });
  expect(fire().disabled).toBe(false);
  expect(document.body.textContent).toContain('Impact hex 3,4');
  expect(
    document.querySelector('.battle-controls')!.textContent,
  ).toContain('Impact hex 3,4');
  fire().click();
  expect(emit).toHaveBeenCalledWith({
    type: 'battle-command',
    command: { type: 'fire', at: { q: 3, r: 4 }, weapon: 'Cannon' },
  });
  view.dispose();
});
