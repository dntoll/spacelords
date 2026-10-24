import { shipTransferIssue } from '../models/FleetTransfer.js';
import type { AppReadModel } from '../models/AppModel.js';
import type { ShipType } from '../models/Game.js';
import type { IntentHandler } from './ViewContracts.js';

interface Transfer {
  source: string;
  ship: ShipType;
  shipId?: string | undefined;
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
    target: string | null | undefined,
  ): target is string | null => {
    const from = model.fleets.find((fleet) => fleet.id === source.source);
    const to = model.fleets.find((fleet) => fleet.id === target);
    return (
      model.phase === 'planning' &&
      !!from &&
      (target === null || !!to) &&
      !shipTransferIssue(from) &&
      from.id !== to?.id &&
      from.ships[source.ship] > 0
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
  const transfer = (source: Transfer, target: string | null | undefined) => {
    if (valid(source, target))
      emit({ type: 'transfer-ships', ...source, target, amount: 1 });
  };
  const targetAt = (x: number, y: number) => {
    const zone = document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>('.fleet-hangar');
    return {
      zone,
      target: zone?.hasAttribute('data-new-fleet')
        ? null
        : zone?.dataset.fleetId,
    };
  };
  page.addEventListener('pointerdown', (event) => {
    if (gesture && gesture.id !== event.pointerId) clearGesture();
  });
  for (const token of page.querySelectorAll<HTMLElement>('.ship-token')) {
    const ship = token.dataset.ship as ShipType;
    const source: Transfer = {
      source: token.dataset.fleetId!,
      ship,
      shipId: token.dataset.shipId,
    };
    token.addEventListener('pointerdown', (event) => {
      const fleet = model.fleets.find((fleet) => fleet.id === source.source);
      if (
        (event.pointerType === 'mouse' && event.button !== 0) ||
        model.phase !== 'planning' ||
        !fleet ||
        shipTransferIssue(fleet)
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
    const { zone, target } = targetAt(event.clientX, event.clientY);
    if (zone && valid(gesture.source, target))
      zone.classList.add('drop-target');
  });
  page.addEventListener('pointerup', (event) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const completed = gesture;
    const { target } = targetAt(event.clientX, event.clientY);
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
