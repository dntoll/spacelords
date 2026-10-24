import { describe, expect, it } from 'vitest';
import {
  ProjectSupply,
  type ProjectSupplyPlanet,
} from '../../src/client/models/ProjectSupply.js';
import { emptyStock } from '../../src/client/models/Economy.js';
import type {
  ComponentOrder,
  ShipmentSnapshot,
} from '../../src/client/models/Logistics.js';

const project = (
  id: string,
  material: 'Iron' | 'Rocket engine',
  amount = 1,
) => ({
  id,
  type: id,
  cost: { ...emptyStock(), [material]: amount },
  issue: null,
});
function planet(
  id = 'aster',
  projects = [project('fighter', 'Rocket engine')],
): ProjectSupplyPlanet {
  return {
    id,
    name: id === 'aster' ? 'Aster' : 'Tellus',
    stock: emptyStock(),
    reserved: emptyStock(),
    extraction: emptyStock(),
    deposits: emptyStock(),
    projects,
  };
}
const order: ComponentOrder = {
  id: 'order',
  projectId: 'fighter',
  recipient: 'aster',
  source: 'tellus',
  location: 'tellus',
  component: 'Rocket engine',
  amount: 1,
  productionProjectId: 'engine',
  shipmentId: null,
  delivered: false,
};
const labels = (value: unknown) => JSON.stringify(value);

describe('projektens-forsorjningssteg', () => {
  it('links remote production, its raw materials and planned transport without mutating orders', () => {
    const source = {
      ...planet('tellus', [project('engine', 'Iron', 2)]),
      stock: { ...emptyStock(), Iron: 2 },
    };
    const orders = structuredClone([order]);
    const result = new ProjectSupply([planet(), source], orders, [], () => [
      'tellus',
      'aster',
    ]).forPlanet('aster');
    expect(labels(result)).toContain('Produce 1 Rocket engine at Tellus');
    expect(labels(result)).toContain(
      'Transport 1 Rocket engine from Tellus to Aster',
    );
    expect(labels(result)).toContain('2 Iron available at Tellus');
    expect(orders).toEqual([order]);
    expect(Object.isFrozen(result[0]?.requirements[0]?.children)).toBe(true);
  });
  it('allocates stock and finite deposits once in actual queue order', () => {
    const input = {
      ...planet('aster', [
        project('one', 'Iron', 3),
        project('two', 'Iron', 3),
      ]),
      stock: { ...emptyStock(), Iron: 3 },
      reserved: { ...emptyStock(), Iron: 1 },
      extraction: { ...emptyStock(), Iron: 1 },
      deposits: { ...emptyStock(), Iron: 2 },
    };
    const supply = (p: ProjectSupplyPlanet) =>
      new ProjectSupply([p], [], [], () => null).forPlanet('aster');
    expect(labels(supply(input)[0])).toContain('2 Iron available');
    expect(labels(supply(input)[1])).toContain('2 Iron unprovided');
    expect(
      labels(supply({ ...input, projects: [...input.projects].reverse() })[0]),
    ).toContain('"projectId":"two"');
    expect(input.stock.Iron).toBe(3);
    expect(input.deposits.Iron).toBe(2);
  });
  it('keeps delivered parts reserved for their owner and does not borrow another shipment', () => {
    const input = {
      ...planet('aster', [
        project('other', 'Rocket engine'),
        project('fighter', 'Rocket engine'),
      ]),
      stock: { ...emptyStock(), 'Rocket engine': 1 },
      reserved: { ...emptyStock(), 'Rocket engine': 1 },
    };
    const result = new ProjectSupply(
      [input],
      [
        {
          ...order,
          source: 'aster',
          location: 'aster',
          productionProjectId: null,
          delivered: true,
        },
      ],
      [],
      () => null,
    ).forPlanet('aster');
    expect(result[0]?.requirements[0]?.status).toBe('Needs attention');
    expect(result[1]?.requirements[0]?.status).toBe('Ready');
  });
  it('propagates raw material shortages and catches cancelled or reordered dependencies', () => {
    const source = planet('tellus', [project('engine', 'Iron', 3)]);
    const remote = new ProjectSupply(
      [planet(), source],
      [order],
      [],
      () => null,
    ).forPlanet('aster');
    expect(remote[0]?.requirements[0]?.status).toBe('Needs attention');
    expect(labels(remote)).toContain('3 Iron unprovided');
    expect(labels(remote)).toContain('No active transport path');
    expect(
      labels(
        new ProjectSupply(
          [planet(), { ...source, projects: [] }],
          [order],
          [],
          () => [],
        ).forPlanet('aster'),
      ),
    ).toContain('production order was cancelled');
    const local = planet('aster', [
      project('fighter', 'Rocket engine'),
      project('engine', 'Iron'),
    ]);
    expect(
      labels(
        new ProjectSupply(
          [local],
          [{ ...order, source: 'aster', location: 'aster' }],
          [],
          () => [],
        ).forPlanet('aster'),
      ),
    ).toContain('Move production before');
  });
  it('shows shipment progress, transshipment location, route and fleet with a broken onward path', () => {
    const shipment: ShipmentSnapshot = {
      id: 'shipment',
      material: 'Rocket engine',
      amount: 1,
      sourceId: 'tellus',
      source: 'Tellus',
      recipientId: 'aster',
      recipient: 'Aster',
      projectId: 'fighter',
      project: 'Fighter',
      locationId: 'relay',
      location: 'Relay',
      nextStop: 'Relay II',
      remainingStops: ['Relay II', 'Aster'],
      routeId: 'route',
      fleetId: 'carrier',
      state: 'In transit',
      years: null,
      issue: 'No active transport path',
    };
    const result = new ProjectSupply(
      [planet()],
      [{ ...order, shipmentId: 'shipment' }],
      [shipment],
      () => null,
    ).forPlanet('aster');
    expect(labels(result)).not.toContain('Produce 1');
    expect(labels(result)).toContain('At Relay → Relay II → Aster');
    expect(labels(result)).toContain('"routeId":"route"');
    expect(labels(result)).toContain('"fleetId":"carrier"');
    expect(result[0]?.requirements[0]?.status).toBe('Needs attention');
  });
});
