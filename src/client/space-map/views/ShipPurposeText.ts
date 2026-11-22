import type { ShipPurpose } from '../models/Game.js';
import { ShipOrders, type ShipOrder } from '../models/ShipOrders.js';

/** byggorsak-i-kon: the sentence for why a queued ship is built. */
export function shipPurposeText(purpose: ShipPurpose): string {
  switch (purpose.kind) {
    case 'link':
      return `For the link ${purpose.from} ↔ ${purpose.to}`;
    case 'colonize':
      return `To colonize ${purpose.planet}`;
    case 'explore':
      return `To explore ${purpose.planet}`;
    case 'fleet':
      return `Joins ${purpose.fleet}`;
    case 'order':
      return ShipOrders.label({ kind: purpose.order } as ShipOrder);
    case 'home-fleet':
      return 'Joins the planet home fleet';
  }
}
