import { expect, it } from 'vitest';
import {
  buildRounds,
  Game,
} from '../../../src/client/space-map/models/Game.js';
import {
  distantTradeNetworkState,
  tradeNetworkState,
} from '../../fixtures/trade-network.js';
import { turnFrames } from '../../fixtures/turn-steps.js';

// Förenklad produktion in the actual game: the fixture's Vesta mine on
// sol-1 needs Iron that only sol-0 holds.

function turn(game: Game) {
  for (const frame of turnFrames(game)) game.applyFrame(frame);
  game.finishTurn();
}

function vesta(game: Game) {
  return game.planetSnapshot(game.galaxy.systems[0]!.planets[1]!)!;
}


it('fraktskepp-ger-forbindelse / fraktskepp-pendlar / en-runda-per-lank: an assigned transport links the planets while it travels between them', () => {
  const game = Game.restore({ ...tradeNetworkState(), pirates: [] });
  game.assignTradeFleet('route-test', 'freighters');
  const position = game.fleet('freighters')!.position;
  turn(game);
  expect(vesta(game).projects).toHaveLength(1);
  // The Iron arrives after one round; then the mine takes its build rounds.
  for (let round = 1; round < buildRounds('Iron mine'); round++) {
    turn(game);
    expect(vesta(game).projects).toHaveLength(1);
  }
  turn(game);
  expect(vesta(game).projects).toHaveLength(0);
  expect(vesta(game).buildings.map((building) => building.type)).toEqual([
    'Iron mine',
  ]);
  expect(game.fleet('freighters')).toMatchObject({ routeId: 'route-test' });
  expect(position).not.toBeNull();
});

const planetAt = (game: Game, index: number) =>
  game.galaxy.systems[0]!.planets[index]!.position.key;

it('fraktskepp-pendlar: an assigned transport travels to the other end every round', () => {
  const game = Game.restore({ ...tradeNetworkState(), pirates: [] });
  game.assignTradeFleet('route-test', 'freighters');
  const visited: (string | undefined)[] = [];
  for (let round = 0; round < 3; round++) {
    turn(game);
    visited.push(game.fleet('freighters')!.position?.key);
    expect(game.networkSnapshot().activeLinkIds).toEqual(['route-test']);
  }
  expect(visited).toEqual([
    planetAt(game, 1),
    planetAt(game, 0),
    planetAt(game, 1),
  ]);
});

it('fraktskepp-pendlar: the link stays active while the transport is between the ends, also after a reload', () => {
  const game = Game.restore({ ...distantTradeNetworkState(), pirates: [] });
  expect(game.networkSnapshot().activeLinkIds).toContain('route-distant');
  turn(game);
  const travellers = game.fleet('travellers')!;
  expect(travellers.destination).not.toBeNull();
  expect(game.networkSnapshot().activeLinkIds).toContain('route-distant');
  expect(reload(game).networkSnapshot().activeLinkIds).toContain(
    'route-distant',
  );
});

it('fraktskepp-pendlar / flytta-fraktskepp-mellan-routes: releasing a travelling transport stops it where it is', () => {
  const game = Game.restore({ ...distantTradeNetworkState(), pirates: [] });
  turn(game);
  const where = game.fleet('travellers')!.position;
  game.releaseTradeFleet('travellers');
  expect(game.fleet('travellers')).toMatchObject({
    position: where,
    destination: null,
  });
  expect(game.fleet('travellers')!.routeId).toBeUndefined();
  expect(game.networkSnapshot().activeLinkIds).not.toContain('route-distant');
});

function reload(game: Game): Game {
  const saved = game.exportState();
  return Game.restore(JSON.parse(JSON.stringify(saved)) as typeof saved);
}

it('byggtid-per-byggnad: saves goods on their way and construction under way, and finishes after a reload', () => {
  const game = Game.restore({ ...tradeNetworkState(), pirates: [] });
  game.assignTradeFleet('route-test', 'freighters');
  turn(game);
  expect(game.exportState().network?.transits.length).toBeGreaterThan(0);
  const travelling = reload(game);
  turn(travelling);
  expect(game.exportState().construction).toEqual({});
  expect(travelling.exportState().construction).toEqual({ 'vesta-mine': 2 });
  const building = reload(travelling);
  expect(vesta(building).projects).toHaveLength(1);
  turn(building);
  expect(vesta(building).projects).toHaveLength(0);
  expect(vesta(building).buildings.map(({ type }) => type)).toEqual([
    'Iron mine',
  ]);
});
