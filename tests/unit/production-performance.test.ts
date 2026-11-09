import { expect, it, vi } from 'vitest';
import { MasterController } from '../../src/client/controllers/app/MasterController.js';
import {
  AppModel,
  type AppReadModel,
} from '../../src/client/models/AppModel.js';
import type { IntentHandler } from '../../src/client/views/ViewContracts.js';

it('snabb-produktionsvy: production choices construct one fresh snapshot and display the selected option', () => {
  const model = new AppModel();
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
