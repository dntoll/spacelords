import { describe, expect, it } from 'vitest';
import {
  CivilianTraffic,
  type CivilianFleet,
  type CivilianPlanet,
} from '../../src/client/models/CivilianTraffic.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';

function network() {
  const planets: CivilianPlanet[] = [
    {
      id: 'a',
      name: 'Alpha',
      position: new HexCoordinate(1, 0),
      population: 1800,
      capacity: 20000,
      workforce: 800,
    },
    {
      id: 'b',
      name: 'Beta',
      position: new HexCoordinate(4, 0),
      population: 1000,
      capacity: 20000,
      workforce: 1000,
    },
    {
      id: 'c',
      name: 'Gamma',
      position: new HexCoordinate(7, 0),
      population: 1000,
      capacity: 20000,
      workforce: 1800,
    },
  ];
  const fleet: CivilianFleet = {
    id: 'shuttle',
    name: 'Shuttle',
    ships: { 'Civilian shuttle': 1 },
    position: planets[0]!.position,
    destination: null,
    civilian: CivilianTraffic.order(),
  };
  const port = {
    planets,
    fleets: [fleet],
    routes: [
      { id: 'ab', a: 'a', b: 'b', closing: false },
      { id: 'bc', a: 'b', b: 'c', closing: false },
    ],
    travelYears: (
      _fleet: CivilianFleet,
      from: HexCoordinate,
      to: HexCoordinate,
    ) => from.distanceTo(to) / 2,
    event: () => {},
  };
  return { port, fleet, planets, traffic: new CivilianTraffic() };
}

describe('automatisk-arbetskraftstrafik', () => {
  it('preserves the source floor and accounts for passengers only at boarding and disembarkation', () => {
    const { port, fleet, planets, traffic } = network();
    traffic.prepare(port);
    expect(planets[0]!.population).toBe(1300);
    expect(planets[2]!.population).toBe(1000);
    expect(fleet.civilian!.passengers).toBe(500);
    expect(fleet.destination!.key).toBe(planets[1]!.position.key);
    fleet.position = fleet.destination;
    fleet.destination = null;
    traffic.arrive(port);
    expect(fleet.civilian!.passengers).toBe(500);
    expect(fleet.destination).toBeNull();
    traffic.prepare(port);
    fleet.position = fleet.destination;
    fleet.destination = null;
    traffic.arrive(port);
    expect(planets[2]!.population).toBe(1500);
    expect(fleet.civilian!.passengers).toBe(0);
    expect(planets.reduce((n, p) => n + p.population, 0)).toBe(3800);
  });

  it('reserves supply and demand across fleets without overbooking', () => {
    const { port, fleet, planets, traffic } = network();
    port.fleets.push({
      ...fleet,
      id: 'shuttle-2',
      civilian: CivilianTraffic.order(),
    });
    traffic.prepare(port);
    expect(port.fleets.map((f) => f.civilian!.passengers)).toEqual([500, 300]);
    expect(planets[0]!.population).toBe(1000);
    expect(port.fleets.reduce((n, f) => n + f.civilian!.reserved, 0)).toBe(800);
  });

  it('protects work at the source and respects available housing at the destination', () => {
    const { port, fleet, planets, traffic } = network();
    planets[0]!.workforce = 1700;
    planets[2]!.capacity = 1050;
    traffic.prepare(port);
    expect(fleet.civilian!.passengers).toBe(50);
    expect(planets[0]!.population).toBe(1750);
  });
});

describe('civiltrafik-pa-handelsnatet', () => {
  it('reassigns a partially obsolete booking at the next endpoint', () => {
    const { port, fleet, planets, traffic } = network();
    traffic.prepare(port);
    planets[2]!.workforce = 1100;
    planets[1]!.workforce = 1400;
    fleet.position = fleet.destination;
    fleet.destination = null;
    traffic.arrive(port);
    expect(planets[1]!.population).toBe(1400);
    expect(fleet.civilian!.passengers).toBe(100);
    traffic.prepare(port);
    expect(fleet.civilian!.targetId).toBe('c');
  });

  it('keeps passengers onboard when every reachable colony is full and resumes after space opens', () => {
    const { port, fleet, planets, traffic } = network();
    traffic.prepare(port);
    for (const planet of planets) {
      planet.workforce = planet.population;
      planet.capacity = planet.population;
    }
    fleet.position = fleet.destination;
    fleet.destination = null;
    traffic.arrive(port);
    traffic.prepare(port);
    expect(fleet.civilian!.passengers).toBe(500);
    expect(fleet.destination).toBeNull();
    expect(fleet.civilian!.status).toContain('no reachable colony has space');
    planets[1]!.capacity += 500;
    traffic.arrive(port);
    expect(fleet.civilian!.passengers).toBe(0);
    expect(planets[1]!.population).toBe(1500);
  });

  it('waits without an open path and resumes when a route opens, without goods carriers', () => {
    const { port, fleet, traffic } = network();
    port.routes[1]!.closing = true;
    traffic.prepare(port);
    expect(fleet.civilian!.passengers).toBe(0);
    expect(fleet.destination).toBeNull();
    port.routes[1]!.closing = false;
    traffic.prepare(port);
    expect(fleet.civilian!.passengers).toBe(500);
  });

  it('rechecks demand at an intermediate planet and finds new work', () => {
    const { port, fleet, planets, traffic } = network();
    traffic.prepare(port);
    planets[2]!.workforce = 1000;
    planets[1]!.workforce = 1400;
    fleet.position = fleet.destination;
    fleet.destination = null;
    traffic.arrive(port);
    expect(planets[1]!.population).toBe(1400);
    expect(fleet.civilian!.passengers).toBe(100);
    traffic.prepare(port);
    expect(fleet.civilian!.targetId).toBe('a');
  });

  it('finishes a closed leg and returns passengers safely, while Stop prevents further pickups', () => {
    const { port, fleet, planets, traffic } = network();
    traffic.prepare(port);
    traffic.stop(fleet);
    port.routes[1]!.closing = true;
    fleet.position = fleet.destination;
    fleet.destination = null;
    traffic.arrive(port);
    traffic.prepare(port);
    expect(fleet.civilian!.targetId).toBe('a');
    fleet.position = fleet.destination;
    fleet.destination = null;
    traffic.arrive(port);
    expect(planets[0]!.population).toBe(1800);
    expect(fleet.civilian).toBeUndefined();
  });
});
