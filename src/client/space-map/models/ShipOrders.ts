import type { ShipType } from './Game.js';
import { armedShipCount } from './ShipEquipment.js';

export type ShipOrder =
  | { readonly kind: 'join-fleet'; readonly fleetId: string }
  | {
      readonly kind: 'patrol';
      readonly position: { readonly q: number; readonly r: number };
    }
  | { readonly kind: 'explore-planet'; readonly planetId: string }
  | { readonly kind: 'explore' | 'explore-stars' };
export type OrderKind = ShipOrder['kind'];
export interface OrderOption {
  readonly kind: OrderKind;
  readonly label: string;
  readonly description: string;
  readonly blockedReason: string | null;
}

/** egen-ordervy: shared names and capabilities. */
export class ShipOrders {
  static options(
    ships: Readonly<Partial<Record<ShipType, number>>>,
  ): readonly OrderOption[] {
    const options: OrderOption[] = [];
    const add = (kind: OrderKind, label: string, description: string) =>
      options.push(
        Object.freeze({ kind, label, description, blockedReason: null }),
      );
    add(
      'join-fleet',
      'Join fleet',
      'Choose a fleet on the map. Travel to it and join when you meet.',
    );
    if (ships['Exploration ship']) {
      add(
        'explore-planet',
        'Explore planet',
        'Choose a discovered planet whose details are still unknown.',
      );
      add('explore', 'Explore', 'Explore unknown hexes automatically.');
      add(
        'explore-stars',
        'Explore stars',
        'Survey star systems automatically.',
      );
    }
    if (armedShipCount(ships))
      add(
        'patrol',
        'Patrol',
        'Choose a position on the map, then patrol around it.',
      );
    return Object.freeze(options);
  }

  static label(order: ShipOrder): string {
    return {
      'join-fleet': 'Join fleet',
      patrol: 'Patrol',
      'explore-planet': 'Explore planet',
      explore: 'Explore',
      'explore-stars': 'Explore stars',
    }[order.kind];
  }

  static validate(order: ShipOrder): void {
    if (!order || typeof order !== 'object')
      throw new Error('Invalid saved ship order.');
    if (order.kind === 'join-fleet' || order.kind === 'explore-planet') {
      const id = order.kind === 'join-fleet' ? order.fleetId : order.planetId;
      if (typeof id !== 'string' || !id)
        throw new Error('Invalid saved ship order.');
    } else if (order.kind === 'patrol') {
      if (
        !Number.isSafeInteger(order.position?.q) ||
        !Number.isSafeInteger(order.position?.r)
      )
        throw new Error('Invalid saved ship order.');
    } else if (!['explore', 'explore-stars'].includes(order.kind))
      throw new Error('Invalid saved ship order.');
  }
}
