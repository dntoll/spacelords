// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { AppController } from '../../src/client/controllers/AppController.js';
import { AppModel } from '../../src/client/models/AppModel.js';
import { FleetMapLayout } from '../../src/client/models/FleetMapLayout.js';
import {
  HexCoordinate,
  HexGeometry,
} from '../../src/client/models/HexCoordinate.js';
import { AppView } from '../../src/client/views/AppView.js';
import type { IntentHandler } from '../../src/client/views/ViewContracts.js';
import { tradeNetworkState } from '../fixtures/trade-network.js';

beforeEach(() => document.body.replaceChildren());
function setup() {
  const state = tradeNetworkState();
  const model = new AppModel(undefined, {
    load: () => ({ lastPlayed: '2026-10-24T00:00:00Z', state }),
    save() {},
    clear() {},
  });
  model.startSlot(1);
  const root = document.createElement('div');
  document.body.append(root);
  const view = new AppView(root, () => ({ render() {}, dispose() {} }));
  let emit: IntentHandler = () => {};
  new AppController(model, {
    bind(handler) {
      emit = handler;
      view.bind(handler);
    },
    render(snapshot) {
      view.render(snapshot);
    },
    dispose() {
      view.dispose();
    },
  }).start();
  const click = (label: string) => {
    const button = root.querySelector<HTMLButtonElement>(
      `[aria-label="${label}"]`,
    );
    expect(button, label).not.toBeNull();
    button!.click();
  };
  const at = (q: number, r: number) => {
    const world = HexGeometry.toPoint(new HexCoordinate(q, r));
    const { center, zoom } = model.snapshot.camera;
    return { x: (world.x - center.x) * zoom, y: (world.y - center.y) * zoom };
  };
  const fleetPoint = (id = 'fleet-home') => {
    const marker = FleetMapLayout.markers(model.snapshot.fleets).find(
      (m) => m.fleet.id === id,
    )!;
    const { center, zoom } = model.snapshot.camera;
    return {
      x: (marker.point.x - center.x) * zoom,
      y: (marker.point.y - center.y) * zoom,
    };
  };
  return { model, root, view, emit, click, at, fleetPoint };
}

describe('delad-kartkamera', () => {
  it('shares pan and zoom bidirectionally without recentering and keeps fleet selection', () => {
    const { model, root, emit } = setup();
    emit({ type: 'map-select-fleet', id: 'fleet-home' });
    emit({ type: 'pan', delta: { x: 83, y: -42 } });
    emit({ type: 'zoom', factor: 1.6, anchor: { x: 23, y: -9 } });
    const camera = model.snapshot.camera;
    emit({ type: 'open-fleets' });
    expect(root.querySelector('.map-container')).not.toBeNull();
    expect(root.querySelector('h1')?.textContent).toBe('Fleets');
    expect(model.snapshot.camera).toEqual(camera);
    expect(model.snapshot.mapFleetId).toBe('fleet-home');
    emit({ type: 'pan', delta: { x: -24, y: 70 } });
    emit({ type: 'zoom', factor: 0.8, anchor: { x: -20, y: 4 } });
    const nextCamera = model.snapshot.camera;
    emit({ type: 'open-map' });
    expect(model.snapshot.camera).toEqual(nextCamera);
    expect(model.snapshot.mapFleetId).toBe('fleet-home');
  });
});

describe('flottfokuserad-kartvy', () => {
  it('ignores route and planet background while preserving fleet selection and orders', () => {
    const { model, root, emit, at, fleetPoint } = setup();
    emit({ type: 'map-select-route', id: 'route-test' });
    emit({ type: 'open-fleets' });
    expect(root.querySelector('.selection-panel')?.hasAttribute('hidden')).toBe(
      true,
    );
    for (const point of [
      at(1, 0),
      at(0, 1),
      { x: (at(1, 0).x + at(0, 1).x) / 2, y: (at(1, 0).y + at(0, 1).y) / 2 },
    ]) {
      emit({ type: 'pointer-move', id: 1, point });
      emit({ type: 'pointer-start', id: 1, point });
      emit({ type: 'pointer-end', id: 1, point });
      expect(model.snapshot.mapTrade.routeId).toBeNull();
      expect(model.snapshot.mapTrade.hoveredRouteIds).toEqual([]);
      expect(
        root.querySelector('.selection-panel')?.hasAttribute('hidden'),
      ).toBe(true);
      expect(model.mapRouteDragSource(point)).toBeNull();
    }
    const start = fleetPoint();
    emit({ type: 'pointer-start', id: 1, point: start });
    expect(model.snapshot.mapFleetId).toBe('fleet-home');
    emit({ type: 'pointer-end', id: 1, point: start });
    expect(root.querySelector('.map-fleet-management')).not.toBeNull();
    expect(root.querySelector('.selection-description')).toBeNull();
    // A route endpoint remains a movement target, never an assignment drop.
    emit({ type: 'pointer-start', id: 1, point: fleetPoint('freighters') });
    emit({ type: 'pointer-move', id: 1, point: at(0, 1) });
    emit({ type: 'pointer-end', id: 1, point: at(0, 1) });
    expect(
      model.snapshot.fleets.find((fleet) => fleet.id === 'freighters')!
        .destination?.key,
    ).toBe('0,1');
    expect(
      model.snapshot.fleets.find((fleet) => fleet.id === 'freighters')!.routeId,
    ).toBeFalsy();
    expect(model.snapshot.screen).toBe('fleets');
  });

  it('keeps map destinations, cancellation, local and distant transfers on Fleets', () => {
    const { model, root, emit, click } = setup();
    emit({ type: 'open-fleets' });
    emit({ type: 'map-select-fleet', id: 'fleet-home' });
    click('Choose destination for Home Fleet');
    expect(model.snapshot.screen).toBe('fleets');
    click('Cancel');
    expect(model.snapshot.screen).toBe('fleets');
    expect(model.snapshot.destinationFleetId).toBeNull();
    click('Choose destination for Home Fleet');
    expect(root.querySelector('[aria-label="Destination hex"]')).toBeNull();
    emit({ type: 'select', position: new HexCoordinate(0, 1) });
    expect(model.snapshot.fleets[0]!.destination?.key).toBe('0,1');
    expect(model.snapshot.screen).toBe('fleets');
    click('Fighter 1 in Home Fleet');
    click('Move ship to new fleet');
    expect(model.snapshot.mapFleetId).not.toBe('fleet-home');
    expect(model.snapshot.fleetNameEdit).not.toBeNull();
    emit({ type: 'cancel-fleet-rename' });
    emit({ type: 'map-select-fleet', id: 'fleet-home' });
    click('Exploration ship 1 in Home Fleet');
    const select = root.querySelector<HTMLSelectElement>(
      '[aria-label="Receiving fleet"]',
    )!;
    expect(select.textContent).toContain('Reserve');
    select.value = 'travellers';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(
      model.snapshot.fleets.some((f) => f.joinFleetId === 'travellers'),
    ).toBe(true);
    expect(model.snapshot.screen).toBe('fleets');
    expect(
      root.querySelector('[aria-label="Cancel reinforcement"]'),
    ).not.toBeNull();
    expect(root.querySelector('.fleet-location-map')).toBeNull();
    expect(root.querySelector('[aria-label="Delete fleet"]')).toBeNull();
    expect(root.querySelector('button[aria-label="New fleet"]')).toBeNull();
  });

  it('dismisses selection outside the hex field and cancels the destination picker with canvas Escape', () => {
    const { model, root, emit } = setup();
    emit({ type: 'open-fleets' });
    emit({ type: 'map-select-fleet', id: 'fleet-home' });
    const outside = { x: 10000, y: 10000 };
    emit({ type: 'pointer-start', id: 1, point: outside });
    emit({ type: 'pointer-end', id: 1, point: outside });
    expect(model.snapshot.mapFleetId).toBeNull();
    expect(root.querySelector<HTMLElement>('.selection-panel')!.hidden).toBe(
      true,
    );
    emit({ type: 'map-select-fleet', id: 'fleet-home' });
    emit({ type: 'begin-destination', id: 'fleet-home' });
    emit({ type: 'pointer-cancel' });
    expect(model.snapshot.destinationFleetId).toBeNull();
    expect(model.snapshot.screen).toBe('fleets');
    expect(model.snapshot.fleets[0]!.destination).toBeNull();
  });

  it('preserves fleet panel route actions, positionless receivers and Star map route selection', () => {
    const { model, root, emit, click } = setup();
    emit({ type: 'map-select-route', id: 'route-test' });
    emit({ type: 'open-research' });
    emit({ type: 'open-map' });
    expect(model.snapshot.mapTrade.routeId).toBe('route-test');
    emit({ type: 'open-fleets' });
    emit({ type: 'begin-map-route', id: 'sol-0' });
    expect(model.snapshot.mapTrade.sourcePlanetId).toBeNull();
    emit({ type: 'map-select-fleet', id: 'freighters' });
    click('Assign Freighters to Tellus to Vesta');
    expect(model.snapshot.screen).toBe('fleets');
    expect(
      model.snapshot.fleets.find((fleet) => fleet.id === 'freighters')?.routeId,
    ).toBe('route-test');
    expect(
      root.querySelector('[aria-label="Release from trade route"]'),
    ).not.toBeNull();
    click('Release from trade route');
    expect(model.snapshot.screen).toBe('fleets');
    emit({ type: 'map-select-fleet', id: 'fleet-home' });
    click('Fighter 1 in Home Fleet');
    const receivers = root.querySelector<HTMLSelectElement>(
      '[aria-label="Receiving fleet"]',
    )!;
    receivers.value = 'empty';
    receivers.dispatchEvent(new Event('change', { bubbles: true }));
    expect(model.snapshot.mapFleetId).toBe('empty');
    expect(
      model.snapshot.fleets.find((fleet) => fleet.id === 'empty'),
    ).toMatchObject({
      name: 'Reserve',
      ships: { Fighter: 1 },
      position: { q: 1, r: 0 },
    });
    expect(model.snapshot.screen).toBe('fleets');
  });

  it('cancels temporary orders on navigation, and explicitly opens a fleet or route', () => {
    const { model, emit, at, fleetPoint } = setup();
    emit({ type: 'open-fleets' });
    emit({ type: 'pointer-start', id: 1, point: fleetPoint() });
    emit({ type: 'pointer-move', id: 1, point: at(2, 0) });
    emit({ type: 'open-map' });
    expect(model.snapshot.fleetDestinationPreview).toBeNull();
    expect(model.snapshot.fleets[0]!.destination).toBeNull();
    emit({ type: 'open-fleets' });
    emit({ type: 'begin-destination', id: 'fleet-home' });
    emit({ type: 'open-map' });
    emit({ type: 'select', position: new HexCoordinate(0, 1) });
    expect(model.snapshot.fleets[0]!.destination).toBeNull();
    emit({ type: 'open-fleet', id: 'travellers' });
    expect(model.snapshot.screen).toBe('fleets');
    expect(model.snapshot.mapFleetId).toBe('travellers');
    expect(model.snapshot.camera.center).toEqual(
      HexGeometry.toPoint(new HexCoordinate(0, 0)),
    );
    emit({ type: 'map-select-route', id: 'route-test' });
    expect(model.snapshot.screen).toBe('map');
    expect(model.snapshot.mapTrade.routeId).toBe('route-test');
  });
});
