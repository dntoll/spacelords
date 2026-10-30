import { expect, it, vi } from 'vitest';
import type p5 from 'p5';
import { AppModel } from '../../src/client/models/AppModel.js';
import { renderMapOverlays } from '../../src/client/views/MapOverlayView.js';

it('kartorderstatus: Star map omits S/Q labels while preserving planet order information', () => {
  const model = new AppModel();
  model.startSlot(1);
  const text = vi.fn();
  expect(
    model.snapshot.planetOrders.some((order) => order.emptySites > 0),
  ).toBe(true);
  renderMapOverlays({ text } as unknown as p5, {
    ...model.snapshot,
    fleets: [],
    pirates: [],
  });
  expect(text).not.toHaveBeenCalled();
});
