import { expect, it } from 'vitest';
import { projectSupplyChain } from '../../src/client/models/ProjectSupplyChain.js';
import type {
  ComponentOrder,
  Shipment,
} from '../../src/client/models/Logistics.js';

it('byggprojektets-forsorjningskedja: includes suppliers, transfers and recursive production without unrelated projects or duplicates', () => {
  const order: ComponentOrder = {
    id: 'order',
    projectId: 'ship',
    recipient: 'a',
    source: 'b',
    location: 'b',
    component: 'Rocket engine',
    amount: 1,
    productionProjectId: 'engine',
    shipmentId: null,
    delivered: false,
  };
  const shipments: Shipment[] = [
    {
      id: 'raw',
      projectId: 'engine',
      resource: 'Iron',
      amount: 3,
      recipient: 'b',
      path: ['c', 'transfer', 'b'],
      stage: 0,
      fleetId: null,
    },
    {
      id: 'extra',
      projectId: 'unrelated',
      resource: 'Iron',
      amount: 5,
      recipient: 'z',
      path: ['unrelated-source', 'z'],
      stage: 0,
      fleetId: null,
    },
    {
      id: 'raw2',
      projectId: 'engine',
      resource: 'Water',
      amount: 2,
      recipient: 'b',
      path: ['d', 'transfer', 'b'],
      stage: 0,
      fleetId: null,
    },
  ];
  const chain = projectSupplyChain(
    'ship',
    [
      { id: 'ship', planetId: 'a' },
      { id: 'engine', planetId: 'b' },
    ],
    [order, { ...order, id: 'second' }],
    shipments,
    () => ['b', 'transfer', 'a'],
    (a, b) => `${a}-${b}`,
  );
  expect(chain.projectIds).toEqual(['ship', 'engine']);
  expect(chain.planets.find((p) => p.id === 'transfer')!.roles).toEqual([
    'Transfer',
  ]);
  expect(chain.planets.find((p) => p.id === 'b')!.roles).toContain('Producer');
  expect(chain.planets.find((p) => p.id === 'c')!.roles).toContain('Supplier');
  expect(chain.routeIds).toEqual([
    'c-transfer',
    'transfer-b',
    'd-transfer',
    'b-transfer',
    'transfer-a',
  ]);
  expect(chain.planets.some((p) => p.id === 'z')).toBe(false);
  expect(Object.isFrozen(chain.planets[0]!.roles)).toBe(true);
});

it('byggprojektets-forsorjningskedja: preserves real shipment paths on a broken network and stops circular production references', () => {
  const orders: ComponentOrder[] = ['a', 'b'].map((projectId, index) => ({
    id: `order-${index}`,
    projectId,
    recipient: projectId,
    source: index === 0 ? 'b' : 'a',
    location: 'b',
    component: 'Rocket engine',
    amount: 1,
    productionProjectId: index === 0 ? 'b' : 'a',
    shipmentId: null,
    delivered: false,
  }));
  const chain = projectSupplyChain(
    'a',
    [
      { id: 'a', planetId: 'a' },
      { id: 'b', planetId: 'b' },
    ],
    orders,
    [
      {
        id: 'delivery',
        projectId: 'a',
        resource: 'Iron',
        amount: 2,
        recipient: 'a',
        path: ['c', 'transfer', 'a'],
        stage: 1,
        fleetId: null,
      },
    ],
    () => null,
    (from, to) => (from === 'c' ? `${from}-${to}` : undefined),
  );
  expect(chain.projectIds).toEqual(['a', 'b']);
  expect(chain.routeIds).toEqual(['c-transfer']);
  expect(chain.planets.find((p) => p.id === 'transfer')!.roles).toContain(
    'Transfer',
  );
  expect(
    projectSupplyChain(
      null,
      [],
      orders,
      [],
      () => null,
      () => undefined,
    ).planets,
  ).toEqual([]);
});
