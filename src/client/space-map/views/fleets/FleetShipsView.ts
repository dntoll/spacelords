import type { FleetSnapshot } from '../../models/GameSnapshots.js';
import type { IntentHandler } from '../../../app/views/ViewContracts.js';
import type { EngineType } from '../../models/Catalog.js';
import { SHIP_IMAGES } from '../ShipImages.js';
import rocketImage from '../../assets/equipment/rocket-engine.png';
import ionImage from '../../assets/equipment/ion-pulse-engine.png';

type Slot = { shipId: string; slot: number | 'engine' };
const ENGINE_IMAGES: Record<EngineType, string> = {
  'Rocket engine': rocketImage,
  'Ion pulse engine': ionImage,
};

// fleet-visuella-platser / fleet-drag-och-rullning: one gesture works with touch, pen and mouse.
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
    'Drag an engine, or select it and then select a destination. Drag the handle to reorder ships.';
  page.append(hint);
  const ships = fleet.shipUnits ?? [];
  let selected: { slot: Slot; button: HTMLButtonElement } | null = null;
  let dragging = false;

  function enableDrag(
    handle: HTMLElement,
    makeGhost: () => HTMLElement,
    drop: (target: Element | null, y: number) => void,
    selector: string,
  ): void {
    let start: { x: number; y: number } | null = null;
    let pointer = { x: 0, y: 0 };
    let ghost: HTMLElement | null = null;
    let marked: Element | null = null;
    let direction = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    const updateTarget = () => {
      const target =
        document.elementFromPoint(pointer.x, pointer.y)?.closest(selector) ??
        null;
      if (target !== marked) {
        marked?.classList.remove('drag-target');
        marked = target;
        marked?.classList.add('drag-target');
      }
    };
    const cleanup = () => {
      clearInterval(timer);
      ghost?.remove();
      marked?.classList.remove('drag-target');
      ghost = null;
      marked = null;
      start = null;
      direction = 0;
    };
    handle.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || start) return;
      start = { x: event.clientX, y: event.clientY };
      pointer = { ...start };
      handle.setPointerCapture(event.pointerId);
      timer = setInterval(() => {
        if (!ghost || !direction) return;
        page.scrollTop += direction;
        updateTarget();
      }, 30);
    });
    handle.addEventListener('pointermove', (event) => {
      if (!start) return;
      pointer = { x: event.clientX, y: event.clientY };
      if (!ghost && Math.hypot(pointer.x - start.x, pointer.y - start.y) >= 8) {
        dragging = true;
        ghost = makeGhost();
        ghost.classList.add('fleet-drag-ghost');
        document.body.append(ghost);
      }
      if (!ghost) return;
      ghost.style.left = `${pointer.x}px`;
      ghost.style.top = `${pointer.y}px`;
      const bounds = page.getBoundingClientRect();
      direction =
        pointer.y < bounds.top + 52
          ? -14
          : pointer.y > bounds.bottom - 52
            ? 14
            : 0;
      updateTarget();
    });
    handle.addEventListener('pointerup', (event) => {
      const wasDragging = !!ghost;
      const target = wasDragging
        ? (document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest(selector) ?? null)
        : null;
      cleanup();
      if (wasDragging) {
        drop(target, event.clientY);
        // A synthesized click after a drag must not select an item.
        setTimeout(() => {
          dragging = false;
        }, 0);
      }
    });
    handle.addEventListener('pointercancel', () => {
      cleanup();
      dragging = false;
    });
    handle.addEventListener('lostpointercapture', () => {
      if (start) {
        cleanup();
        dragging = false;
      }
    });
  }

  ships.forEach((ship, shipIndex) => {
    const card = document.createElement('article');
    card.className = 'fleet-ship';
    card.dataset.shipId = ship.id;
    const header = document.createElement('div');
    header.className = 'fleet-ship-header';
    const title = document.createElement('h2');
    title.textContent = ship.type;
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'fleet-ship-handle';
    handle.textContent = '☰';
    handle.setAttribute('aria-label', `Drag ${ship.type} to reorder`);
    const up = document.createElement('button');
    up.type = 'button';
    up.textContent = '↑';
    up.disabled = shipIndex === 0;
    up.setAttribute('aria-label', `Move ${ship.type} up`);
    up.addEventListener('click', () =>
      emit({ type: 'reorder-ship', shipId: ship.id, index: shipIndex - 1 }),
    );
    const down = document.createElement('button');
    down.type = 'button';
    down.textContent = '↓';
    down.disabled = shipIndex === ships.length - 1;
    down.setAttribute('aria-label', `Move ${ship.type} down`);
    down.addEventListener('click', () =>
      emit({ type: 'reorder-ship', shipId: ship.id, index: shipIndex + 1 }),
    );
    header.append(handle, title, up, down);
    card.append(header);
    enableDrag(
      handle,
      () => {
        const ghost = document.createElement('div');
        ghost.className = 'fleet-ship-ghost';
        const image = document.createElement('img');
        image.src = SHIP_IMAGES[ship.type];
        image.alt = '';
        ghost.append(image, document.createTextNode(ship.type));
        return ghost;
      },
      (target, y) => {
        const targetId = (target as HTMLElement | null)?.dataset.shipId;
        const targetIndex = ships.findIndex((entry) => entry.id === targetId);
        if (targetIndex < 0 || !target) return;
        const after =
          y >
          target.getBoundingClientRect().top +
            target.getBoundingClientRect().height / 2;
        const insertion = targetIndex + Number(after);
        const index = Math.max(
          0,
          Math.min(ships.length - 1, insertion - Number(shipIndex < insertion)),
        );
        emit({ type: 'reorder-ship', shipId: ship.id, index });
      },
      '.fleet-ship',
    );

    const image = document.createElement('div');
    image.className = 'fleet-ship-image';
    image.style.backgroundImage = `url("${SHIP_IMAGES[ship.type]}")`;
    const addSlot = (slot: Slot['slot'], content: EngineType | null): void => {
      const control = document.createElement('button');
      control.type = 'button';
      control.className = 'fleet-equipment-slot';
      control.dataset.shipId = ship.id;
      control.dataset.slot = String(slot);
      const slotName = slot === 'engine' ? 'Engine' : `Cargo ${slot + 1}`;
      control.setAttribute(
        'aria-label',
        `${ship.type} ${slotName}: ${content ?? 'Empty'}`,
      );
      control.title = `${slotName}: ${content ?? 'Empty'}`;
      // Coordinates are percentages of the square ship artwork; cargo uses two rows of five.
      const column = slot === 'engine' ? 2 : slot % 5;
      const row = slot === 'engine' ? 2 : Math.floor(slot / 5);
      control.style.left = `${10 + column * 20}%`;
      control.style.top = `${22 + row * 27}%`;
      if (content) {
        const icon = document.createElement('img');
        icon.src = ENGINE_IMAGES[content];
        icon.alt = '';
        control.append(icon);
      }
      const current = { shipId: ship.id, slot };
      control.addEventListener('click', () => {
        if (dragging) return;
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
      if (content)
        enableDrag(
          control,
          () => {
            const ghost = document.createElement('img');
            ghost.className = 'fleet-item-ghost';
            ghost.src = ENGINE_IMAGES[content];
            ghost.alt = '';
            return ghost;
          },
          (target) => {
            const destination = target as HTMLElement | null;
            if (!destination?.dataset.shipId || !destination.dataset.slot)
              return;
            const destinationSlot =
              destination.dataset.slot === 'engine'
                ? 'engine'
                : Number(destination.dataset.slot);
            emit({
              type: 'move-engine',
              from: current,
              to: { shipId: destination.dataset.shipId, slot: destinationSlot },
            });
          },
          '.fleet-equipment-slot',
        );
      image.append(control);
    };
    const engine = ship.engines['Ion pulse engine']
      ? 'Ion pulse engine'
      : ship.engines['Rocket engine']
        ? 'Rocket engine'
        : null;
    addSlot('engine', engine);
    ship.cargoSlots?.forEach((item, index) => addSlot(index, item));
    card.append(image);
    page.append(card);
  });
  return page;
}
