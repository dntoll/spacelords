import { Game, type ShipUnit } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { Salvage } from '../../src/client/models/Salvage.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { collectTurnFrames } from './turn-steps.js';

export const advancedExplorer: ShipUnit = {
  id: 'advanced-explorer',
  type: 'Exploration ship',
  engines: { 'Rocket engine': 0, 'Ion pulse engine': 2 },
  telescope: 3,
};
export function salvageState() {
  const state = new Game(createExampleGalaxy()).exportState();
  const colony = state.colonies[0]![1];
  const planetId = state.colonies[0]![0];
  colony.stock = { ...colony.stock, Iron: 1000, Water: 1000, Oil: 1000 };
  colony.buildings = [
    {
      id: 'yard-facility',
      type: 'Orbital shipyard',
      slotIndex: 0,
      demolition: false,
    },
    {
      id: 'research',
      type: 'Research station',
      slotIndex: 1,
      demolition: false,
    },
  ];
  const salvage = new Salvage();
  const position = new HexCoordinate(2, 0);
  salvage.yards.push({
    id: 'yard',
    facilityId: 'yard-facility',
    planetId,
    position,
    builtRound: 1,
    destroyed: false,
    queue: [],
    orbitFleetId: null,
    issue: null,
  });
  salvage.addWreck('advanced-wreck', advancedExplorer, new HexCoordinate(4, 0));
  return {
    ...state,
    round: 2,
    researched: [
      'Rocket engine factory',
      'Orbital shipyard',
      'Salvage ship factory',
    ] as const,
    pirates: [],
    salvage: salvage.snapshot(),
    fleets: [
      {
        ...state.fleets[0]!,
        position: { q: 3, r: 0 },
        destination: null,
        ships: {
          Fighter: 0,
          'Exploration ship': 0,
          'Colony ship': 0,
          'Transport ship': 0,
          'Civilian shuttle': 0,
          'Space pirate': 0,
          'Salvage ship': 1,
        },
        shipUnits: [
          {
            id: 'tug',
            type: 'Salvage ship' as const,
            engines: { 'Rocket engine': 2, 'Ion pulse engine': 0 },
          },
        ],
      },
    ],
  };
}
export function finishYear(game: Game): void {
  collectTurnFrames(game);
  game.finishTurn();
}
