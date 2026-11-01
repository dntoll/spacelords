import { Game } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';

export function researchStationState() {
  const state = new Game(createExampleGalaxy()).exportState();
  state.colonies[0]![1].buildings.push({
    id: 'test-research-station',
    type: 'Research station',
    slotIndex: 0,
    demolition: false,
  });
  return state;
}
