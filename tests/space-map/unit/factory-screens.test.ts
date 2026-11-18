// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { FactoryType } from '../../../src/client/space-map/models/factory-screens/FactoryCatalog.js';
import {
  FactoryNetwork,
  type NetworkPlanet,
  type NetworkState,
  type SiteState,
} from '../../../src/client/space-map/models/factory-screens/FactoryNetwork.js';
import { FactoryScreensFacade } from '../../../src/client/space-map/models/factory-screens/FactoryScreensFacade.js';
import { FactoryScreensView } from '../../../src/client/space-map/views/factory-screens/FactoryScreensView.js';

// Klickbar prototyp av fabriksskärmarna. Own fixtures so the example data
// in the app can change without breaking these tests.

const built = (type: FactoryType, orders = 0): SiteState => ({
  kind: 'factory',
  factory: {
    type,
    phase: 'built',
    roundsDone: 0,
    orders,
    productionDone: 0,
    productionTotal: 0,
  },
});
const empty: SiteState = { kind: 'empty' };

function planet(
  name: string,
  x: number,
  sites: readonly SiteState[],
  extra: Partial<NetworkPlanet> = {},
): NetworkPlanet {
  return {
    name,
    environment: 'Temperate',
    position: { x, y: 0 },
    deposits: [],
    stock: {},
    workers: 0,
    sites,
    ...extra,
  };
}

/** A–B–C chain with D and E apart; E has its own free transport. */
function fixture(): NetworkState {
  return {
    planets: [
      planet(
        'Alpha',
        0,
        [built('Iron mine'), built('Transport ship factory'), empty],
        {
          deposits: ['Iron', 'Water'],
          stock: { Iron: 20, Water: 10, Oil: 5 },
        },
      ),
      planet(
        'Beta',
        2,
        [built('Oil extractor'), built('Rocket engine factory')],
        {
          deposits: ['Oil'],
        },
      ),
      planet('Gamma', 4, [
        built('Weapons module factory'),
        built('Fighter factory', 2),
        empty,
      ]),
      planet('Delta', 6, [built('Water extractor')], { deposits: ['Water'] }),
      planet('Epsilon', 20, [empty]),
    ],
    links: [
      {
        id: 'ab',
        a: 'Alpha',
        b: 'Beta',
        transport: 'Hauler 1',
        pending: false,
      },
      {
        id: 'bc',
        a: 'Beta',
        b: 'Gamma',
        transport: 'Hauler 2',
        pending: false,
      },
    ],
    freeTransports: [
      { name: 'Hauler 3', planet: 'Alpha' },
      { name: 'Hauler 9', planet: 'Epsilon' },
    ],
  };
}

describe('factory network', () => {
  it('produktionsnatverk: groups planets joined by active links only', () => {
    const network = new FactoryNetwork(fixture());
    expect(network.groups()).toEqual([
      ['Alpha', 'Beta', 'Gamma'],
      ['Delta'],
      ['Epsilon'],
    ]);
    network.link('Gamma', 'Delta', { kind: 'build', planet: 'Alpha' });
    expect(network.groupOf('Delta')).toEqual(['Delta']);
  });

  it('en-runda-per-lank / kortaste-vag-i-lankar: counts rounds as the fewest links', () => {
    const network = new FactoryNetwork(fixture());
    expect(network.rounds('Alpha').get('Gamma')).toBe(2);
    network.link('Alpha', 'Gamma', { kind: 'free', name: 'Hauler 3' });
    expect(network.rounds('Alpha').get('Gamma')).toBe(1);
    expect(network.rounds('Alpha').has('Delta')).toBe(false);
  });

  it('blockerad-fabrik: an input missing in the group blocks until a link adds its producer', () => {
    const network = new FactoryNetwork(fixture());
    const [proposal] = network.proposals(network.groupOf('Alpha'));
    expect(proposal?.targetGroup).toEqual(['Delta']);
    expect(proposal?.unblocks).toEqual([
      { planet: 'Gamma', type: 'Weapons module factory' },
    ]);
    expect(proposal?.adds).toEqual(['Water']);
    expect(network.proposals(network.groupOf('Alpha'))[1]?.unblocks).toEqual(
      [],
    );
  });

  it('Connect-skärmen: links the two nearest planets and uses only the own group’s transports', () => {
    const network = new FactoryNetwork(fixture());
    const proposal = network
      .proposals(network.groupOf('Alpha'))
      .find((entry) => entry.targetGroup[0] === 'Epsilon');
    expect([proposal?.from, proposal?.to]).toEqual(['Gamma', 'Epsilon']);
    expect(network.canConnect(['Delta'])).toBe(false);
    expect(() =>
      network.link('Delta', 'Epsilon', { kind: 'free', name: 'Hauler 9' }),
    ).toThrow(/not free in this group/);
  });

  it('flytta-fraktskepp-mellan-routes: reports the planets a moved transport cuts off and frees it', () => {
    const network = new FactoryNetwork(fixture());
    expect(network.splitOff('bc')).toEqual(['Gamma']);
    network.link('Alpha', 'Gamma', { kind: 'free', name: 'Hauler 3' });
    expect(network.splitOff('bc')).toEqual([]);
    network.release('bc');
    expect(network.freeTransportsIn(['Beta'])).toEqual([
      { name: 'Hauler 2', planet: 'Beta' },
    ]);
  });

  it('parallella-byggen / byggnader-kostar-raavaror: builds when the group can pay and queues otherwise', () => {
    const network = new FactoryNetwork(fixture());
    network.build('Alpha', 2, 'Weapons module factory');
    expect(network.planet('Alpha').sites[2]).toMatchObject({
      factory: { phase: 'building' },
    });
    expect(network.stock(['Alpha']).Iron).toBe(12);
    network.build('Gamma', 2, 'Raptor factory');
    expect(network.planet('Gamma').sites[2]).toMatchObject({
      factory: { phase: 'queued' },
    });
    expect(network.stock(network.groupOf('Gamma')).Iron).toBe(12);
  });

  it('utvinning-vid-fyndighet: refuses an extractor without its resource on the planet', () => {
    const network = new FactoryNetwork(fixture());
    expect(() => network.build('Gamma', 2, 'Oil extractor')).toThrow(/no Oil/);
  });

  it('skeppsorder-pa-planeten: orders ships but never cancels the one in production', () => {
    const network = new FactoryNetwork(fixture());
    network.order('Gamma', 1, 1);
    // Rocket engine one link away, Weapons module made here, then one round.
    expect(network.planet('Gamma').sites[1]).toMatchObject({
      factory: { orders: 3, productionDone: 0, productionTotal: 2 },
    });
    network.order('Gamma', 1, -1);
    network.order('Gamma', 1, -1);
    expect(network.planet('Gamma').sites[1]).toMatchObject({
      factory: { orders: 1 },
    });
    expect(() => network.order('Gamma', 1, -1)).toThrow(/in production/);
  });
});

describe('factory screens facade', () => {
  it('Connect-skärmen: merges groups after Connect and marks unblocked factories as working', () => {
    const screens = new FactoryScreensFacade();
    screens.open(fixture());
    const weapons = () =>
      screens.snapshot?.groups[0]?.planets.find(
        (entry) => entry.name === 'Gamma',
      )?.sites[0]?.factory?.status;
    expect(weapons()).toBe('missing');
    screens.apply({ kind: 'open-connect', group: 'Alpha, Beta, Gamma' });
    expect(screens.snapshot?.connect?.transports[0]).toMatchObject({
      choice: { kind: 'free', name: 'Hauler 3' },
      selected: true,
    });
    screens.apply({ kind: 'connect', target: 'Delta' });
    expect(screens.snapshot?.groups[0]?.key).toBe('Alpha, Beta, Delta, Gamma');
    expect(weapons()).toBe('working');
  });

  it('flytta-fraktskepp-mellan-routes: asks before a move splits the group', () => {
    const screens = new FactoryScreensFacade();
    screens.open(fixture());
    screens.apply({ kind: 'open-connect', group: 'Alpha, Beta, Gamma' });
    screens.apply({ kind: 'open-links' });
    screens.apply({ kind: 'move-link', link: 'bc' });
    expect(screens.snapshot?.links?.pendingMove?.splitOff).toEqual(['Gamma']);
    screens.apply({ kind: 'confirm-move' });
    expect(screens.snapshot?.screen).toBe('connect');
    expect(screens.snapshot?.connect?.transports).toContainEqual(
      expect.objectContaining({
        choice: { kind: 'free', name: 'Hauler 2' },
        selected: true,
      }),
    );
  });
});

describe('factory screens view', () => {
  it('Skärm 2: offers Build or Queue and greys out extractors without a deposit', () => {
    const screens = new FactoryScreensFacade();
    screens.open(fixture());
    screens.apply({ kind: 'open-site', planet: 'Gamma', site: 2 });
    const root = document.createElement('div');
    document.body.append(root);
    const view = new FactoryScreensView(root, () => undefined);
    view.render(screens.snapshot!);
    const text = root.textContent ?? '';
    expect(text).toContain('No Iron on Gamma');
    expect(
      root.querySelector('[aria-label="Build Water extractor"]'),
    ).toBeNull();
    expect(
      root.querySelector('[aria-label="Build Rocket engine factory"]'),
    ).not.toBeNull();
    expect(
      root.querySelector('[aria-label="Queue Raptor factory"]'),
    ).not.toBeNull();
    expect(text).toContain('Short: Oil 1');
    view.dispose();
  });
});
