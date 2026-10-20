// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppController } from '../../src/client/controllers/AppController.js';
import { AppView } from '../../src/client/views/AppView.js';
import { renderTradeRoutes } from '../../src/client/views/TradeGraphView.js';
import { tradeNetworkState } from '../fixtures/trade-network.js';

function modelWithRoute() {
  const model = new AppModel(undefined, {
    load: (id) =>
      id === 1
        ? { lastPlayed: '2026-10-20T10:00:00Z', state: tradeNetworkState() }
        : null,
    save() {},
    clear() {},
  });
  model.startSlot(1);
  model.openTradeRoutes();
  return model;
}

it('handelsgraf-planetoversikt: exposes stock, extraction, net need, incoming and manufacturing without foreign planets', () => {
  const model = modelWithRoute();
  model.selectTradePlanet('sol-0');
  const view = renderTradeRoutes(model.snapshot, () => {});
  expect(view.querySelectorAll('.trade-planet-node')).toHaveLength(2);
  expect(view.querySelector('.trade-graph-stage .trade-materials')).toBeNull();
  const home = view.querySelector('.trade-selection-panel')!;
  expect(
    home.querySelector('[data-material="Iron"] .trade-stock')!.textContent,
  ).toBe('120');
  expect(
    home.querySelector('[data-material="Iron"] .trade-extraction')!.textContent,
  ).toBe('10');
  expect(home.textContent).toContain('Factories: Rocket engine');
  model.selectTradePlanet('sol-1');
  const vesta = renderTradeRoutes(model.snapshot, () => {}).querySelector(
    '.trade-selection-panel',
  )!;
  expect(
    vesta.querySelector('[data-material="Iron"] .trade-shortage')!.textContent,
  ).toBe('5');
  expect(vesta.textContent).toContain('Next: Iron mine');
  expect(view.textContent).not.toContain('Nadir I');
});

it('handelsgraf-kompakt-flottvy / handelsgraf-valpanel: selects ships, assigns on a route and releases through the detail panel without large graph cards', () => {
  const model = modelWithRoute();
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const controller = new AppController(
    model,
    new AppView(root, () => ({ render() {}, dispose() {} })),
  );
  controller.start();
  const click = (label: string) =>
    root
      .querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
  expect(root.querySelector('.trade-graph-stage .trade-fleet-box')).toBeNull();
  expect(root.querySelector('.trade-route-dock')).toBeNull();
  expect(root.querySelectorAll('.trade-ship-location')).toHaveLength(4);
  click('Select route Tellus to Vesta');
  const camera = model.snapshot.tradeGraph.camera;
  expect(
    root.querySelector<HTMLButtonElement>(
      '[aria-label="Assign Home Fleet to Tellus to Vesta"]',
    )!.disabled,
  ).toBe(true);
  click('Assign Freighters to Tellus to Vesta');
  expect(model.snapshot.tradeRoutes[0]!.fleetIds).toEqual(['freighters']);
  const panel = root.querySelector('.trade-selection-panel')!;
  expect(panel.textContent).toContain('60 cargo capacity');
  expect(
    panel.querySelector(
      '[data-fleet-id="freighters"] [data-ship="Transport ship"] figcaption',
    )!.textContent,
  ).toBe('2');
  expect(model.snapshot.tradeGraph.camera).toEqual(camera);
  click('Select ships of Freighters');
  expect(root.querySelector('.trade-selection-panel h2')!.textContent).toBe(
    'Freighters',
  );
  click('Release Freighters');
  expect(model.snapshot.tradeRoutes[0]!.fleetIds).toEqual([]);
  expect(root.querySelector('.trade-graph-stage .trade-fleet-box')).toBeNull();
  controller.dispose();
});

it('handelsgraf-kompakt-flottvy: drops a fleet directly onto the line and rejects travelling fleets', () => {
  const model = modelWithRoute();
  const emit = vi.fn();
  const view = renderTradeRoutes(model.snapshot, emit);
  const ships = view.querySelector<HTMLButtonElement>(
    '.trade-ship-location[data-fleet-id="freighters"]',
  )!;
  expect(
    ships.querySelector('[data-ship="Transport ship"]')!.textContent,
  ).toContain('2');
  expect(view.querySelector('[data-fleet-id="empty"]')!.textContent).toContain(
    'No position',
  );
  for (const id of ['freighters', 'travellers']) {
    emit.mockClear();
    const drop = new Event('drop', { cancelable: true });
    Object.defineProperty(drop, 'dataTransfer', {
      value: { getData: () => id },
    });
    view.querySelector('.trade-route-hit')!.dispatchEvent(drop);
    if (id === 'freighters')
      expect(emit).toHaveBeenLastCalledWith({
        type: 'assign-trade-fleet',
        routeId: 'route-test',
        fleetId: id,
      });
    else expect(emit).not.toHaveBeenCalled();
  }
});
