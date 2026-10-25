import { turnFrames } from '../fixtures/turn-steps.js';
import { expect, it } from 'vitest';
import { Game } from '../../src/client/models/Game.js';
import { routeEscortState } from '../fixtures/route-escorts.js';

function session() {
  return Game.restore(routeEscortState());
}

it('unika-flottnamn: rejects duplicate names regardless of case and surrounding whitespace', () => {
  const game = session();
  expect(() => game.renameFleet('fighters', '  carrier a  ')).toThrow(
    /unique/i,
  );
  expect(game.fleet('fighters')!.name).toBe('Fighters');
  game.renameFleet('carrier-a', '  CARRIER A  ');
  expect(game.fleet('carrier-a')!.name).toBe('CARRIER A');
});

it('rutt-eskortfordelning: requires a carrier then distributes fighters into the carrier fleets without losing ship identities', () => {
  const game = session();
  const before = game
    .fleetSnapshots()
    .flatMap((fleet) => fleet.shipUnits!.map((ship) => ship.id))
    .sort();
  expect(() => game.assignTradeFleet('route-test', 'fighters')).toThrow(
    /transport/i,
  );
  expect(game.fleet('fighters')!.ships.Fighter).toBe(5);
  game.assignTradeFleet('route-test', 'carrier-a');
  game.assignTradeFleet('route-test', 'carrier-b');
  game.assignTradeFleet('route-test', 'fighters');
  expect(game.fleet('carrier-a')!.ships.Fighter).toBe(3);
  expect(game.fleet('carrier-b')!.ships.Fighter).toBe(2);
  expect(game.fleet('fighters')!.ships.Fighter).toBe(0);
  expect([...game.tradeRoutes[0]!.fleetIds].sort()).toEqual([
    'carrier-a',
    'carrier-b',
  ]);
  expect(
    game
      .fleetSnapshots()
      .flatMap((fleet) => fleet.shipUnits!.map((ship) => ship.id))
      .sort(),
  ).toEqual(before);
  const restored = Game.restore(game.exportState());
  expect(restored.fleet('carrier-a')!.ships.Fighter).toBe(3);
});

it('unika-flottnamn: repairs duplicate names in existing saves without losing fleets and avoids generated-name collisions', () => {
  const state = session().exportState();
  state.fleets[0]!.name = 'Fleet 1';
  state.fleets[1]!.name = 'fleet 1';
  state.fleets[2]!.name = 'Fleet 1 (2)';
  const game = Game.restore(state);
  expect(
    new Set(game.fleetSnapshots().map((f) => f.name.toLowerCase())).size,
  ).toBe(3);
  const created = game.createFleet();
  expect(created.name).toBe('Fleet 2');
  expect(game.exportState().fleets).toHaveLength(4);
});

it('rutt-eskortfordelning: balances existing escorts and pending reinforcements, which join physically at a distant carrier', () => {
  const state = session().exportState();
  state.fleets[0]!.ships.Fighter = 3;
  const game = Game.restore({
    ...state,
    fleets: state.fleets.map((fleet, index) =>
      index < 2 ? { ...fleet, position: { q: 0, r: 1 } } : fleet,
    ),
  });
  game.assignTradeFleet('route-test', 'carrier-a');
  game.assignTradeFleet('route-test', 'carrier-b');
  game.assignTradeFleet('route-test', 'fighters');
  expect(game.fleet('carrier-a')!.ships.Fighter).toBe(3);
  expect(game.fleet('carrier-b')!.ships.Fighter).toBe(0);
  const pending = game.fleetSnapshots().filter((f) => f.joinFleetId);
  expect(pending.reduce((sum, f) => sum + f.ships.Fighter, 0)).toBe(5);
  expect(
    pending.find((f) => f.joinFleetId === 'carrier-b')!.ships.Fighter,
  ).toBe(4);
  const restored = Game.restore(game.exportState());
  for (
    let year = 0;
    year < 5 && restored.fleetSnapshots().some((f) => f.joinFleetId);
    year++
  ) {
    for (const frame of turnFrames(restored)) restored.applyFrame(frame);
    restored.finishTurn();
  }
  expect(restored.fleetSnapshots().filter((f) => f.joinFleetId)).toEqual([]);
  expect(restored.fleet('carrier-a')!.ships.Fighter).toBe(4);
  expect(restored.fleet('carrier-b')!.ships.Fighter).toBe(4);
});

it('rutt-eskortfordelning: rejects closing routes, releasing carriers, travelling fighters and orders during simulation without mutation', () => {
  const game = session();
  game.assignTradeFleet('route-test', 'carrier-a');
  const closing = game.exportState();
  closing.tradeRoutes[0]!.closing = true;
  expect(() =>
    Game.restore(closing).assignTradeFleet('route-test', 'fighters'),
  ).toThrow(/closing/i);
  const releasing = game.exportState();
  releasing.fleets[0]!.releaseRequested = true;
  expect(() =>
    Game.restore(releasing).assignTradeFleet('route-test', 'fighters'),
  ).toThrow(/transport/i);
  const travelling = game.exportState();
  const moving = Game.restore({
    ...travelling,
    fleets: travelling.fleets.map((fleet, index) =>
      index === 2 ? { ...fleet, destination: { q: 0, r: 1 } } : fleet,
    ),
  });
  const before = moving.exportState();
  expect(() => moving.assignTradeFleet('route-test', 'fighters')).toThrow(
    /travelling/i,
  );
  expect(moving.exportState()).toEqual(before);
  game.startTurn();
  expect(() => game.assignTradeFleet('route-test', 'fighters')).toThrow();
  expect(() => game.renameFleet('fighters', 'New name')).toThrow();
});

it('ruttflottor-pa-kartan: assigned fleets are separated around the midpoint, remain selectable and leave physical fleet positions unchanged', async () => {
  const { FleetMapLayout } =
    await import('../../src/client/models/FleetMapLayout.js');
  const { HexGeometry } =
    await import('../../src/client/models/HexCoordinate.js');
  const { AppModel } = await import('../../src/client/models/AppModel.js');
  const game = session();
  game.assignTradeFleet('route-test', 'carrier-a');
  game.assignTradeFleet('route-test', 'carrier-b');
  const model = new AppModel(undefined, {
    load: () => ({
      lastPlayed: '2026-10-24T00:00:00Z',
      state: game.exportState(),
    }),
    save() {},
    clear() {},
  });
  model.startSlot(1);
  model.openRoute();
  const route = game.tradeRoutes[0]!;
  const a = HexGeometry.toPoint(route.start),
    b = HexGeometry.toPoint(route.end);
  const markers = FleetMapLayout.markers(
    game.fleetSnapshots(),
    game.tradeRoutes,
  ).filter((m) => m.fleet.routeId);
  expect(markers).toHaveLength(2);
  expect((markers[0]!.point.x + markers[1]!.point.x) / 2).toBeCloseTo(
    (a.x + b.x) / 2,
  );
  expect((markers[0]!.point.y + markers[1]!.point.y) / 2).toBeCloseTo(
    (a.y + b.y) / 2,
  );
  expect(
    Math.hypot(
      markers[0]!.point.x - markers[1]!.point.x,
      markers[0]!.point.y - markers[1]!.point.y,
    ),
  ).toBeGreaterThan(FleetMapLayout.hitRadius * 2);
  for (const zoom of [0.35, 1, 2.5]) {
    const zoomed = FleetMapLayout.markers(
      game.fleetSnapshots(),
      game.tradeRoutes,
      zoom,
    ).filter((marker) => marker.fleet.routeId);
    expect((zoomed[1]!.point.y - zoomed[0]!.point.y) * zoom).toBeCloseTo(44);
    for (const marker of zoomed)
      expect(
        FleetMapLayout.hit(
          game.fleetSnapshots(),
          marker.point,
          game.tradeRoutes,
          zoom,
        ),
      ).toBe(marker.fleet.id);
  }
  const original = game.exportState();
  for (const marker of markers) {
    expect(
      FleetMapLayout.hit(game.fleetSnapshots(), marker.point, game.tradeRoutes),
    ).toBe(marker.fleet.id);
    const { camera } = model.snapshot;
    expect(
      model.fleetAtPoint({
        x: (marker.point.x - camera.center.x) * camera.zoom,
        y: (marker.point.y - camera.center.y) * camera.zoom,
      }),
    ).toBe(marker.fleet.id);
  }
  expect(game.exportState()).toEqual(original);
  const idle = game.fleetSnapshots().find((f) => f.id === 'fighters')!;
  expect(FleetMapLayout.markers([idle], game.tradeRoutes)).toEqual(
    FleetMapLayout.markers([idle]),
  );
});

it('rutt-eskortfordelning: counts escorts already on their way when assigning another fighter fleet', () => {
  const state = session().exportState();
  const template = state.fleets[2]!;
  const game = Game.restore({
    ...state,
    fleets: [
      ...state.fleets,
      {
        ...template,
        id: 'pending',
        name: 'Pending escorts',
        position: { q: 0, r: 1 },
        joinFleetId: 'carrier-a',
        ships: { ...template.ships, Fighter: 3 },
      },
    ],
  });
  game.assignTradeFleet('route-test', 'carrier-a');
  game.assignTradeFleet('route-test', 'carrier-b');
  game.assignTradeFleet('route-test', 'fighters');
  expect(game.fleet('carrier-a')!.ships.Fighter).toBe(1);
  expect(game.fleet('carrier-b')!.ships.Fighter).toBe(4);
  expect(game.fleet('pending')!.joinFleetId).toBe('carrier-a');
});
