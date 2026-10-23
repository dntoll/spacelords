// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppController } from '../../src/client/controllers/AppController.js';
import { AppView } from '../../src/client/views/AppView.js';
import { renderSupply } from '../../src/client/views/SupplyView.js';
import { SupplyOverview } from '../../src/client/models/SupplyOverview.js';
import { Game } from '../../src/client/models/Game.js';
import { tradeNetworkState } from '../fixtures/trade-network.js';

function setup() {
  const save = vi.fn();
  const model = new AppModel(undefined, {
    load: () => ({
      lastPlayed: '2026-10-21T10:00:00Z',
      state: tradeNetworkState(),
    }),
    save,
    clear() {},
  });
  model.startSlot(1);
  model.openSupply();
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const controller = new AppController(
    model,
    new AppView(root, () => ({ render() {}, dispose() {} })),
  );
  controller.start();
  const click = (label: string) =>
    root.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!.click();
  return { model, root, controller, click, save };
}

it('forsorjningsoversikt / relevanta-material: leads with unmet project needs and hides unrelated and foreign materials', () => {
  const { root, click, controller } = setup();
  expect(
    root.querySelector('.supply-planet')!.getAttribute('data-planet-id'),
  ).toBe('sol-1');
  expect(root.querySelector('.supply-material')).toBeNull();
  click('Supply details for Vesta');
  const details = root.querySelector('[data-planet-id="sol-1"]')!;
  // Keep the accessible action label out of the three visible summary columns.
  expect(
    details.querySelector('.supply-planet-summary')!.textContent,
  ).not.toContain('Supply details for');
  expect(details.textContent).toContain('Iron mine');
  expect(
    details.querySelector('[data-material="Iron"]')!.textContent,
  ).toContain('Unprovided5');
  expect(details.querySelector('[data-material="Rocket engine"]')).toBeNull();
  expect(root.textContent).not.toContain('Nadir');
  expect(root.querySelector('canvas')).toBeNull();
  controller.dispose();
});

it('materialoversikt / produktionsformaga: keeps search focus and position, inspects manufacturers, and returns to the overview', () => {
  const { root, model, click, controller } = setup();
  const search = root.querySelector<HTMLInputElement>('input[type="search"]')!;
  search.focus();
  search.value = 'Rocket';
  search.setSelectionRange(3, 3);
  root.querySelector('.supply-content')!.scrollTop = 100;
  search.dispatchEvent(new Event('input', { bubbles: true }));
  expect(document.activeElement).toBe(root.querySelector('input'));
  expect((document.activeElement as HTMLInputElement).selectionStart).toBe(3);
  expect(root.querySelector('.supply-content')!.scrollTop).toBe(100);
  click('Rocket engine');
  expect(model.snapshot.supplySelection.material).toBe('Rocket engine');
  expect(document.activeElement).toBe(
    root.querySelector('.supply-material-heading h2'),
  );
  expect(root.querySelector('.supply-capabilities')!.textContent).toContain(
    'Can produce · 0 queued',
  );
  expect(root.querySelectorAll('.supply-planet')).toHaveLength(1);
  click('All planets');
  expect(root.querySelectorAll('.supply-planet')).toHaveLength(2);
  click('Supply details for Tellus');
  click('Show inventory');
  expect(root.querySelector('[data-material="Rocket engine"]')).not.toBeNull();
  click('Open route Tellus to Vesta');
  expect(model.snapshot.screen).toBe('map');
  expect(model.snapshot.mapTrade.routeId).toBe('route-test');
  controller.dispose();
});

it('forsorjningsoversikt: inspection stays available without writing saves for temporary selections', () => {
  const { root, save, click, controller } = setup();
  save.mockClear();
  const search = root.querySelector<HTMLInputElement>('input')!;
  search.value = 'Iron';
  search.dispatchEvent(new Event('input'));
  click('Supply details for Vesta');
  expect(save).not.toHaveBeenCalled();
  controller.dispose();
});

it('produktionsformaga / forsorjningsstatus: missing staff and demolition block capabilities and project readiness', () => {
  const state = tradeNetworkState();
  const home = state.colonies[0]![1];
  home.population = 0;
  home.projects.push({
    id: 'engine-project',
    type: 'Rocket engine',
    slotIndex: null,
    factoryId: 'engine',
    destinationFleetId: null,
  });
  const unstaffed = Game.restore(state)
    .supplyOverview()
    .planets.find((p) => p.id === 'sol-0')!;
  expect(unstaffed.status).toBe('Needs attention');
  expect(unstaffed.summary).toContain('population');
  expect(unstaffed.capabilities[0]).toMatchObject({
    available: false,
    reason: 'Not enough workers',
    queued: 1,
  });
  home.buildings.find((b) => b.id === 'engine')!.demolition = true;
  const demolished = Game.restore(state)
    .supplyOverview()
    .planets.find((p) => p.id === 'sol-0')!;
  expect(demolished.summary).toContain('factory is required');
  expect(demolished.capabilities[0]!.reason).toBe(
    'Factory scheduled for demolition',
  );
});

it('materialoversikt: hundreds of material names remain searchable without changing the game catalogue', () => {
  const { model, controller } = setup();
  const stock = Object.fromEntries(
    Array.from({ length: 300 }, (_, i) => [`Material ${i}`, i + 1]),
  );
  const supply = new SupplyOverview(
    [
      {
        id: 'sol-0',
        name: 'Tellus',
        project: null,
        issue: null,
        stock,
        reserved: {},
        demand: {},
        extraction: {},
        deposits: {},
        capabilities: [],
      },
    ],
    [],
  );
  const emit = vi.fn();
  const view = renderSupply(
    {
      ...model.snapshot,
      supply,
      supplySelection: {
        query: 'Material 299',
        material: null,
        expanded: [],
        inventories: [],
      },
    },
    emit,
  );
  const results = view.querySelector('.supply-search-results')!;
  expect(results.querySelectorAll('button')).toHaveLength(1);
  results.querySelector('button')!.click();
  expect(emit).toHaveBeenCalledWith({
    type: 'supply-material',
    material: 'Material 299',
  });
  controller.dispose();
});

it('forsorjningsstatus / leveransfloden: decisions and supply agree, inspection preserves game state, and arrival resolves needs', () => {
  const game = Game.restore(tradeNetworkState());
  const before = game.exportState();
  expect(game.supplyOverview().planets[0]!.status).toBe('Needs attention');
  expect(game.decisions.some((d) => d.id === 'supply-sol-1')).toBe(true);
  expect(game.exportState()).toEqual(before);
  game.assignTradeFleet('route-test', 'freighters');
  expect(game.supplyOverview().planets[0]!.status).toBe('Waiting');
  expect(game.decisions.some((d) => d.id === 'supply-sol-1')).toBe(false);
  expect(game.shipments[0]).toMatchObject({
    state: 'Awaiting pickup',
    source: 'Tellus',
    recipient: 'Vesta',
    project: 'Iron mine',
  });
  const frames = game.startTurn();
  expect(game.shipments[0]).toMatchObject({
    state: 'In transit',
    source: 'Tellus',
    recipient: 'Vesta',
    project: 'Iron mine',
  });
  expect(
    game.supplyOverview().planets.find((p) => p.id === 'sol-1')!.status,
  ).toBe('Waiting');
  expect(game.decisions.some((d) => d.id === 'supply-sol-1')).toBe(false);
  for (const frame of frames) game.applyFrame(frame);
  game.finishTurn();
  expect(game.shipments).toHaveLength(0);
  expect(
    game.supplyOverview().planets.find((p) => p.id === 'sol-1')!.status,
  ).toBe('Idle');
});

it('forsorjningsoversikt: opens supply decisions at the affected planet and route decisions on Star map', () => {
  const { model, controller } = setup();
  model.selectSupplyMaterial('Rocket engine');
  model.openDecision('supply-sol-1');
  expect(model.snapshot.screen).toBe('supply');
  expect(model.snapshot.supplySelection.material).toBeNull();
  expect(model.snapshot.supplySelection.expanded).toContain('sol-1');
  model.beginDestination('fleet-home');
  expect(model.snapshot.destinationFleetId).toBe('fleet-home');
  model.openDecision('route-idle-route-test');
  expect(model.snapshot.screen).toBe('map');
  expect(model.snapshot.destinationFleetId).toBeNull();
  expect(model.snapshot.mapTrade.routeId).toBe('route-test');
  model.openSupplyPlanet('sol-1');
  expect(model.snapshot.planet!.name).toBe('Vesta');
  controller.dispose();
});
