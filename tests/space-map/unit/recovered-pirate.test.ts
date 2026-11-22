import { expect, it } from 'vitest';
import { SHIP_IMAGES } from '../../../src/client/space-map/views/ShipImages.js';

it('unik-bild-for-civila-transporter: passenger shuttles and freighters have distinct sprites', () => {
  expect(SHIP_IMAGES['Civilian shuttle']).not.toBe(
    SHIP_IMAGES['Transport ship'],
  );
});

it('egen-raptor-grafik: Raptor does not reuse Fighter artwork', () => {
  expect(SHIP_IMAGES.Raptor).not.toBe(SHIP_IMAGES.Fighter);
});
