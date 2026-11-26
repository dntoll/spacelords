// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import {
  renderCrew,
  renderFleetEquipment,
} from '../../../src/client/space-map/views/fleets/FleetShipsView.js';

it('crew-med-utrustning-och-skeppsbyte: exposes people, assignments and equipment controls in Crew and Fleet', () => {
  const game = new Game(createExampleGalaxy());
  const fleet = game.fleetSnapshot();
  const emit = vi.fn();
  const crew = renderCrew(fleet, emit);
  expect(crew.querySelectorAll('.crew-person')).toHaveLength(12);
  const first = fleet.people![0]!;
  const select = crew.querySelector<HTMLSelectElement>(
    `select[aria-label="${first.name} ship"]`,
  )!;
  select.value = fleet.shipUnits!.find((ship) => ship.id !== first.shipId)!.id;
  select.dispatchEvent(new Event('change'));
  expect(emit).toHaveBeenCalledWith({
    type: 'crew-move',
    personId: first.id,
    shipId: select.value,
  });
  const fleetPage = renderFleetEquipment(fleet, emit);
  expect(fleetPage.querySelectorAll('.crew-person')).toHaveLength(12);
  for (const overview of fleetPage.querySelectorAll('.crew-role-overview'))
    expect(overview.querySelectorAll('span')).toHaveLength(7);
});
