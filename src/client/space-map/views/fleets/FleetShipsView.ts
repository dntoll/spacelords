import crewPortraitAtlas from '../../assets/crew/crew-portraits.png';
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

function setCrewPortrait(element: HTMLElement, id: string): void {
  element.style.backgroundImage = `url(${crewPortraitAtlas})`;
  const number = /^crew-(\d+)$/.exec(id);
  const index = number
    ? (Number(number[1]) - 1) % 12
    : [...id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 12;
  element.style.backgroundPosition = `${((index % 4) * 100) / 3}% ${Math.floor(index / 4) * 50}%`;
}
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
    'Drag crew or equipment between slots to move or swap them. Select two slots to move without dragging. Drag a ship by its name onto another ship to take its place.';
  page.append(hint);
  const details = document.createElement('aside');
  details.className = 'fleet-item-details';
  details.setAttribute('aria-label', 'Selected slot details');
  details.setAttribute('aria-live', 'polite');
  details.hidden = true;
  page.append(details);
  bindCrewEquipment(page, emit);
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
  let selectedCrew: HTMLButtonElement | null = null;
  let addingRole = false;
  // fleet-direktmarkering: background clicks clear the current inspection.
  const clearSelection = () => {
    selected?.button.classList.remove('selected');
    selected?.button.setAttribute('aria-pressed', 'false');
    selected = null;
    selectedCrew?.classList.remove('selected');
    selectedCrew?.setAttribute('aria-pressed', 'false');
    selectedCrew = null;
    addingRole = false;
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
    drop: (target: Element | null) => void,
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
        drop(target);
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

  const renderCrewSlots = (
    ship: NonNullable<FleetSnapshot['shipUnits']>[number],
  ): HTMLElement => {
    const roleOverview = document.createElement('div');
    roleOverview.className = 'fleet-crew crew-role-overview';
    roleOverview.setAttribute('role', 'group');
    roleOverview.setAttribute('aria-label', 'Crew');
    const crewTitle = document.createElement('span');
    crewTitle.className = 'fleet-storage-title';
    crewTitle.textContent = 'Crew';
    roleOverview.append(crewTitle);
    for (const role of ['pilot', 'engineer', 'gunner', 'boarder'] as const) {
      const members = (fleet.people ?? []).filter(
        (person) => person.shipId === ship.id && person.roles.includes(role),
      );
      for (let index = 0; index < (role === 'boarder' ? 4 : 1); index++) {
        const person = members[index];
        const slotLabel =
          role === 'boarder'
            ? `Boarder ${index + 1}`
            : role[0]!.toUpperCase() + role.slice(1);
        const wrapper = document.createElement('div');
        wrapper.className = 'fleet-crew-cell';
        const label = document.createElement('span');
        label.className = 'fleet-crew-label';
        label.textContent = slotLabel;
        const slot = document.createElement('button');
        slot.type = 'button';
        slot.className = 'fleet-equipment-slot fleet-crew-slot';
        slot.setAttribute(
          'aria-label',
          `${ship.type} ${slotLabel}: ${person?.name ?? 'Empty'}`,
        );
        slot.setAttribute('aria-pressed', 'false');
        slot.dataset.crewShip = ship.id;
        slot.dataset.crewRole = role;
        slot.dataset.crewPerson = person?.id ?? '';
        if (person) {
          const portrait = document.createElement('span');
          portrait.className = 'crew-slot-portrait';
          portrait.setAttribute('aria-hidden', 'true');
          setCrewPortrait(portrait, person.id);
          slot.append(portrait);
          enableDrag(
            slot,
            () => {
              const ghost = document.createElement('span');
              ghost.className = 'crew-slot-portrait';
              setCrewPortrait(ghost, person.id);
              return ghost;
            },
            (target) => {
              const destination = target as HTMLElement | null;
              const toShip = destination?.dataset.crewShip;
              const toRole = destination?.dataset.crewRole as
                typeof role | undefined;
              if (!toShip || !toRole || destination === slot) return;
              emit({
                type: 'crew-place',
                personId: person.id,
                fromShip: ship.id,
                fromRole: role,
                toShip,
                toRole,
                occupantId: destination?.dataset.crewPerson || null,
              });
            },
            '.fleet-crew-slot',
          );
          slot.addEventListener('click', () => {
            if (dragging) return;
            if (selectedCrew && selectedCrew !== slot) {
              const fromShip = selectedCrew.dataset.crewShip!;
              const fromRole = (selectedCrew.dataset.crewRole || null) as
                typeof role | null;
              emit({
                type: 'crew-place',
                personId: selectedCrew.dataset.crewPerson!,
                fromShip,
                fromRole,
                toShip: ship.id,
                toRole: role,
                occupantId: person.id,
              });
              clearSelection();
              return;
            }
            if (selectedCrew === slot) {
              clearSelection();
              return;
            }
            clearSelection();
            selectedCrew = slot;
            slot.classList.add('selected');
            slot.setAttribute('aria-pressed', 'true');
            details.replaceChildren(crewPersonControls(fleet, person));
            const addRole = document.createElement('button');
            addRole.type = 'button';
            addRole.textContent = 'Assign another role';
            addRole.addEventListener('click', () => {
              addingRole = true;
              addRole.textContent = 'Select an empty role on this ship';
            });
            details.append(addRole);
            details.hidden = false;
          });
        } else
          slot.addEventListener('click', () => {
            if (!selectedCrew) return;
            if (addingRole) {
              if (selectedCrew.dataset.crewShip === ship.id)
                emit({
                  type: 'crew-role',
                  personId: selectedCrew.dataset.crewPerson!,
                  role,
                  assigned: true,
                });
              clearSelection();
              return;
            }
            emit({
              type: 'crew-place',
              personId: selectedCrew.dataset.crewPerson!,
              fromShip: selectedCrew.dataset.crewShip!,
              fromRole: (selectedCrew.dataset.crewRole || null) as
                typeof role | null,
              toShip: ship.id,
              toRole: role,
              occupantId: null,
            });
            clearSelection();
          });
        wrapper.append(label, slot);
        roleOverview.append(wrapper);
      }
    }
    for (const person of (fleet.people ?? []).filter(
      (entry) =>
        entry.shipId === ship.id &&
        entry.roles.length === 0 &&
        entry.status === 'active',
    )) {
      const cell = document.createElement('div');
      cell.className = 'fleet-crew-cell';
      const label = document.createElement('span');
      label.className = 'fleet-crew-label';
      label.textContent = 'Unassigned';
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = 'fleet-equipment-slot fleet-crew-slot';
      slot.dataset.crewShip = ship.id;
      slot.dataset.crewRole = '';
      slot.dataset.crewPerson = person.id;
      slot.setAttribute(
        'aria-label',
        `${ship.type} Unassigned: ${person.name}`,
      );
      const portrait = document.createElement('span');
      portrait.className = 'crew-slot-portrait';
      setCrewPortrait(portrait, person.id);
      slot.append(portrait);
      enableDrag(
        slot,
        () => {
          const ghost = portrait.cloneNode(true) as HTMLElement;
          return ghost;
        },
        (target) => {
          const destination = target as HTMLElement | null;
          const toShip = destination?.dataset.crewShip;
          const toRole = destination?.dataset.crewRole as
            'pilot' | 'engineer' | 'gunner' | 'boarder' | undefined;
          if (toShip && toRole)
            emit({
              type: 'crew-place',
              personId: person.id,
              fromShip: ship.id,
              fromRole: null,
              toShip,
              toRole,
              occupantId: destination?.dataset.crewPerson || null,
            });
        },
        '.fleet-crew-slot',
      );
      slot.addEventListener('click', () => {
        if (dragging) return;
        clearSelection();
        selectedCrew = slot;
        slot.classList.add('selected');
        details.replaceChildren(crewPersonControls(fleet, person));
        details.hidden = false;
      });
      cell.append(label, slot);
      roleOverview.append(cell);
    }
    return roleOverview;
  };

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
    // fleet-skeppsordning: the handle and the name both start a reorder; a
    // ship dropped anywhere on another ship takes that ship's place.
    title.classList.add('fleet-ship-title-handle');
    for (const grip of [handle, title])
      enableDrag(
        grip,
        () => {
          const ghost = document.createElement('div');
          ghost.className = 'fleet-ship-ghost';
          const image = document.createElement('img');
          image.src = SHIP_IMAGES[ship.type];
          image.alt = '';
          ghost.append(image, document.createTextNode(ship.type));
          return ghost;
        },
        (target) => {
          const targetId = (target as HTMLElement | null)?.dataset.shipId;
          const index = ships.findIndex((entry) => entry.id === targetId);
          if (index < 0 || index === shipIndex) return;
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
        selectedCrew?.classList.remove('selected');
        selectedCrew?.setAttribute('aria-pressed', 'false');
        selectedCrew = null;
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
    card.append(renderCrewSlots(ship));
    const crew = document.createElement('details');
    crew.dataset.crewShip = ship.id;
    const summary = document.createElement('summary');
    summary.textContent = 'Crew';
    crew.append(summary);
    for (const person of fleet.people ?? [])
      if (person.shipId === ship.id)
        crew.append(crewPersonControls(fleet, person));
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
    card.append(title, rejoin, renderCrewSlots(ship));
    if (rejoin.disabled) {
      const hint = document.createElement('p');
      hint.textContent = 'Assign an active pilot and engineer to rejoin.';
      card.append(hint);
    }
    for (const person of fleet.people ?? [])
      if (person.shipId === ship.id)
        card.append(crewPersonControls(fleet, person));
    page.append(card);
  }
  return page;
}

/** besattningsvarden-forklaras: what each personal value does in boarding. */
const CREW_STAT_EFFECTS = {
  HP: 'Damage a person can take in boarding before going down.',
  Accuracy: 'Added to the D20 roll for shots and grenade throws in boarding.',
  Defense: 'The total an enemy shot must reach to hit this person.',
  Agility: 'Action points each boarding turn, before equipment changes them.',
} as const;

/** crew-med-utrustning-och-skeppsbyte: the same controls work in Fleet and Crew. */
function crewPersonControls(
  fleet: FleetSnapshot,
  person: NonNullable<FleetSnapshot['people']>[number],
): HTMLElement {
  const section = document.createElement('article');
  section.className = 'crew-person';
  const name = document.createElement('h3');
  name.textContent = person.name;
  const portrait = document.createElement('span');
  portrait.className = 'crew-portrait';
  portrait.setAttribute('aria-hidden', 'true');
  setCrewPortrait(portrait, person.id);
  const info = document.createElement('p');
  const ship = [
    ...(fleet.shipUnits ?? []),
    ...(fleet.abandonedShips ?? []),
  ].find((entry) => entry.id === person.shipId);
  info.textContent = `${ship?.type ?? 'Unknown ship'} · ${person.status} · ${person.roles.join(', ') || 'Unassigned'}`;
  section.append(portrait, name, info);
  for (const [label, value, max] of [
    ['HP', person.hitPoints, person.attributes.maxHitPoints],
    ['Accuracy', person.attributes.accuracy, 20],
    ['Defense', person.attributes.defense, 20],
    ['Agility', person.attributes.agility, 20],
  ] as const) {
    const row = document.createElement('label');
    row.className = 'crew-stat';
    row.title = CREW_STAT_EFFECTS[label];
    row.textContent = `${label} ${value}${label === 'HP' ? `/${max}` : ''}`;
    const bar = document.createElement('progress');
    bar.max = Math.max(max, value);
    bar.value = value;
    bar.setAttribute('aria-label', `${person.name} ${label}`);
    row.append(bar);
    section.append(row);
  }
  const equipment = document.createElement('div');
  equipment.className = 'crew-equipment';
  for (const slot of ['weapon', 'gadget'] as const) {
    const item = slot === 'weapon' ? person.weapon : person.gadget?.type;
    const cell = document.createElement('div');
    const label = document.createElement('span');
    label.textContent = slot === 'weapon' ? 'Weapon' : 'Gadget';
    const control = document.createElement('button');
    control.type = 'button';
    control.className = 'fleet-equipment-slot crew-equipment-slot';
    control.dataset.person = person.id;
    control.dataset.slot = slot;
    control.dataset.filled = String(!!item);
    control.textContent = item ? item.replaceAll('-', ' ') : 'Empty';
    control.setAttribute(
      'aria-label',
      `${person.name} ${slot}: ${item ?? 'Empty'}`,
    );
    cell.append(label, control);
    equipment.append(cell);
  }
  section.append(equipment);
  return section;
}

export function renderCrew(
  fleet: FleetSnapshot,
  emit: IntentHandler,
): HTMLElement {
  const page = document.createElement('section');
  page.className = 'crew-page';
  bindCrewEquipment(page, emit);
  const heading = document.createElement('h1');
  heading.textContent = 'Crew';
  page.append(heading);
  const legend = document.createElement('dl');
  legend.className = 'crew-stat-legend';
  for (const [label, effect] of Object.entries(CREW_STAT_EFFECTS)) {
    const term = document.createElement('dt');
    term.textContent = label;
    const description = document.createElement('dd');
    description.textContent = effect;
    legend.append(term, description);
  }
  page.append(legend);
  for (const person of fleet.people ?? [])
    page.append(crewPersonControls(fleet, person));
  if (!fleet.people?.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No crew aboard.';
    page.append(empty);
  }
  return page;
}

// dragbar-personlig-utrustning: pointer gestures and two taps share the same exchange.
function bindCrewEquipment(page: HTMLElement, emit: IntentHandler): void {
  let selected: HTMLButtonElement | null = null;
  let gesture: {
    source: HTMLButtonElement;
    id: number;
    x: number;
    y: number;
    ghost: HTMLElement | null;
  } | null = null;
  let suppressClick = false;
  let direction = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  // A person's portrait in Fleet accepts the item into the same personal slot.
  const exchange = (
    source: HTMLButtonElement,
    target: HTMLButtonElement | null,
  ) => {
    const portrait = target?.classList.contains('fleet-crew-slot');
    const secondId = portrait
      ? target?.dataset.crewPerson
      : target?.dataset.person;
    if (
      !target ||
      !secondId ||
      source === target ||
      (!portrait && source.dataset.slot !== target.dataset.slot) ||
      source.dataset.person === secondId
    )
      return;
    emit({
      type: 'crew-swap-equipment',
      firstId: source.dataset.person!,
      secondId,
      slot: source.dataset.slot as 'weapon' | 'gadget',
    });
  };
  page.addEventListener('click', (event) => {
    const slot = (event.target as Element).closest<HTMLButtonElement>(
      '.crew-equipment-slot',
    );
    if (!slot || suppressClick) return;
    if (selected && selected !== slot) {
      exchange(selected, slot);
      selected.classList.remove('selected');
      selected = null;
    } else {
      selected?.classList.remove('selected');
      selected =
        slot.dataset.filled === 'true' && selected !== slot ? slot : null;
      selected?.classList.add('selected');
    }
  });
  page.addEventListener('pointerdown', (event) => {
    const source = (event.target as Element).closest<HTMLButtonElement>(
      '.crew-equipment-slot',
    );
    if (!source || source.dataset.filled !== 'true' || event.button !== 0)
      return;
    gesture = {
      source,
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      ghost: null,
    };
    source.setPointerCapture(event.pointerId);
    timer = setInterval(() => {
      if (gesture?.ghost && direction) page.scrollTop += direction;
    }, 30);
  });
  page.addEventListener('pointermove', (event) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    if (
      !gesture.ghost &&
      Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) >= 8
    ) {
      gesture.ghost = gesture.source.cloneNode(true) as HTMLElement;
      gesture.ghost.classList.add('fleet-drag-ghost');
      document.body.append(gesture.ghost);
    }
    if (gesture.ghost) {
      gesture.ghost.style.left = `${event.clientX}px`;
      gesture.ghost.style.top = `${event.clientY}px`;
      const bounds = page.getBoundingClientRect();
      direction =
        event.clientY < bounds.top + 52
          ? -14
          : event.clientY > bounds.bottom - 52
            ? 14
            : 0;
    }
  });
  const finish = (event: PointerEvent, commit: boolean) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    if (gesture.ghost && commit) {
      const target =
        document
          .elementFromPoint(event.clientX, event.clientY)
          ?.closest<HTMLButtonElement>(
            '.crew-equipment-slot, .fleet-crew-slot',
          ) ?? null;
      exchange(gesture.source, target);
      suppressClick = true;
      setTimeout(() => {
        suppressClick = false;
      }, 0);
    }
    clearInterval(timer);
    direction = 0;
    gesture.ghost?.remove();
    gesture = null;
  };
  page.addEventListener('pointerup', (event) => finish(event, true));
  page.addEventListener('pointercancel', (event) => finish(event, false));
  page.addEventListener('lostpointercapture', (event) => finish(event, false));
}
