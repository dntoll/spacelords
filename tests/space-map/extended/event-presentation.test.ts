// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { AppView } from '../../../src/client/app/views/AppView.js';
import { renderEventContent } from '../../../src/client/space-map/views/turn/EventContent.js';
import { renderEvents } from '../../../src/client/space-map/views/turn/EventsView.js';
import { SHIP_IMAGES } from '../../../src/client/space-map/views/ShipImages.js';
import type { GameEvent } from '../../../src/client/space-map/models/Game.js';

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

it('bilder-i-events: uses ship images in the same grouped report without losing text', () => {
  const event: GameEvent = {
    id: 'built',
    round: 1,
    heading: 'Tellus',
    text: 'Tellus:\nFighter joined.\nRaptor captured.',
    lines: [
      {
        text: 'Fighter joined.',
        illustration: { kind: 'ship', type: 'Fighter' },
      },
      {
        text: 'Raptor captured.',
        illustration: { kind: 'ship', type: 'Raptor' },
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
    ).toEqual([SHIP_IMAGES.Fighter, SHIP_IMAGES.Raptor]);
    expect(
      [...content.querySelectorAll('img')].every((image) => image.alt === ''),
    ).toBe(true);
    content.querySelector('img')!.dispatchEvent(new Event('error'));
    expect(content.textContent).toBe(event.text);
    expect(content.querySelectorAll('img')).toHaveLength(1);
  }
  expect(
    renderEventContent({ id: 'old', round: 1, text: 'Legacy production.' })
      .textContent,
  ).toBe('Legacy production.');
});
