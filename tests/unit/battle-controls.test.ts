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
import { AppController } from '../../src/client/controllers/AppController.js';
import { AppModel } from '../../src/client/models/AppModel.js';
import type { SaveRepository } from '../../src/client/models/SaveRepository.js';
import {
  BoardingBattle,
  type BoardingBattleState,
} from '../../src/client/models/BoardingBattle.js';
import {
  createTestBoardingBattle,
  testBoardingMap,
} from '../../src/client/models/TestBoarding.js';
import {
  BoardingView,
  type BoardingMapFactory,
} from '../../src/client/views/BoardingView.js';
import { renderSaveSlots } from '../../src/client/views/SaveSlotsView.js';
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
  expect(document.querySelector('.battle-controls')!.textContent).toContain(
    'Impact hex 3,4',
  );
  fire().click();
  expect(emit).toHaveBeenCalledWith({
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
  const rendered = vi.fn();
  const playMotion = vi.fn(() => Promise.resolve());
  const map: BoardingMapFactory = (_container, select) => {
    selectHex = select;
    return { render: rendered, zoom() {}, fit() {}, dispose() {}, playMotion };
  };
  const emit = vi.fn<(intent: AppIntent) => void>();
  const view = new BoardingView(document.body, emit, map);
  view.render(battle.visibleSnapshot);
  const left = document.querySelector<HTMLButtonElement>(
    '[aria-label="Turn left 90°"]',
  )!;
  const right = document.querySelector<HTMLButtonElement>(
    '[aria-label="Turn right 90°"]',
  )!;
  expect(left).not.toBeNull();
  expect(right).not.toBeNull();
  expect(left.textContent).toBe('↶');
  expect(right.textContent).toBe('↷');
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
  expect(document.querySelector('.boarding-legend')!.textContent).toContain(
    'Half cover',
  );
  expect(document.querySelector('.boarding-legend')!.textContent).toContain(
    'Facing',
  );
  selectHex({ q: player.position.q + 3, r: player.position.r });
  expect(document.body.textContent).toContain('Destination');
  expect(document.querySelector('.boarding-legend')!.textContent).toMatch(
    /Fire after move|Move only/,
  );
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

it('valbar-bordningssoldat / klickskott-pa-vald-fiende / animerat-bordningsskott: clicks another soldier to act and a selected enemy to fire', async () => {
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
  let selectHex: (position: { q: number; r: number }) => void = () => {};
  const playShot = vi.fn(() => Promise.resolve());
  const emit = vi.fn<(intent: AppIntent) => void>();
  const view = new BoardingView(document.body, emit, (_container, select) => {
    selectHex = select;
    return { render() {}, playShot, zoom() {}, fit() {}, dispose() {} };
  });
  const restored = BoardingBattle.restore(testBoardingMap, boardingState);
  view.render(restored.snapshot);
  selectHex(other!.position);
  expect(emit).toHaveBeenCalledWith({
    type: 'boarding-command',
    command: { type: 'select', id: other!.id },
  });
  selectHex({ q: 5, r: 5 });
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
  const controller = new AppController(model, {
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
