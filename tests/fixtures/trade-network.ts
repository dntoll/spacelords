import {
  Game,
  type GameState,
} from '../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../src/client/space-map/models/exampleGalaxy.js';

/**
 * A new game with the player's only fleet at Tellus (`enda-spelarflottan`).
 * Trade routes and extra fleets are gone (`single-fleet-rensning`); the name is
 * kept for existing callers.
 */
export function tradeNetworkState(): GameState {
  return new Game(createExampleGalaxy()).exportState();
}
