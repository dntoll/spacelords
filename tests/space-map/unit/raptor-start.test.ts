import { describe, expect, it } from 'vitest';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';

describe('startflotta-med-raptor', () => {
  it('starts the game with a single Raptor at the home planet', () => {
    const game = new Game(createExampleGalaxy());
    const fleet = game.fleetSnapshot();
    expect(fleet.shipUnits?.map((unit) => unit.type)).toEqual(['Raptor']);
    expect(fleet.position?.key).toBe(game.galaxy.homePlanet.position.key);
    expect(fleet.speed).toBe(2);
  });

  it('gives the Raptor sight like Telescope I', () => {
    const game = new Game(createExampleGalaxy());
    expect(game.fleetSnapshot().detectionRange).toBe(1);
    const home = game.galaxy.homePlanet.position;
    const visible = game
      .mapSnapshot()
      .filter((cell) => cell.visible)
      .map((cell) => cell.position.distanceTo(home));
    expect(Math.max(...visible)).toBe(1);
  });

  it('explores a planet when the Raptor arrives', () => {
    const galaxy = createExampleGalaxy();
    const home = galaxy.homePlanet.position;
    const planet = galaxy.systems
      .flatMap((system) => system.planets)
      .filter((item) => item.position.key !== home.key)
      .sort(
        (a, b) => a.position.distanceTo(home) - b.position.distanceTo(home),
      )[0]!;
    const state = new Game(galaxy).exportState();
    const game = Game.restore({ ...state, pirates: [] });
    game.setDestination(
      'fleet-home',
      new HexCoordinate(planet.position.q, planet.position.r),
    );
    for (let stage = 0; stage < 12; stage++) {
      if (game.fleet('fleet-home')!.position!.key === planet.position.key)
        break;
      game.startTurn(game.enemyTurnPending ? 'enemy' : 'player');
      for (let step = 0; step < 40; step++) {
        if (game.phase === 'interrupted') {
          game.handleDiscoveries();
          game.continueTurn();
        }
        const frame = game.nextTurnFrame();
        if (!frame) break;
        game.applyFrame(frame);
      }
      game.finishTurn();
    }
    expect(game.fleet('fleet-home')!.position!.key).toBe(planet.position.key);
    expect(
      game.events.some((event) =>
        event.text.startsWith(`Planet explored: ${planet.name}`),
      ),
    ).toBe(true);
  });
});
