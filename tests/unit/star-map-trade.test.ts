import { expect, it } from 'vitest';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppController } from '../../src/client/controllers/AppController.js';
import { HexGeometry } from '../../src/client/models/HexCoordinate.js';
import { TradeRouteMapLayout } from '../../src/client/models/TradeRouteMapLayout.js';
import type { IntentHandler } from '../../src/client/views/ViewContracts.js';
import {
  tradeNetworkState,
  distantTradeNetworkState,
} from '../fixtures/trade-network.js';
import { FleetMapLayout } from '../../src/client/models/FleetMapLayout.js';

function session(withRoute = true, state = tradeNetworkState(withRoute)) {
  const model = new AppModel(undefined, {
    load: () => ({
      lastPlayed: '2026-10-21T10:00:00Z',
      state,
    }),
    save() {},
    clear() {},
  });
  model.startSlot(1);
  let emit: IntentHandler = () => {};
  const controller = new AppController(model, {
    bind(handler) {
      emit = handler;
    },
    render() {},
    dispose() {},
  });
  controller.start();
  const point = (world: { x: number; y: number }) => ({
    x: (world.x - model.snapshot.camera.center.x) * model.snapshot.camera.zoom,
    y: (world.y - model.snapshot.camera.center.y) * model.snapshot.camera.zoom,
  });
  const drag = (
    start: { x: number; y: number },
    end: { x: number; y: number },
  ) => {
    emit({ type: 'pointer-start', id: 1, point: start });
    emit({ type: 'pointer-move', id: 1, point: end });
    emit({ type: 'pointer-end', id: 1, point: end });
  };
  return { model, emit, point, drag };
}

it('handelsrutt-val-pa-stjarnkartan: route hit widths stay in screen pixels across zoom and preserve overlapping candidates', () => {
  const { model } = session();
  const route = model.snapshot.tradeRoutes[0]!;
  const a = HexGeometry.toPoint(route.start),
    b = HexGeometry.toPoint(route.end);
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  for (const zoom of [0.35, 1, 2.5]) {
    const p = (distance: number) => ({
      x: (a.x + b.x) / 2 - (((b.y - a.y) / length) * distance) / zoom,
      y: (a.y + b.y) / 2 + (((b.x - a.x) / length) * distance) / zoom,
    });
    expect(
      TradeRouteMapLayout.hit(
        [route, { ...route, id: 'overlap' }],
        p(13),
        zoom,
        14,
      ),
    ).toHaveLength(2);
    expect(TradeRouteMapLayout.hit([route], p(15), zoom, 14)).toHaveLength(0);
    expect(TradeRouteMapLayout.hit([route], p(19), zoom, 20)).toHaveLength(1);
  }
});

it('handelsrutt-skapande-pa-stjarnkartan: a selected planet creates one route by dragging, keeps the camera and selects its details', () => {
  const { model, point, drag } = session(false);
  const [a, b] = model.snapshot.ownedPlanets;
  model.select(a!.position);
  const camera = model.snapshot.camera;
  drag(
    point(HexGeometry.toPoint(a!.position)),
    point(HexGeometry.toPoint(b!.position)),
  );
  expect(model.snapshot.tradeRoutes).toHaveLength(1);
  expect(model.snapshot.mapTrade.routeId).toBe(
    model.snapshot.tradeRoutes[0]!.id,
  );
  expect(model.snapshot.camera).toEqual(camera);
  model.select(a!.position);
  drag(
    point(HexGeometry.toPoint(a!.position)),
    point(HexGeometry.toPoint(b!.position)),
  );
  expect(model.snapshot.tradeRoutes).toHaveLength(1);
});

it('flottilldelning-pa-stjarnkartan: dropping ships on a route assigns without changing their physical position or giving a move order', () => {
  const { model, point, drag } = session();
  const before = model.snapshot.fleets.find((f) => f.id === 'freighters')!;
  const marker = FleetMapLayout.markers(model.snapshot.fleets).find(
    (m) => m.fleet.id === before.id,
  )!;
  const route = model.snapshot.tradeRoutes[0]!;
  const a = HexGeometry.toPoint(route.start),
    b = HexGeometry.toPoint(route.end);
  drag(point(marker.point), point({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }));
  const after = model.snapshot.fleets.find((f) => f.id === before.id)!;
  expect(after.routeId).toBe(route.id);
  expect(after.position).toEqual(before.position);
  expect(after.destination).toBeNull();
  expect(model.snapshot.mapTrade.routeId).toBe(route.id);
});

it('flottilldelning-pa-stjarnkartan: an invalid route drop and cancelled drag cannot become destination orders', () => {
  const { model, point, drag, emit } = session();
  const before = model.snapshot.fleets[0]!;
  const marker = FleetMapLayout.markers(model.snapshot.fleets).find(
    (m) => m.fleet.id === before.id,
  )!;
  const route = model.snapshot.tradeRoutes[0]!;
  const a = HexGeometry.toPoint(route.start),
    b = HexGeometry.toPoint(route.end);
  const end = point({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  drag(point(marker.point), end);
  expect(model.snapshot.fleets[0]!.destination).toEqual(before.destination);
  emit({ type: 'pointer-start', id: 1, point: point(marker.point) });
  emit({ type: 'pointer-move', id: 1, point: end });
  emit({ type: 'pointer-cancel' });
  emit({ type: 'pointer-end', id: 1, point: end });
  expect(model.snapshot.fleets[0]!.destination).toEqual(before.destination);
  expect(model.snapshot.mapTrade.candidateRouteIds).toEqual([]);
});

it('handelsrutt-skapande-pa-stjarnkartan: click/keyboard creation survives panning and obeys research and ownership rules', () => {
  const { model, emit } = session(false);
  const [home, target] = model.snapshot.ownedPlanets;
  emit({ type: 'begin-map-route', id: home!.id });
  emit({ type: 'pan', delta: { x: 10, y: 10 } });
  expect(model.snapshot.mapTrade.sourcePlanetId).toBe(home!.id);
  emit({ type: 'select', position: target!.position });
  expect(model.snapshot.tradeRoutes).toHaveLength(1);
  expect(model.snapshot.mapTrade.sourcePlanetId).toBeNull();
  const locked = { ...tradeNetworkState(false), researched: [] };
  const other = session(false, locked);
  other.emit({ type: 'begin-map-route', id: home!.id });
  other.emit({ type: 'select', position: target!.position });
  expect(other.model.snapshot.tradeRoutes).toHaveLength(0);
});

it('handelsrutt-skapande-pa-stjarnkartan: a second pointer cancels creation and cannot commit when the first pointer ends', () => {
  const { model, emit, point } = session(false);
  const [home, target] = model.snapshot.ownedPlanets;
  const start = point(HexGeometry.toPoint(home!.position));
  const end = point(HexGeometry.toPoint(target!.position));
  emit({ type: 'pointer-start', id: 1, point: start });
  emit({ type: 'pointer-move', id: 1, point: end });
  expect(model.snapshot.mapTrade.preview?.targetId).toBe(target!.id);
  emit({ type: 'pointer-start', id: 2, point: { x: 100, y: 100 } });
  emit({ type: 'pointer-end', id: 1, point: end });
  emit({ type: 'pointer-end', id: 2, point: end });
  expect(model.snapshot.tradeRoutes).toHaveLength(0);
  expect(model.snapshot.mapTrade.preview).toBeNull();
});

it('flottilldelning-pa-stjarnkartan: ambiguous drops wait for an explicit route choice', () => {
  const original = distantTradeNetworkState();
  const state = {
    ...original,
    fleets: original.fleets.map((f) => {
      const copy = { ...f };
      if (copy.id === 'freighters') delete copy.routeId;
      return copy;
    }),
  };
  const { model, emit, point, drag } = session(true, state);
  const fleet = model.snapshot.fleets.find((f) => f.id === 'freighters')!;
  const marker = FleetMapLayout.markers(model.snapshot.fleets).find(
    (m) => m.fleet.id === fleet.id,
  )!;
  drag(point(marker.point), point(HexGeometry.toPoint(fleet.position!)));
  expect(model.snapshot.mapTrade.candidateRouteIds).toHaveLength(2);
  expect(
    model.snapshot.fleets.find((f) => f.id === fleet.id)!.routeId,
  ).toBeUndefined();
  emit({
    type: 'assign-trade-fleet',
    fleetId: fleet.id,
    routeId: 'route-test',
  });
  expect(model.snapshot.mapTrade.candidateRouteIds).toEqual([]);
  expect(model.snapshot.mapTrade.routeId).toBe('route-test');
});

it('handelsrutt-val-pa-stjarnkartan: planet and fleet clicks take priority over lines; route selection clears when the route disappears', () => {
  const { model, emit, point } = session();
  const home = model.snapshot.ownedPlanets[0]!;
  const center = point(HexGeometry.toPoint(home.position));
  emit({ type: 'pointer-start', id: 1, point: center });
  emit({ type: 'pointer-end', id: 1, point: center });
  expect(model.snapshot.mapTrade.routeId).toBeNull();
  const marker = FleetMapLayout.markers(model.snapshot.fleets)[0]!;
  const p = point(marker.point);
  emit({ type: 'pointer-start', id: 1, point: p });
  emit({ type: 'pointer-end', id: 1, point: p });
  expect(model.snapshot.mapFleetId).toBe(marker.fleet.id);
  emit({ type: 'map-select-route', id: 'route-test' });
  expect(model.snapshot.mapFleetId).toBeNull();
  emit({ type: 'close-trade-route', id: 'route-test' });
  expect(model.snapshot.mapTrade.routeId).toBeNull();
});

it('handelsrutt-val-pa-stjarnkartan: Homeworld and explicit destination mode replace route selection', () => {
  const { model, emit, point } = session();
  emit({ type: 'map-select-route', id: 'route-test' });
  emit({ type: 'home' });
  expect(model.snapshot.mapTrade.routeId).toBeNull();
  emit({ type: 'map-select-route', id: 'route-test' });
  emit({ type: 'begin-destination', id: 'freighters' });
  expect(model.snapshot.mapTrade.routeId).toBeNull();
  const route = model.snapshot.tradeRoutes[0]!;
  const a = HexGeometry.toPoint(route.start),
    b = HexGeometry.toPoint(route.end);
  model.selectPoint(
    point({ x: a.x + (b.x - a.x) * 0.75, y: a.y + (b.y - a.y) * 0.75 }),
  );
  const fleet = model.snapshot.fleets.find((f) => f.id === 'freighters')!;
  expect(fleet.destination).not.toBeNull();
  expect(fleet.routeId).toBeUndefined();
});
