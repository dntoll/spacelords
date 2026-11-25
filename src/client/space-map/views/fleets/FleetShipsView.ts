import type { FleetSnapshot } from '../../models/GameSnapshots.js';
import type { IntentHandler } from '../../../app/views/ViewContracts.js';
import { SHIP_IMAGES } from '../ShipImages.js';

type Slot = { shipId: string; slot: number | 'engine' };

// fleet-motorer-och-last: selection also provides touch and keyboard access.
export function renderFleetEquipment(
  fleet: FleetSnapshot,
  emit: IntentHandler,
): HTMLElement {
  const page = document.createElement('section');
  page.className = 'fleet-ships';
  const heading = document.createElement('h1');
  heading.textContent = 'Fleet';
  page.append(heading);
  const hint = document.createElement('p');
  hint.textContent =
    'Drag an engine, or select it and then select a destination.';
  page.append(hint);
  let selected: { slot: Slot; button: HTMLButtonElement } | null = null;
  for (const ship of fleet.shipUnits ?? []) {
    const card = document.createElement('article');
    card.className = 'fleet-ship';
    const title = document.createElement('h2');
    title.textContent = ship.type;
    card.append(title);
    const image = document.createElement('div');
    image.className = 'fleet-ship-image';
    image.style.backgroundImage = `url("${SHIP_IMAGES[ship.type]}")`;
    const slots = document.createElement('div');
    slots.className = 'fleet-ship-slots';
    const addSlot = (slot: Slot['slot'], content: string | null): void => {
      const control = document.createElement('button');
      control.type = 'button';
      control.className = 'fleet-equipment-slot';
      control.dataset.shipId = ship.id;
      control.dataset.slot = String(slot);
      control.textContent = `${slot === 'engine' ? 'Engine' : `Cargo ${slot + 1}`}: ${content ?? 'Empty'}`;
      control.setAttribute('aria-label', `${ship.type} ${control.textContent}`);
      const current = { shipId: ship.id, slot };
      control.addEventListener('click', () => {
        if (selected) {
          const from = selected.slot;
          selected.button.classList.remove('selected');
          selected = null;
          emit({ type: 'move-engine', from, to: current });
        } else if (content) {
          selected = { slot: current, button: control };
          control.classList.add('selected');
        }
      });
      if (content) {
        let start: { x: number; y: number } | null = null;
        let scrollDirection = 0;
        let scrollTimer: ReturnType<typeof setInterval> | undefined;
        control.addEventListener('pointerdown', (event) => {
          start = { x: event.clientX, y: event.clientY };
          control.setPointerCapture(event.pointerId);
          scrollTimer = setInterval(() => {
            page.scrollTop += scrollDirection;
          }, 30);
        });
        control.addEventListener('pointermove', (event) => {
          if (
            !start ||
            Math.hypot(event.clientX - start.x, event.clientY - start.y) < 8
          )
            return;
          const bounds = page.getBoundingClientRect();
          scrollDirection =
            event.clientY < bounds.top + 48
              ? -12
              : event.clientY > bounds.bottom - 48
                ? 12
                : 0;
        });
        control.addEventListener('pointercancel', () => {
          clearInterval(scrollTimer);
          start = null;
        });
        control.addEventListener('pointerup', (event) => {
          clearInterval(scrollTimer);
          if (
            !start ||
            Math.hypot(event.clientX - start.x, event.clientY - start.y) < 8
          )
            return;
          const target = document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest<HTMLButtonElement>('.fleet-equipment-slot');
          if (!target?.dataset.shipId || !target.dataset.slot) return;
          const targetSlot =
            target.dataset.slot === 'engine'
              ? 'engine'
              : Number(target.dataset.slot);
          emit({
            type: 'move-engine',
            from: current,
            to: { shipId: target.dataset.shipId, slot: targetSlot },
          });
        });
      }
      slots.append(control);
    };
    const engine = ship.engines['Ion pulse engine']
      ? 'Ion pulse engine'
      : ship.engines['Rocket engine']
        ? 'Rocket engine'
        : null;
    addSlot('engine', engine);
    ship.cargoSlots?.forEach((item, index) => addSlot(index, item));
    image.append(slots);
    card.append(image);
    page.append(card);
  }
  return page;
}
