import type { PlanetSnapshot } from '../models/Planet.js';
import type { IntentHandler } from './ViewContracts.js';
import { button, element, labelValue, planetIllustration } from './dom.js';

export function renderPlanet(
  planet: PlanetSnapshot,
  owner: string,
  emit: IntentHandler,
): HTMLElement {
  const page = element('section', 'planet-page');
  page.append(
    button(
      'Tillbaka till kartan',
      () => emit({ type: 'open-map' }),
      'back-button',
    ),
  );
  const hero = element('div', 'planet-hero panel');
  const introduction = element('div', 'planet-introduction');
  introduction.append(
    element('p', 'eyebrow', 'DIN HEMVÄRLD'),
    element('h1', '', planet.name),
    element('p', 'page-description', 'Här börjar ditt imperiums historia.'),
    element(
      'span',
      'pill',
      planet.type === 'solid' ? 'Fast planet' : 'Gasplanet',
    ),
  );
  hero.append(introduction, planetIllustration(true));
  const values = element('dl', 'planet-stats');
  const population = new Intl.NumberFormat('sv-SE')
    .format(planet.colony?.population ?? 0)
    .replaceAll('\u00a0', ' ');
  const used = planet.colony?.buildings.length ?? 0;
  values.append(
    labelValue('Ägare', owner),
    labelValue('Befolkning', population),
    labelValue('Gästvänlighet', `${planet.habitability} %`),
    labelValue('Använda byggplatser', `${used} av ${planet.buildSlots}`),
  );
  hero.append(values);
  page.append(hero);

  const columns = element('div', 'planet-columns');
  const resources = element('section', 'panel content-panel');
  resources.append(
    element('p', 'eyebrow', 'PLANETENS TILLGÅNGAR'),
    element('h2', '', 'Råvaror'),
  );
  const resourceList = element('dl', 'resource-list');
  for (const resource of planet.resources) {
    resourceList.append(
      labelValue(resource.name, `${resource.perYear} enheter/år`),
    );
  }
  resources.append(
    resourceList,
    element(
      'p',
      'muted-note',
      'Tillgångar per spelår. Utvinning införs senare.',
    ),
  );
  const buildings = element('section', 'panel content-panel');
  buildings.append(
    element('p', 'eyebrow', 'UTVECKLA DIN VÄRLD'),
    element('h2', '', 'Byggnader'),
  );
  const slots = element('div', 'build-slots');
  slots.setAttribute(
    'aria-label',
    `${planet.buildSlots - used} lediga byggplatser`,
  );
  for (let index = 0; index < planet.buildSlots; index += 1)
    slots.append(element('span', 'build-slot', '+'));
  const station = element('div', 'station-card');
  station.append(
    element('span', 'pill', 'Tillgänglig från start'),
    element('h3', '', 'Forskningsstation'),
    element('p', '', 'En plats för nya idéer och framtida upptäckter.'),
    element(
      'p',
      'muted-note',
      'Byggande kommer i nästa steg. Inga byggorder kan ges ännu.',
    ),
  );
  const build = button(
    'Bygg forskningsstation',
    () => undefined,
    'button button-secondary',
  );
  build.disabled = true;
  station.append(build);
  buildings.append(slots, station);
  columns.append(resources, buildings);
  page.append(
    columns,
    element(
      'p',
      'example-note',
      'Exempelvärld · Värdena är preliminära och förändras inte ännu.',
    ),
  );
  return page;
}
