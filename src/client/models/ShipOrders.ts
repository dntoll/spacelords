import type { FleetSnapshot, ShipType, Technology } from './Game.js';
import type { TradeRouteSnapshot } from './Logistics.js';
import type { HexCoordinate } from './HexCoordinate.js';

export type ShipOrder =
  | { readonly kind: 'join-route'; readonly routeId: string }
  | { readonly kind: 'join-fleet'; readonly fleetId: string }
  | {
      readonly kind: 'patrol';
      readonly position: { readonly q: number; readonly r: number };
    }
  | { readonly kind: 'salvage'; readonly wreckId: string }
  | { readonly kind: 'colonize'; readonly planetId: string }
  | {
      readonly kind:
        | 'auto-salvage'
        | 'auto-transport'
        | 'civilian-transport'
        | 'explore'
        | 'explore-stars';
    };
export type OrderKind = ShipOrder['kind'] | 'upgrade' | 'return-shipyard';
export interface OrderOption {
  readonly kind: OrderKind;
  readonly label: string;
  readonly description: string;
  readonly blockedReason: string | null;
}
export interface RouteOrderChoice {
  readonly route: TradeRouteSnapshot;
  readonly distance: number;
  readonly matchingShips: number;
  readonly ships: Readonly<Partial<Record<ShipType, number>>>;
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
    if (ships['Transport ship'] || ships.Fighter)
      add(
        'join-route',
        'Join route',
        'Choose a trade route. Existing transports and escorts are shown.',
      );
    if (ships['Transport ship'])
      add(
        'auto-transport',
        'Auto assign route',
        'Find the nearest trade route that needs transport.',
        'Automated transport',
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
        'explore',
        'Explore',
        'Explore unknown hexes automatically.',
        'Automated exploration',
      );
      add(
        'explore-stars',
        'Explore stars',
        'Survey star systems automatically.',
        'Automated exploration',
      );
    }
    if (ships.Fighter)
      add(
        'patrol',
        'Patrol',
        'Choose a position on the map, then patrol around it.',
        'Fleet patrol',
      );
    if (ships['Colony ship'])
      add('colonize', 'Colonize', 'Choose an uninhabited planet on the map.');
    if (ships['Civilian shuttle'])
      add(
        'civilian-transport',
        'Civilian transport',
        'Carry people to available jobs through trade routes.',
        'Civilian transport',
      );
    if (upgradeable)
      add(
        'upgrade',
        'Upgrade',
        'Travel to a suitable shipyard for better researched equipment.',
      );
    return Object.freeze(options);
  }

  static routes(
    type: ShipType,
    origin: HexCoordinate,
    routes: readonly TradeRouteSnapshot[],
    fleets: readonly FleetSnapshot[],
    distance: (route: TradeRouteSnapshot, origin: HexCoordinate) => number,
  ): readonly RouteOrderChoice[] {
    return Object.freeze(
      routes
        .filter((route) => !route.closing)
        .map((route) => {
          const ships: Partial<Record<ShipType, number>> = {};
          for (const fleet of fleets.filter(
            (fleet) => fleet.routeId === route.id && !fleet.releaseRequested,
          ))
            for (const [ship, count] of Object.entries(fleet.ships))
              ships[ship as ShipType] = (ships[ship as ShipType] ?? 0) + count;
          return Object.freeze({
            route,
            distance: distance(route, origin),
            matchingShips: ships[type] ?? 0,
            ships: Object.freeze(ships),
          });
        })
        .sort(
          (a, b) =>
            Number(a.matchingShips > 0) - Number(b.matchingShips > 0) ||
            a.distance - b.distance ||
            a.route.id.localeCompare(b.route.id),
        ),
    );
  }

  static label(order: ShipOrder): string {
    return {
      'join-route': 'Join route',
      'join-fleet': 'Join fleet',
      patrol: 'Patrol',
      salvage: 'Deliberate salvage',
      colonize: 'Colonize',
      'auto-salvage': 'Auto salvage',
      'auto-transport': 'Auto assign route',
      'civilian-transport': 'Civilian transport',
      explore: 'Explore',
      'explore-stars': 'Explore stars',
    }[order.kind];
  }

  static validate(order: ShipOrder): void {
    if (!order || typeof order !== 'object')
      throw new Error('Invalid saved ship order.');
    const id =
      order.kind === 'join-route'
        ? order.routeId
        : order.kind === 'join-fleet'
          ? order.fleetId
          : order.kind === 'salvage'
            ? order.wreckId
            : order.kind === 'colonize'
              ? order.planetId
              : null;
    if (
      ['join-route', 'join-fleet', 'salvage', 'colonize'].includes(order.kind)
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
      ![
        'auto-salvage',
        'auto-transport',
        'civilian-transport',
        'explore',
        'explore-stars',
      ].includes(order.kind)
    )
      throw new Error('Invalid saved ship order.');
  }
}
