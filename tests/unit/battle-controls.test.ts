// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BattleView,
  type BattleMapFactory,
} from '../../src/client/views/battle/BattleView.js';
import {
  TacticalBattle,
  type BattleState,
  type BattleHex,
} from '../../src/client/models/TacticalBattle.js';
import { MasterController } from '../../src/client/controllers/app/MasterController.js';
import { AppModel } from '../../src/client/models/AppModel.js';
import type { SaveRepository } from '../../src/client/models/saves/SaveRepository.js';
import {
  BoardingBattle,
  type BoardingBattleState,
} from '../../src/client/models/boarding/BoardingBattle.js';
import { composeBoardingMaps } from '../../src/client/models/boarding/BoardingComposer.js';
import type { BoardingMap } from '../../src/client/models/boarding/BoardingMap.js';
import {
  createTestBoardingBattle,
  testBoardingMap,
} from '../../src/client/models/boarding/TestBoarding.js';
import {
  BoardingView,
  type BoardingMapFactory,
} from '../../src/client/views/boarding/BoardingView.js';
import { renderSaveSlots } from '../../src/client/views/saves/SaveSlotsView.js';
import type { AppIntent } from '../../src/client/views/ViewContracts.js';

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

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

it('hexmal-for-manover: previews an option before confirming the same maneuver', () => {
  const initial = state();
  const { view, emit } = setup({
    ...initial,
    activation: {
      id: 'first',
      remaining: 2,
      fired: false,
      moved: false,
      movementClosed: false,
    },
  });
  const option = document.querySelector<HTMLButtonElement>(
    '[data-maneuver-option]',
  );
  expect(option).not.toBeNull();
  option!.click();
  expect(emit).not.toHaveBeenCalled();
  expect(
    document.querySelector('[data-maneuver-option][aria-pressed="true"]'),
  ).not.toBeNull();
  document
    .querySelector<HTMLButtonElement>(
      '[data-maneuver-option][aria-pressed="true"]',
    )!
    .click();
  const intent = emit.mock.calls[0]?.[0];
  expect(intent?.type).toBe('battle-command');
  if (intent?.type === 'battle-command')
    expect(intent.command.type).toBe('maneuver');
  view.dispose();
});

it('overwatch-i-rymdstrid: reserves the currently selected weapon', () => {
  const initial = state();
  const { view, emit } = setup({
    ...initial,
    activation: {
      id: 'first',
      remaining: 2,
      fired: false,
      moved: false,
      movementClosed: false,
    },
  });
  document
    .querySelector<HTMLButtonElement>('[aria-label="Overwatch"]')!
    .click();
  expect(emit).toHaveBeenCalledWith({
    type: 'battle-command',
    command: { type: 'overwatch', weapon: 'Cannon' },
  });
  view.dispose();
});

it('overwatch-i-rymdstrid: plays reactions between the movement steps', async () => {
  const order: string[] = [];
  const view = new BattleView(document.body, vi.fn(), () => ({
    render() {},
    dispose() {},
    animateManeuver(move) {
      order.push(`move:${move.steps.length}`);
      return Promise.resolve();
    },
    animateShot() {
      order.push('shot');
      return Promise.resolve();
    },
  }));
  await view.animateManeuver({
    id: 'move',
    shipId: 'first',
    from: { position: { q: 0, r: 0 }, facing: 0 },
    steps: [
      { position: { q: 1, r: 0 }, facing: 0 },
      { position: { q: 2, r: 0 }, facing: 0 },
    ],
    reactions: [
      {
        step: 1,
        shot: {
          id: 'shot',
          weapon: 'Cannon',
          from: { q: 0, r: 1 },
          at: { q: 1, r: 0 },
          impacts: [],
        },
      },
    ],
  });
  expect(order).toEqual(['move:1', 'shot', 'move:1']);
  view.dispose();
});

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

it('stridsorder-utan-mobilscroll / hexmal-for-manover: overlays maneuver choices on the battlefield without a form panel', () => {
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
  expect(
    board.querySelector('[aria-label="End ship turn"] svg'),
  ).not.toBeNull();
  expect(
    board.querySelectorAll('[data-maneuver-option]').length,
  ).toBeGreaterThan(0);
  expect(board.querySelector('[aria-label="Increase speed"]')).toBeNull();
  expect(board.querySelector('[aria-label="Straight"]')).toBeNull();
  expect(
    board.querySelector('select, [aria-label="Fire weapon"], .battle-zoom'),
  ).toBeNull();
  expect(document.querySelector('.battle-details .battle-log')).not.toBeNull();
  expect(document.querySelector('.battle-controls .battle-log')).toBeNull();
  view.dispose();
});

it('ingen-avslut-med-fart-och-manoverpoang: End ship turn is unavailable while speed and maneuver points remain', () => {
  const moving = state();
  const { view } = setup({
    ...moving,
    activation: {
      id: 'first',
      remaining: 2,
      fired: false,
      moved: false,
      movementClosed: false,
    },
    pieces: moving.pieces.map((piece) =>
      piece.id === 'first' ? { ...piece, speed: 1 } : piece,
    ),
  });
  const end = document.querySelector<HTMLButtonElement>(
    '[aria-label="End ship turn"]',
  )!;
  expect(end.disabled).toBe(true);
  expect(end.title).toMatch(/speed/);
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

it('actionpoints-och-riktad-forflyttning / tydlig-bordningsstatus / ap-fargad-bordningsvag / animerad-bordningsforflyttning: exposes correct turns, selected soldier health and a map legend without mutating during render', async () => {
  const created = createTestBoardingBattle();
  const player = created.snapshot.people.find(
    (person) =>
      person.side === 'player' &&
      person.position.q === 2 &&
      person.position.r === 8,
  )!;
  const boardingState: BoardingBattleState = {
    ...created.snapshot,
    people: created.snapshot.people.map((person) =>
      person.id === player.id ? { ...person, facing: 0 } : person,
    ),
    initiativeOrder: [player.id],
    initiativeIndex: 0,
    currentActorId: player.id,
    activation: { id: player.id, remaining: 7 },
  };
  const battle = BoardingBattle.restore(testBoardingMap, boardingState);
  let selectHex: (position: { q: number; r: number }) => void = () => {};
  const rendered = vi.fn<ReturnType<BoardingMapFactory>['render']>();
  const playMotion = vi.fn(() => Promise.resolve());
  const map: BoardingMapFactory = (_container, select) => {
    selectHex = select;
    return { render: rendered, zoom() {}, fit() {}, dispose() {}, playMotion };
  };
  const emit = vi.fn<(intent: AppIntent) => void>();
  const view = new BoardingView(document.body, emit, map);
  view.render(battle.visibleSnapshot);
  const left = document.querySelector<HTMLButtonElement>(
    '[aria-label="Turn left 45°"]',
  )!;
  const right = document.querySelector<HTMLButtonElement>(
    '[aria-label="Turn right 45°"]',
  )!;
  expect(left).not.toBeNull();
  expect(right).not.toBeNull();
  expect(left.querySelector('.boarding-action-art')).not.toBeNull();
  expect(right.querySelector('.boarding-action-art')).not.toBeNull();
  expect(left.textContent).toBe('');
  expect(right.textContent).toBe('');
  expect(left.classList).toContain('boarding-action');
  left.click();
  expect(emit).toHaveBeenCalledWith({
    type: 'boarding-command',
    command: { type: 'turn', direction: 1 },
  });
  const team = document.querySelector('[aria-label="Boarding team"]')!;
  expect(team.querySelectorAll('progress')).toHaveLength(4);
  expect(team.querySelector('.boarding-unit-active')!.textContent).toContain(
    player.label,
  );
  const health = document.querySelector<HTMLProgressElement>(
    `[aria-label="${player.label} HP"]`,
  )!;
  expect(health.value).toBe(player.hitPoints);
  expect(health.max).toBe(player.maxHitPoints);
  expect(document.querySelector('.boarding-legend')).toBeNull();
  expect(document.querySelector('.boarding-zoom')).toBeNull();
  selectHex({ q: player.position.q + 3, r: player.position.r });
  expect(document.body.textContent).toContain('Destination');
  expect(rendered.mock.calls.at(-1)?.[3]).toEqual([
    {
      position: { q: player.position.q + 1, r: player.position.r },
      kind: 'fire',
    },
    {
      position: { q: player.position.q + 2, r: player.position.r },
      kind: 'reach',
    },
    {
      position: { q: player.position.q + 3, r: player.position.r },
      kind: 'reach',
    },
  ]);
  expect(battle.snapshot).toStrictEqual(boardingState);
  const stepped = {
    ...battle.visibleSnapshot,
    people: battle.visibleSnapshot.people.map((person) =>
      person.id === player.id
        ? {
            ...person,
            position: { q: player.position.q + 1, r: player.position.r },
          }
        : person,
    ),
  };
  view.render(stepped, null, [stepped]);
  await Promise.resolve();
  expect(playMotion).toHaveBeenCalled();
  const defender = created.snapshot.people.find(
    (person) => person.side === 'defender',
  )!;
  view.render({
    ...battle.visibleSnapshot,
    currentActorId: defender.id,
    activation: { id: defender.id, remaining: 12 },
  });
  expect(document.querySelector('.boarding-activity')!.textContent).toBe(
    'A defender is acting…',
  );
  view.dispose();
});

it('valbar-bordningssoldat / klickskott-pa-vald-fiende / animerat-bordningsskott / traffchans-vid-synliga-fiender: clicks another soldier to act and a selected enemy to fire', async () => {
  const created = createTestBoardingBattle();
  const [actor, other] = created.snapshot.people.filter(
    (person) => person.side === 'player',
  );
  const defender = created.snapshot.people.find(
    (person) => person.side === 'defender',
  )!;
  const boardingState: BoardingBattleState = {
    ...created.snapshot,
    people: created.snapshot.people.map((person) =>
      person.id === actor!.id
        ? { ...person, position: { q: 2, r: 5 }, facing: 0 }
        : person.id === defender.id
          ? { ...person, position: { q: 5, r: 5 } }
          : person,
    ),
    features: created.snapshot.features.map((feature) => ({
      ...feature,
      destroyed: true,
    })),
    initiativeOrder: [actor!.id, other!.id],
    initiativeIndex: 0,
    currentActorId: actor!.id,
    activation: { id: actor!.id, remaining: 12 },
  };
  let selectHex: (
    position: { q: number; r: number },
    personId?: string,
    mode?: 'center-target',
  ) => void = () => {};
  const playShot = vi.fn(() => Promise.resolve());
  const rendered = vi.fn<ReturnType<BoardingMapFactory>['render']>();
  const emit = vi.fn<(intent: AppIntent) => void>();
  const view = new BoardingView(document.body, emit, (_container, select) => {
    selectHex = select;
    return { render: rendered, playShot, zoom() {}, fit() {}, dispose() {} };
  });
  const restored = BoardingBattle.restore(testBoardingMap, boardingState);
  view.render(restored.snapshot);
  expect(rendered.mock.lastCall?.[4]).toContainEqual(
    expect.objectContaining({ id: defender.id, affordable: true }),
  );
  selectHex(other!.position);
  expect(emit).toHaveBeenCalledWith({
    type: 'boarding-command',
    command: { type: 'select', id: other!.id },
  });
  selectHex({ q: 5, r: 5 }, defender.id, 'center-target');
  expect(rendered.mock.lastCall?.[1]).toBe(defender.id);
  expect(emit).not.toHaveBeenCalledWith({
    type: 'boarding-command',
    command: { type: 'shoot', targetId: defender.id },
  });
  selectHex({ q: 5, r: 5 });
  expect(emit).toHaveBeenCalledWith({
    type: 'boarding-command',
    command: { type: 'shoot', targetId: defender.id },
  });
  view.render(restored.visibleSnapshot, null, [], {
    from: actor!.position,
    to: defender.position,
    hit: true,
  });
  await Promise.resolve();
  expect(playShot).toHaveBeenCalled();
  expect(document.body.textContent).not.toContain('Resolving action…');
  view.dispose();
});

it('klickgang-pa-vald-destination: clicking the chosen destination issues move', () => {
  const created = createTestBoardingBattle();
  const player = created.snapshot.people.find(
    (person) =>
      person.side === 'player' &&
      person.position.q === 2 &&
      person.position.r === 8,
  )!;
  const boardingState: BoardingBattleState = {
    ...created.snapshot,
    people: created.snapshot.people.map((person) =>
      person.id === player.id ? { ...person, facing: 0 } : person,
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
  view.render(BoardingBattle.restore(testBoardingMap, boardingState).snapshot);
  const destination = { q: player.position.q + 2, r: player.position.r };
  selectHex(destination);
  expect(emit).not.toHaveBeenCalledWith({
    type: 'boarding-command',
    command: { type: 'move', to: destination },
  });
  expect(document.body.textContent).toContain('Destination');
  selectHex(destination);
  expect(emit).toHaveBeenCalledWith({
    type: 'boarding-command',
    command: { type: 'move', to: destination },
  });
  view.dispose();
});

it('klickdorr-pa-vald-dorr: clicking an adjacent selected door opens or hacks it', () => {
  const created = createTestBoardingBattle();
  const player = created.snapshot.people.find(
    (person) => person.side === 'player',
  )!;
  const door = created.snapshot.features.find(
    (feature) => feature.kind === 'door' && !feature.locked,
  )!;
  const locked = created.snapshot.features.find(
    (feature) => feature.kind === 'door' && feature.locked,
  )!;
  let selectHex: (position: { q: number; r: number }) => void = () => {};
  const emit = vi.fn<(intent: AppIntent) => void>();
  const view = new BoardingView(document.body, emit, (_container, select) => {
    selectHex = select;
    return { render() {}, zoom() {}, fit() {}, dispose() {} };
  });
  view.render(
    BoardingBattle.restore(testBoardingMap, {
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
    }).snapshot,
  );
  selectHex(door.position);
  expect(emit).not.toHaveBeenCalledWith({
    type: 'boarding-command',
    command: { type: 'door', id: door.id, action: 'open' },
  });
  selectHex(door.position);
  expect(emit).toHaveBeenCalledWith({
    type: 'boarding-command',
    command: { type: 'door', id: door.id, action: 'open' },
  });
  view.render(
    BoardingBattle.restore(testBoardingMap, {
      ...created.snapshot,
      people: created.snapshot.people.map((person) =>
        person.id === player.id
          ? {
              ...person,
              position: { q: locked.position.q - 1, r: locked.position.r },
              facing: 0,
            }
          : person,
      ),
      initiativeOrder: [player.id],
      initiativeIndex: 0,
      currentActorId: player.id,
      activation: { id: player.id, remaining: 12 },
    }).snapshot,
  );
  selectHex(locked.position);
  selectHex(locked.position);
  expect(emit).toHaveBeenCalledWith({
    type: 'boarding-command',
    command: { type: 'hack', id: locked.id },
  });
  view.dispose();
});

it('animerad-bordningsforflyttning: does not replay a finished walk when the same presentation is rendered again', async () => {
  const created = createTestBoardingBattle();
  const player = created.snapshot.people.find(
    (person) => person.side === 'player',
  )!;
  const playMotion = vi.fn(() => Promise.resolve());
  const view = new BoardingView(document.body, vi.fn(), () => ({
    render() {},
    playMotion,
    zoom() {},
    fit() {},
    dispose() {},
  }));
  const start = {
    ...created.snapshot,
    people: created.snapshot.people.map((person) =>
      person.id === player.id
        ? { ...person, position: { q: 2, r: 5 }, facing: 0 }
        : person,
    ),
  };
  const afterPlayer = {
    ...start,
    people: start.people.map((person) =>
      person.id === player.id
        ? { ...person, position: { q: 3, r: 5 } }
        : person,
    ),
  };
  view.render(start);
  view.render(afterPlayer, null, [afterPlayer]);
  await Promise.resolve();
  await Promise.resolve();
  expect(playMotion).toHaveBeenCalledTimes(1);
  view.render(afterPlayer, null, [afterPlayer]);
  await Promise.resolve();
  expect(playMotion).toHaveBeenCalledTimes(1);
  view.dispose();
});

it('animerad-bordningsforflyttning: plays a queued enemy move after the current animation', async () => {
  const created = createTestBoardingBattle();
  const player = created.snapshot.people.find(
    (person) => person.side === 'player',
  )!;
  const defender = created.snapshot.people.find(
    (person) => person.side === 'defender',
  )!;
  let resolveFirst!: () => void;
  const playMotion = vi
    .fn<() => Promise<void>>()
    .mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveFirst = resolve;
        }),
    )
    .mockResolvedValue(undefined);
  const view = new BoardingView(document.body, vi.fn(), () => ({
    render() {},
    playMotion,
    zoom() {},
    fit() {},
    dispose() {},
  }));
  const start = {
    ...created.snapshot,
    people: created.snapshot.people.map((person) =>
      person.id === player.id
        ? { ...person, position: { q: 2, r: 5 }, facing: 0 }
        : person.id === defender.id
          ? { ...person, position: { q: 5, r: 5 } }
          : person,
    ),
  };
  const afterPlayer = {
    ...start,
    people: start.people.map((person) =>
      person.id === player.id
        ? { ...person, position: { q: 3, r: 5 } }
        : person,
    ),
  };
  const afterEnemy = {
    ...afterPlayer,
    people: afterPlayer.people.map((person) =>
      person.id === defender.id
        ? { ...person, position: { q: 6, r: 5 } }
        : person,
    ),
  };
  view.render(start);
  view.render(afterPlayer, null, [afterPlayer]);
  expect(playMotion).toHaveBeenCalledTimes(1);
  view.render(afterEnemy, null, [afterEnemy]);
  expect(playMotion).toHaveBeenCalledTimes(1);
  resolveFirst();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  expect(playMotion).toHaveBeenCalledTimes(2);
  view.dispose();
});

it('forsvarare-och-civilister: drains queued defender updates until the next player turn appears', async () => {
  const initial = createTestBoardingBattle().snapshot;
  const defender = initial.people.find((person) => person.side === 'defender')!;
  const player = initial.people.find((person) => person.side === 'player')!;
  let finishMotion!: () => void;
  const renderMap = vi.fn<(state: BoardingBattleState) => void>();
  const view = new BoardingView(document.body, vi.fn(), () => ({
    render: renderMap,
    playMotion: () =>
      new Promise<void>((resolve) => {
        finishMotion = resolve;
      }),
    zoom() {},
    fit() {},
    dispose() {},
  }));
  const defenderTurn = {
    ...initial,
    currentActorId: defender.id,
    activation: { id: defender.id, remaining: 12 },
  };
  const moved = {
    ...defenderTurn,
    people: defenderTurn.people.map((person) =>
      person.id === defender.id
        ? {
            ...person,
            position: { q: person.position.q - 1, r: person.position.r },
          }
        : person,
    ),
  };
  const prepared = {
    ...moved,
    log: [...moved.log, 'A defender takes a prepared position.'],
  };
  const playerTurn = {
    ...prepared,
    currentActorId: player.id,
    activation: { id: player.id, remaining: 12 },
  };
  view.render(defenderTurn);
  view.render(moved, null, [moved]);
  view.render(prepared);
  view.render(playerTurn);
  finishMotion();
  await vi.waitFor(() =>
    expect(renderMap.mock.lastCall?.[0].currentActorId).toBe(player.id),
  );
  expect(document.querySelector('.boarding-status')?.textContent).toContain(
    player.label,
  );
  view.dispose();
});

it('forsvarare-och-civilister: preserves later animations after a queued non-animated update', async () => {
  const initial = createTestBoardingBattle().snapshot;
  const defender = initial.people.find((person) => person.side === 'defender')!;
  const player = initial.people.find((person) => person.side === 'player')!;
  let finishFirst!: () => void;
  const playMotion = vi
    .fn<() => Promise<void>>()
    .mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishFirst = resolve;
        }),
    )
    .mockResolvedValue(undefined);
  const renderMap = vi.fn<(state: BoardingBattleState) => void>();
  const view = new BoardingView(document.body, vi.fn(), () => ({
    render: renderMap,
    playMotion,
    zoom() {},
    fit() {},
    dispose() {},
  }));
  const start = {
    ...initial,
    currentActorId: defender.id,
    activation: { id: defender.id, remaining: 12 },
  };
  const move = (
    state: BoardingBattleState,
    q: number,
  ): BoardingBattleState => ({
    ...state,
    people: state.people.map((person) =>
      person.id === defender.id
        ? { ...person, position: { ...person.position, q } }
        : person,
    ),
  });
  const first = move(start, defender.position.q - 1);
  const prepared = {
    ...first,
    log: [...first.log, 'A defender takes a prepared position.'],
  };
  const second = move(prepared, defender.position.q - 2);
  const playerTurn = {
    ...second,
    currentActorId: player.id,
    activation: { id: player.id, remaining: 12 },
  };
  view.render(start);
  view.render(first, null, [first]);
  view.render(prepared);
  view.render(second, null, [second]);
  view.render(playerTurn);
  finishFirst();
  await vi.waitFor(() =>
    expect(renderMap.mock.lastCall?.[0].currentActorId).toBe(player.id),
  );
  expect(playMotion).toHaveBeenCalledTimes(2);
  view.dispose();
});

it('tydlig-bordningsstatus: combat details follow the latest log line', () => {
  const created = createTestBoardingBattle();
  const emit = vi.fn<(intent: AppIntent) => void>();
  const view = new BoardingView(document.body, emit, () => ({
    render() {},
    zoom() {},
    fit() {},
    dispose() {},
  }));
  const details =
    document.querySelector<HTMLDetailsElement>('.boarding-details')!;
  details.open = true;
  Object.defineProperties(details, {
    scrollHeight: { configurable: true, value: 400 },
    clientHeight: { configurable: true, value: 80 },
  });
  view.render({
    ...created.snapshot,
    log: ['Rifle 1', 'Rifle 2', 'Rifle 3', 'Rifle 4'],
  });
  expect(details.scrollTop).toBe(400);
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
  const boardingState: BoardingBattleState = {
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
  view.render(BoardingBattle.restore(testBoardingMap, boardingState).snapshot);
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

it('fristaende-bordningsprototyp / forsvarare-och-civilister / tydlig-bordningsstatus: starts, advances a hidden defender and closes without writing a save slot', async () => {
  vi.useFakeTimers();
  const save = vi.fn();
  const repo: SaveRepository = {
    load: () => null,
    save,
    clear: vi.fn(),
  };
  const model = new AppModel(undefined, repo);
  model.startSlot(1);
  model.openSaves();
  save.mockClear();
  let emit: (intent: AppIntent) => void = () => {};
  const render = vi.fn();
  const controller = new MasterController(model, {
    bind: (handler) => {
      emit = handler;
    },
    render,
    dispose() {},
  });
  controller.start();
  const menu = renderSaveSlots(model.snapshot, emit);
  document.body.append(menu);
  const control = [...menu.querySelectorAll('button')].find(
    (node) => node.textContent === 'Test boarding (cheat)',
  );
  expect(control).toBeDefined();
  control!.click();
  expect(model.snapshot.screen).toBe('saves');
  expect(model.snapshot.boardingBattle?.phase).toBe('fighting');
  for (let index = 0; index < 4; index++) {
    const boarding = model.snapshot.boardingBattle!;
    const actor = boarding.people.find(
      (person) => person.id === boarding.currentActorId,
    );
    if (!actor || actor.side !== 'player') break;
    emit({ type: 'boarding-command', command: { type: 'end-activation' } });
  }
  const hiddenDefender = model.snapshot.boardingBattle!;
  expect(
    hiddenDefender.people.find(
      (person) => person.id === hiddenDefender.currentActorId,
    ),
  ).toBeUndefined();
  const logLength = hiddenDefender.log.length;
  await vi.advanceTimersByTimeAsync(500);
  expect(model.snapshot.boardingBattle!.log.length).toBeGreaterThan(logLength);
  model.save();
  emit({ type: 'close-boarding' });
  expect(model.snapshot.boardingBattle).toBeNull();
  expect(save).not.toHaveBeenCalled();
  expect(render).toHaveBeenCalled();
  controller.dispose();
});

it('skott-kraver-giltigt-mal: shoot stays disabled until an enemy or feature is selected', () => {
  const created = createTestBoardingBattle();
  const player = created.snapshot.people.find(
    (person) => person.side === 'player',
  )!;
  const defender = created.snapshot.people.find(
    (person) => person.side === 'defender',
  )!;
  const boardingState: BoardingBattleState = {
    ...created.snapshot,
    people: created.snapshot.people.map((person) =>
      person.id === player.id
        ? { ...person, position: { q: 4, r: 5 }, facing: 0 }
        : person.id === defender.id
          ? { ...person, position: { q: 5, r: 5 }, facing: 0 }
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
  view.render(BoardingBattle.restore(testBoardingMap, boardingState).snapshot);
  const shoot = () =>
    document.querySelector<HTMLButtonElement>('[aria-label^="Shoot"]')!;
  expect(shoot().disabled).toBe(true);
  shoot().click();
  expect(emit).not.toHaveBeenCalled();
  selectHex({ q: 4, r: 5 });
  expect(shoot().disabled).toBe(true);
  shoot().click();
  expect(emit).not.toHaveBeenCalled();
  selectHex({ q: 5, r: 5 });
  expect(shoot().disabled).toBe(false);
  shoot().click();
  expect(emit).toHaveBeenCalledWith({
    type: 'boarding-command',
    command: { type: 'shoot', targetId: defender.id },
  });
  view.dispose();
});

it('melee-kraver-valt-mal: melee stays disabled until an adjacent enemy is selected', () => {
  const created = createTestBoardingBattle();
  const player = created.snapshot.people.find(
    (person) => person.side === 'player',
  )!;
  const defender = created.snapshot.people.find(
    (person) => person.side === 'defender',
  )!;
  const boardingState: BoardingBattleState = {
    ...created.snapshot,
    people: created.snapshot.people.map((person) =>
      person.id === player.id
        ? { ...person, position: { q: 4, r: 5 }, facing: 0 }
        : person.id === defender.id
          ? { ...person, position: { q: 5, r: 5 }, facing: 0 }
          : person,
    ),
    initiativeOrder: [player.id],
    initiativeIndex: 0,
    currentActorId: player.id,
    activation: { id: player.id, remaining: 12 },
  };
  let selectHex: (position: { q: number; r: number }) => void = () => {};
  const rendered = vi.fn<ReturnType<BoardingMapFactory>['render']>();
  const emit = vi.fn<(intent: AppIntent) => void>();
  const view = new BoardingView(document.body, emit, (_container, select) => {
    selectHex = select;
    return { render: rendered, zoom() {}, fit() {}, dispose() {} };
  });
  view.render(BoardingBattle.restore(testBoardingMap, boardingState).snapshot);
  const melee = () =>
    document.querySelector<HTMLButtonElement>('[aria-label="Melee"]')!;
  expect(melee().disabled).toBe(true);
  melee().click();
  expect(emit).not.toHaveBeenCalled();
  selectHex({ q: 5, r: 5 });
  expect(melee().disabled).toBe(false);
  expect(rendered.mock.calls.at(-1)?.[1]).toBe(defender.id);
  melee().click();
  expect(emit).toHaveBeenCalledWith({
    type: 'boarding-command',
    command: { type: 'melee', targetId: defender.id },
  });
  view.dispose();
});

it('tva-skepp-pa-bordningskartan: uses the composed campaign map for the boarding canvas', () => {
  const composed = composeBoardingMaps('Space pirate', 'Transport ship');
  const battle = BoardingBattle.createCampaign(
    composed,
    true,
    11,
    'Space pirate',
    'Transport ship',
  );
  const maps: BoardingMap[] = [];
  const view = new BoardingView(
    document.body,
    vi.fn(),
    (_container, _select, map) => {
      maps.push(map);
      return { render() {}, zoom() {}, fit() {}, dispose() {} };
    },
  );
  view.render(battle.visibleSnapshot);
  expect(maps.at(-1)?.name).toBe(composed.map.name);
  expect(maps.at(-1)?.width).toBe(composed.map.width);
  expect(maps.at(-1)?.height).toBe(composed.map.height);
  view.dispose();
});

it('docka-babord-styrbord: offers Dock instead of firing when a pirate has side contact', () => {
  const created = TacticalBattle.create(
    'dock-view',
    { q: 8, r: -4 },
    [
      {
        id: 'friendly',
        side: 'player',
        retreat: { q: 7, r: -4 },
        ships: [{ id: 'raider', type: 'Space pirate', ion: false }],
      },
      {
        id: 'enemy',
        side: 'enemy',
        retreat: { q: 8, r: -3 },
        ships: [{ id: 'hauler', type: 'Transport ship', ion: false }],
      },
    ],
    5,
  ).snapshot;
  const { view, emit } = setup({
    ...created,
    phase: 'fighting',
    round: 1,
    turn: 'player',
    asteroids: [],
    activation: {
      id: 'raider',
      remaining: 3,
      fired: false,
      moved: false,
      movementClosed: false,
    },
    pieces: created.pieces.map((piece) =>
      piece.id === 'raider'
        ? { ...piece, position: { q: 3, r: 4 }, facing: 0 }
        : { ...piece, position: { q: 4, r: 3 }, facing: 0 },
    ),
  });
  const dock = document.querySelector<HTMLButtonElement>(
    '[aria-label="Dock"]',
  )!;
  expect(dock.disabled).toBe(false);
  dock.click();
  expect(emit).toHaveBeenCalledWith({
    type: 'battle-command',
    command: { type: 'dock', targetId: 'hauler' },
  });
  view.dispose();
});

it('valbar-bordningssoldat: renders the controller-selected soldier and preserves AP when switching back', () => {
  const created = createTestBoardingBattle();
  const [first, second] = created.snapshot.people.filter(
    (person) => person.side === 'player',
  );
  const battle = BoardingBattle.restore(testBoardingMap, {
    ...created.snapshot,
    currentActorId: first!.id,
    activation: { id: first!.id, remaining: 7 },
  });
  const rendered = vi.fn<ReturnType<BoardingMapFactory>['render']>();
  let selectCell: (position: { q: number; r: number }) => void = () => {};
  const view = new BoardingView(
    document.body,
    (intent) => {
      if (intent.type !== 'boarding-command') return;
      battle.command(intent.command);
      view.render(battle.snapshot);
    },
    (_container, select) => {
      selectCell = select;
      return { render: rendered, zoom() {}, fit() {}, dispose() {} };
    },
  );
  view.render(battle.snapshot);
  selectCell(second!.position);
  expect(rendered.mock.lastCall?.[0].currentActorId).toBe(second!.id);
  selectCell(first!.position);
  expect(rendered.mock.lastCall?.[0].activation).toEqual({
    id: first!.id,
    remaining: 7,
  });
  view.dispose();
});

it('automatisk-bordningstur-vid-tom-ap / animerat-bordningsskott: shows the last rifle shot before civilians move at round end', async () => {
  const initial = createTestBoardingBattle().snapshot;
  const actor = initial.people.find((person) => person.side === 'player')!;
  const enemy = initial.people.find((person) => person.side === 'defender')!;
  const civilian = initial.people.find((person) => person.side === 'civilian')!;
  const after = {
    ...initial,
    people: initial.people.map((person) =>
      person.id === civilian.id
        ? { ...person, position: { q: 13, r: 3 } }
        : person,
    ),
  };
  const order: string[] = [];
  const view = new BoardingView(document.body, vi.fn(), () => ({
    render() {},
    zoom() {},
    fit() {},
    dispose() {},
    playShot: () => {
      order.push('shot');
      return Promise.resolve();
    },
    playMotion: () => {
      order.push('move');
      return Promise.resolve();
    },
  }));
  view.render(initial);
  view.render(after, null, [after], {
    from: actor.position,
    to: enemy.position,
    hit: true,
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(order).toEqual(['shot', 'move']);
  view.dispose();
});

it('kamerafokus-vid-bordningssoldatbyte: focuses a newly activated soldier even without movement and does not replay focus on rerender', async () => {
  const initial = createTestBoardingBattle().snapshot;
  const next = initial.people.find(
    (person) =>
      person.side === 'player' && person.id !== initial.currentActorId,
  )!;
  const focusActor = vi.fn(() => Promise.resolve());
  const view = new BoardingView(document.body, vi.fn(), () => ({
    render() {},
    focusActor,
    zoom() {},
    fit() {},
    dispose() {},
  }));
  view.render(initial);
  expect(focusActor).not.toHaveBeenCalled();
  const selected = {
    ...initial,
    currentActorId: next.id,
    activation: { id: next.id, remaining: 7 },
  };
  view.render(selected);
  view.render(selected);
  await vi.waitFor(() =>
    expect(document.querySelector('.boarding-status')!.textContent).toContain(
      '7 AP',
    ),
  );
  expect(focusActor).toHaveBeenCalledExactlyOnceWith(next.id);
  view.dispose();
});

it('kameraoverblick-fore-bordningsskott / kameraoverblick-vid-synlig-bordningsrorelse / kamerafokus-vid-bordningssoldatbyte: frames the combatants before the shot, then movement, and focuses the next soldier last', async () => {
  const initial = createTestBoardingBattle().snapshot;
  const actor = initial.people.find(
    (person) =>
      person.side === 'player' && person.id !== initial.currentActorId,
  )!;
  const civilian = initial.people.find((person) => person.side === 'civilian')!;
  const frame = {
    ...initial,
    people: initial.people.map((person) =>
      person.id === civilian.id
        ? { ...person, position: { q: 13, r: 3 } }
        : person,
    ),
  };
  const final = {
    ...frame,
    currentActorId: actor.id,
    activation: { id: actor.id, remaining: 12 },
  };
  const order: string[] = [];
  const view = new BoardingView(document.body, vi.fn(), () => ({
    render() {},
    zoom() {},
    fit() {},
    dispose() {},
    frameVisibleMovement: () => {
      order.push('frame');
      return Promise.resolve();
    },
    frameShot: () => {
      order.push('shot-frame');
      return Promise.resolve();
    },
    playMotion: () => {
      order.push('move');
      return Promise.resolve();
    },
    playShot: () => {
      order.push('shot');
      return Promise.resolve();
    },
    focusActor: () => {
      order.push('focus');
      return Promise.resolve();
    },
  }));
  view.render(initial);
  view.render(final, null, [frame], {
    from: { q: 2, r: 5 },
    to: { q: 5, r: 5 },
    hit: true,
    presentationIndex: 0,
  });
  await vi.waitFor(() =>
    expect(order).toEqual(['shot-frame', 'shot', 'frame', 'move', 'focus']),
  );
  view.dispose();
});

it('kamerafokus-vid-bordningssoldatbyte: reserves the action HUD while busy and recalculates free space after rotation with a hidden legend', () => {
  let width = 400;
  let controlsHeight = 132;
  const rect = (top: number, height: number, rectWidth = width) =>
    ({
      left: 0,
      right: rectWidth,
      top,
      bottom: top + height,
      width: rectWidth,
      height,
    }) as DOMRect;
  const bounds = vi
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('boarding-canvas'))
        return rect(0, width === 400 ? 800 : 400);
      if (this.classList.contains('boarding-hud')) return rect(0, 100);
      if (this.classList.contains('boarding-details')) return rect(0, 50);
      if (this.classList.contains('boarding-controls'))
        return rect(
          (width === 400 ? 720 : 360) - controlsHeight,
          controlsHeight,
        );
      if (this.classList.contains('boarding-legend'))
        return width === 400 ? rect(740, 20) : rect(0, 0, 0);
      if (this.classList.contains('boarding-zoom'))
        return rect(width === 400 ? 740 : 370, 20);
      return rect(0, 0, 0);
    });
  let viewport: (() => { top: number; bottom: number } | null) | undefined;
  const view = new BoardingView(document.body, vi.fn(), () => ({
    render() {},
    zoom() {},
    fit() {},
    dispose() {},
    setViewportProvider(provider) {
      viewport = provider;
    },
  }));
  try {
    view.render(createTestBoardingBattle().snapshot);
    expect(viewport!()).toMatchObject({ top: 100, bottom: 588 });
    controlsHeight = 30;
    expect(viewport!()).toMatchObject({ top: 100, bottom: 588 });
    width = 800;
    controlsHeight = 60;
    expect(viewport!()).toMatchObject({ top: 100, bottom: 300 });
  } finally {
    view.dispose();
    bounds.mockRestore();
  }
});

it('dorrhandling-framfor-soldat / oppen-dorr-som-golvruta: offers the facing door and selects an open door as a destination', () => {
  const created = createTestBoardingBattle();
  const player = created.snapshot.people.find(
    (person) => person.side === 'player',
  )!;
  const door = created.snapshot.features.find(
    (feature) => feature.kind === 'door',
  )!;
  const boardingState: BoardingBattleState = {
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
    features: created.snapshot.features.map((feature) =>
      feature.id === door.id
        ? { ...feature, locked: false, open: false }
        : feature,
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
  view.render(boardingState);
  document
    .querySelector<HTMLButtonElement>('[aria-label="Open door"]')!
    .click();
  expect(emit).toHaveBeenCalledWith({
    type: 'boarding-command',
    command: { type: 'door', id: door.id, action: 'open' },
  });
  view.render({
    ...boardingState,
    features: boardingState.features.map((feature) =>
      feature.id === door.id ? { ...feature, open: true } : feature,
    ),
  });
  selectHex(door.position);
  expect(document.querySelector('.boarding-selection')!.textContent).toContain(
    'Destination',
  );
  view.dispose();
});

it('kastad-granat-i-bage: plays the throw before applying the impact state', async () => {
  const initial = createTestBoardingBattle().snapshot;
  const actor = initial.people.find((person) => person.side === 'player')!;
  const impact = { q: actor.position.q + 1, r: actor.position.r };
  const playShot = vi.fn(() => Promise.resolve());
  const view = new BoardingView(document.body, vi.fn(), () => ({
    render() {},
    zoom() {},
    fit() {},
    dispose() {},
    playShot,
  }));
  view.render(initial);
  view.render({ ...initial, smokeCells: [impact] }, null, [], {
    kind: 'grenade',
    grenade: 'smoke',
    from: actor.position,
    to: impact,
    hit: true,
  });
  await vi.waitFor(() =>
    expect(playShot).toHaveBeenCalledExactlyOnceWith(
      actor.position,
      impact,
      'grenade',
    ),
  );
  view.dispose();
});
