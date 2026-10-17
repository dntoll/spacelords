import type { PlanetTab } from '../models/AppModel.js';
import type { PlanetSnapshot } from '../models/Planet.js';
import type { IntentHandler } from './ViewContracts.js';
import { button, element, labelValue, planetIllustration } from './dom.js';

const tabs = [
  ['overview', 'Overview'],
  ['resources', 'Resources'],
  ['buildings', 'Buildings'],
] as const;

export function renderPlanet(
  planet: PlanetSnapshot,
  owner: string,
  activeTab: PlanetTab,
  emit: IntentHandler,
): HTMLElement {
  const page = element('section', 'planet-page');
  const header = element('div', 'screen-header');
  const identity = element('div', 'planet-identity');
  identity.append(
    element('h1', '', planet.name),
    element(
      'span',
      'pill',
      planet.type === 'solid' ? 'Rocky planet' : 'Gas giant',
    ),
  );
  header.append(
    identity,
    button('Back to map', () => emit({ type: 'open-map' }), 'back-button'),
  );
  const navigation = element('div', 'planet-tabs');
  navigation.setAttribute('role', 'tablist');
  navigation.setAttribute('aria-label', 'Planet information');
  for (const [id, label] of tabs) {
    const tab = button(
      label,
      () => emit({ type: 'planet-tab', tab: id }),
      'tab-button',
    );
    tab.id = `tab-${id}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(id === activeTab));
    tab.setAttribute('aria-controls', 'planet-content');
    tab.tabIndex = id === activeTab ? 0 : -1;
    tab.addEventListener('keydown', (event) => {
      const index = tabs.findIndex(([candidate]) => candidate === id);
      const next =
        event.key === 'ArrowRight'
          ? (index + 1) % tabs.length
          : event.key === 'ArrowLeft'
            ? (index + tabs.length - 1) % tabs.length
            : event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? tabs.length - 1
                : null;
      if (next !== null) {
        event.preventDefault();
        emit({ type: 'planet-tab', tab: tabs[next]![0] });
      }
    });
    navigation.append(tab);
  }
  const panel = element('section', `planet-content ${activeTab}`);
  panel.id = 'planet-content';
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', `tab-${activeTab}`);
  const used = planet.colony?.buildings.length ?? 0;
  if (activeTab === 'overview') {
    const values = element('dl', 'planet-stats');
    values.append(
      labelValue('Owner', owner),
      labelValue(
        'Population',
        new Intl.NumberFormat('en-GB').format(planet.colony?.population ?? 0),
      ),
      labelValue('Habitability', `${planet.habitability}%`),
      labelValue('Used build slots', `${used} of ${planet.buildSlots}`),
    );
    panel.append(planetIllustration(true), values);
  } else if (activeTab === 'resources') {
    const resources = element('dl', 'resource-list');
    for (const resource of planet.resources)
      resources.append(
        labelValue(resource.name, `${resource.perYear} units/year`),
      );
    panel.append(
      resources,
      element(
        'p',
        'muted-note',
        'Annual deposits. Extraction is not available yet.',
      ),
    );
  } else {
    const station = element('div', 'station-card');
    station.append(
      element('h2', '', 'Research station'),
      element('span', 'pill', 'Available from the start'),
      element('p', '', `${planet.buildSlots - used} free build slots`),
    );
    const build = button('Build research station', () => undefined, 'button');
    build.disabled = true;
    station.append(
      build,
      element('p', 'muted-note', 'Construction is not available yet.'),
    );
    panel.append(station);
  }
  page.append(header, navigation, panel);
  return page;
}
