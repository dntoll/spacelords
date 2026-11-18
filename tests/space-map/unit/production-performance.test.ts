import { expect, it, vi } from 'vitest';
import { MasterController } from '../../../src/client/app/controllers/MasterController.js';
import {
  AppModel,
  type AppReadModel,
} from '../../../src/client/app/models/AppModel.js';
import type { IntentHandler } from '../../../src/client/app/views/ViewContracts.js';
import { tradeNetworkState } from '../../fixtures/trade-network.js';

it('snabb-produktionsvy: production choices construct one fresh snapshot and display the selected option', () => {
  // skeppsorder-pa-planeten: the map offers ships from existing factories.
  const state = tradeNetworkState();
  state.colonies[0]![1].buildings.push({
    id: 'yard',
    type: 'Transport ship factory',
    slotIndex: 2,
    demolition: false,
  });
  const model = new AppModel(undefined, {
    load: () => ({ lastPlayed: '2026-11-18T00:00:00Z', state }),
    save() {},
    clear() {},
  });
  model.startSlot(1);
  model.openProduction('sol-0');
  let emit: IntentHandler = () => {};
  const render = vi.fn<(model: AppReadModel) => void>();
  const controller = new MasterController(model, {
    bind: (handler) => {
      emit = handler;
    },
    render,
    dispose() {},
  });
  controller.start();
  const option = model.snapshot.productionMap.options[0]!;
  const snapshots = vi.spyOn(model, 'snapshot', 'get');
  emit({ type: 'map-production-option', option: option.type });
  expect(render.mock.lastCall?.[0].productionMap.selectedOption?.type).toBe(
    option.type,
  );
  expect(snapshots).toHaveBeenCalledTimes(1);
  controller.dispose();
});
