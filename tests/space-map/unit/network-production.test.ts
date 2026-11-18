import { expect, it } from 'vitest';
import { Game } from '../../../src/client/space-map/models/Game.js';
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

it('saves goods on their way and finishes the delivery after a reload', () => {
  const game = Game.restore({ ...tradeNetworkState(), pirates: [] });
  game.assignTradeFleet('route-test', 'freighters');
  turn(game);
  const saved = game.exportState();
  expect(saved.network?.transits.length).toBeGreaterThan(0);
  const restored = Game.restore(
    JSON.parse(JSON.stringify(saved)) as typeof saved,
  );
  turn(restored);
  expect(vesta(restored).projects).toHaveLength(0);
});
