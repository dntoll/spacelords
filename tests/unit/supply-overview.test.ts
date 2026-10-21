import { expect, it } from 'vitest';
import {
  SupplyOverview,
  type SupplyPlanetInput,
} from '../../src/client/models/SupplyOverview.js';
import type { ShipmentSnapshot } from '../../src/client/models/Logistics.js';

const planet = (
  changes: Partial<SupplyPlanetInput> = {},
): SupplyPlanetInput => ({
  id: 'a',
  name: 'Alpha',
  project: { id: 'project', type: 'Fighter' },
  issue: null,
  stock: { Iron: 3 },
  reserved: {},
  demand: { Iron: 10 },
  extraction: {},
  deposits: {},
  capabilities: [],
  ...changes,
});
const shipment = (
  changes: Partial<ShipmentSnapshot> = {},
): ShipmentSnapshot => ({
  id: 's',
  material: 'Iron',
  amount: 4,
  sourceId: 'b',
  source: 'Beta',
  recipientId: 'a',
  recipient: 'Alpha',
  projectId: 'project',
  project: 'Fighter',
  location: 'Beta',
  nextStop: 'Alpha',
  fleetId: null,
  routeId: 'route',
  state: 'Awaiting pickup',
  years: 2,
  issue: null,
  ...changes,
});

it('forsorjningsstatus: partial deliveries do not hide an unresolved deficit', () => {
  const result = new SupplyOverview([planet()], [shipment()]).planets[0]!;
  expect(result.status).toBe('Needs attention');
  expect(result.materials[0]).toMatchObject({
    available: 3,
    incoming: 4,
    unprovided: 3,
  });
});

it('forsorjningsstatus: reservations, finite deposits and extraction are counted once', () => {
  const input = planet({
    stock: { Iron: 8 },
    reserved: { Iron: 5 },
    extraction: { Iron: 2 },
    deposits: { Iron: 2 },
  });
  const result = new SupplyOverview([input], [shipment()]).planets[0]!;
  expect(result.status).toBe('Needs attention');
  expect(result.materials[0]).toMatchObject({
    available: 3,
    unprovided: 1,
    localYears: null,
  });
  const covered = new SupplyOverview(
    [planet({ ...input, deposits: { Iron: 3 } })],
    [shipment()],
  ).planets[0]!;
  expect(covered.status).toBe('Waiting');
  expect(covered.materials[0]!.localYears).toBe(2);
});

it('forsorjningsstatus: future projects and broken deliveries cannot satisfy the next project', () => {
  const result = new SupplyOverview(
    [planet()],
    [
      shipment({ projectId: 'later' }),
      shipment({
        id: 'broken',
        issue: 'No active transport path',
        years: null,
      }),
    ],
  ).planets[0]!;
  expect(result.materials[0]!.unprovided).toBe(7);
  expect(result.status).toBe('Needs attention');
});

it('forsorjningsoversikt: prioritizes problems, then waiting, ready and idle with stable name order', () => {
  const overview = new SupplyOverview(
    [
      planet({ id: 'idle', project: null, demand: {} }),
      planet({ id: 'ready', stock: { Iron: 10 } }),
      planet({ id: 'wait', extraction: { Iron: 2 }, deposits: { Iron: 20 } }),
      planet({
        id: 'factory',
        issue: 'A matching completed factory is required.',
      }),
    ],
    [],
  );
  expect(overview.planets.map((p) => p.status)).toEqual([
    'Needs attention',
    'Waiting',
    'Ready',
    'Idle',
  ]);
  expect(overview.planets[0]!.summary).toContain('factory');
});

it('relevanta-material / materialoversikt: discovers hundreds of materials without fixed columns or zero rows', () => {
  const stock = Object.fromEntries(
    Array.from({ length: 300 }, (_, i) => [`Material ${i}`, i + 1]),
  );
  const overview = new SupplyOverview(
    [planet({ stock: { ...stock, Empty: 0 }, demand: { Missing: 1 } })],
    [],
  );
  expect(overview.planets[0]!.materials).toHaveLength(301);
  expect(overview.materials).toContain('Missing');
  expect(overview.materials).not.toContain('Empty');
  expect(Object.isFrozen(overview.planets[0]!.materials[0])).toBe(true);
});

it('produktionsformaga: capability does not count as a supply commitment', () => {
  const overview = new SupplyOverview(
    [
      planet({
        stock: {},
        demand: { Engine: 1 },
        capabilities: [
          {
            product: 'Engine',
            kind: 'material',
            available: true,
            reason: null,
            queued: 0,
          },
        ],
      }),
    ],
    [],
  );
  expect(overview.planets[0]!.status).toBe('Needs attention');
  expect(overview.materials).toContain('Engine');
  expect(overview.planets[0]!.capabilities[0]!.queued).toBe(0);
});
