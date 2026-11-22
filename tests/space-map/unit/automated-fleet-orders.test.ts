import { describe, expect, it } from 'vitest';
import {
  Game,
  type GameState,
} from '../../../src/client/space-map/models/Game.js';
import { ResearchPlan } from '../../../src/client/space-map/models/research/Research.js';
import { salvageState, finishYear } from '../../fixtures/salvage.js';
import { tradeNetworkState } from '../../fixtures/trade-network.js';
import {
  HexCoordinate,
  HexGeometry,
} from '../../../src/client/common/HexCoordinate.js';

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

it('radiell-automatisk-hexutforskning: explorers at Tellus reserve different frontier directions', () => {
  const state = tradeNetworkState();
  const home = state.fleets[0]!;
  const explorer = home.shipUnits!.find(
    (ship) => ship.type === 'Exploration ship',
  )!;
  const extra = (id: string) => ({
    id,
    name: id,
    position: home.position,
    destination: null,
    ships: { 'Exploration ship': 1 },
    shipUnits: [{ ...explorer, id: `${id}-ship` }],
  });
  const game = Game.restore({
    ...state,
    pirates: [],
    fleets: [home, extra('explorer-two'), extra('explorer-three')],
  });
  for (const id of ['fleet-home', 'explorer-two', 'explorer-three'])
    game.setExploration(id, 'explore');
  const homePoint = HexGeometry.toPoint(game.galaxy.homePlanet.position);
  const destinations = game
    .fleetSnapshots()
    .map((fleet) => fleet.destination)
    .filter((point): point is HexCoordinate => !!point);
  expect(new Set(destinations.map((point) => point.key)).size).toBe(3);
  const directions = destinations.map((point) => {
    const target = HexGeometry.toPoint(point);
    return Math.atan2(target.y - homePoint.y, target.x - homePoint.x);
  });
  expect(new Set(directions.map((angle) => angle.toFixed(3))).size).toBe(3);
});

describe('fria-utforsknings-och-patrullorder', () => {
  it('keeps older active Patrol and Explore orders operational without granting retired research', () => {
    const state = tradeNetworkState();
    for (const order of ['patrol', 'explore'] as const) {
      let game = Game.restore({ ...state, pirates: [] });
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
  it('queues Salvage ship factory before Automated salvage', () => {
    const plan = new ResearchPlan();
    plan.add('Automated salvage');
    expect(plan.queue.indexOf('Salvage ship factory')).toBeLessThan(
      plan.queue.indexOf('Automated salvage'),
    );
  });
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
  // forskningstid: deep technologies take three rounds.
  for (let round = 0; round < 3 && game.research.queue.length; round++)
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

it.each(['salvage'] as const)(
  'forskade-automatiska-order: rejects incompatible saved %s orders',
  (automation) => {
    const state = automaticSalvage();
    expect(() =>
      Game.restore({
        ...state,
        fleets: state.fleets.map((f) => ({
          ...f,
          automation,
          ships: { ...f.ships, 'Civilian shuttle': 0, 'Salvage ship': 0 },
        })),
      }),
    ).toThrow('Invalid saved automatic fleet order');
  },
);
