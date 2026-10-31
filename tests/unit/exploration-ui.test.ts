import { completeTacticalBattles } from '../fixtures/tactical-combat.js';
import { Game } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppController } from '../../src/client/controllers/AppController.js';
import { AppView } from '../../src/client/views/AppView.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import type {
  SaveRepository,
  SavedGame,
} from '../../src/client/models/SaveRepository.js';
import type { IntentHandler } from '../../src/client/views/ViewContracts.js';
import { discoveryState } from '../fixtures/exploration.js';
import { encounterGame, arrangeBattle } from '../fixtures/battle-checkpoint.js';

afterEach(() => vi.useRealTimers());

it('gemensamt-handelseflode / upptacktsavbrott / order-under-upptacktsavbrott / spara-avbrutet-ar: controller saves before showing discovery and restores edited orders without repeating movement', async () => {
  vi.useFakeTimers();
  let saved: SavedGame = {
    lastPlayed: '2026-10-25T00:00:00Z',
    state: discoveryState(),
  };
  const repository: SaveRepository = {
    load: () => saved,
    save: (_id, next) => {
      saved = JSON.parse(JSON.stringify(next)) as SavedGame;
    },
    clear() {},
  };
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  function setup() {
    const model = new AppModel(undefined, repository);
    model.startSlot(1);
    const view = new AppView(root, () => ({ render() {}, dispose() {} }));
    let emit: IntentHandler = () => {};
    const controller = new AppController(model, {
      bind: (handler) => {
        emit = handler;
        view.bind(handler);
      },
      render: (snapshot) => view.render(snapshot),
      dispose: () => view.dispose(),
    });
    controller.start();
    return { model, controller, emit, view };
  }
  const first = setup();
  first.emit({ type: 'confirm-end-turn' });
  await vi.advanceTimersByTimeAsync(0);
  expect(
    root.querySelector('.event-announcement[data-stage="awaiting-choice"]'),
  ).not.toBeNull();
  expect(root.querySelector('.discovery-dialog')).toBeNull();
  expect(saved.state.phase).toBe('interrupted');
  expect(
    saved.state.events.some((event) => event.text.startsWith('Combat at')),
  ).toBe(false);
  first.emit({ type: 'handle-discoveries' });
  await vi.advanceTimersByTimeAsync(450);
  expect(first.model.snapshot.mapFleetId).toBe('fleet-home');
  expect(
    first.model.snapshot.fleets.find((fleet) => fleet.id === 'other')!
      .canIssueOrders,
  ).toBe(false);
  first.emit({ type: 'allow-other-fleet-orders' });
  first.emit({ type: 'open-fleet', id: 'other' });
  first.emit({ type: 'begin-destination', id: 'other' });
  first.emit({ type: 'select', position: new HexCoordinate(2, 0) });
  expect(
    saved.state.fleets.find((fleet) => fleet.id === 'other')!.destination,
  ).toEqual({ q: 2, r: 0 });
  first.controller.dispose();
  const restored = setup();
  expect(root.querySelector('.discovery-controls')).not.toBeNull();
  expect(root.querySelector('.discovery-dialog')).toBeNull();
  expect(restored.model.snapshot.interruption!.handling).toBe(true);
  expect(
    restored.model.snapshot.fleets.find((fleet) => fleet.id === 'fleet-home')!
      .remainingMovement,
  ).toBe(2);
  restored.emit({ type: 'continue-turn' });
  expect(restored.model.snapshot.phase).toBe('interrupted');
  expect(restored.model.snapshot.eventPlayback?.stage).toBe('awaiting-choice');
  expect(
    saved.state.events.some((event) => event.text.startsWith('Combat at')),
  ).toBe(false);
  for (
    let attempt = 0;
    attempt < 30 && !restored.model.snapshot.interruption?.battles?.length;
    attempt++
  ) {
    if (restored.model.snapshot.eventPlayback?.stage === 'awaiting-choice')
      restored.emit({ type: 'ignore-discoveries' });
    await vi.advanceTimersByTimeAsync(1850);
    if (restored.model.snapshot.tacticalBattle) {
      completeTacticalBattles(restored.model);
      restored.model.finishCameraFraming();
      restored.view.render(restored.model.snapshot);
    }
  }
  expect(restored.model.snapshot.interruption?.battles).toHaveLength(1);
  expect(root.querySelector('.event-announcement')?.textContent).toContain(
    'versus Space pirate',
  );
  for (
    let attempt = 0;
    attempt < 30 && restored.model.snapshot.phase !== 'planning';
    attempt++
  ) {
    if (restored.model.snapshot.eventPlayback?.stage === 'awaiting-choice')
      restored.emit({ type: 'ignore-discoveries' });
    await vi.advanceTimersByTimeAsync(1850);
    if (restored.model.snapshot.tacticalBattle) {
      completeTacticalBattles(restored.model);
      restored.emit({ type: 'open-map' });
      await vi.advanceTimersByTimeAsync(0);
    }
  }
  expect(restored.model.snapshot.phase).toBe('planning');
  expect(saved.state.round).toBe(2);
  expect(
    saved.state.fleets.find((fleet) => fleet.id === 'other')!.position,
  ).toEqual({ q: 2, r: 0 });
  expect(
    saved.state.events.filter((event) => event.text.startsWith('Combat at')),
  ).toHaveLength(1);
  restored.controller.dispose();
});

it('flottorder-som-symboler / kompakta-flottkort: exposes explorer controls and actual fleet speed without position or engine rows', () => {
  const model = new AppModel(undefined, {
    load: () => ({
      lastPlayed: '2026-10-30',
      state: {
        ...new Game(createExampleGalaxy()).exportState(),
        researched: ['Automated exploration'],
      },
    }),
    save() {},
    clear() {},
  });
  model.startSlot(1);
  model.selectMapFleet('fleet-home');
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const view = new AppView(root, () => ({ render() {}, dispose() {} }));
  const controller = new AppController(model, view);
  controller.start();
  const card = () => root.querySelector('.fleet-card')!;
  expect(
    card().querySelector(
      '.fleet-current-position, .ship-engine-details, .fleet-orders',
    ),
  ).toBeNull();
  expect(card().querySelector('.fleet-speed')!.textContent).toBe('S: 3 hex');
  card()
    .querySelector<HTMLButtonElement>('[aria-label="Explore stars"]')!
    .click();
  expect(model.snapshot.fleets[0]!.exploration).toBe('explore-stars');
  expect(
    card()
      .querySelector('[aria-label="Explore stars"]')!
      .getAttribute('aria-pressed'),
  ).toBe('true');
  controller.dispose();
});

it('vaxelvisa-skeppsaktiveringar / riktning-och-vapen: controller saves a left turn and restores the same unfinished activation', () => {
  vi.useFakeTimers();
  const game = arrangeBattle(encounterGame(), (state) => ({
    ...state,
    asteroids: [],
    phase: 'fighting',
    round: 2,
    turn: 'player',
    pieces: state.pieces.map((p, i) => ({
      ...p,
      position: { q: i + 1, r: i + 1 },
      facing: p.side === 'player' ? 0 : 3,
    })),
  }));
  let saved: SavedGame = {
    lastPlayed: '2026-10-31',
    state: game.exportState(),
  };
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const model = new AppModel(undefined, {
    load: () => saved,
    save: (_id, next) => {
      saved = structuredClone(next);
    },
    clear() {},
  });
  model.startSlot(1);
  const view = new AppView(root, () => ({ render() {}, dispose() {} }));
  const controller = new AppController(model, view);
  controller.start();
  const fighter = model.snapshot.tacticalBattle!.pieces.find(
    (p) => p.type === 'Fighter',
  )!;
  const select = root.querySelector<HTMLSelectElement>(
    'select[aria-label="Your ship"]',
  )!;
  select.value = fighter.id;
  select.dispatchEvent(new Event('change'));
  root
    .querySelector<HTMLButtonElement>('button[aria-label="Activate ship"]')!
    .click();
  root
    .querySelector<HTMLButtonElement>('button[aria-label="Turn left 60°"]')!
    .click();
  const checkpoint = saved.state.simulation!.tacticalBattles![0]!;
  expect(checkpoint.pieces.find((p) => p.id === fighter.id)!.facing).toBe(1);
  expect(checkpoint.activation!.remaining).toBe(3);
  expect(Game.restore(saved.state).tacticalBattle).toEqual(
    model.snapshot.tacticalBattle,
  );
  expect(
    root.querySelector('dialog[aria-label="Tactical combat"][open]'),
  ).not.toBeNull();
  controller.dispose();
});

it('stridsutplacering / sparad-taktisk-strid: the facing control reflects a saved deployment and Auto deploy resets it', () => {
  const game = encounterGame();
  game.commandBattle({ type: 'auto-deploy' });
  const first = game.tacticalBattle!.pieces[0]!;
  game.commandBattle({
    type: 'place',
    id: first.id,
    position: first.position!,
    facing: 3,
  });
  let saved: SavedGame = {
    lastPlayed: '2026-10-31',
    state: game.exportState(),
  };
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const model = new AppModel(undefined, {
    load: () => saved,
    save: (_id, next) => {
      saved = structuredClone(next);
    },
    clear() {},
  });
  model.startSlot(1);
  const controller = new AppController(
    model,
    new AppView(root, () => ({ render() {}, dispose() {} })),
  );
  controller.start();
  expect(
    root.querySelector<HTMLSelectElement>('select[aria-label="Facing"]')!.value,
  ).toBe('3');
  root
    .querySelector<HTMLButtonElement>('button[aria-label="Auto deploy"]')!
    .click();
  expect(
    root.querySelector<HTMLSelectElement>('select[aria-label="Facing"]')!.value,
  ).toBe('0');
  expect(
    saved.state.simulation!.tacticalBattles![0]!.pieces.find(
      (p) => p.id === first.id,
    )!.facing,
  ).toBe(0);
  controller.dispose();
});
