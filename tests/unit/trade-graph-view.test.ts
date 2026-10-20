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
  const view = renderTradeRoutes(model.snapshot, () => {});
  expect(view.querySelectorAll('.trade-planet-node')).toHaveLength(2);
  const home = view.querySelector('[data-planet-id="sol-0"]')!;
  expect(
    home.querySelector('[data-material="Iron"] .trade-stock')!.textContent,
  ).toBe('120');
  expect(
    home.querySelector('[data-material="Iron"] .trade-extraction')!.textContent,
  ).toBe('10');
  expect(home.textContent).toContain('Factories: Rocket engine');
  const vesta = view.querySelector('[data-planet-id="sol-1"]')!;
  expect(
    vesta.querySelector('[data-material="Iron"] .trade-shortage')!.textContent,
  ).toBe('5');
  expect(vesta.textContent).toContain('Next: Iron mine');
  expect(view.textContent).not.toContain('Nadir I');
});

it('handelsgraf-flottboxar: assigns and releases a fleet through controllers without losing the graph camera', () => {
  const model = modelWithRoute();
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  new AppController(
    model,
    new AppView(root, () => ({ render() {}, dispose() {} })),
  ).start();
  const click = (label: string) =>
    root
      .querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!
      .click();
  click('Assign fleets to Tellus to Vesta');
  const camera = model.snapshot.tradeGraph.camera;
  expect(
    root.querySelector<HTMLButtonElement>(
      '[aria-label="Assign Home Fleet to Tellus to Vesta"]',
    )!.disabled,
  ).toBe(true);
  expect(
    root.querySelector<HTMLButtonElement>(
      '[aria-label="Assign Travellers to Tellus to Vesta"]',
    )!.disabled,
  ).toBe(true);
  click('Assign Freighters to Tellus to Vesta');
  expect(model.snapshot.tradeRoutes[0]!.fleetIds).toContain('freighters');
  expect(root.querySelector('.trade-route-dock')!.textContent).toContain(
    '60 cargo capacity',
  );
  expect(
    root.querySelector(
      '.trade-route-dock [data-fleet-id="freighters"] [data-ship="Transport ship"]',
    ),
  ).not.toBeNull();
  expect(model.snapshot.tradeGraph.camera).toEqual(camera);
  click('Release Freighters');
  expect(model.snapshot.tradeRoutes[0]!.fleetIds).toEqual([]);
});

it('handelsgraf-flottboxar: displays exact ship totals and positions, and emits the canonical assignment order on a valid drop', () => {
  const model = modelWithRoute();
  const emit = vi.fn();
  const view = renderTradeRoutes(model.snapshot, emit);
  const bay = view.querySelector('.trade-fleet-bay')!;
  const fleet = bay.querySelector('[data-fleet-id="freighters"]')!;
  expect(
    fleet.querySelector('[data-ship="Transport ship"] figcaption')!.textContent,
  ).toBe('2');
  expect(fleet.textContent).toContain('Tellus · HEX 1, 0');
  expect(bay.querySelector('[data-fleet-id="empty"]')!.textContent).toContain(
    'No position',
  );
  const drop = new Event('drop', { cancelable: true });
  Object.defineProperty(drop, 'dataTransfer', {
    value: { getData: () => 'freighters' },
  });
  view.querySelector('.trade-route-dock')!.dispatchEvent(drop);
  expect(emit).toHaveBeenLastCalledWith({
    type: 'assign-trade-fleet',
    routeId: 'route-test',
    fleetId: 'freighters',
  });
});
