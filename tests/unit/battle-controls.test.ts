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
    return { render() {}, dispose() {} };
  };
  const emit = vi.fn<(intent: AppIntent) => void>();
  const view = new BattleView(document.body, emit, map);
  view.render(initial);
  const select = (id: string) => {
    document
      .querySelector<HTMLButtonElement>(`[data-ship-id="${id}"]`)!
      .click();
  };
  return { view, emit, select, selectHex: (hex: BattleHex) => selectHex(hex) };
}

it('avfyra-pa-markerat-mal: fires by tapping the autoaim target without a separate fire button', () => {
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
  selectHex({ q: 3, r: 4 });
  expect(emit).toHaveBeenCalledWith({
    type: 'battle-command',
    command: { type: 'fire', at: { q: 3, r: 4 }, weapon: 'Cannon' },
  });
  expect(document.querySelector('[aria-label="Fire weapon"]')).toBeNull();
  view.dispose();
});

describe('skeppsval-startar-stridstur', () => {
  it('selecting an eligible ship on the map starts exactly one activation intent', () => {
    const { view, emit, selectHex } = setup();
    expect(emit).not.toHaveBeenCalled();
    expect(document.querySelector('select')).toBeNull();
    selectHex({ q: 2, r: 4 });
    expect(emit).toHaveBeenCalledExactlyOnceWith({
      type: 'battle-command',
      command: { type: 'activate', id: 'second' },
    });
    view.dispose();
  });
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
          document.querySelector<HTMLElement>('.battle-dialog')!.dataset
            .activeShip,
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
      document.querySelector<HTMLElement>('.battle-dialog')!.dataset.activeShip,
    ).toBe('first');
    view.dispose();
  });
});

it('stridsorder-utan-mobilscroll / skeppsnara-stridskontroller: overlays all movement commands on the battlefield without a form panel', () => {
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
  const board = document.querySelector('.battle-board')!;
  for (const label of [
    'Turn left 60°',
    'Turn right 60°',
    'Forward / escape',
    'End ship turn',
  ]) {
    const action = board.querySelector(`[aria-label="${label}"]`)!;
    expect(action).not.toBeNull();
    expect(action.querySelector('svg')).not.toBeNull();
  }
  expect(
    board.querySelector('select, [aria-label="Fire weapon"], .battle-zoom'),
  ).toBeNull();
  expect(document.querySelector('.battle-details .battle-log')).not.toBeNull();
  expect(document.querySelector('.battle-controls .battle-log')).toBeNull();
  view.dispose();
});

it('avfyra-pa-markerat-mal / traffhex-istallet-for-mallista: rejects invalid shots and requires selection before firing at a new target', () => {
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
  selectHex({ q: 8, r: 4 });
  selectHex({ q: 8, r: 4 });
  expect(emit).not.toHaveBeenCalled();
  expect(document.body.textContent).toContain('enemy ship');
  selectHex({ q: 3, r: 4 });
  expect(emit).not.toHaveBeenCalled();
  selectHex({ q: 3, r: 4 });
  expect(emit).toHaveBeenCalledExactlyOnceWith({
    type: 'battle-command',
    command: { type: 'fire', at: { q: 3, r: 4 }, weapon: 'Cannon' },
  });
  view.dispose();
});

it('autoaim-med-manuellt-mal: keeps a manually selected farther target and clears it outside the front arc', () => {
  const first = state();
  const initial: BattleState = {
    ...first,
    activation: {
      id: 'first',
      remaining: 4,
      moved: false,
      fired: false,
      movementClosed: false,
    },
    pieces: [
      ...first.pieces,
      { ...first.pieces[2]!, id: 'farther', position: { q: 4, r: 4 } },
    ],
  };
  const { view, emit, selectHex } = setup(initial);
  const aim = () => document.querySelector<HTMLElement>('.battle-aim')!;
  expect(aim().dataset.aimQ).toBe('3');
  selectHex({ q: 4, r: 4 });
  view.render(initial);
  expect(emit).not.toHaveBeenCalled();
  expect(aim().dataset.aimQ).toBe('4');
  selectHex({ q: 4, r: 4 });
  expect(emit).toHaveBeenLastCalledWith({
    type: 'battle-command',
    command: { type: 'fire', at: { q: 4, r: 4 }, weapon: 'Cannon' },
  });
  view.render({
    ...initial,
    pieces: initial.pieces.map((piece) =>
      piece.id === 'first' ? { ...piece, facing: 3 } : piece,
    ),
  });
  expect(aim().textContent).toContain('No target');
  expect(aim().dataset.canFire).toBe('false');
  view.render(initial);
  expect(aim().dataset.aimQ).toBe('3');
  view.dispose();
});

it('vapensymboler-i-strid / avfyra-pa-markerat-mal: weapon selection never fires and missile impact can be adjusted before firing', () => {
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
  const missile = document.querySelector<HTMLButtonElement>(
    '[aria-label="Missiles"]',
  )!;
  expect(missile.querySelector('svg')).not.toBeNull();
  missile.click();
  expect(emit).not.toHaveBeenCalled();
  expect(
    document
      .querySelector('[aria-label="Missiles"]')!
      .getAttribute('aria-pressed'),
  ).toBe('true');
  selectHex({ q: 5, r: 4 });
  expect(emit).not.toHaveBeenCalled();
  selectHex({ q: 5, r: 4 });
  expect(emit).toHaveBeenLastCalledWith({
    type: 'battle-command',
    command: { type: 'fire', at: { q: 5, r: 4 }, weapon: 'Missiles' },
  });
  view.dispose();
});

it('avfyra-pa-markerat-mal: clicking another part of a marked large hull fires at its valid selected impact', () => {
  const initial = state();
  const { view, emit, selectHex } = setup({
    ...initial,
    largeShipFootprints: true,
    activation: {
      id: 'first',
      remaining: 4,
      fired: false,
      moved: false,
      movementClosed: false,
    },
    pieces: initial.pieces.map((piece) =>
      piece.side === 'enemy'
        ? {
            ...piece,
            type: 'Transport ship',
            movement: 2,
            position: { q: 4, r: 4 },
          }
        : piece,
    ),
  });
  // The stern is the nearest hittable cell; the bow lies beyond cannon range.
  expect(document.querySelector<HTMLElement>('.battle-aim')!.dataset.aimQ).toBe(
    '3',
  );
  selectHex({ q: 5, r: 4 });
  expect(emit).toHaveBeenCalledExactlyOnceWith({
    type: 'battle-command',
    command: { type: 'fire', at: { q: 3, r: 4 }, weapon: 'Cannon' },
  });
  view.dispose();
});

it('avfyra-pa-markerat-mal: no shots are issued after a salvo, during the enemy turn or beneath Combat details', () => {
  const initial = state();
  const activation = {
    id: 'first',
    remaining: 4,
    fired: false,
    moved: false,
    movementClosed: false,
  };
  const { view, emit, selectHex } = setup({ ...initial, activation });
  document.querySelector<HTMLDetailsElement>('.battle-details')!.open = true;
  selectHex({ q: 3, r: 4 });
  expect(emit).not.toHaveBeenCalled();
  document.querySelector<HTMLDetailsElement>('.battle-details')!.open = false;
  view.render({ ...initial, activation: { ...activation, fired: true } });
  selectHex({ q: 3, r: 4 });
  view.render({ ...initial, turn: 'enemy', activation: null });
  selectHex({ q: 3, r: 4 });
  expect(emit).not.toHaveBeenCalled();
  view.dispose();
});
