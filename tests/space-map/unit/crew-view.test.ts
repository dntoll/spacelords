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
  const portraits = [...crew.querySelectorAll<HTMLElement>('.crew-portrait')];
  expect(
    new Set(portraits.map((portrait) => portrait.style.backgroundPosition))
      .size,
  ).toBe(12);
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
    expect(overview.querySelectorAll('.fleet-crew-slot')).toHaveLength(7);
});

it('fleet-besattningsrutor: shows crew as square slots with portraits and opens the selected person', () => {
  const game = new Game(createExampleGalaxy());
  const fleet = game.fleetSnapshot();
  const raptor = fleet.shipUnits!.find((ship) => ship.type === 'Raptor')!;
  const person = fleet.people!.find(
    (entry) => entry.shipId === raptor.id && entry.roles.includes('pilot'),
  )!;
  const page = renderFleetEquipment(fleet, vi.fn());
  const card = page.querySelector<HTMLElement>(
    `.fleet-ship[data-ship-id="${raptor.id}"]`,
  )!;
  const group = card.querySelector<HTMLElement>(
    '[role="group"][aria-label="Crew"]',
  );
  expect(group).not.toBeNull();
  const buttons =
    group!.querySelectorAll<HTMLButtonElement>('.fleet-crew-slot');
  expect(buttons).toHaveLength(7);
  const pilot = [...buttons].find((button) =>
    button.getAttribute('aria-label')?.includes(person.name),
  )!;
  expect(pilot.querySelector('.crew-slot-portrait')).not.toBeNull();
  pilot.click();
  const details = page.querySelector<HTMLElement>('.fleet-item-details')!;
  expect(details.hidden).toBe(false);
  expect(details.textContent).toContain(person.name);
  expect(
    details.querySelector(`[aria-label="${person.name} ship"]`),
  ).not.toBeNull();
});
