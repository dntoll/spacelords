import type { AppReadModel } from '../models/AppModel.js';
import type { ShipType } from '../models/Game.js';
import type { IntentHandler } from './ViewContracts.js';

interface Transfer {
  source: string;
  ship: ShipType;
}

export function bindShipTransfers(
  page: HTMLElement,
  model: AppReadModel,
  emit: IntentHandler,
): void {
  let gesture: {
    id: number;
    x: number;
    y: number;
    source: Transfer;
    dragged: boolean;
    ghost: HTMLElement | null;
    token: HTMLElement;
  } | null = null;
  let suppressClick = false;
  const valid = (
    source: Transfer,
    target: string | undefined,
  ): target is string => {
    const from = model.fleets.find((fleet) => fleet.id === source.source);
    const to = model.fleets.find((fleet) => fleet.id === target);
    return (
      model.phase === 'planning' &&
      !!from &&
      !!to &&
      from.id !== to.id &&
      from.ships[source.ship] > 0 &&
      (!to.position || from.position?.key === to.position.key)
    );
  };
  const clearHighlights = () =>
    page
      .querySelectorAll('.drop-target')
      .forEach((node) => node.classList.remove('drop-target'));
  const clearGesture = () => {
    gesture?.ghost?.remove();
    gesture = null;
    clearHighlights();
  };
  const transfer = (source: Transfer, target: string | undefined) => {
    if (valid(source, target))
      emit({ type: 'transfer-ships', ...source, target, amount: 1 });
  };
  for (const token of page.querySelectorAll<HTMLElement>('.ship-token')) {
    const ship = token.dataset.ship as ShipType;
    const source: Transfer = { source: token.dataset.fleetId!, ship };
    token.addEventListener('pointerdown', (event) => {
      if (
        (event.pointerType === 'mouse' && event.button !== 0) ||
        model.phase !== 'planning'
      )
        return;
      if (gesture) {
        clearGesture();
        return;
      }
      gesture = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        source,
        dragged: false,
        ghost: null,
        token,
      };
      token.setPointerCapture(event.pointerId);
    });
  }
  page.addEventListener('pointermove', (event) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    if (
      !gesture.dragged &&
      Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 8
    ) {
      gesture.dragged = true;
      const token = [...page.querySelectorAll<HTMLElement>('.ship-token')].find(
        (node) =>
          node.dataset.ship === gesture!.source.ship &&
          node.dataset.fleetId === gesture!.source.source,
      );
      gesture.ghost = token
        ?.querySelector('img')
        ?.cloneNode(true) as HTMLElement | null;
      if (gesture.ghost) {
        gesture.ghost.className = 'ship-drag-ghost';
        gesture.ghost.setAttribute('aria-hidden', 'true');
        page.append(gesture.ghost);
      }
    }
    if (!gesture.dragged) return;
    event.preventDefault();
    if (gesture.ghost) {
      gesture.ghost.style.left = `${event.clientX}px`;
      gesture.ghost.style.top = `${event.clientY}px`;
    }
    clearHighlights();
    const zone = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('.fleet-hangar');
    if (zone && valid(gesture.source, zone.dataset.fleetId))
      zone.classList.add('drop-target');
  });
  page.addEventListener('pointerup', (event) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const completed = gesture;
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('.fleet-hangar')?.dataset.fleetId;
    suppressClick = completed.dragged;
    clearGesture();
    if (completed.token.hasPointerCapture(event.pointerId))
      completed.token.releasePointerCapture(event.pointerId);
    if (completed.dragged) transfer(completed.source, target);
  });
  page.addEventListener('pointercancel', clearGesture);
  page.addEventListener('lostpointercapture', clearGesture);
  page.addEventListener(
    'click',
    (event) => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    },
    true,
  );
  page.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') clearGesture();
  });
}
