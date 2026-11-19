import { AppModel } from '../../src/client/app/models/AppModel.js';
import { researchStationState } from './research-station.js';

export function researchStationModel(options: { shipFactory?: boolean } = {}) {
  const model = new AppModel(undefined, {
    load: () => ({
      lastPlayed: '2026-10-24T00:00:00Z',
      state: researchStationState(options),
    }),
    save() {},
    clear() {},
  });
  model.startSlot(1);
  return model;
}
