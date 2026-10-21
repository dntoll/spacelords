import { describe, expect, it } from 'vitest';
import {
  Logistics,
  type LogisticsPort,
  type TransportFleet,
} from '../../src/client/models/Logistics.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { emptyStock } from '../../src/client/models/Economy.js';

function setup() {
  let sequence = 1;
  const planets = ['a', 'b', 'c'].map((id, i) => ({
    id,
    name: id,
    position: new HexCoordinate(i * 4, 0),
    stock: emptyStock(),
    demand: emptyStock(),
    projects: [] as { id: string; cost: ReturnType<typeof emptyStock> }[],
  }));
  planets[0]!.stock.Iron = 100;
  planets[2]!.demand.Iron = 40;
  planets[2]!.projects.push({
    id: 'project-1',
    cost: { ...emptyStock(), Iron: 40 },
  });
  const fleets: TransportFleet[] = [
    {
      id: 'one',
      position: planets[0]!.position,
      destination: null,
      ships: { 'Transport ship': 1 },
    },
    {
      id: 'two',
      position: planets[1]!.position,
      destination: null,
      ships: { 'Transport ship': 1 },
    },
  ];
  const port: LogisticsPort = {
    planets,
    fleets,
    speed: () => 2,
    id: (prefix) => `${prefix}-${sequence++}`,
    event: () => {},
    projectExists: (id) =>
      planets.some((p) => p.projects.some((project) => project.id === id)),
  };
  const logistics = new Logistics();
  const ab = logistics.create('a', 'b', port),
    bc = logistics.create('b', 'c', port);
  logistics.assign(ab, fleets[0]!, port);
  logistics.assign(bc, fleets[1]!, port);
  const turn = () => {
    logistics.prepare(port);
    for (const fleet of fleets) {
      if (!fleet.destination) continue;
      const delta = fleet.destination.q - fleet.position!.q;
      fleet.position = new HexCoordinate(
        fleet.position!.q + Math.sign(delta) * Math.min(2, Math.abs(delta)),
        0,
      );
      if (fleet.position.key === fleet.destination.key)
        fleet.destination = null;
    }
    logistics.unload(port);
  };
  const total = () =>
    planets.reduce((sum, p) => sum + p.stock.Iron, 0) +
    logistics.shipments
      .filter((s) => s.fleetId)
      .reduce((sum, s) => sum + s.amount, 0);
  return { logistics, port, planets, fleets, ab, bc, turn, total };
}

describe('handelsnatverk / fysisk-frakt / flera-ruttflottor', () => {
  it.each([
    [-3, 'a'],
    [7, 'b'],
    [2, 'a'],
  ])(
    'ruttflotta-till-narmaste-andplanet: approaches the closest endpoint from q=%s, even without cargo demand',
    (q, endpoint) => {
      const { logistics, port, planets, fleets, ab, turn } = setup();
      planets[2]!.projects = [];
      planets[2]!.demand = emptyStock();
      const remote: TransportFleet = {
        id: 'remote',
        position: new HexCoordinate(q, 0),
        destination: null,
        ships: { 'Transport ship': 1 },
      };
      fleets.push(remote);
      port.planets = [...planets].reverse();
      const position = remote.position;
      logistics.assign(ab, remote, port);
      expect(remote.routeId).toBe(ab);
      expect(remote.position).toEqual(position);
      expect(remote.destination).toEqual(
        planets.find((p) => p.id === endpoint)!.position,
      );
      expect(remote.courseOrigin).toEqual(position);
      for (let year = 0; year < 4; year++) turn();
      expect(remote.position).toEqual(
        planets.find((p) => p.id === endpoint)!.position,
      );
      expect(remote.destination).toBeNull();
      expect(remote.routeId).toBe(ab);
      expect(logistics.shipments).toHaveLength(0);
    },
  );

  it('ruttflotta-till-narmaste-andplanet: closing a route waits for an approaching fleet without collecting cargo', () => {
    const { logistics, port, planets, fleets, ab, turn } = setup();
    planets[2]!.projects = [];
    planets[2]!.demand = emptyStock();
    const remote: TransportFleet = {
      id: 'remote',
      position: new HexCoordinate(-5, 0),
      destination: null,
      ships: { 'Transport ship': 1 },
    };
    fleets.push(remote);
    logistics.assign(ab, remote, port);
    logistics.close(ab, port);
    expect(remote.releaseRequested).toBe(true);
    turn();
    expect(remote.position!.q).toBe(-3);
    expect(remote.routeId).toBe(ab);
    turn();
    turn();
    expect(remote.position).toEqual(planets[0]!.position);
    expect(remote.routeId).toBeUndefined();
    expect(logistics.routes.some((r) => r.id === ab)).toBe(false);
  });

  it('moves material over two physical links without teleporting, duplicating or spending transit reserves', () => {
    const { logistics, planets, turn, total } = setup();
    turn();
    expect(planets[0]!.stock.Iron).toBe(70);
    expect(planets[2]!.stock.Iron).toBe(0);
    expect(logistics.incoming('c').Iron).toBe(40);
    expect(total()).toBe(100);
    turn();
    expect(planets[1]!.stock.Iron).toBe(30);
    expect(logistics.reserved('b').Iron).toBe(30);
    expect(planets[2]!.stock.Iron).toBe(0);
    turn();
    turn();
    expect(planets[2]!.stock.Iron).toBe(30);
    for (let i = 0; i < 8; i++) {
      turn();
      expect(total()).toBe(100);
    }
    expect(planets[2]!.stock.Iron).toBe(40);
    expect(logistics.shipments).toHaveLength(0);
  });

  it('supports several fleets per route and disallows ambiguous assignments', () => {
    const { logistics, port, fleets, ab, planets } = setup();
    const third: TransportFleet = {
      id: 'third',
      position: planets[0]!.position,
      destination: null,
      ships: { 'Transport ship': 2 },
    };
    port.fleets = [...fleets, third];
    logistics.assign(ab, third, port);
    expect(logistics.snapshots(port)[0]!.capacity).toBe(90);
    expect(() => logistics.assign(ab, third, port)).toThrow();
    expect(() => logistics.create('b', 'a', port)).toThrow('already');
    expect(() => logistics.create('a', 'a', port)).toThrow();
  });

  it('finishes loaded deliveries when an order is cancelled and releases unshipped reservations', () => {
    const { logistics, port, planets, turn, total } = setup();
    turn();
    planets[2]!.projects = [];
    planets[2]!.demand = emptyStock();
    logistics.cleanup(port);
    expect(logistics.shipments.reduce((n, s) => n + s.amount, 0)).toBe(30);
    turn();
    expect(planets[1]!.stock.Iron).toBe(30);
    expect(logistics.reserved('b').Iron).toBe(30);
    turn();
    turn();
    expect(planets[2]!.stock.Iron).toBe(30);
    expect(total()).toBe(100);
  });

  it('releases a fleet only after unloading and closes only the requested route', () => {
    const { logistics, port, fleets, ab, turn, planets, total } = setup();
    turn();
    logistics.close(ab, port);
    expect(fleets[0]!.releaseRequested).toBe(true);
    expect(fleets[0]!.routeId).toBe(ab);
    turn();
    expect(fleets[0]!.routeId).toBeUndefined();
    expect(planets[1]!.stock.Iron).toBe(30);
    expect(logistics.routes).toHaveLength(1);
    expect(total()).toBe(100);
  });

  it('protects local construction demand and does not duplicate reservations on later rounds', () => {
    const { planets, logistics, port } = setup();
    planets[0]!.demand.Iron = 80;
    logistics.prepare(port);
    logistics.prepare(port);
    expect(logistics.incoming('c').Iron).toBe(20);
    expect(planets[0]!.stock.Iron).toBe(80);
  });

  it('chooses shorter travel time and is independent of planet iteration order', () => {
    const first = setup(),
      second = setup();
    second.port.planets = [...second.planets].reverse();
    first.turn();
    second.turn();
    expect(second.logistics.shipments).toEqual(first.logistics.shipments);
    expect(first.logistics.path('a', 'c', first.port)?.years).toBeGreaterThan(
      first.logistics.path('b', 'c', first.port)!.years,
    );
  });
});

it('leveransfloden: separates pickup from transit, shows relay location, and keeps cancelled cargo visible', () => {
  const { logistics, port, turn, planets } = setup();
  turn();
  const snapshots = logistics.shipmentSnapshots(port);
  expect(snapshots.find((s) => s.state === 'Awaiting pickup')!.amount).toBe(10);
  expect(snapshots.find((s) => s.state === 'In transit')).toMatchObject({
    amount: 30,
    source: 'a',
    recipient: 'c',
    nextStop: 'b',
  });
  expect(Object.isFrozen(snapshots[0])).toBe(true);
  planets[2]!.projects = [];
  logistics.cleanup(port);
  expect(logistics.shipmentSnapshots(port)).toHaveLength(1);
  expect(logistics.shipmentSnapshots(port)[0]!.projectId).toBeNull();
  turn();
  expect(logistics.shipmentSnapshots(port)[0]).toMatchObject({
    state: 'Awaiting pickup',
    location: 'b',
    source: 'a',
    recipient: 'c',
  });
});

it('leveransfloden: a broken remaining transport leg has no arrival promise', () => {
  const { logistics, port, turn, fleets } = setup();
  turn();
  logistics.release(fleets[1]!);
  expect(logistics.shipmentSnapshots(port)[0]).toMatchObject({
    years: null,
    issue: 'No active transport path',
  });
});
