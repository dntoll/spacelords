import { describe, expect, it } from 'vitest';
import { AppModel } from '../../src/client/models/AppModel.js';
import {
  HexCoordinate,
  HexGeometry,
} from '../../src/client/models/HexCoordinate.js';
import {
  TradeGraphLayout,
  TradeGraphState,
  tradeAssignmentIssue,
} from '../../src/client/models/TradeGraph.js';

describe('handelsgraf / handelsgraf-navigation / handelsgraf-valpanel', () => {
  it('preserves the star map geometry for every planet and moving fleet', () => {
    const model = new AppModel().snapshot;
    const home = model.ownedPlanets[0]!;
    const planets = [
      home,
      {
        ...home,
        id: 'vesta',
        name: 'Vesta',
        position: new HexCoordinate(0, 1),
      },
      {
        ...home,
        id: 'distant',
        name: 'Distant',
        position: new HexCoordinate(-5, 4),
      },
    ];
    const layout = new TradeGraphLayout(planets, model.fleets);
    for (const a of planets)
      for (const b of planets) {
        const p = HexGeometry.toPoint(a.position),
          q = HexGeometry.toPoint(b.position);
        const from = layout.planets.find((n) => n.id === a.id)!,
          to = layout.planets.find((n) => n.id === b.id)!;
        expect(to.x - from.x).toBeCloseTo((q.x - p.x) * TradeGraphLayout.scale);
        expect(to.y - from.y).toBeCloseTo((q.y - p.y) * TradeGraphLayout.scale);
      }
    const fleet = layout.fleets[0]!;
    expect(fleet.anchor).toEqual(
      TradeGraphLayout.point(model.fleets[0]!.position!),
    );
    expect(Object.isFrozen(layout.planets)).toBe(true);
    const state = new TradeGraphState();
    state.resize(900, 650, layout.bounds);
    const before = state.snapshot;
    state.zoomAt(1.5, { x: 450, y: 325 });
    state.panBy({ x: 80, y: 30 });
    expect(state.snapshot.camera).not.toEqual(before.camera);
    state.selectPlanet(home.id);
    state.selectPlanet('vesta');
    expect(state.snapshot.planets).toEqual([home.id, 'vesta']);
    const camera = state.snapshot.camera;
    state.selectRoute('route');
    expect(state.snapshot.planets).toEqual([]);
    expect(state.snapshot.camera).toEqual(camera);
    state.selectFleet('fleet-home');
    expect(state.snapshot.fleetId).toBe('fleet-home');
    expect(state.snapshot.routeId).toBeNull();
    state.selectPlanet(home.id);
    expect(state.snapshot.fleetId).toBeNull();
    expect(state.snapshot.planets).toEqual([home.id]);
    expect(state.snapshot.camera).toEqual(camera);
  });
});

describe('handelsgraf-flottboxar', () => {
  it('ruttflotta-till-narmaste-andplanet: offers assignment to idle transport fleets regardless of distance', () => {
    const fleet = new AppModel().snapshot.fleets[0]!;
    const transport = {
      ...fleet,
      ships: { ...fleet.ships, 'Transport ship': 2 },
    };
    const route = {
      id: 'route',
      a: 'sol-0',
      b: 'sol-1',
      from: 'Tellus',
      to: 'Vesta',
      start: fleet.position!,
      end: new HexCoordinate(0, 1),
      closing: false,
      fleetIds: [],
      capacity: 0,
      waiting: 0,
      status: 'Idle',
    };
    expect(tradeAssignmentIssue(transport, route)).toBeNull();
    expect(
      tradeAssignmentIssue(
        { ...transport, position: new HexCoordinate(4, 0) },
        route,
      ),
    ).toBeNull();
    for (const unavailable of [
      fleet,
      { ...transport, routeId: 'another' },
      { ...transport, destination: route.end },
      { ...transport, joinFleetId: 'other' },
      { ...transport, position: null },
    ])
      expect(tradeAssignmentIssue(unavailable, route)).not.toBeNull();
    expect(
      tradeAssignmentIssue(transport, { ...route, closing: true }),
    ).not.toBeNull();
  });
});
