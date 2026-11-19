// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { MasterController } from '../../../src/client/app/controllers/MasterController.js';
import { playerNoticeText } from '../../../src/client/app/views/playerNoticeText.js';
import { AppView } from '../../../src/client/app/views/AppView.js';
import type { IntentHandler } from '../../../src/client/app/views/ViewContracts.js';
import {
  Game,
  TECHNOLOGIES,
} from '../../../src/client/space-map/models/Game.js';
import {
  HexCoordinate,
  HexGeometry,
} from '../../../src/client/common/HexCoordinate.js';
import { BUILD_RING_EXTENT } from '../../../src/client/space-map/models/ProductionMap.js';
import { tradeNetworkState } from '../../fixtures/trade-network.js';

/** skeppsorder-pa-planeten: the map offers ships from existing factories. */
function shipyardState() {
  const state = tradeNetworkState();
  state.colonies[0]![1].buildings.push(
    {
      id: 'transport-yard',
      type: 'Transport ship factory',
      slotIndex: 2,
      demolition: false,
    },
    {
      id: 'explorer-yard',
      type: 'Exploration ship factory',
      slotIndex: 3,
      demolition: false,
    },
  );
  return state;
}

function setup(state = tradeNetworkState()) {
  const save = vi.fn();
  const model = new AppModel(undefined, {
    load: () => ({ lastPlayed: '2026-10-24T00:00:00Z', state }),
    save,
    clear() {},
  });
  model.startSlot(1);
  save.mockClear();
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const render = vi.fn(),
    dispose = vi.fn();
  const factory = vi.fn(() => ({ render, dispose }));
  const view = new AppView(root, factory);
  let emit: IntentHandler = () => {};
  const controller = new MasterController(model, {
    bind(handler) {
      emit = handler;
      view.bind(handler);
    },
    render: (snapshot) => view.render(snapshot),
    renderCamera: (snapshot) => view.renderCamera(snapshot),
    dispose: () => view.dispose(),
  });
  controller.start();
  const click = (label: string) => {
    const control = root.querySelector<HTMLButtonElement>(
      `[aria-label="${label}"]`,
    );
    expect(control, label).not.toBeNull();
    control!.click();
  };
  return { model, root, factory, dispose, emit, click, save, controller };
}

it('produktionsorder-aterkoppling: confirms a double-click order outside the queue and renews the receipt', () => {
  vi.useFakeTimers();
  const { root, emit, model, controller } = setup(shipyardState());
  emit({ type: 'open-production' });
  const choice = root.querySelector<HTMLButtonElement>(
    '[data-production-option="Transport ship"]',
  )!;
  choice.click();
  choice.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  expect(model.snapshot.planet!.projects).toHaveLength(1);
  expect(
    root.querySelector('.production-receipt[role="status"]')?.textContent,
  ).toBe('Queued Transport ship · #1');
  vi.advanceTimersByTime(2500);
  emit({ type: 'map-production-build', option: 'Transport ship' });
  vi.advanceTimersByTime(600);
  expect(root.querySelector('.production-receipt')?.textContent).toBe(
    'Queued Transport ship · #2',
  );
  vi.advanceTimersByTime(2400);
  expect(root.querySelector('.production-receipt')).toBeNull();
  controller.dispose();
  vi.useRealTimers();
});

it('produktionsorder-aterkoppling: replaces a previous success with the reason when a stale option is rejected', () => {
  const { root, emit, model, controller } = setup(shipyardState());
  emit({ type: 'open-production' });
  emit({ type: 'map-production-build', option: 'Transport ship' });
  expect(root.querySelector('.production-receipt')).not.toBeNull();
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  emit({ type: 'map-production-build', option: 'Fighter' });
  expect(playerNoticeText(model.snapshot.notice)).toContain(
    'no longer available',
  );
  expect(root.querySelector('.production-receipt')).toBeNull();
  expect(model.snapshot.planet!.projects).toHaveLength(1);
  warning.mockRestore();
  controller.dispose();
});

describe('route-kartvy / delad-kartkamera', () => {
  it('keeps one map instance and camera across all four modes, cancelling an unfinished route', () => {
    const { model, factory, dispose, emit, click, save, controller } = setup();
    emit({ type: 'pan', delta: { x: 40, y: -12 } });
    emit({ type: 'zoom', factor: 1.5, anchor: { x: 0, y: 0 } });
    const camera = model.snapshot.camera;
    // Factories replaces Route in the navigation; the Route map remains.
    emit({ type: 'open-route' });
    emit({ type: 'begin-map-route', id: 'sol-0' });
    expect(model.snapshot.mapTrade.sourcePlanetId).toBe('sol-0');
    click('Production');
    expect(model.snapshot.mapTrade.sourcePlanetId).toBeNull();
    for (const name of ['Fleets', 'Star map']) {
      click(name);
      expect(model.snapshot.camera).toEqual(camera);
    }
    emit({ type: 'open-route' });
    expect(model.snapshot.camera).toEqual(camera);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(dispose).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    controller.dispose();
  });
  it('creates routes with click alternatives, assigns transport and rejects invalid assignment', () => {
    const { model, emit, click, controller } = setup(tradeNetworkState(false));
    emit({ type: 'open-route' });
    click('Create route');
    emit({ type: 'select', position: new HexCoordinate(0, 1) });
    expect(model.snapshot.tradeRoutes).toHaveLength(1);
    const id = model.snapshot.tradeRoutes[0]!.id;
    emit({ type: 'assign-trade-fleet', routeId: id, fleetId: 'fleet-home' });
    expect(playerNoticeText(model.snapshot.notice)).toContain(
      'Assign a transport fleet to this route before adding escorts',
    );
    emit({ type: 'assign-trade-fleet', routeId: id, fleetId: 'freighters' });
    expect(model.snapshot.tradeRoutes[0]!.hasActiveTransport).toBe(true);
    controller.dispose();
  });
});

describe('forsorjningsproblem-pa-kartan', () => {
  it('routes decisions to Route or Production with the affected object selected', () => {
    const { model, emit, controller } = setup();
    emit({ type: 'open-decision', id: 'supply-sol-1' });
    expect(model.snapshot.screen).toBe('route');
    expect(model.snapshot.selected?.object?.name).toBe('Vesta');
    emit({ type: 'open-decision', id: 'route-idle-route-test' });
    expect(model.snapshot.mapTrade.routeId).toBe('route-test');
    emit({ type: 'open-decision', id: 'building-empty-sol-0' });
    expect(model.snapshot.screen).toBe('production');
    expect(model.snapshot.planet?.name).toBe('Tellus');
    controller.dispose();
  });
});

describe('produktions-kartvy / radiella-byggval / kompakt-produktionsko', () => {
  it('gives planet selection priority, ignores fleet/route gestures, and minimally fits the ring without changing zoom', () => {
    const { model, emit, controller } = setup();
    emit({ type: 'open-production' });
    emit({ type: 'map-select-fleet', id: 'freighters' });
    expect(model.snapshot.mapFleetId).toBeNull();
    expect(model.mapRouteDragSource({ x: 0, y: 0 })).toBeNull();
    expect(model.fleetAtPoint({ x: 0, y: 0 })).toBeNull();
    emit({ type: 'zoom', factor: 1.5, anchor: { x: 0, y: 0 } });
    emit({ type: 'pan', delta: { x: 150, y: 130 } });
    const before = model.snapshot.camera;
    emit({
      type: 'map-size',
      viewport: {
        width: 390,
        height: 700,
        availableWidth: 390,
        availableHeight: 460,
      },
    });
    const camera = model.snapshot.camera;
    const planet = HexGeometry.toPoint(model.snapshot.planet!.position);
    const x = (planet.x - camera.center.x) * camera.zoom + 195;
    const y = (planet.y - camera.center.y) * camera.zoom + 350;
    expect(x).toBeCloseTo(390 - BUILD_RING_EXTENT);
    expect(y).toBeCloseTo(460 - BUILD_RING_EXTENT);
    expect(camera.zoom).toBe(before.zoom);
    const fitted = model.snapshot.camera;
    emit({
      type: 'map-size',
      viewport: {
        width: 390,
        height: 700,
        availableWidth: 390,
        availableHeight: 460,
      },
    });
    expect(model.snapshot.camera).toEqual(fitted);
    controller.dispose();
  });
});

it('handelsrutt-skapande-pa-stjarnkartan: Route explains and disables Create route until Trade logistics is completed', () => {
  const state = { ...tradeNetworkState(false), researched: [] };
  const { root, emit, controller } = setup(state);
  emit({ type: 'open-route' });
  const create = root.querySelector<HTMLButtonElement>(
    '[aria-label="Create route"]',
  )!;
  expect(create.disabled).toBe(true);
  const reason = root.querySelector(
    `#${create.getAttribute('aria-describedby')}`,
  );
  expect(reason?.textContent).toBe('Research Trade logistics first.');
  emit({ type: 'begin-map-route', id: 'sol-0' });
  expect(root.querySelector('.map-route-feedback')?.textContent).toBe(
    'Research Trade logistics first.',
  );
  controller.dispose();
});

it('centrerat-kartfokus: Show centers the planet in the unobscured area after measuring the new screen', () => {
  const { model, controller } = setup();
  model.resizeMap({
    width: 390,
    height: 700,
    availableWidth: 390,
    availableHeight: 700,
  });
  model.openProduction('sol-1');
  model.resizeMap({
    width: 390,
    height: 600,
    availableWidth: 390,
    availableHeight: 360,
    ringTop: 150,
    ringBottom: 35,
    ringLeft: 60,
    ringRight: 60,
  });
  const camera = model.snapshot.camera;
  const world = HexGeometry.toPoint(model.snapshot.planet!.position);
  expect((world.x - camera.center.x) * camera.zoom + 195).toBeCloseTo(195);
  expect((world.y - camera.center.y) * camera.zoom + 300).toBeCloseTo(180);
  controller.dispose();
});

it('radiella-byggval: all product kinds use existing factories, workers/resources do not block queues and simulation does', () => {
  const state = tradeNetworkState();
  state.colonies[0]![1].population = 0;
  state.colonies[0]![1].stock.Iron = 0;
  state.colonies[0]![1].stock.Water = 0;
  state.colonies[0]![1].stock.Oil = 0;
  state.colonies[0]![1].buildings.push({
    id: 'yard',
    type: 'Transport ship factory',
    slotIndex: 2,
    demolition: false,
  });
  const game = Game.restore(state);
  for (const type of [
    'Research station',
    'Rocket engine',
    'Transport ship',
  ] as const)
    expect(game.productionIssue(game.galaxy.homePlanet, type)).toBeNull();
  game.scheduleBuild(game.galaxy.homePlanet, 'Research station');
  // delar-tillverkas-pa-behov: parts are never ordered by hand.
  expect(() =>
    game.scheduleComponent(game.galaxy.homePlanet, 'Rocket engine'),
  ).toThrow('automatically');
  game.scheduleShip(game.galaxy.homePlanet, 'Transport ship');
  expect(
    game.planetSnapshot(game.galaxy.homePlanet)!.projects.map((p) => p.type),
  ).toEqual(['Research station', 'Transport ship']);
  const projectIds = game
    .planetSnapshot(game.galaxy.homePlanet)!
    .projects.map((p) => p.id);
  game.startTurn();
  for (const option of game.productionOptions(game.galaxy.homePlanet))
    expect(option.blockedReason).toContain('planning');
  expect(game.productionIssue(game.galaxy.homePlanet, 'Fighter')).toContain(
    'planning',
  );
  expect(
    game.planetSnapshot(game.galaxy.homePlanet)!.projects.map((p) => p.id),
  ).toEqual(projectIds);
});

it('radiella-byggval / skeppsorder-pa-planeten: every ship from existing factories is reachable through category and page navigation', () => {
  const { model, emit, controller } = setup({
    ...shipyardState(),
    researched: TECHNOLOGIES,
  });
  emit({ type: 'open-production' });
  emit({
    type: 'map-size',
    viewport: {
      width: 320,
      height: 600,
      availableWidth: 320,
      availableHeight: 320,
    },
  });
  const found = new Set<string>();
  for (const category of ['Buildings', 'Components', 'Ships'] as const) {
    emit({ type: 'map-production-category', category });
    for (let page = 0; page < model.snapshot.productionMap.pages; page++) {
      emit({ type: 'map-production-page', page });
      expect(model.snapshot.productionMap.options.length).toBeLessThanOrEqual(
        4,
      );
      for (const option of model.snapshot.productionMap.options)
        found.add(option.type);
    }
  }
  const game = Game.restore({
    ...shipyardState(),
    researched: TECHNOLOGIES,
  });
  expect([...found].sort()).toEqual(
    game
      .productionOptions(game.galaxy.homePlanet)
      .map((o) => o.type)
      .sort(),
  );
  controller.dispose();
});

it('radiella-byggval: pages narrow screens with enlarged text so options remain separate', () => {
  const { model, emit, controller } = setup({
    ...shipyardState(),
    researched: TECHNOLOGIES,
  });
  emit({ type: 'open-production' });
  emit({
    type: 'map-size',
    viewport: {
      width: 320,
      height: 568,
      availableWidth: 320,
      availableHeight: 320,
      fontScale: 1.25,
    },
  });
  expect(model.snapshot.productionMap.options.length).toBeLessThanOrEqual(2);
  expect(model.snapshot.productionMap.pages).toBeGreaterThan(1);
  controller.dispose();
});

it('produktions-kartvy: clears controls after selecting space outside the galaxy', () => {
  const { model, emit, root, controller } = setup();
  emit({ type: 'open-production' });
  emit({ type: 'select', position: new HexCoordinate(100, 100) });
  expect(model.snapshot.planet).toBeNull();
  expect(root.querySelector('.production-ring')).toBeNull();
  controller.dispose();
});

it('dubbelklick-bygger-pa-kartan: keeps radial buttons through selection and queues exactly once on a double click', () => {
  const { model, root, emit, controller } = setup(shipyardState());
  emit({ type: 'open-production' });
  const choice = root.querySelector<HTMLButtonElement>(
    '[aria-label="Show Transport ship"]',
  )!;
  const before = model.snapshot.planet!.projects.length;
  choice.click();
  expect(root.querySelector('[aria-label="Show Transport ship"]')).toBe(choice);
  expect(model.snapshot.planet!.projects.length).toBe(before);
  choice.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  expect(model.snapshot.planet!.projects.length).toBe(before + 1);
  expect(model.snapshot.planet!.projects.at(-1)!.type).toBe('Transport ship');
  controller.dispose();
});

it('byggknapp-vid-titel: keeps Build beside the selected option heading before its details', () => {
  const { root, emit, click, controller } = setup(shipyardState());
  emit({ type: 'open-production' });
  click('Show Transport ship');
  const heading = root.querySelector('.map-build-heading')!;
  expect(heading?.querySelector('h2')?.textContent).toContain('Transport ship');
  expect(heading?.querySelector('button')?.textContent).toBe('Build');
  expect(root.querySelector('.map-build-details')!.firstElementChild).toBe(
    heading,
  );
  controller.dispose();
});
