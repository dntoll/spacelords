import type { GameEvent } from '../../models/Game.js';
import type { EventIllustration } from '../../models/turn/EventDetails.js';
import { BUILDING_IMAGES } from '../BuildingImage.js';
import { BUILDING_SYMBOLS } from '../BuildingSymbols.js';
import { SHIP_IMAGES } from '../ShipImages.js';
import { PLANET_IMAGES } from '../PlanetImages.js';
import { element } from '../../../common/dom.js';
import { gameText } from './GameText.js';
import starImage from '../../assets/stars/plasma-star.webp';

function artwork(art: EventIllustration): string | undefined {
  if (art.kind === 'star') return starImage;
  if (art.kind === 'ship') return SHIP_IMAGES[art.type];
  if (art.kind === 'planet') return PLANET_IMAGES[art.type];
  if (art.kind === 'building')
    return BUILDING_IMAGES[art.type] ?? BUILDING_SYMBOLS[art.type];
  if (art.kind === 'research')
    return BUILDING_SYMBOLS[art.type as keyof typeof BUILDING_SYMBOLS];
  return undefined;
}

function illustration(art?: EventIllustration): HTMLElement {
  const frame = element('span', 'event-illustration');
  frame.setAttribute('aria-hidden', 'true');
  const symbol =
    art?.kind === 'component' ? '⚙' : art?.kind === 'research' ? '✧' : '◆';
  frame.dataset.symbol = symbol;
  const source = art && artwork(art);
  if (source) {
    const image = element('img');
    image.src = source;
    image.alt = '';
    image.width = 48;
    image.height = 48;
    image.decoding = 'async';
    image.addEventListener('error', () => frame.replaceChildren(), {
      once: true,
    });
    frame.replaceChildren(image);
  }
  return frame;
}

/** bilder-i-events: announcements and history share one accessible presentation. */
export function renderEventContent(event: GameEvent): HTMLElement {
  const content = element('div', 'event-text');
  if (event.lines?.length) {
    content.classList.add('event-report');
    const heading = element('div', 'event-content-heading');
    heading.append(
      illustration(event.illustration),
      element('strong', '', `${event.heading ?? 'Planet report'}:`),
    );
    content.append(heading, document.createTextNode('\n'));
    for (const line of event.lines) {
      const row = element('div', 'event-content-row');
      row.append(
        illustration(line.illustration),
        element('span', '', gameText(line.text)),
      );
      if (content.querySelector('.event-content-row'))
        content.append(document.createTextNode('\n'));
      content.append(row);
    }
  } else {
    content.classList.add('event-content-row');
    content.append(
      illustration(event.illustration),
      element('span', '', gameText(event.text)),
    );
  }
  return content;
}
