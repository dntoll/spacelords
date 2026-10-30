import { describe, expect, it } from 'vitest';
import { Game, type GameState } from '../../src/client/models/Game.js';
import { ResearchPlan } from '../../src/client/models/Research.js';
import { salvageState, finishYear } from '../fixtures/salvage.js';
import {
  tradeNetworkState,
  distantTradeNetworkState,
} from '../fixtures/trade-network.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';

function automaticSalvage(): GameState {
  const state = salvageState();
  return {
    ...state,
    researched: [...state.researched, 'Automated salvage'],
    salvage: {
      ...state.salvage,
      wrecks: [
        ...state.salvage.wrecks,
        {
          ...state.salvage.wrecks[0]!,
          id: 'far-wreck',
          position: new HexCoordinate(6, 0),
          ship: { ...state.salvage.wrecks[0]!.ship, id: 'far-ship' },
        },
      ],
    },
  };
}

describe('automatisk-bargning', () => {
  it('research gates the order, then reserves the nearest free known wreck and returns it before choosing the next', () => {
    expect(() =>
      Game.restore(salvageState()).setAutomaticSalvage('fleet-home'),
    ).toThrow('Research Automated salvage first');
    let game = Game.restore(automaticSalvage());
    game.setAutomaticSalvage('fleet-home');
    expect(game.fleet('fleet-home')!.salvage!.targets).toEqual([
      'advanced-wreck',
    ]);
    expect(
      game.wrecks.find((w) => w.id === 'far-wreck')!.reservedBy,
    ).toBeNull();
    game = Game.restore(game.exportState());
    expect(game.fleet('fleet-home')!.automation).toBe('salvage');
    finishYear(game);
    expect(game.wrecks.find((w) => w.id === 'advanced-wreck')!.towedBy).toBe(
      'fleet-home',
    );
    expect(game.fleet('fleet-home')!.destination!.key).toBe('2,0');
    for (
      let year = 0;
      year < 4 && !game.wrecks.find((w) => w.id === 'far-wreck')!.reservedBy;
      year++
    )
      finishYear(game);
    expect(
      game.wrecks.some((w) => w.id === 'advanced-wreck' && !w.yardId),
    ).toBe(false);
    expect(game.wrecks.find((w) => w.id === 'far-wreck')!.reservedBy).toBe(
      'fleet-home',
    );
  });
  it('waits when there are no free known wrecks, resumes on discovery, and Stop releases the reservation', () => {
    const state = automaticSalvage();
    let game = Game.restore({
      ...state,
      salvage: {
        ...state.salvage!,
        wrecks: state.salvage!.wrecks.map((w) => ({
          ...w,
          known: false,
          position: new HexCoordinate(10, 0),
        })),
      },
    });
    game.setAutomaticSalvage('fleet-home');
    expect(game.fleet('fleet-home')!.destination).toBeNull();
    expect(game.decisions.some((d) => d.id === 'fleet-idle-fleet-home')).toBe(
      false,
    );
    const waiting = game.exportState();
    game = Game.restore({
      ...waiting,
      salvage: {
        ...waiting.salvage!,
        wrecks: waiting.salvage!.wrecks.map((w) => ({ ...w, known: true })),
      },
    });
    finishYear(game);
    expect(game.fleet('fleet-home')!.salvage!.targets).toHaveLength(1);
    game.clearDestination('fleet-home');
    expect(game.fleet('fleet-home')!.automation).toBeUndefined();
    expect(game.wrecks.every((w) => w.reservedBy === null)).toBe(true);
  });
  it('selects the nearest surviving yard, and preserves the tow when cancelled', () => {
    const state = automaticSalvage();
    state.colonies[0]![1].buildings.push({
      id: 'other-facility',
      type: 'Orbital shipyard',
      slotIndex: 2,
      demolition: false,
    });
    const game = Game.restore({
      ...state,
      salvage: {
        ...state.salvage!,
        yards: [
          { ...state.salvage!.yards[0]!, destroyed: true },
          {
            ...state.salvage!.yards[0]!,
            id: 'far-yard',
            facilityId: 'other-facility',
            position: new HexCoordinate(7, 0),
          },
        ],
      },
    });
    game.setAutomaticSalvage('fleet-home');
    finishYear(game);
    expect(game.fleet('fleet-home')!.destination!.key).toBe('7,0');
    game.clearDestination('fleet-home');
    expect(game.fleet('fleet-home')!.automation).toBeUndefined();
    expect(game.fleet('fleet-home')!.towing).toEqual(['advanced-wreck']);
  });
});

describe('automatisk-rutttilldelning', () => {
  it('requires research, assigns the nearest unassigned route and travels to its nearest endpoint', () => {
    const state = tradeNetworkState();
    expect(() =>
      Game.restore(state).setAutomaticTransport('freighters'),
    ).toThrow('Research Automated transport first');
    const game = Game.restore({
      ...state,
      researched: [...state.researched, 'Automated transport'],
    });
    game.setAutomaticTransport('freighters');
    expect(game.fleet('freighters')!.routeId).toBe('route-test');
    expect(game.fleet('freighters')!.automation).toBeUndefined();
    expect(Game.restore(game.exportState()).fleet('freighters')!.routeId).toBe(
      'route-test',
    );
  });
  it('waits without claiming a served route, survives reload and claims a released route', () => {
    const state = tradeNetworkState();
    let game = Game.restore({
      ...state,
      researched: [...state.researched, 'Automated transport'],
      fleets: state.fleets.map((f) =>
        f.id === 'travellers' ? { ...f, destination: null } : f,
      ),
    });
    game.assignTradeFleet('route-test', 'freighters');
    game.setAutomaticTransport('travellers');
    expect(game.fleet('travellers')!.automation).toBe('transport');
    expect(game.decisions.some((d) => d.id === 'fleet-idle-travellers')).toBe(
      false,
    );
    game = Game.restore(game.exportState());
    game.releaseTradeFleet('freighters');
    finishYear(game);
    expect(game.fleet('travellers')!.routeId).toBe('route-test');
  });
  it('replaces a previous movement order and allows Stop while waiting', () => {
    const state = tradeNetworkState(false);
    const game = Game.restore({
      ...state,
      researched: [...state.researched, 'Automated transport'],
    });
    game.setAutomaticTransport('travellers');
    expect(game.fleet('travellers')!.destination).toBeNull();
    game.clearDestination('travellers');
    expect(game.fleet('travellers')!.automation).toBeUndefined();
    game.setDestination('travellers', new HexCoordinate(1, 0));
    expect(game.fleet('travellers')!.destination!.key).toBe('1,0');
  });
});

describe('forskade-automatiska-order', () => {
  it('requires research for Patrol and both exploration orders without changing existing orders', () => {
    const state = tradeNetworkState();
    const game = Game.restore({ ...state, researched: [] });
    const before = game.fleet('fleet-home');
    expect(() => game.setPatrol('fleet-home')).toThrow(
      'Research Fleet patrol first',
    );
    for (const order of ['explore', 'explore-stars'] as const)
      expect(() => game.setExploration('fleet-home', order)).toThrow(
        'Research Automated exploration first',
      );
    expect(game.fleet('fleet-home')).toEqual(before);
  });
  it('keeps older active Patrol and Explore orders operational without granting new research', () => {
    const state = tradeNetworkState();
    for (const order of ['patrol', 'explore'] as const) {
      let game = Game.restore(state);
      if (order === 'patrol') game.setPatrol('fleet-home');
      else game.setExploration('fleet-home', 'explore');
      const saved = game.exportState();
      game = Game.restore({ ...saved, researched: [] });
      finishYear(game);
      expect(
        order === 'patrol'
          ? game.fleet('fleet-home')!.patrol
          : game.fleet('fleet-home')!.exploration,
      ).toBeTruthy();
      expect(game.research.completed).not.toContain('Fleet patrol');
    }
  });
  it('queues the relevant ship technology before each automation technology', () => {
    const plan = new ResearchPlan();
    plan.add('Automated salvage');
    expect(plan.queue.indexOf('Salvage ship factory')).toBeLessThan(
      plan.queue.indexOf('Automated salvage'),
    );
    plan.add('Automated transport');
    expect(plan.queue.indexOf('Trade logistics')).toBeLessThan(
      plan.queue.indexOf('Automated transport'),
    );
    plan.add('Fleet patrol');
    plan.add('Automated exploration');
    expect(plan.queue.indexOf('Fighter factory')).toBeLessThan(
      plan.queue.indexOf('Fleet patrol'),
    );
    expect(plan.queue.indexOf('Exploration ship factory')).toBeLessThan(
      plan.queue.indexOf('Automated exploration'),
    );
  });
});

it('automatisk-rutttilldelning: compares both endpoints, skips closing and occupied routes and reserves once per waiting fleet', () => {
  const state = distantTradeNetworkState();
  const fleets = state.fleets.map((f) => {
    const copy = { ...f, destination: null };
    delete copy.routeId;
    return copy;
  });
  const game = Game.restore({
    ...state,
    researched: [...state.researched, 'Automated transport'],
    fleets,
  });
  game.setAutomaticTransport('travellers');
  expect(game.fleet('travellers')!.routeId).toBe('route-distant');
  game.setAutomaticTransport('freighters');
  expect(game.fleet('freighters')!.routeId).toBe('route-test');
  const closing = Game.restore({
    ...state,
    researched: [...state.researched, 'Automated transport'],
    fleets,
    tradeRoutes: state.tradeRoutes.map((r) => ({
      ...r,
      closing: r.id === 'route-distant',
    })),
  });
  closing.setAutomaticTransport('travellers');
  expect(closing.fleet('travellers')!.routeId).toBe('route-test');
  expect(closing.fleet('travellers')!.destination?.key).toBe('1,0');
});

it('automatisk-bargning: competing fleets reserve different wrecks and losing the last Salvage ship cancels automation', () => {
  const state = automaticSalvage();
  const game = Game.restore({
    ...state,
    fleets: [
      ...state.fleets,
      {
        ...state.fleets[0]!,
        id: 'second-tug',
        name: 'Second tug',
        shipUnits: [{ ...state.fleets[0]!.shipUnits![0]!, id: 'second-ship' }],
      },
    ],
  });
  game.setAutomaticSalvage('fleet-home');
  game.setAutomaticSalvage('second-tug');
  expect(game.fleet('fleet-home')!.salvage!.targets).toEqual([
    'advanced-wreck',
  ]);
  expect(game.fleet('second-tug')!.salvage!.targets).toEqual(['far-wreck']);
  game.transferShips('fleet-home', 'Salvage ship', 1, null);
  expect(game.fleet('fleet-home')!.automation).toBeUndefined();
  expect(
    game.wrecks.find((w) => w.id === 'advanced-wreck')!.reservedBy,
  ).toBeNull();
  expect(game.fleet('second-tug')!.salvage!.targets).toEqual(['far-wreck']);
});

it('forskade-automatiska-order: completing research in a station unlocks Auto salvage', () => {
  const game = Game.restore(salvageState());
  game.selectResearch('Automated salvage');
  finishYear(game);
  expect(game.research.completed).toContain('Automated salvage');
  game.setAutomaticSalvage('fleet-home');
  expect(game.fleet('fleet-home')!.automation).toBe('salvage');
  expect(
    game
      .planetSnapshot(game.galaxy.homePlanet)!
      .buildOptions.some(
        (option) => option.type === ('Automated salvage' as string),
      ),
  ).toBe(false);
});

it('automatisk-rutttilldelning: a newly created route wakes waiting transports without assigning both to the same route', () => {
  const state = tradeNetworkState(false);
  const game = Game.restore({
    ...state,
    researched: [...state.researched, 'Automated transport'],
  });
  game.setAutomaticTransport('freighters');
  game.setAutomaticTransport('travellers');
  const route = game.createTradeRoute('sol-0', 'sol-1');
  expect(game.fleet('freighters')!.routeId).toBe(route);
  expect(game.fleet('travellers')!.routeId).toBeUndefined();
  expect(game.fleet('travellers')!.automation).toBe('transport');
});

it.each(['salvage', 'transport'] as const)(
  'forskade-automatiska-order: rejects incompatible saved %s orders',
  (automation) => {
    const state = automaticSalvage();
    expect(() =>
      Game.restore({
        ...state,
        fleets: state.fleets.map((f) => ({
          ...f,
          automation,
          routeId: 'nonexistent-route',
        })),
      }),
    ).toThrow('Invalid saved automatic fleet order');
    expect(() =>
      Game.restore({
        ...state,
        fleets: state.fleets.map((f) => ({
          ...f,
          automation,
          ships: { ...f.ships, 'Salvage ship': 0 },
        })),
      }),
    ).toThrow('Invalid saved automatic fleet order');
  },
);
