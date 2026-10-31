// @vitest-environment jsdom
import { turnFrames } from '../fixtures/turn-steps.js';
import { domeProductionState as domeWorld } from '../fixtures/production-dome.js';
import { describe, expect, it, vi } from 'vitest';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppController } from '../../src/client/controllers/AppController.js';
import { AppView } from '../../src/client/views/AppView.js';
import type { IntentHandler } from '../../src/client/views/ViewContracts.js';
import { Game, TECHNOLOGIES } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import {
  HexCoordinate,
  HexGeometry,
} from '../../src/client/models/HexCoordinate.js';
import { BUILD_RING_EXTENT } from '../../src/client/models/ProductionMap.js';
import { tradeNetworkState } from '../fixtures/trade-network.js';

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
  const controller = new AppController(model, {
    bind(handler) {
      emit = handler;
      view.bind(handler);
    },
    render: (snapshot) => view.render(snapshot),
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

it('dubbelklick-bygger-pa-kartan / teleskop-i-exploration-ships: an uncategorized ship choice keeps page two stable between clicks', () => {
  const state = new Game(createExampleGalaxy()).exportState();
  state.colonies[0]![1].buildings = [
    {
      id: 'yard',
      type: 'Exploration ship factory',
      slotIndex: 0,
      demolition: false,
    },
    {
      id: 'telescope',
      type: 'Telescope III factory',
      slotIndex: 1,
      demolition: false,
    },
  ];
  const { model, emit } = setup(state);
  emit({ type: 'open-production' });
  emit({
    type: 'map-size',
    viewport: {
      width: 390,
      height: 800,
      availableWidth: 390,
      availableHeight: 500,
    },
  });
  emit({ type: 'map-production-page', page: 1 });
  expect(model.snapshot.productionMap.categorized).toBe(false);
  expect(
    model.snapshot.productionMap.options.some(
      (option) => option.type === 'Exploration ship',
    ),
  ).toBe(true);
  emit({ type: 'map-production-option', option: 'Exploration ship' });
  expect(model.snapshot.productionMap.page).toBe(1);
  expect(
    model.snapshot.productionMap.options.some(
      (option) => option.type === 'Exploration ship',
    ),
  ).toBe(true);
});

it('produktionsorder-aterkoppling: confirms a double-click order outside the queue and renews the receipt', () => {
  vi.useFakeTimers();
  const { root, emit, model, controller } = setup();
  emit({ type: 'open-production' });
  const choice = root.querySelector<HTMLButtonElement>(
    '[data-production-option="Research station"]',
  )!;
  choice.click();
  choice.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  expect(model.snapshot.planet!.projects).toHaveLength(1);
  expect(
    root.querySelector('.production-receipt[role="status"]')?.textContent,
  ).toBe('Queued Research station · #1');
  vi.advanceTimersByTime(2500);
  emit({ type: 'map-production-build', option: 'Research station' });
  vi.advanceTimersByTime(600);
  expect(root.querySelector('.production-receipt')?.textContent).toBe(
    'Queued Research station · #2',
  );
  vi.advanceTimersByTime(2400);
  expect(root.querySelector('.production-receipt')).toBeNull();
  controller.dispose();
  vi.useRealTimers();
});

it('produktionsorder-aterkoppling: replaces a previous success with the reason when a stale option is rejected', () => {
  const { root, emit, model, controller } = setup();
  emit({ type: 'open-production' });
  emit({ type: 'map-production-build', option: 'Research station' });
  expect(root.querySelector('.production-receipt')).not.toBeNull();
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  emit({ type: 'map-production-build', option: 'Fighter' });
  expect(model.snapshot.notice).toContain('no longer available');
  expect(root.querySelector('.production-receipt')).toBeNull();
  expect(model.snapshot.planet!.projects).toHaveLength(1);
  warning.mockRestore();
  controller.dispose();
});

it('produktionsorder-aterkoppling / automatiska-delorder: reports the main order after automatically queued components', () => {
  const state = tradeNetworkState();
  state.colonies[0]![1].stock['Rocket engine'] = 0;
  state.colonies[0]![1].buildings.push(
    {
      id: 'weapons',
      type: 'Weapons module factory',
      slotIndex: 2,
      demolition: false,
    },
    {
      id: 'fighters',
      type: 'Fighter factory',
      slotIndex: 3,
      demolition: false,
    },
  );
  const { model, emit, root, controller } = setup(state);
  emit({ type: 'open-production' });
  emit({ type: 'map-production-build', option: 'Fighter' });
  expect(
    model.snapshot.planet!.projects.map((project) => project.type),
  ).toEqual(['Rocket engine', 'Weapons module', 'Fighter']);
  expect(root.querySelector('.production-receipt')!.textContent).toBe(
    'Queued Fighter · #3',
  );
  expect(model.snapshot.productionReceipt!.projectId).toBe(
    model.snapshot.planet!.projects[2]!.id,
  );
  controller.dispose();
});

describe('route-kartvy / delad-kartkamera', () => {
  it('keeps one map instance and camera across all four modes, cancelling an unfinished route', () => {
    const { model, factory, dispose, emit, click, save, controller } = setup();
    emit({ type: 'pan', delta: { x: 40, y: -12 } });
    emit({ type: 'zoom', factor: 1.5, anchor: { x: 0, y: 0 } });
    const camera = model.snapshot.camera;
    click('Route');
    emit({ type: 'begin-map-route', id: 'sol-0' });
    expect(model.snapshot.mapTrade.sourcePlanetId).toBe('sol-0');
    click('Production');
    expect(model.snapshot.mapTrade.sourcePlanetId).toBeNull();
    for (const name of ['Fleets', 'Star map', 'Route']) {
      click(name);
      expect(model.snapshot.camera).toEqual(camera);
    }
    expect(factory).toHaveBeenCalledTimes(1);
    expect(dispose).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    controller.dispose();
  });
  it('creates routes with click alternatives, assigns transport and rejects invalid assignment', () => {
    const { model, emit, click, controller } = setup(tradeNetworkState(false));
    click('Route');
    click('Create route');
    emit({ type: 'select', position: new HexCoordinate(0, 1) });
    expect(model.snapshot.tradeRoutes).toHaveLength(1);
    const id = model.snapshot.tradeRoutes[0]!.id;
    emit({ type: 'assign-trade-fleet', routeId: id, fleetId: 'fleet-home' });
    expect(model.snapshot.notice).toContain(
      'Assign a transport fleet to this route before adding escorts',
    );
    emit({ type: 'assign-trade-fleet', routeId: id, fleetId: 'freighters' });
    expect(model.snapshot.tradeRoutes[0]!.hasActiveTransport).toBe(true);
    controller.dispose();
  });
});

describe('forsorjningsproblem-pa-kartan', () => {
  it('marks the resolving navigation view, hides muted/skipped issues and removes arranged supply problems', () => {
    const { model, root, emit, controller } = setup();
    expect(
      model.snapshot.mapProblems.some((p) => p.decisionId === 'supply-sol-1'),
    ).toBe(true);
    expect(
      root.querySelector('[data-screen="route"] .nav-attention'),
    ).not.toBeNull();
    emit({ type: 'mute-decision', id: 'supply-sol-1' });
    expect(
      model.snapshot.mapProblems.some((p) => p.decisionId === 'supply-sol-1'),
    ).toBe(false);
    emit({ type: 'unmute-decision', id: 'supply-sol-1' });
    emit({ type: 'skip-decision', id: 'supply-sol-1' });
    expect(
      model.snapshot.mapProblems.some((p) => p.decisionId === 'supply-sol-1'),
    ).toBe(false);
    emit({
      type: 'assign-trade-fleet',
      routeId: 'route-test',
      fleetId: 'freighters',
    });
    expect(
      model.snapshot.supply.planets.find((p) => p.id === 'sol-1')!.status,
    ).toBe('Waiting');
    expect(model.snapshot.mapProblems).toEqual([]);
    expect(
      root.querySelector('[data-screen="route"] .nav-attention'),
    ).toBeNull();
    expect(
      root.querySelector('[data-screen="fleets"] .nav-attention'),
    ).not.toBeNull();
    controller.dispose();
  });
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
  it('offers all options through pages and categories, and retains selection across orders and queue changes', () => {
    const state = tradeNetworkState();
    state.colonies[0]![1].stock.Iron = 0;
    const { model, click, root, emit, save, controller } = setup({
      ...state,
      researched: TECHNOLOGIES.filter(
        (type) => type !== 'Ion pulse engine factory',
      ),
    });
    click('Production');
    expect(
      root.querySelectorAll('.radial-build-option').length,
    ).toBeLessThanOrEqual(8);
    click('Next build options');
    expect(model.snapshot.productionMap.page).toBe(1);
    click('Components');
    expect(model.snapshot.productionMap.page).toBe(0);
    click('Show Rocket engine');
    expect(model.snapshot.supplyChain.projectIds).toEqual([]);
    expect(save).not.toHaveBeenCalled();
    click('Build');
    click('Build');
    expect(model.snapshot.planet!.projects).toHaveLength(2);
    expect(root.querySelectorAll('.map-queue-row')).toHaveLength(2);
    const [first, second] = model.snapshot.planet!.projects;
    expect(model.snapshot.productionMap.selectedProjectId).toBe(first!.id);
    click('Select project 2: Rocket engine');
    expect(model.snapshot.productionMap.selectedProjectId).toBe(second!.id);
    const handle =
      root.querySelectorAll<HTMLButtonElement>('.queue-drag-handle')[1]!;
    handle.focus();
    for (const key of [' ', 'ArrowUp', 'Enter'])
      handle.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true }),
      );
    expect(document.activeElement).toBe(
      root.querySelector('.queue-drag-handle'),
    );
    expect(model.snapshot.productionMap.selectedProjectId).toBe(second!.id);
    expect(model.snapshot.planet!.projects[0]!.id).toBe(second!.id);
    click('Cancel project 1');
    expect(model.snapshot.productionMap.selectedProjectId).toBe(first!.id);
    expect(model.snapshot.productionMap.selectedOption!.type).toBe(
      'Rocket engine',
    );
    emit({ type: 'select', position: new HexCoordinate(0, 0) });
    expect(model.snapshot.planet).toBeNull();
    expect(root.querySelector('.production-ring')).toBeNull();
    expect(root.querySelector<HTMLElement>('.selection-panel')!.hidden).toBe(
      true,
    );
    controller.dispose();
  });
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

it('radiella-byggval / automatiska-delorder: preview is pure and failed ordering keeps option and reports the cause', () => {
  const state = tradeNetworkState();
  const home = state.colonies[0]![1];
  home.buildings = [
    {
      id: 'yard',
      type: 'Transport ship factory',
      slotIndex: 0,
      demolition: false,
    },
  ];
  home.stock['Rocket engine'] = 0;
  const game = Game.restore(state);
  const before = game.exportState();
  expect(
    game
      .productionOptions(game.galaxy.homePlanet)
      .find((o) => o.type === 'Transport ship')!.blockedReason,
  ).toContain('Cannot order');
  expect(game.exportState()).toEqual(before);
  const { model, emit, controller } = setup(state);
  emit({ type: 'open-production' });
  emit({ type: 'map-production-option', option: 'Transport ship' });
  emit({ type: 'map-production-build' });
  expect(model.snapshot.notice).toContain('Cannot order');
  expect(model.snapshot.productionMap.selectedOption!.type).toBe(
    'Transport ship',
  );
  expect(model.snapshot.planet!.projects).toHaveLength(0);
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
  game.scheduleComponent(game.galaxy.homePlanet, 'Rocket engine');
  game.scheduleShip(game.galaxy.homePlanet, 'Transport ship');
  expect(
    game.planetSnapshot(game.galaxy.homePlanet)!.projects.map((p) => p.type),
  ).toEqual(['Research station', 'Rocket engine', 'Transport ship']);
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

it('radiella-byggval: full sites and missing/demolished factories report existing blockers without consuming IDs', () => {
  const state = tradeNetworkState();
  state.colonies[0]![1].buildings = Array.from(
    { length: 10 },
    (_, slotIndex) => ({
      id: `building-${slotIndex}`,
      type: 'Research station' as const,
      slotIndex,
      demolition: false,
    }),
  );
  const game = Game.restore(state);
  const before = game.exportState();
  expect(
    game.productionIssue(game.galaxy.homePlanet, 'Research station'),
  ).toContain('No build slots');
  expect(
    game.productionIssue(game.galaxy.homePlanet, 'Rocket engine'),
  ).toContain('factory');
  expect(
    game.productionIssue(game.galaxy.homePlanet, 'Transport ship'),
  ).toContain('shipyard');
  expect(game.exportState()).toEqual(before);
  const demolished = tradeNetworkState();
  demolished.colonies[0]![1].buildings.find(
    (b) => b.id === 'engine',
  )!.demolition = true;
  const preview = Game.restore(demolished);
  expect(
    preview
      .productionOptions(preview.galaxy.homePlanet)
      .find((o) => o.type === 'Rocket engine')!.blockedReason,
  ).toContain('factory');
});

it('radiella-byggval: every unlocked option and factory product is reachable through category and page navigation', () => {
  const { model, emit, controller } = setup({
    ...tradeNetworkState(),
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
    ...tradeNetworkState(),
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

it('produktions-kartvy: clears controls after selecting space outside the galaxy', () => {
  const { model, emit, root, controller } = setup();
  emit({ type: 'open-production' });
  emit({ type: 'select', position: new HexCoordinate(100, 100) });
  expect(model.snapshot.planet).toBeNull();
  expect(model.snapshot.supplyChain.projectIds).toEqual([]);
  expect(root.querySelector('.production-ring')).toBeNull();
  controller.dispose();
});

it('radiella-byggval / domes-per-byggplats / dome-fore-fabriksforslag: Production offers the matching Dome before factories when no site is prepared', () => {
  const { model, root, click, emit, controller } = setup(domeWorld());
  emit({ type: 'open-production' });
  expect(model.snapshot.productionMap.options[0]?.type).toBe('Desert dome');
  expect(
    model.snapshot.productionMap.options.some((option) =>
      option.type.includes('factory'),
    ),
  ).toBe(false);
  expect(root.textContent).not.toContain('Build a matching factory');
  click('Prepare building site');
  expect(model.snapshot.productionMap.selectedOption?.type).toBe('Desert dome');
  click('Build');
  expect(model.snapshot.planet!.projects[0]).toMatchObject({
    type: 'Desert dome',
    slotIndex: 0,
  });
  controller.dispose();
});

it('dome-fore-fabriksforslag: requires Dome research, waits for a queued Dome and restores factory options when it completes', () => {
  const locked = setup(domeWorld(false));
  locked.emit({ type: 'open-production' });
  expect(locked.root.textContent).toContain('Research Desert dome');
  expect(locked.root.textContent).not.toContain('Build a matching factory');
  expect(
    locked.model.snapshot.productionMap.options.some(
      (o) => o.type === 'Desert dome',
    ),
  ).toBe(false);
  locked.controller.dispose();

  const state = domeWorld(true, 2);
  const { model, root, click, emit, controller } = setup(state);
  emit({ type: 'open-production' });
  click('Prepare building site');
  click('Build');
  expect(model.snapshot.productionGuidance?.kind).toBe('waiting');
  expect(root.textContent).toContain('A Dome is already queued');
  expect(model.snapshot.productionMap.options).toEqual([]);
  for (const frame of turnFrames(model)) model.applyTurnFrame(frame);
  model.finishTurn();
  expect(model.snapshot.productionGuidance?.kind).toBe('factory');
  expect(model.snapshot.planet!.sites[0]!.hasDome).toBe(true);
  emit({ type: 'map-production-option', option: 'Rocket engine factory' });
  click('Build');
  expect(model.snapshot.planet!.projects[0]).toMatchObject({
    type: 'Rocket engine factory',
    slotIndex: 0,
  });
  controller.dispose();
});

it('dome-fore-fabriksforslag: occupied sites cannot accept another Dome, while existing factories can keep producing', () => {
  const state = domeWorld();
  state.colonies[0]![1].domes = [0, 1, 2];
  state.colonies[0]![1].buildings = [0, 1, 2].map((slotIndex) => ({
    id: `engine-${slotIndex}`,
    type: 'Rocket engine factory' as const,
    slotIndex,
    demolition: false,
  }));
  const { model, root, emit, controller } = setup(state);
  emit({ type: 'open-production' });
  expect(model.snapshot.productionGuidance?.kind).toBe('full');
  expect(root.textContent).toContain('No building sites are available');
  expect(root.textContent).not.toContain('Build a matching factory');
  expect(model.snapshot.productionMap.options.map((o) => o.type)).toEqual([
    'Rocket engine',
  ]);
  controller.dispose();
});

it('dome-fore-fabriksforslag: the planet Production tab opens the matching Dome details on the map', () => {
  const { model, root, click, emit, controller } = setup(domeWorld());
  emit({ type: 'open-planet' });
  root
    .querySelector<HTMLButtonElement>('.planet-tabs [aria-label="Production"]')!
    .click();
  expect(root.textContent).toContain('Build a Desert dome');
  expect(root.textContent).not.toContain('Build a matching factory');
  click('Prepare building site');
  expect(model.snapshot.screen).toBe('production');
  expect(model.snapshot.productionMap.selectedOption?.type).toBe('Desert dome');
  controller.dispose();
});

it('dubbelklick-bygger-pa-kartan: keeps radial buttons through selection and queues exactly once on a double click', () => {
  const { model, root, emit, controller } = setup();
  emit({ type: 'open-production' });
  const choice = root.querySelector<HTMLButtonElement>(
    '[aria-label="Show Iron mine"]',
  )!;
  const before = model.snapshot.planet!.projects.length;
  choice.click();
  expect(root.querySelector('[aria-label="Show Iron mine"]')).toBe(choice);
  expect(model.snapshot.planet!.projects.length).toBe(before);
  choice.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  expect(model.snapshot.planet!.projects.length).toBe(before + 1);
  expect(model.snapshot.planet!.projects.at(-1)!.type).toBe('Iron mine');
  controller.dispose();
});

it('byggknapp-vid-titel: keeps Build beside the selected option heading before its details', () => {
  const { root, emit, click, controller } = setup();
  emit({ type: 'open-production' });
  click('Show Iron mine');
  const heading = root.querySelector('.map-build-heading')!;
  expect(heading?.querySelector('h2')?.textContent).toContain('Iron mine');
  expect(heading?.querySelector('button')?.textContent).toBe('Build');
  expect(root.querySelector('.map-build-details')!.firstElementChild).toBe(
    heading,
  );
  controller.dispose();
});

it('produktionsval-efter-forekomst: puts globally missing buildings before buildings missing locally, then local buildings, without changing the save', () => {
  const state = tradeNetworkState();
  state.colonies[1]![1].projects = [];
  state.colonies[1]![1].buildings = [
    { id: 'water', type: 'Water extractor', slotIndex: 0, demolition: false },
  ];
  const game = Game.restore({ ...state, researched: TECHNOLOGIES });
  const before = game.exportState();
  const options = game.productionOptions(game.galaxy.homePlanet);
  const index = (type: string) =>
    options.findIndex((option) => option.type === type);
  expect(index('Oil extractor')).toBeLessThan(index('Water extractor'));
  expect(index('Water extractor')).toBeLessThan(index('Iron mine'));
  expect(
    options.find((option) => option.type === 'Water extractor'),
  ).toMatchObject({ localCount: 0, empireCount: 1 });
  expect(game.productionOptions(game.galaxy.homePlanet)).toEqual(options);
  expect(game.exportState()).toEqual(before);
});

it('produktionsberoenden-i-byggval: missing component factories precede shipyards and warn without preventing construction', () => {
  const state = tradeNetworkState();
  state.colonies[0]![1].buildings = [];
  state.colonies[0]![1].stock['Rocket engine'] = 0;
  const { model, emit, root, click, controller } = setup({
    ...state,
    researched: TECHNOLOGIES,
  });
  const game = Game.restore({ ...state, researched: TECHNOLOGIES });
  const options = game.productionOptions(game.galaxy.homePlanet);
  const index = (type: string) =>
    options.findIndex((option) => option.type === type);
  expect(index('Rocket engine factory')).toBeLessThan(index('Fighter factory'));
  expect(index('Weapons module factory')).toBeLessThan(
    index('Fighter factory'),
  );
  emit({ type: 'open-production' });
  emit({ type: 'map-production-option', option: 'Fighter factory' });
  expect(
    root.querySelector('.production-dependency-warning')?.textContent,
  ).toContain('Weapons module factory');
  expect(
    root.querySelector<HTMLButtonElement>('[aria-label="Build"]')!.disabled,
  ).toBe(false);
  click('Build');
  expect(model.snapshot.planet!.projects.at(-1)!.type).toBe('Fighter factory');
  controller.dispose();
});

it('produktionsberoenden-i-byggval: queued factories remain missing until completed, and either engine variant plus a remote weapons factory satisfies the advisory', () => {
  const state = tradeNetworkState();
  state.colonies[0]![1].buildings = [];
  state.colonies[1]![1].projects = [];
  const game = Game.restore({ ...state, researched: TECHNOLOGIES });
  const warning = () =>
    game
      .productionOptions(game.galaxy.homePlanet)
      .find((option) => option.type === 'Fighter factory')!.dependencyWarning;
  game.scheduleBuild(game.galaxy.homePlanet, 'Rocket engine factory');
  game.scheduleBuild(game.galaxy.homePlanet, 'Weapons module factory');
  expect(warning()).toContain('Weapons module factory');
  for (let year = 0; year < 2; year++) {
    for (const frame of turnFrames(game)) game.applyFrame(frame);
    game.finishTurn();
  }
  expect(warning()).toBeNull();
  state.colonies[1]![1].buildings = [
    {
      id: 'ion',
      type: 'Ion pulse engine factory',
      slotIndex: 0,
      demolition: false,
    },
    {
      id: 'weapons',
      type: 'Weapons module factory',
      slotIndex: 1,
      demolition: false,
    },
  ];
  const remote = Game.restore({ ...state, researched: TECHNOLOGIES });
  expect(
    remote
      .productionOptions(remote.galaxy.homePlanet)
      .find((option) => option.type === 'Fighter factory')!.dependencyWarning,
  ).toBeNull();
  state.colonies[1]![1].buildings[1]!.demolition = true;
  const closing = Game.restore({ ...state, researched: TECHNOLOGIES });
  expect(
    closing
      .productionOptions(closing.galaxy.homePlanet)
      .find((option) => option.type === 'Fighter factory')!.dependencyWarning,
  ).toContain('Weapons module factory');
});

it('produktionsval-efter-forekomst: counts completed Domes, current parts and fleet presence rather than queued construction', () => {
  const state = domeWorld();
  state.colonies[0]![1].domes = [0, 1];
  state.colonies[0]![1].buildings = [
    {
      id: 'transport-yard',
      type: 'Transport ship factory',
      slotIndex: 0,
      demolition: false,
    },
    {
      id: 'engines',
      type: 'Rocket engine factory',
      slotIndex: 1,
      demolition: false,
    },
  ];
  const game = Game.restore({
    ...state,
    researched: TECHNOLOGIES.filter(
      (type) => type !== 'Ion pulse engine factory',
    ),
  });
  const options = game.productionOptions(game.galaxy.homePlanet);
  expect(options.find((option) => option.type === 'Desert dome')).toMatchObject(
    { localCount: 2, empireCount: 2 },
  );
  expect(
    options.find((option) => option.type === 'Rocket engine'),
  ).toMatchObject({ localCount: 3, empireCount: 3 });
  expect(
    options.find((option) => option.type === 'Transport ship'),
  ).toMatchObject({ localCount: 2, empireCount: 3 });
});

it('produktionsberoenden-i-byggval: orders transitive missing dependencies and retains all choices even with a cyclic catalog', async () => {
  const { prioritizeProduction } =
    await import('../../src/client/models/ProductionPriorities.js');
  const game = Game.restore({
    ...tradeNetworkState(),
    researched: TECHNOLOGIES,
  });
  const options = game
    .productionOptions(game.galaxy.homePlanet)
    .filter((option) =>
      [
        'Colony ship factory',
        'Exploration ship factory',
        'Ion pulse engine factory',
      ].includes(option.type),
    );
  const ordered = prioritizeProduction(
    options,
    new Map([
      ['Colony ship factory', ['Exploration ship factory']],
      ['Exploration ship factory', ['Ion pulse engine factory']],
    ]),
  );
  expect(ordered.map((option) => option.type)).toEqual([
    'Ion pulse engine factory',
    'Exploration ship factory',
    'Colony ship factory',
  ]);
  const cycle = new Map([
    ['Colony ship factory', ['Exploration ship factory']],
    ['Exploration ship factory', ['Colony ship factory']],
  ] as const);
  const cyclic = prioritizeProduction(options, cycle);
  expect(new Set(cyclic.map((option) => option.type)).size).toBe(
    options.length,
  );
  expect(prioritizeProduction(options, cycle)).toEqual(cyclic);
  expect(Object.isFrozen(cyclic)).toBe(true);
});
