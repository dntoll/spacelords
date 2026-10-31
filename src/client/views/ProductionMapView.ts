import { ShipOrders } from '../models/ShipOrders.js';
import type { ShipType } from '../models/Game.js';
import type { AppReadModel } from '../models/AppModel.js';
import type { PlanetGameSnapshot } from '../models/Game.js';
import type { SupplyStep } from '../models/ProjectSupply.js';
import type { ProductionOption } from '../models/ProductionMap.js';
import type { IntentHandler } from './ViewContracts.js';
import {
  catalogIcon,
  catalogHeading,
  categoryButtons,
} from './CatalogControls.js';
import { renderMapLocationHeading } from './MapLocationHeading.js';
import { button, element, queueButton } from './dom.js';
import { bindQueueOrder, decorateQueueRow } from './QueueView.js';

function presenceLabel(option: ProductionOption): string {
  return {
    local: 'Local',
    network: 'Network',
    queued: 'Queued',
    missing: 'Missing',
  }[option.presence];
}

function presenceDescription(option: ProductionOption): string {
  return `On this planet: ${option.localCount}. In active network: ${option.networkCount}. Empire total: ${option.empireCount}. Queued locally: ${option.queuedLocalCount}. Queued in network: ${option.queuedNetworkCount}.`;
}

export function renderProductionRing(
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const ring = element('div', 'production-ring');
  ring.setAttribute('role', 'group');
  ring.setAttribute('aria-label', 'Build options');
  let lastTouchOption: string | null = null;
  let lastTouchTime = -Infinity;
  for (const [index, option] of model.productionMap.options.entries()) {
    const angle =
      (index * Math.PI * 2) / model.productionMap.options.length -
      (model.productionMap.options.length === 2 ? 0 : Math.PI / 2);
    let touchClick = false;
    const order = () => {
      if (model.phase === 'planning')
        emit({ type: 'map-production-build', option: option.type });
    };
    const choice = button(
      `Show ${option.type}`,
      () => {
        if (touchClick) {
          touchClick = false;
          const now = performance.now();
          const doubleTap =
            lastTouchOption === option.type && now - lastTouchTime <= 500;
          lastTouchOption = option.type;
          lastTouchTime = now;
          if (doubleTap) {
            lastTouchOption = null;
            order();
            return;
          }
        } else {
          lastTouchOption = null;
          lastTouchTime = -Infinity;
        }
        emit({ type: 'map-production-option', option: option.type });
      },
      'button radial-build-option',
    );
    choice.dataset.productionOption = option.type;
    choice.dataset.presence = option.presence;
    choice.addEventListener('pointerup', (event) => {
      touchClick = event.pointerType === 'touch';
    });
    choice.addEventListener('dblclick', () => {
      // dubbelklick-bygger-pa-kartan: touch already orders on its second click.
      if (performance.now() - lastTouchTime > 750) order();
    });
    choice.style.left = `${Math.cos(angle) * model.productionMap.radius}px`;
    choice.style.top = `${Math.sin(angle) * model.productionMap.radius}px`;
    choice.setAttribute(
      'aria-pressed',
      String(model.productionMap.selectedOption?.type === option.type),
    );
    choice.title = option.type;
    choice.replaceChildren(
      catalogIcon(option.type),
      element('span', '', option.type),
    );
    const status = element(
      'small',
      'production-presence',
      presenceLabel(option),
    );
    choice.append(status);
    choice.setAttribute('aria-description', presenceDescription(option));
    if (option.queuedLocalCount + option.queuedNetworkCount > 0) {
      const queued = element(
        'small',
        'production-queued-marker',
        `Queue ${option.queuedLocalCount + option.queuedNetworkCount}`,
      );
      queued.title = `Queued locally: ${option.queuedLocalCount}. Queued in network: ${option.queuedNetworkCount}.`;
      choice.append(queued);
    }
    if (option.category === 'Buildings') {
      choice.append(
        element(
          'small',
          '',
          `${option.localCount} local / ${option.empireCount} total`,
        ),
      );
    }
    if (option.dependencyWarning) {
      const marker = element('span', 'production-dependency-marker', '!');
      marker.setAttribute('aria-hidden', 'true');
      choice.append(marker);
      choice.title = `${option.type}. ${option.dependencyWarning}`;
      choice.setAttribute(
        'aria-description',
        `${choice.getAttribute('aria-description') ?? ''} ${option.dependencyWarning}`.trim(),
      );
    }
    ring.append(choice);
  }
  return ring;
}

export function renderProductionMapPanel(
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const planet = model.planet!;
  const panel = element('div', 'production-map-controls');
  panel.append(renderMapLocationHeading(planet.name, planet.id, emit));
  const map = model.productionMap;
  if (map.categorized)
    panel.append(
      categoryButtons(
        'Build categories',
        ['Buildings', 'Components', 'Ships'] as const,
        map.category,
        (category) => emit({ type: 'map-production-category', category }),
      ),
    );
  if (map.pages > 1) {
    const pages = element('div', 'production-pages');
    const previous = button(
      'Previous build options',
      () => emit({ type: 'map-production-page', page: map.page - 1 }),
      'button secondary-button',
    );
    const next = button(
      'Next build options',
      () => emit({ type: 'map-production-page', page: map.page + 1 }),
      'button secondary-button',
    );
    previous.disabled = map.page === 0;
    next.disabled = map.page === map.pages - 1;
    previous.textContent = '←';
    next.textContent = '→';
    pages.append(
      previous,
      element('span', '', `Page ${map.page + 1} / ${map.pages}`),
      next,
    );
    panel.append(pages);
  }
  const guidance = model.productionGuidance;
  if (guidance && (!map.options.length || guidance.kind !== 'factory')) {
    panel.append(
      element('p', 'production-guidance muted-note', guidance.message),
    );
    if (guidance.dome)
      panel.append(
        button('Prepare building site', () =>
          emit({ type: 'map-production-option', option: guidance.dome }),
        ),
      );
    if (guidance.kind === 'research')
      panel.append(
        button('Open research', () => emit({ type: 'open-research' })),
      );
  }
  const option = map.selectedOption;
  if (option) {
    const detail = element('section', 'map-build-details');
    detail.setAttribute('aria-label', 'Build details');
    const heading = element('div', 'map-build-heading');
    const build = button('Build', () => emit({ type: 'map-production-build' }));
    build.disabled = !!option.blockedReason || model.phase !== 'planning';
    heading.append(catalogHeading(option.type), build);
    detail.append(
      heading,
      element('p', '', option.description),
      element(
        'p',
        '',
        `Iron ${option.cost.Iron} · Water ${option.cost.Water} · Oil ${option.cost.Oil}`,
      ),
      element(
        'p',
        '',
        `${option.workers} workers · ${option.crew} crew · ${planet.budget.availableWorkers} available workers`,
      ),
    );
    if (option.dependencyWarning)
      detail.insertBefore(
        element(
          'p',
          'production-dependency-warning',
          `! ${option.dependencyWarning}`,
        ),
        heading.nextSibling,
      );
    const parts = Object.entries(option.parts).map(
      ([name, amount]) =>
        `${amount} ${name === 'Rocket engine' ? 'engines (Rocket engine or Ion pulse engine)' : name}`,
    );
    if (parts.length)
      detail.append(
        element(
          'p',
          '',
          `Requires ${parts.join(', ')}. Missing parts are ordered automatically; available Ion pulse engines are fitted first.`,
        ),
      );
    if (planet.budget.availableWorkers < option.workers + option.crew)
      detail.append(
        element(
          'p',
          'muted-note',
          'Waiting for workers or crew. Orders can be queued.',
        ),
      );
    if (
      Object.entries(option.cost).some(
        ([material, amount]) =>
          planet.economy.stock[material as keyof typeof planet.economy.stock] <
          amount,
      )
    )
      detail.append(
        element(
          'p',
          'muted-note',
          'Waiting for resources. Orders can be queued.',
        ),
      );
    if (option.category === 'Ships') {
      detail.append(
        element(
          'p',
          'muted-note',
          `Start order: ${model.productionStartOrder ? ShipOrders.label(model.productionStartOrder) : option.type === 'Civilian shuttle' ? 'Civilian transport (default)' : 'Planet home fleet (default)'}.`,
        ),
      );
      const orders = button('Orders', () =>
        emit({ type: 'open-ship-orders', ship: option.type as ShipType }),
      );
      orders.disabled = model.phase !== 'planning';
      detail.append(orders);
    }
    if (option.blockedReason)
      detail.append(element('p', 'blocked-reason', option.blockedReason));

    panel.append(detail);
  }
  const problems = model.mapProblems.filter(
    (p) => p.planetId === planet.id && p.screen === 'production',
  );
  for (const problem of problems)
    panel.append(element('p', 'blocked-reason', problem.explanation));
  const queue = element('section', 'map-build-queue');
  queue.setAttribute('aria-label', 'Build queue');
  queue.append(element('h2', '', 'Build queue'));
  const list = element('ol', 'map-queue-list');
  bindQueueOrder(
    list,
    planet.projects.map((project) => project.id),
    (id, index) => emit({ type: 'move-project', id, index }),
    model.phase !== 'planning',
  );
  planet.projects.forEach((project, index) => {
    const item = element('li', 'map-queue-row');
    item.dataset.projectId = project.id;
    const choose = button(
      `Select project ${index + 1}: ${project.type}`,
      () => emit({ type: 'map-production-project', id: project.id }),
      'button secondary-button map-queue-choice',
    );
    const supply = model.projectSupply.find((p) => p.projectId === project.id);
    const status = supply?.requirements.some(
      (s) => s.status === 'Needs attention',
    )
      ? 'Needs attention'
      : supply?.requirements.some((s) => s.status === 'Waiting')
        ? 'Waiting'
        : 'Ready';
    choose.textContent = `${index + 1}. ${project.type} · ${status}`;
    choose.setAttribute(
      'aria-pressed',
      String(map.selectedProjectId === project.id),
    );
    const cancel = queueButton('×', `Cancel project ${index + 1}`, () =>
      emit({ type: 'cancel-project', id: project.id }),
    );
    cancel.disabled = model.phase !== 'planning';
    for (const [action, control] of [
      ['select', choose],
      ['cancel', cancel],
    ] as const)
      control.dataset.focusKey = `project:${project.id}:${action}`;
    item.append(choose, cancel);
    decorateQueueRow(
      item,
      project.id,
      `${project.type}, position ${index + 1}`,
      model.phase !== 'planning',
    );
    list.append(item);
  });
  queue.append(list);
  if (!planet.projects.length)
    queue.append(element('p', 'muted-note', 'No production queued.'));
  const selected = model.projectSupply.find(
    (p) => p.projectId === map.selectedProjectId,
  );
  const selectedProject = planet.projects.find(
    (project) => project.id === map.selectedProjectId,
  );
  if (
    selectedProject &&
    [
      'Colony ship',
      'Exploration ship',
      'Fighter',
      'Transport ship',
      'Civilian shuttle',
      'Salvage ship',
    ].includes(selectedProject.type)
  ) {
    queue.append(
      element(
        'p',
        '',
        `Start order: ${selectedProject.initialOrder ? ShipOrders.label(selectedProject.initialOrder) : 'Default'}`,
      ),
    );
    const orders = button(`Orders for queued ${selectedProject.type}`, () =>
      emit({
        type: 'open-ship-orders',
        ship: selectedProject.type as ShipType,
        projectId: selectedProject.id,
      }),
    );
    orders.disabled = model.phase !== 'planning';
    queue.append(orders);
  }
  if (selected) {
    const chain = element('section', 'map-supply-chain');
    chain.setAttribute('aria-label', 'Selected project supply chain');
    const renderSteps = (steps: readonly SupplyStep[]): HTMLElement => {
      const list = element('ul');
      for (const step of steps) {
        const item = element('li', '', `${step.label} · ${step.status}`);
        if (step.children.length) item.append(renderSteps(step.children));
        list.append(item);
      }
      return list;
    };
    chain.append(renderSteps(selected.requirements));
    queue.append(chain);
  }
  panel.append(queue);
  return panel;
}

export function renderRoutePlanet(
  model: AppReadModel,
  planet: PlanetGameSnapshot,
  emit: IntentHandler,
): HTMLElement {
  const panel = element('div', 'route-planet-controls');
  panel.append(renderMapLocationHeading(planet.name, planet.id, emit));
  const supply = model.supply.planets.find((p) => p.id === planet.id);
  if (supply)
    panel.append(
      element(
        'p',
        'route-supply-summary',
        `${supply.project?.type ?? 'No production queued'} · ${supply.status} · ${supply.summary}`,
      ),
    );
  for (const problem of model.mapProblems.filter(
    (p) => p.planetId === planet.id && p.screen === 'route',
  ))
    panel.append(element('p', 'blocked-reason', problem.explanation));
  panel.append(
    button('Open in Production', () =>
      emit({ type: 'open-production', planetId: planet.id }),
    ),
  );
  const create = button('Create route', () =>
    emit({ type: 'begin-map-route', id: planet.id }),
  );
  create.disabled = model.mapTrade.creationIssue !== null;
  panel.append(create);
  if (model.mapTrade.creationIssue) {
    const reason = element('p', 'blocked-reason', model.mapTrade.creationIssue);
    reason.id = 'route-creation-issue';
    create.setAttribute('aria-describedby', reason.id);
    panel.append(reason);
  }
  for (const route of model.tradeRoutes.filter(
    (r) => r.a === planet.id || r.b === planet.id,
  ))
    panel.append(
      button(
        `${route.from} ↔ ${route.to}`,
        () => emit({ type: 'map-select-route', id: route.id }),
        'button secondary-button',
      ),
    );
  return panel;
}
