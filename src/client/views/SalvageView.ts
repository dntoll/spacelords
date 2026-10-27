import type { AppReadModel } from '../models/AppModel.js';
import { Salvage } from '../models/Salvage.js';
import { projectDefinition } from '../models/Game.js';
import { button, element } from './dom.js';
import { shipImage } from './ShipView.js';
import type { IntentHandler } from './ViewContracts.js';
import { bindQueueOrder, decorateQueueRow } from './QueueView.js';

export function renderSalvageSelection(
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement | null {
  const panel = element('section', 'salvage-panel');
  if (model.shipyardPlacement) {
    panel.append(
      element('h3', '', 'Place orbital shipyard'),
      element('p', '', 'Choose a free neighboring hex on the map or below.'),
    );
    const select = element('select');
    select.setAttribute('aria-label', 'Shipyard hex');
    for (const position of model.shipyardPlacement.choices) {
      const option = element('option', '', `HEX ${position.key}`);
      option.value = position.key;
      select.append(option);
    }
    panel.append(
      select,
      button('Build here', () => {
        const position = model.shipyardPlacement!.choices.find(
          (item) => item.key === select.value,
        )!;
        emit({ type: 'place-shipyard', position });
      }),
      button('Cancel', () => emit({ type: 'cancel-shipyard-placement' })),
    );
    return panel;
  }
  const wreck = model.wrecks.find((item) => item.id === model.salvageSelection);
  if (wreck) {
    panel.append(
      element('h3', '', `${wreck.ship.type} wreck`),
      shipImage(wreck.ship.type),
      element(
        'p',
        '',
        `HEX ${wreck.position.key} · Engines: ${wreck.ship.engines['Rocket engine']} Rocket, ${wreck.ship.engines['Ion pulse engine']} Ion${wreck.ship.telescope ? ` · Telescope ${wreck.ship.telescope}` : ''}`,
      ),
    );
    if (wreck.reservedBy || wreck.towedBy || wreck.yardId)
      panel.append(
        element(
          'p',
          '',
          wreck.yardId
            ? 'In the shipyard repair queue.'
            : `Assigned to ${model.fleets.find((fleet) => fleet.id === (wreck.towedBy ?? wreck.reservedBy))?.name ?? 'a fleet'}.`,
        ),
      );
    else {
      const fleets = model.fleets.filter(
        (fleet) =>
          fleet.position &&
          !fleet.routeId &&
          (fleet.canIssueOrders ?? model.phase === 'planning') &&
          fleet.ships['Salvage ship'] >
            model.wrecks.filter(
              (item) =>
                item.reservedBy === fleet.id || item.towedBy === fleet.id,
            ).length,
      );
      const select = element('select');
      select.setAttribute('aria-label', 'Salvage fleet');
      for (const fleet of fleets) {
        const option = element('option', '', fleet.name);
        option.value = fleet.id;
        select.append(option);
      }
      const order = button('Salvage with selected fleet', () =>
        emit({
          type: 'salvage-wreck',
          fleetId: select.value,
          wreckId: wreck.id,
        }),
      );
      order.disabled = !fleets.length;
      panel.append(
        element(
          'p',
          '',
          'Drag this wreck marker onto a fleet, or choose a fleet below.',
        ),
        select,
        order,
      );
      if (!fleets.length)
        panel.append(
          element(
            'p',
            '',
            'No available Salvage ship. Research and build one first.',
          ),
        );
    }
    return panel;
  }
  const yard = model.shipyards.find(
    (item) => item.id === model.salvageSelection,
  );
  if (!yard) return null;
  const planet = model.ownedPlanets.find((item) => item.id === yard.planetId);
  panel.append(
    element('h3', '', `Shipyard · ${planet?.name ?? yard.planetId}`),
  );
  if (yard.destroyed) {
    const rebuild = button('Rebuild station', () =>
      emit({ type: 'rebuild-shipyard', id: yard.id }),
    );
    rebuild.disabled = model.phase !== 'planning';
    panel.append(
      element('p', '', 'Station destroyed. The planetary facility remains.'),
      rebuild,
    );
  } else {
    panel.append(
      element(
        'p',
        '',
        'Automatic repairs · one ship per year · fresh crew from the planet.',
      ),
    );
    const repairs = element('ol', 'repair-queue');
    bindQueueOrder(
      repairs,
      yard.queue,
      (wreckId, index) =>
        emit({ type: 'move-repair', yardId: yard.id, wreckId, index }),
      model.phase !== 'planning',
    );
    for (const [index, id] of yard.queue.entries()) {
      const queued = model.wrecks.find((item) => item.id === id);
      if (!queued) continue;
      const cost = Salvage.repairCost(
        queued.ship,
        (type) => projectDefinition(type).cost,
      );
      const row = element('li');
      row.append(
        element(
          'p',
          '',
          `${index + 1}. ${queued.ship.type} · ${index === 0 ? (yard.issue ?? 'Next repair') : 'Queued'} · Iron ${cost.Iron}, Water ${cost.Water}, Oil ${cost.Oil}`,
        ),
      );
      decorateQueueRow(
        row,
        id,
        `${queued.ship.type}, position ${index + 1}`,
        model.phase !== 'planning',
      );
      repairs.append(row);
    }
    panel.append(repairs);
    panel.append(
      element(
        'p',
        '',
        yard.issue ??
          (yard.queue.length
            ? 'Repairs complete at the end of the year.'
            : 'No wrecks in Orbit.'),
      ),
    );
  }
  panel.append(
    button('Open planet', () =>
      emit({ type: 'open-planet', id: yard.planetId }),
    ),
  );
  return panel;
}
