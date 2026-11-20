// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type p5 from 'p5';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { MasterController } from '../../../src/client/app/controllers/MasterController.js';
import { AppView } from '../../../src/client/app/views/AppView.js';
import type { FleetSnapshot } from '../../../src/client/space-map/models/Game.js';
import { fleetCategory } from '../../../src/client/space-map/models/fleets/FleetCategory.js';
import { FleetMapLayout } from '../../../src/client/space-map/models/star-map/FleetMapLayout.js';
import { FLEET_CATEGORY_COLORS } from '../../../src/client/space-map/views/FleetCategoryColors.js';
import { renderMapFleets } from '../../../src/client/space-map/views/star-map/FleetMapView.js';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';
import { tradeNetworkState } from '../../fixtures/trade-network.js';

const noShips: FleetSnapshot['ships'] = {
  Fighter: 0,
  'Exploration ship': 0,
  'Colony ship': 0,
  'Transport ship': 0,
  'Civilian shuttle': 0,
  'Space pirate': 0,
  'Salvage ship': 0,
  Raptor: 0,
};

function fleet(
  ships: Partial<FleetSnapshot['ships']>,
  order: Partial<FleetSnapshot> = {},
): FleetSnapshot {
  return {
    id: 'f',
    name: 'F',
    position: new HexCoordinate(0, 0),
    destination: null,
    ships: { ...noShips, ...ships },
    speed: 1,
    crew: 0,
    ...order,
  };
}

describe('flottkategorier', () => {
  it('lets the order decide a mixed fleet and the ships decide otherwise', () => {
    const mixed = { 'Transport ship': 1, Fighter: 2, 'Colony ship': 1 };
    expect(fleetCategory(fleet(mixed))).toBe('Mixed');
    expect(fleetCategory(fleet(mixed, { routeId: 'r' }))).toBe('Transport');
    expect(fleetCategory(fleet(mixed, { colonizationTargetId: 'sol-2' }))).toBe(
      'Colony',
    );
    expect(
      fleetCategory(
        fleet(mixed, { patrol: { center: new HexCoordinate(0, 0), range: 1 } }),
      ),
    ).toBe('Combat');
    expect(fleetCategory(fleet({ 'Exploration ship': 2 }))).toBe('Exploration');
    expect(fleetCategory(fleet({ Fighter: 1, Raptor: 1 }))).toBe('Combat');
    expect(fleetCategory(fleet({ 'Salvage ship': 1 }))).toBe('Salvage');
  });

  it('gives every category its own colour and none of them the pirate red', () => {
    const colours = Object.values(FLEET_CATEGORY_COLORS);
    expect(new Set(colours).size).toBe(colours.length);
    expect(colours).not.toContain('#ff8e85');
    expect(colours).not.toContain('#ffdc88');
  });

  it('draws each fleet ring on the Fleets map in its category colour', () => {
    const stroke = vi.fn();
    const sketch = new Proxy(
      { stroke, drawingContext: { setLineDash() {} } },
      {
        get: (target, key) =>
          key in target ? target[key as keyof typeof target] : () => {},
      },
    ) as unknown as p5;
    renderMapFleets(
      sketch,
      [
        fleet({ 'Transport ship': 1 }, { id: 't' }),
        fleet({ Fighter: 1 }, { id: 'c', position: new HexCoordinate(3, 0) }),
      ],
      1,
      undefined,
      true,
    );
    expect(stroke).toHaveBeenCalledWith(FLEET_CATEGORY_COLORS.Transport);
    expect(stroke).toHaveBeenCalledWith(FLEET_CATEGORY_COLORS.Combat);
  });

  it('hides a chosen category from the Fleets map and shows it again', () => {
    const model = new AppModel(undefined, {
      load: () => ({
        lastPlayed: '2026-11-20T00:00:00Z',
        state: { ...tradeNetworkState(), pirates: [] },
      }),
      save: vi.fn(),
      clear() {},
    });
    model.startSlot(1);
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    const controller = new MasterController(
      model,
      new AppView(root, () => ({ render() {}, dispose() {} })),
    );
    controller.start();
    root.querySelector<HTMLButtonElement>('[data-screen="fleets"]')!.click();
    const toggle = () =>
      root.querySelector<HTMLButtonElement>(
        '.fleet-category-legend [data-category="Transport"]',
      )!;
    expect(toggle().getAttribute('aria-pressed')).toBe('true');
    const { camera, fleets, tradeRoutes } = model.snapshot;
    const marker = FleetMapLayout.markers(
      fleets,
      tradeRoutes,
      camera.zoom,
      'endpoint',
    ).find((item) => item.fleet.id === 'travellers')!;
    const point = {
      x: (marker.point.x - camera.center.x) * camera.zoom,
      y: (marker.point.y - camera.center.y) * camera.zoom,
    };
    expect(model.fleetAtPoint(point)).toBe('travellers');
    toggle().click();
    expect(model.snapshot.hiddenFleetCategories).toEqual(['Transport']);
    expect(toggle().getAttribute('aria-pressed')).toBe('false');
    expect(model.fleetAtPoint(point)).not.toBe('travellers');
    toggle().click();
    expect(model.snapshot.hiddenFleetCategories).toEqual([]);
    expect(model.fleetAtPoint(point)).toBe('travellers');
    controller.dispose();
  });
});
