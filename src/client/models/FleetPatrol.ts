import { HexCoordinate } from './HexCoordinate.js';

export interface PatrolOrder {
  readonly center: { readonly q: number; readonly r: number };
  nextIndex: number;
  targetPirateId?: string;
}

export interface PatrolContact {
  readonly id: string;
  readonly position: HexCoordinate;
}

/** flottpatrullering: patrol a fixed ring and pursue only currently visible contacts. */
export class FleetPatrol {
  static destination(
    order: PatrolOrder,
    position: HexCoordinate,
    range: number,
    contacts: readonly PatrolContact[],
    contains: (position: HexCoordinate) => boolean,
  ): HexCoordinate | null {
    const eligible = contacts
      .filter((contact) => position.distanceTo(contact.position) <= range)
      .sort(
        (a, b) =>
          position.distanceTo(a.position) - position.distanceTo(b.position) ||
          a.id.localeCompare(b.id),
      );
    const target =
      eligible.find((contact) => contact.id === order.targetPirateId) ??
      eligible[0];
    if (target) {
      order.targetPirateId = target.id;
      return target.position;
    }
    const ring = new HexCoordinate(order.center.q, order.center.r).neighbors();
    const available = ring
      .map((point, index) => ({ point, index }))
      .filter(({ point }) => contains(point));
    if (order.targetPirateId) {
      delete order.targetPirateId;
      const nearest = [...available].sort(
        (a, b) =>
          position.distanceTo(a.point) - position.distanceTo(b.point) ||
          a.index - b.index,
      )[0];
      if (nearest) order.nextIndex = nearest.index;
    }
    for (let offset = 0; offset < ring.length; offset++) {
      const index = (order.nextIndex + offset) % ring.length;
      const next = ring[index]!;
      if (!contains(next) || next.key === position.key) continue;
      order.nextIndex = index;
      return next;
    }
    return null;
  }

  static validate(
    order: PatrolOrder,
    contains: (position: HexCoordinate) => boolean,
  ): void {
    if (
      !order ||
      !Number.isInteger(order.center?.q) ||
      !Number.isInteger(order.center?.r) ||
      !Number.isInteger(order.nextIndex) ||
      order.nextIndex < 0 ||
      order.nextIndex > 5 ||
      !contains(new HexCoordinate(order.center.q, order.center.r)) ||
      (order.targetPirateId !== undefined &&
        (typeof order.targetPirateId !== 'string' || !order.targetPirateId))
    )
      throw new Error('Invalid saved Patrol order.');
  }
}
