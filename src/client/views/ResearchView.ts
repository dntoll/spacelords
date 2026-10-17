import type { IntentHandler } from './ViewContracts.js';
import { button, element } from './dom.js';

export function renderResearch(emit: IntentHandler): HTMLElement {
  const page = element('section', 'research-page');
  page.append(
    button(
      'Tillbaka till kartan',
      () => emit({ type: 'open-map' }),
      'back-button',
    ),
  );
  const panel = element('div', 'panel research-panel');
  const orbit = element('div', 'research-orbit', '✦');
  orbit.setAttribute('aria-hidden', 'true');
  panel.append(
    element('p', 'eyebrow', 'KUNSKAP TAR OSS LÄNGRE'),
    element('h1', '', 'Forskning'),
    element(
      'p',
      'page-description',
      'Ditt imperiums nästa stora upptäckt börjar med en fråga.',
    ),
    orbit,
    element('span', 'pill pill-warm', 'Forskning kommer senare'),
    element('h2', '', 'Forskningsstation'),
    element(
      'p',
      '',
      'Din första forskningsstation blir grunden för nya tekniker. Den är tillgänglig att bygga från början när byggandet införs.',
    ),
    element(
      'p',
      '',
      'På sikt kan forskning öppna vägen till bättre fabriker, mindre utsläpp och effektivare användning av arbetskraft.',
    ),
    element(
      'p',
      'muted-note',
      'I detta första steg finns inga teknikval eller forskningsorder. Utforska kartan och lär känna din hemvärld så länge.',
    ),
    button('Utforska kartan', () => emit({ type: 'open-map' }), 'button'),
  );
  page.append(panel);
  return page;
}
