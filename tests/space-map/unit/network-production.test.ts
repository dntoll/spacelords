import { expect, it } from 'vitest';
import {
  buildRounds,
  Game,
} from '../../../src/client/space-map/models/Game.js';
import { tradeNetworkState } from '../../fixtures/trade-network.js';
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

it('produktionsnatverk: a planet without a route cannot use another planet’s stock', () => {
  const game = Game.restore({ ...tradeNetworkState(), pirates: [] });
  turn(game);
  turn(game);
  expect(vesta(game).projects.map((project) => project.id)).toEqual([
    'vesta-mine',
  ]);
  expect(
    game.decisions.find((decision) => decision.id === 'supply-sol-1')?.label,
  ).toContain('no Iron');
});

it('fraktskepp-ger-forbindelse / fraktskepp-ligger-stilla / en-runda-per-lank: an assigned transport links the planets and stays put', () => {
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
  expect(game.fleet('freighters')).toMatchObject({
    position,
    destination: null,
    routeId: 'route-test',
  });
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
