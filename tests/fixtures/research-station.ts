import { Game } from '../../src/client/models/Game.js';
import { AppModel } from '../../src/client/models/AppModel.js';
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

export function researchStationModel() {
  const model = new AppModel(undefined, {
    load: () => ({
      lastPlayed: '2026-10-24T00:00:00Z',
      state: researchStationState(),
    }),
    save() {},
    clear() {},
  });
  model.startSlot(1);
  return model;
}
