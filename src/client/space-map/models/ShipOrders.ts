import type { ShipType, Technology } from './Game.js';
import { armedShipCount } from './ShipEquipment.js';

export type ShipOrder =
  | { readonly kind: 'join-fleet'; readonly fleetId: string }
  | {
      readonly kind: 'patrol';
      readonly position: { readonly q: number; readonly r: number };
    }
  | { readonly kind: 'salvage'; readonly wreckId: string }
  | { readonly kind: 'colonize'; readonly planetId: string }
  | { readonly kind: 'explore-planet'; readonly planetId: string }
  | {
      readonly kind: 'auto-salvage' | 'explore' | 'explore-stars';
    };
export type OrderKind = ShipOrder['kind'] | 'upgrade' | 'return-shipyard';
export interface OrderOption {
  readonly kind: OrderKind;
  readonly label: string;
  readonly description: string;
  readonly blockedReason: string | null;
}
/** egen-ordervy / startorder-for-nybyggda-skepp: shared names and capabilities. */
export class ShipOrders {
  static options(
    ships: Readonly<Partial<Record<ShipType, number>>>,
    researched: readonly Technology[],
    upgradeable = false,
    towing = false,
  ): readonly OrderOption[] {
    const options: OrderOption[] = [];
    const add = (
      kind: OrderKind,
      label: string,
      description: string,
      technology?: Technology,
    ) =>
      options.push(
        Object.freeze({
          kind,
          label,
          description,
          blockedReason:
            technology && !researched.includes(technology)
              ? `Research ${technology} first.`
              : null,
        }),
      );
    add(
      'join-fleet',
      'Join fleet',
      'Choose a fleet on the map. Travel to it and join when you meet.',
    );
    if (ships['Salvage ship']) {
      add(
        'auto-salvage',
        'Auto salvage',
        'Find wrecks and bring them to a shipyard automatically.',
        'Automated salvage',
      );
      add(
        'salvage',
        'Deliberate salvage',
        'Choose a specific wreck on the map.',
      );
    }
    if (towing)
      add(
        'return-shipyard',
        'Return to shipyard',
        'Bring towed wrecks to the nearest working shipyard.',
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
    if (armedShipCount(ships)) {
      add(
        'patrol',
        'Patrol',
        'Choose a position on the map, then patrol around it.',
      );
    }
    if (ships['Colony ship'])
      add('colonize', 'Colonize', 'Choose an uninhabited planet on the map.');
    if (upgradeable)
      add(
        'upgrade',
        'Upgrade',
        'Travel to a suitable shipyard for better researched equipment.',
      );
    return Object.freeze(options);
  }

  static defaultAssignment(ship: string): string {
    if (ship === 'Civilian shuttle') return 'Civilian transport';
    return 'Planet home fleet';
  }

  static label(order: ShipOrder): string {
    return {
      'join-fleet': 'Join fleet',
      patrol: 'Patrol',
      salvage: 'Deliberate salvage',
      colonize: 'Colonize',
      'explore-planet': 'Explore planet',
      'auto-salvage': 'Auto salvage',
      explore: 'Explore',
      'explore-stars': 'Explore stars',
    }[order.kind];
  }

  static validate(order: ShipOrder): void {
    if (!order || typeof order !== 'object')
      throw new Error('Invalid saved ship order.');
    const id =
      order.kind === 'join-fleet'
        ? order.fleetId
        : order.kind === 'salvage'
          ? order.wreckId
          : order.kind === 'colonize' || order.kind === 'explore-planet'
            ? order.planetId
            : null;
    if (
      ['join-fleet', 'salvage', 'colonize', 'explore-planet'].includes(
        order.kind,
      )
    ) {
      if (typeof id !== 'string' || !id)
        throw new Error('Invalid saved ship order.');
    } else if (order.kind === 'patrol') {
      if (
        !Number.isSafeInteger(order.position?.q) ||
        !Number.isSafeInteger(order.position?.r)
      )
        throw new Error('Invalid saved ship order.');
    } else if (
      !['auto-salvage', 'explore', 'explore-stars'].includes(order.kind)
    )
      throw new Error('Invalid saved ship order.');
  }
}
