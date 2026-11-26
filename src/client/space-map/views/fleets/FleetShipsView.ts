import { crewPortraitAtlas } from '../../../boarding/views/index.js';
import type { FleetSnapshot } from '../../models/GameSnapshots.js';
import type { IntentHandler } from '../../../app/views/ViewContracts.js';
import {
  ENGINE_SPEED_BONUS,
  type EngineType,
  type Equipment,
  type EquipmentSlot,
  type ShipWeapon,
} from '../../models/Catalog.js';
import { WEAPONS } from '../../../space-battle/models/index.js';
import { SHIP_IMAGES } from '../ShipImages.js';
import rocketImage from '../../assets/equipment/rocket-engine.png';
import ionImage from '../../assets/equipment/ion-pulse-engine.png';
import cannonImage from '../../assets/equipment/cannon-illustration.png';
import lightCannonImage from '../../assets/equipment/light-cannon-illustration.png';
import raiderCannonImage from '../../assets/equipment/raider-cannon-illustration.png';
import missilesImage from '../../assets/equipment/missiles-illustration.png';

type Slot = EquipmentSlot;
const WEAPON_IMAGES: Record<ShipWeapon, string> = {
  Cannon: cannonImage,
  'Light cannon': lightCannonImage,
  'Raider cannon': raiderCannonImage,
  Missiles: missilesImage,
};
const equipmentName = (item: Equipment) =>
  typeof item === 'string' ? item : item.type;
const equipmentImage = (item: Equipment) =>
  typeof item === 'string' ? ENGINE_IMAGES[item] : WEAPON_IMAGES[item.type];
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
    'Drag equipment to move or swap it. Select an item for details, then an empty slot to move it. Drag the handle to reorder ships.';
  page.append(hint);
  const details = document.createElement('aside');
  details.className = 'fleet-item-details';
  details.setAttribute('aria-label', 'Selected slot details');
  details.setAttribute('aria-live', 'polite');
  details.hidden = true;
  page.append(details);
  const showDetails = (slotName: string, content: Equipment | null) => {
    details.replaceChildren();
    details.hidden = false;
    const heading = document.createElement('h2');
    heading.textContent = content
      ? equipmentName(content)
      : `Empty ${slotName.toLowerCase()} slot`;
    details.append(heading);
    if (!content) return;
    const picture = document.createElement('img');
    picture.src = equipmentImage(content);
    picture.alt = '';
    const stats = document.createElement('div');
    if (typeof content === 'string') {
      const bonus = ENGINE_SPEED_BONUS[content];
      const map = document.createElement('p');
      map.textContent = `Star map speed bonus: +${bonus}`;
      const battle = document.createElement('p');
      battle.textContent = `Battle speed bonus: +${bonus}`;
      const condition = document.createElement('p');
      condition.textContent = 'Bonuses apply when equipped.';
      stats.append(map, battle, condition);
    } else {
      const profile = WEAPONS[content.type];
      const range = document.createElement('p');
      range.textContent = `Range: ${profile.min}–${profile.max} · Arc: ${profile.arc}°`;
      const damage = document.createElement('p');
      damage.textContent = `Damage dice: ${profile.dice} · Hit: ${profile.threshold}+`;
      stats.append(range, damage);
      if (content.type === 'Missiles') {
        const ammo = document.createElement('p');
        ammo.textContent = `Salvos: ${content.salvos ?? 0}`;
        stats.append(ammo);
      }
    }
    const body = document.createElement('div');
    body.className = 'fleet-item-details-body';
    body.append(picture, stats);
    details.append(body);
  };
  const ships = fleet.shipUnits ?? [];
  let selected: {
    slot: Slot;
    button: HTMLButtonElement;
    content: Equipment | null;
  } | null = null;
  let dragging = false;
  // fleet-direktmarkering: background clicks clear the current inspection.
  const clearSelection = () => {
    selected?.button.classList.remove('selected');
    selected?.button.setAttribute('aria-pressed', 'false');
    selected = null;
    details.hidden = true;
  };
  page.addEventListener('clear-fleet-selection', clearSelection);
  page.addEventListener('click', (event) => {
    const target = event.target;
    if (
      target instanceof Element &&
      !target.closest('button, .fleet-item-details')
    )
      clearSelection();
  });

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

    const layout = document.createElement('div');
    layout.className = 'fleet-ship-layout';
    const picture = document.createElement('img');
    picture.className = 'fleet-ship-picture';
    picture.src = SHIP_IMAGES[ship.type];
    picture.alt = '';
    const image = document.createElement('div');
    image.className = 'fleet-ship-image';
    layout.append(picture, image);
    const addSlot = (
      slot: Slot['slot'],
      content: Equipment | null,
      weaponIndex?: number,
    ): void => {
      const control = document.createElement('button');
      control.type = 'button';
      control.className = 'fleet-equipment-slot';
      control.setAttribute('aria-pressed', 'false');
      const wrapper = document.createElement('div');
      wrapper.className = 'fleet-slot';
      const label = document.createElement('span');
      label.className = 'fleet-slot-label';
      label.textContent =
        slot === 'engine' ? 'Engine' : slot === 'weapon' ? 'Weapon' : '';
      label.setAttribute('aria-hidden', 'true');
      control.dataset.shipId = ship.id;
      control.dataset.slot =
        slot === 'weapon' ? `weapon:${weaponIndex}` : String(slot);
      const slotName =
        slot === 'engine'
          ? 'Engine'
          : slot === 'weapon'
            ? `Weapon ${weaponIndex! + 1}`
            : `Cargo ${slot + 1}`;
      control.setAttribute(
        'aria-label',
        `${ship.type} ${slotName}: ${content ? equipmentName(content) : 'Empty'}`,
      );
      control.title = `${slotName}: ${content ? equipmentName(content) : 'Empty'}`;
      if (slot === 'engine') {
        wrapper.classList.add('fleet-engine-position');
      } else if (slot === 'weapon') {
        wrapper.classList.add('fleet-weapon-position');
        wrapper.classList.add(
          weaponIndex === 0 ? 'fleet-weapon-upper' : 'fleet-weapon-lower',
        );
      } else wrapper.classList.add('fleet-storage-slot');
      if (content) {
        const icon = document.createElement('img');
        icon.src = equipmentImage(content);
        icon.alt = '';
        control.append(icon);
      }
      const current: Slot = {
        shipId: ship.id,
        slot,
        ...(slot === 'weapon' ? { index: weaponIndex! } : {}),
      };
      control.addEventListener('click', () => {
        if (dragging) return;
        if (selected?.button === control) {
          control.classList.remove('selected');
          control.setAttribute('aria-pressed', 'false');
          selected = null;
          details.hidden = true;
          return;
        }
        if (selected?.content && !content) {
          const from = selected.slot;
          selected.button.classList.remove('selected');
          selected.button.setAttribute('aria-pressed', 'false');
          selected = null;
          details.hidden = true;
          emit({ type: 'move-equipment', from, to: current });
          return;
        }
        selected?.button.classList.remove('selected');
        selected?.button.setAttribute('aria-pressed', 'false');
        selected = { slot: current, button: control, content };
        control.classList.add('selected');
        control.setAttribute('aria-pressed', 'true');
        showDetails(
          slot === 'engine'
            ? 'Engine'
            : slot === 'weapon'
              ? 'Weapon'
              : 'Storage',
          content,
        );
      });
      if (content)
        enableDrag(
          control,
          () => {
            const ghost = document.createElement('img');
            ghost.className = 'fleet-item-ghost';
            ghost.src = equipmentImage(content);
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
                : destination.dataset.slot.startsWith('weapon:')
                  ? 'weapon'
                  : Number(destination.dataset.slot);
            const destinationIndex =
              destinationSlot === 'weapon'
                ? Number(destination.dataset.slot.slice(7))
                : undefined;
            emit({
              type: 'move-equipment',
              from: current,
              to: {
                shipId: destination.dataset.shipId,
                slot: destinationSlot,
                ...(destinationIndex !== undefined
                  ? { index: destinationIndex }
                  : {}),
              },
            });
          },
          '.fleet-equipment-slot',
        );
      if (slot === 'engine' || slot === 'weapon') wrapper.append(label);
      wrapper.append(control);
      if (typeof slot === 'number') storage?.append(wrapper);
      else image.append(wrapper);
    };
    let storage: HTMLElement | null = null;
    if (ship.cargoSlots?.length) {
      storage = document.createElement('div');
      storage.className = 'fleet-storage';
      storage.setAttribute('role', 'group');
      storage.setAttribute('aria-label', 'Storage');
      const title = document.createElement('span');
      title.className = 'fleet-storage-title';
      title.textContent = 'Storage';
      storage.append(title);
      image.append(storage);
    }
    const engine = ship.engines['Ion pulse engine']
      ? 'Ion pulse engine'
      : ship.engines['Rocket engine']
        ? 'Rocket engine'
        : null;
    addSlot('engine', engine);
    ship.cargoSlots?.forEach((item, index) => addSlot(index, item));
    ship.weaponSlots?.forEach((item, index) => addSlot('weapon', item, index));
    card.append(layout);
    const roleOverview = document.createElement('div');
    roleOverview.className = 'crew-role-overview';
    for (const role of ['pilot', 'engineer', 'gunner', 'boarder'] as const) {
      const names = (fleet.people ?? [])
        .filter(
          (person) => person.shipId === ship.id && person.roles.includes(role),
        )
        .map((person) => person.name);
      for (let index = 0; index < (role === 'boarder' ? 4 : 1); index++) {
        const slot = document.createElement('span');
        slot.textContent = `${role === 'boarder' ? `boarder ${index + 1}` : role}: ${names[index] ?? 'Empty'}`;
        roleOverview.append(slot);
      }
    }
    card.append(roleOverview);
    const crew = document.createElement('details');
    crew.dataset.crewShip = ship.id;
    const summary = document.createElement('summary');
    summary.textContent = 'Crew';
    crew.append(summary);
    for (const person of fleet.people ?? [])
      if (person.shipId === ship.id)
        crew.append(crewPersonControls(fleet, person, emit));
    card.append(crew);
    page.append(card);
  });
  for (const ship of fleet.abandonedShips ?? []) {
    const card = document.createElement('article');
    card.className = 'fleet-ship';
    const title = document.createElement('h2');
    title.textContent = `${ship.type} · Left behind`;
    const rejoin = document.createElement('button');
    rejoin.textContent = 'Rejoin fleet';
    const aboard = (fleet.people ?? []).filter(
      (person) => person.shipId === ship.id && person.status === 'active',
    );
    rejoin.disabled = !(['pilot', 'engineer'] as const).every((role) =>
      aboard.some((person) => person.roles.includes(role)),
    );
    if (rejoin.disabled)
      rejoin.title = 'Assign an active pilot and engineer first.';
    rejoin.addEventListener('click', () =>
      emit({ type: 'rejoin-ship', shipId: ship.id }),
    );
    card.append(title, rejoin);
    if (rejoin.disabled) {
      const hint = document.createElement('p');
      hint.textContent = 'Assign an active pilot and engineer to rejoin.';
      card.append(hint);
    }
    for (const person of fleet.people ?? [])
      if (person.shipId === ship.id)
        card.append(crewPersonControls(fleet, person, emit));
    page.append(card);
  }
  return page;
}

/** crew-med-utrustning-och-skeppsbyte: the same controls work in Fleet and Crew. */
function crewPersonControls(
  fleet: FleetSnapshot,
  person: NonNullable<FleetSnapshot['people']>[number],
  emit: IntentHandler,
): HTMLElement {
  const section = document.createElement('article');
  section.className = 'crew-person';
  const name = document.createElement('h3');
  name.textContent = person.name;
  const portrait = document.createElement('span');
  portrait.className = 'crew-portrait';
  portrait.setAttribute('aria-hidden', 'true');
  portrait.style.backgroundImage = `url(${crewPortraitAtlas})`;
  const info = document.createElement('p');
  info.textContent = `HP ${person.hitPoints}/${person.attributes.maxHitPoints} · ${person.status} · Accuracy ${person.attributes.accuracy} · Defense ${person.attributes.defense} · Agility ${person.attributes.agility}`;
  section.append(portrait, name, info);
  const shipLabel = document.createElement('label');
  shipLabel.textContent = 'Ship ';
  const shipSelect = document.createElement('select');
  shipSelect.setAttribute('aria-label', `${person.name} ship`);
  for (const ship of [
    ...(fleet.shipUnits ?? []),
    ...(fleet.abandonedShips ?? []),
  ]) {
    const option = document.createElement('option');
    option.value = ship.id;
    option.textContent = ship.type;
    option.selected = ship.id === person.shipId;
    shipSelect.append(option);
  }
  shipSelect.addEventListener('change', () =>
    emit({ type: 'crew-move', personId: person.id, shipId: shipSelect.value }),
  );
  shipLabel.append(shipSelect);
  section.append(shipLabel);
  const roles = document.createElement('div');
  roles.className = 'crew-roles';
  for (const role of ['pilot', 'engineer', 'gunner', 'boarder'] as const) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = person.roles.includes(role);
    input.disabled = person.status !== 'active' && !input.checked;
    input.addEventListener('change', () =>
      emit({
        type: 'crew-role',
        personId: person.id,
        role,
        assigned: input.checked,
      }),
    );
    label.append(input, document.createTextNode(` ${role}`));
    roles.append(label);
  }
  section.append(roles);
  for (const slot of ['weapon', 'gadget'] as const) {
    const row = document.createElement('label');
    const item = slot === 'weapon' ? person.weapon : person.gadget?.type;
    row.textContent = `${slot}: ${item ?? 'Empty'} · swap with `;
    const select = document.createElement('select');
    select.setAttribute('aria-label', `${person.name} swap ${slot}`);
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Choose person';
    select.append(placeholder);
    for (const target of fleet.people ?? []) {
      if (target.id === person.id || target.status === 'dead') continue;
      const option = document.createElement('option');
      option.value = target.id;
      option.textContent = target.name;
      select.append(option);
    }
    select.addEventListener('change', () => {
      if (select.value)
        emit({
          type: 'crew-swap-equipment',
          firstId: person.id,
          secondId: select.value,
          slot,
        });
    });
    row.append(select);
    section.append(row);
  }
  return section;
}

export function renderCrew(
  fleet: FleetSnapshot,
  emit: IntentHandler,
): HTMLElement {
  const page = document.createElement('section');
  page.className = 'crew-page';
  const heading = document.createElement('h1');
  heading.textContent = 'Crew';
  page.append(heading);
  for (const person of fleet.people ?? [])
    page.append(crewPersonControls(fleet, person, emit));
  if (!fleet.people?.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No crew aboard.';
    page.append(empty);
  }
  return page;
}
