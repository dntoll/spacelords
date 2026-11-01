// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppView } from '../../src/client/views/AppView.js';
import { renderEventContent } from '../../src/client/views/EventContent.js';
import { renderEvents } from '../../src/client/views/EventsView.js';
import { BUILDING_IMAGES } from '../../src/client/views/BuildingImage.js';
import { BUILDING_SYMBOLS } from '../../src/client/views/BuildingSymbols.js';
import { SHIP_IMAGES } from '../../src/client/views/ShipImages.js';
import type { GameEvent } from '../../src/client/models/Game.js';

it('flottor-fore-planetdetaljer: keeps the planet heading and information below all fleet controls', () => {
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const model = new AppModel();
  model.home();
  const view = new AppView(root, () => ({ render() {}, dispose() {} }));
  view.render(model.snapshot);
  const fleets = root.querySelector('.map-fleet-management')!;
  const planet = root.querySelector('.planet-selection-details')!;
  expect(fleets).not.toBeNull();
  expect(fleets.textContent).not.toContain('Tellus');
  expect(planet).not.toBeNull();
  expect(planet.textContent).toContain('Tellus');
  expect(
    fleets.compareDocumentPosition(planet) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  view.dispose();
});

it('bilder-i-events: uses portraits, building symbols and ship images in the same grouped report without losing text', () => {
  const event: GameEvent = {
    id: 'built',
    round: 1,
    heading: 'Tellus',
    text: 'Tellus:\nResearch station completed.\nIron mine completed.\nColony ship produced.',
    lines: [
      {
        text: 'Research station completed.',
        illustration: { kind: 'building', type: 'Research station' },
      },
      {
        text: 'Iron mine completed.',
        illustration: { kind: 'building', type: 'Iron mine' },
      },
      {
        text: 'Colony ship produced.',
        illustration: { kind: 'ship', type: 'Colony ship' },
      },
    ],
  };
  const announcement = renderEventContent(event);
  const history = renderEvents([event])[0]!;
  for (const content of [announcement, history.querySelector('.event-text')!]) {
    expect(content.textContent).toBe(event.text);
    expect(
      [...content.querySelectorAll('img')].map((image) =>
        image.getAttribute('src'),
      ),
    ).toEqual([
      BUILDING_IMAGES['Research station'],
      BUILDING_SYMBOLS['Iron mine'],
      SHIP_IMAGES['Colony ship'],
    ]);
    expect(
      [...content.querySelectorAll('img')].every((image) => image.alt === ''),
    ).toBe(true);
    content.querySelector('img')!.dispatchEvent(new Event('error'));
    expect(content.textContent).toBe(event.text);
    expect(content.querySelectorAll('img')).toHaveLength(2);
  }
  expect(
    renderEventContent({ id: 'old', round: 1, text: 'Legacy production.' })
      .textContent,
  ).toBe('Legacy production.');
});
