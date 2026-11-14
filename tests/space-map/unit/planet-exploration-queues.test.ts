import { describe, expect, it } from 'vitest';
import {
  Game,
  type GameState,
} from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';

function detectedUninhabited(game: Game) {
  return game.galaxy.systems
    .flatMap((system) => system.planets)
    .filter((planet) => !planet.colony && game.planetIntel(planet.position));
}

function emptyShips() {
  return {
    Fighter: 0,
    'Exploration ship': 0,
    'Colony ship': 0,
    'Transport ship': 0,
    'Civilian shuttle': 0,
    'Space pirate': 0,
    'Salvage ship': 0,
    Raptor: 0,
  };
}

describe('planetupptackt-fore-utforskning / planetutforskning-vid-ankomst', () => {
  it('accepts a deliberate Explore planet order without adding the planet to the queue', () => {
    const game = new Game(createExampleGalaxy());
    const target = detectedUninhabited(game)[0]!;
    game.issueFleetOrder('fleet-home', {
      kind: 'explore-planet',
      planetId: target.id,
    });
    expect(game.fleet('fleet-home')).toMatchObject({
      explorationTargetId: target.id,
      destination: target.position,
    });
    expect(game.planetQueues.exploration).toEqual([]);
  });

  it('hides details until an Exploration ship survives arrival, then pauses with an explored event', () => {
    const game = new Game(createExampleGalaxy());
    const target = detectedUninhabited(game)[0]!;
    expect(game.planetIntel(target.position)).toMatchObject({
      id: target.id,
      surveyed: false,
    });
    expect(game.planetKnowledge(target.position)).toBeNull();

    game.addPlanetToQueue('exploration', target.id);
    expect(game.planetQueues.exploration[0]).toMatchObject({
      planetId: target.id,
      assignedFleetId: 'fleet-home',
    });

    game.startTurn();
    for (let step = 0; step < 20 && game.phase === 'simulating'; step++) {
      const frame = game.nextTurnFrame();
      if (!frame) break;
      game.applyFrame(frame);
    }
    expect(game.phase).toBe('interrupted');
    expect(game.interruption?.discoveries).toContainEqual(
      expect.objectContaining({ id: target.id, kind: 'planet-explored' }),
    );
    expect(game.planetIntel(target.position)).toMatchObject({
      id: target.id,
      surveyed: true,
      habitability: target.habitability,
      maxBuildSlots: target.buildSlots,
    });
    expect(game.planetQueues.exploration).toEqual([]);
  });
});

describe('utforskningsko / koloniseringsko / automatisk-tilldelning-av-planetkoer', () => {
  it('reserves different exploration targets and reassigns a target when its ship is transferred', () => {
    const state = new Game(createExampleGalaxy()).exportState();
    const targets = state.world.systems
      .flatMap((system) => system.planets)
      .filter((planet) => !planet.colony)
      .slice(0, 2);
    expect(targets).toHaveLength(2);
    const game = Game.restore({
      ...state,
      knownObjects: [
        ...(state.knownObjects ?? []),
        ...targets.map((planet) => planet.id),
      ],
      explored: [
        ...state.explored,
        ...targets.map((planet) => `${planet.position.q},${planet.position.r}`),
      ],
      fleets: [
        state.fleets[0]!,
        {
          ...state.fleets[0]!,
          id: 'other',
          name: 'Other',
          ships: { ...emptyShips(), 'Exploration ship': 1 },
          shipUnits: [],
        },
      ],
    });
    game.addPlanetToQueue('exploration', targets[0]!.id);
    game.addPlanetToQueue('exploration', targets[1]!.id);
    expect(
      game.planetQueues.exploration.map((item) => item.assignedFleetId),
    ).toEqual(['fleet-home', 'other']);

    game.removePlanetFromQueue('exploration', targets[1]!.id);
    game.transferShips('fleet-home', 'Exploration ship', 1, 'other');
    expect(game.planetQueues.exploration[0]!.assignedFleetId).toBe('other');
    expect(game.fleet('fleet-home')!.destination).toBeNull();
  });

  it('assigns an explored colonization target to the closest idle Colony ship and persists it', () => {
    const base = new Game(createExampleGalaxy()).exportState();
    const target = base.world.systems
      .flatMap((system) => system.planets)
      .find(
        (planet) => !planet.colony && base.knownObjects?.includes(planet.id),
      )!;
    const state: GameState = {
      ...base,
      surveyedPlanets: [...(base.surveyedPlanets ?? []), target.id],
      fleets: [
        {
          ...base.fleets[0]!,
          ships: { ...emptyShips(), 'Colony ship': 1 },
          shipUnits: [],
        },
        {
          ...base.fleets[0]!,
          id: 'closest',
          name: 'Closest',
          position: target.position,
          ships: { ...emptyShips(), 'Colony ship': 1 },
          shipUnits: [],
        },
      ],
    };
    const game = Game.restore(state);
    game.addPlanetToQueue('colonization', target.id);
    expect(game.planetQueues.colonization[0]).toMatchObject({
      planetId: target.id,
      assignedFleetId: 'closest',
    });
    const restored = Game.restore(game.exportState());
    expect(restored.planetQueues.colonization[0]!.assignedFleetId).toBe(
      'closest',
    );
  });
});
