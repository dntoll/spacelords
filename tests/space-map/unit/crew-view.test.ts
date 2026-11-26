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
  expect(crew.querySelectorAll('select')).toHaveLength(0);
  expect(crew.querySelectorAll('.crew-equipment-slot')).toHaveLength(24);
  expect(crew.querySelectorAll('.crew-stat progress')).toHaveLength(48);
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
  expect(details.querySelector(`select`)).toBeNull();
});

it('dragbar-besattning: selects two crew slots to exchange roles across ships', () => {
  const fleet = new Game(createExampleGalaxy()).fleetSnapshot();
  const first = fleet.people!.find((person) => person.roles.includes('pilot'))!;
  const second = fleet.people!.find(
    (person) =>
      person.shipId !== first.shipId && person.roles.includes('engineer'),
  )!;
  const emit = vi.fn();
  const page = renderFleetEquipment(fleet, emit);
  const source = page.querySelector<HTMLButtonElement>(
    `.fleet-crew-slot[data-crew-person="${first.id}"][data-crew-role="pilot"]`,
  )!;
  const target = page.querySelector<HTMLButtonElement>(
    `.fleet-crew-slot[data-crew-person="${second.id}"][data-crew-role="engineer"]`,
  )!;
  source.click();
  target.click();
  expect(emit).toHaveBeenCalledWith({
    type: 'crew-place',
    personId: first.id,
    fromShip: first.shipId,
    fromRole: 'pilot',
    toShip: second.shipId,
    toRole: 'engineer',
    occupantId: second.id,
  });
});

it('dragbar-personlig-utrustning: transfers only between matching equipment slots', () => {
  const fleet = new Game(createExampleGalaxy()).fleetSnapshot();
  const equipped = fleet.people!.find((person) => person.gadget)!;
  const other = fleet.people!.find((person) => person.id !== equipped.id)!;
  const emit = vi.fn();
  const page = renderCrew(fleet, emit);
  const source = page.querySelector<HTMLButtonElement>(
    `.crew-equipment-slot[data-person="${equipped.id}"][data-slot="gadget"]`,
  )!;
  const wrong = page.querySelector<HTMLButtonElement>(
    `.crew-equipment-slot[data-person="${other.id}"][data-slot="weapon"]`,
  )!;
  const target = page.querySelector<HTMLButtonElement>(
    `.crew-equipment-slot[data-person="${other.id}"][data-slot="gadget"]`,
  )!;
  source.click();
  wrong.click();
  expect(emit).not.toHaveBeenCalled();
  source.click();
  target.click();
  expect(emit).toHaveBeenCalledWith({
    type: 'crew-swap-equipment',
    firstId: equipped.id,
    secondId: other.id,
    slot: 'gadget',
  });
});

it('dragbar-besattning: pointer drags deliver the chosen slots and cancellation leaves them unchanged', () => {
  const fleet = new Game(createExampleGalaxy()).fleetSnapshot();
  const emit = vi.fn();
  const page = renderFleetEquipment(fleet, emit);
  document.body.append(page);
  const source = page.querySelector<HTMLButtonElement>(
    '.fleet-crew-slot[data-crew-person]:not([data-crew-person=""])',
  )!;
  const target = [
    ...page.querySelectorAll<HTMLButtonElement>('.fleet-crew-slot'),
  ].find((slot) => slot.dataset.crewShip !== source.dataset.crewShip)!;
  source.setPointerCapture = vi.fn();
  const hit = vi.fn().mockReturnValue(target);
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: hit,
  });
  const pointer = (type: string, x: number) => {
    const event = new MouseEvent(type, {
      bubbles: true,
      button: 0,
      clientX: x,
      clientY: 10,
    });
    Object.defineProperty(event, 'pointerId', { value: 1 });
    source.dispatchEvent(event);
  };
  pointer('pointerdown', 0);
  pointer('pointermove', 20);
  pointer('pointercancel', 20);
  expect(emit).not.toHaveBeenCalled();
  pointer('pointerdown', 0);
  pointer('pointermove', 20);
  pointer('pointerup', 20);
  expect(emit).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'crew-place',
      personId: source.dataset.crewPerson,
      toShip: target.dataset.crewShip,
    }),
  );
  Reflect.deleteProperty(document, 'elementFromPoint');
  page.remove();
});

it('dragbar-personlig-utrustning: dragging exchanges equipment and cancelling does not', () => {
  const fleet = new Game(createExampleGalaxy()).fleetSnapshot();
  const equipped = fleet.people!.find((person) => person.gadget)!;
  const other = fleet.people!.find((person) => person.id !== equipped.id)!;
  const emit = vi.fn();
  const page = renderCrew(fleet, emit);
  document.body.append(page);
  const source = page.querySelector<HTMLButtonElement>(
    `.crew-equipment-slot[data-person="${equipped.id}"][data-slot="gadget"]`,
  )!;
  const target = page.querySelector<HTMLButtonElement>(
    `.crew-equipment-slot[data-person="${other.id}"][data-slot="gadget"]`,
  )!;
  source.setPointerCapture = vi.fn();
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: vi.fn().mockReturnValue(target),
  });
  const pointer = (type: string, x: number) => {
    const event = new MouseEvent(type, {
      bubbles: true,
      button: 0,
      clientX: x,
      clientY: 10,
    });
    Object.defineProperty(event, 'pointerId', { value: 1 });
    source.dispatchEvent(event);
  };
  pointer('pointerdown', 0);
  pointer('pointermove', 20);
  pointer('pointercancel', 20);
  expect(emit).not.toHaveBeenCalled();
  pointer('pointerdown', 0);
  pointer('pointermove', 20);
  pointer('pointerup', 20);
  expect(emit).toHaveBeenCalledWith({
    type: 'crew-swap-equipment',
    firstId: equipped.id,
    secondId: other.id,
    slot: 'gadget',
  });
  Reflect.deleteProperty(document, 'elementFromPoint');
  page.remove();
});
