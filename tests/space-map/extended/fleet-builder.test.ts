// @vitest-environment jsdom
import {
  renderFleetShips,
  SHIP_IMAGES,
} from '../../../src/client/space-map/views/ShipView.js';
import { SHIP_SPRITES } from '../../../src/client/space-map/views/ShipImages.js';
import { renderMapFleetPanel } from '../../../src/client/space-map/views/fleets/FleetMapPanel.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppModel } from '../../../src/client/app/models/AppModel.js';

beforeEach(() => document.body.replaceChildren());

describe('skeppsbilder', () => {
  it('keeps large fleet previews bounded and preserves all ship types', () => {
    const model = new AppModel();
    const fleet = {
      ...model.snapshot.fleets[0]!,
      ships: {
        Fighter: 1000000,
        'Colony ship': 1,
        'Exploration ship': 1,
        'Transport ship': 1,
        'Civilian shuttle': 1,
        'Space pirate': 1,
        'Salvage ship': 1,
        Raptor: 1,
      },
    };
    const view = renderFleetShips(fleet);
    expect(view.querySelectorAll('img').length).toBeLessThan(21);
    expect(view.textContent).toContain('+999988 Fighter');
    expect(new Set(Object.values(SHIP_IMAGES)).size).toBe(8);
    for (const ship of Object.keys(SHIP_IMAGES))
      expect(view.querySelector(`img[alt="${ship}"]`)).not.toBeNull();
  });
});

it('genererade-skeppssprites / bargat-piratskepp-behaller-typ: renders dedicated cargo, salvage and pirate portraits', () => {
  const model = new AppModel();
  const position = model.snapshot.fleets[0]!.position!;
  const panel = renderMapFleetPanel(
    {
      ...model.snapshot,
      pirates: [{ id: 'pirate-test', systemId: 'test', count: 1, position }],
    },
    () => {},
    position,
  );
  expect(
    panel
      .querySelector<HTMLImageElement>('img[alt="Space pirate"]')
      ?.getAttribute('src'),
  ).toBe(SHIP_SPRITES['Space pirate']);
  expect(SHIP_SPRITES['Space pirate']).not.toBe(SHIP_IMAGES.Fighter);
  expect(Object.keys(SHIP_IMAGES)).toHaveLength(8);
  const view = renderFleetShips({
    ...model.snapshot.fleets[0]!,
    ships: {
      Fighter: 0,
      'Colony ship': 0,
      'Exploration ship': 0,
      'Transport ship': 1,
      'Civilian shuttle': 0,
      'Space pirate': 0,
      'Salvage ship': 1,
      Raptor: 0,
    },
  });
  for (const type of ['Transport ship', 'Salvage ship'] as const) {
    expect(
      view
        .querySelector<HTMLImageElement>(`img[alt="${type}"]`)
        ?.getAttribute('src'),
    ).toMatch(
      new RegExp(
        type === 'Transport ship'
          ? 'transport-ship.*\\.webp'
          : 'salvage-ship.*\\.webp',
      ),
    );
  }
});
