import type { AppReadModel } from '../models/AppModel.js';
import { BUILDINGS, type PlanetGameSnapshot } from '../models/Game.js';
import { MATERIALS } from '../models/Economy.js';
import type { IntentHandler } from './ViewContracts.js';
import { button, element } from './dom.js';

export function renderTradePlanet(
  planet: PlanetGameSnapshot,
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const card = element('article', 'trade-planet-node diagram-card');
  card.dataset.planetId = planet.id;
  card.setAttribute('aria-label', `Planet ${planet.name}`);
  const selected = model.tradeGraph.planets.indexOf(planet.id);
  card.classList.toggle('chosen-endpoint', selected >= 0);
  const choose = button(
    `Select planet ${planet.name}`,
    () => emit({ type: 'trade-select-planet', id: planet.id }),
    'trade-planet-name',
  );
  const sphere = element('span', 'trade-planet-sphere');
  sphere.setAttribute('aria-hidden', 'true');
  choose.replaceChildren(
    sphere,
    element('span', 'trade-planet-label', planet.name),
  );
  choose.setAttribute('aria-pressed', String(selected >= 0));
  card.append(choose);
  return card;
}

export function renderTradePlanetDetails(
  planet: PlanetGameSnapshot,
): HTMLElement {
  const card = element('section', 'trade-planet-details');
  card.dataset.planetId = planet.id;
  card.append(
    element('h2', '', planet.name),
    element(
      'p',
      'trade-coordinates',
      `HEX ${planet.position.q}, ${planet.position.r} · Population ${planet.population}`,
    ),
  );
  const table = element('table', 'trade-materials');
  table.setAttribute('aria-label', `${planet.name} materials`);
  const head = element('thead');
  const labels = element('tr');
  for (const label of ['Material', 'Stock', '+/yr', 'Need', 'Incoming']) {
    const th = element('th', '', label);
    th.scope = 'col';
    th.title =
      label === 'Need'
        ? 'Missing for the active project after stock and incoming supplies'
        : label === 'Incoming'
          ? 'Incoming supplies'
          : label === '+/yr'
            ? 'Extraction per year'
            : label;
    labels.append(th);
  }
  head.append(labels);
  const body = element('tbody');
  for (const material of MATERIALS) {
    const row = element('tr');
    row.dataset.material = material;
    const economy = planet.economy;
    const need = Math.max(
      0,
      economy.demand[material] -
        economy.stock[material] -
        economy.incoming[material],
    );
    const label = element('th', '', material);
    label.scope = 'row';
    const missing = element('td', need ? 'trade-shortage' : '', String(need));
    missing.title = `${economy.demand[material]} required by the active project`;
    row.append(
      label,
      element('td', 'trade-stock', String(economy.stock[material])),
      element('td', 'trade-extraction', String(economy.extraction[material])),
      missing,
      element('td', 'trade-incoming', String(economy.incoming[material])),
    );
    body.append(row);
  }
  table.append(head, body);
  const produces = [
    ...new Set(
      planet.buildings
        .filter((b) => !b.scheduledForDemolition && b.operational !== false)
        .flatMap((b) => {
          const definition = BUILDINGS[b.type];
          return definition.component
            ? [definition.component]
            : definition.ship
              ? [definition.ship]
              : [];
        }),
    ),
  ];
  const capabilities = element(
    'p',
    'trade-production',
    `Factories: ${produces.join(', ') || 'None'}`,
  );
  capabilities.title = capabilities.textContent!;
  const project = planet.projects[0];
  const next = element(
    'p',
    'trade-project',
    `Next: ${project?.type ?? 'No project'}`,
  );
  const status = element(
    'p',
    'trade-project-status',
    project?.blockedReason ??
      (project ? 'Ready for production' : 'Idle production'),
  );
  status.title = status.textContent!;
  card.append(table, capabilities, next, status);
  return card;
}
