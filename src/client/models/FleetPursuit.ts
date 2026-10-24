import type { ShipType, ShipUnit, TurnFrame } from './Game.js';
import type { CombatResult } from './FleetCombat.js';
import type { HexCoordinate } from './HexCoordinate.js';

export interface PursuingFleet {
  id: string;
  name: string;
  position: HexCoordinate | null;
  destination: HexCoordinate | null;
  courseOrigin?: HexCoordinate;
  joinFleetId?: string;
  ships: Record<ShipType, number>;
  shipUnits?: ShipUnit[];
}

/** skepp-till-rorlig-flotta: resolve simultaneous travel and physical meetings. */
export class FleetPursuit {
  static refresh(
    fleets: PursuingFleet[],
    cancelled: (fleet: PursuingFleet) => void,
  ): void {
    this.#validateOrders(fleets);
    for (const fleet of fleets) {
      if (!fleet.joinFleetId) continue;
      const target = fleets.find((target) => target.id === fleet.joinFleetId);
      if (!target?.position || !fleet.position) {
        delete fleet.joinFleetId;
        fleet.destination = null;
        delete fleet.courseOrigin;
        cancelled(fleet);
      } else {
        fleet.destination = target.position;
        fleet.courseOrigin = fleet.position;
      }
    }
  }

  static #validateOrders(fleets: readonly PursuingFleet[]): void {
    const byId = new Map(fleets.map((fleet) => [fleet.id, fleet]));
    const checked = new Set<string>();
    for (const fleet of fleets) {
      const chain = new Set<string>();
      let current: PursuingFleet | undefined = fleet;
      while (current?.joinFleetId && !checked.has(current.id)) {
        if (chain.has(current.id))
          throw new Error('Reinforcement orders cannot form a cycle.');
        chain.add(current.id);
        current = byId.get(current.joinFleetId);
      }
      for (const id of chain) checked.add(id);
    }
  }

  static merge(
    fleets: PursuingFleet[],
    merged: (group: PursuingFleet, target: PursuingFleet) => void,
  ): void {
    let joined: boolean;
    do {
      joined = false;
      for (const group of [...fleets].sort((a, b) =>
        a.id.localeCompare(b.id),
      )) {
        if (!group.joinFleetId) continue;
        const target = fleets.find((fleet) => fleet.id === group.joinFleetId);
        if (!target?.position || target.position.key !== group.position?.key)
          continue;
        for (const ship of Object.keys(group.ships) as ShipType[])
          target.ships[ship] += group.ships[ship];
        if (group.shipUnits) (target.shipUnits ??= []).push(...group.shipUnits);
        for (const follower of fleets)
          if (follower.joinFleetId === group.id)
            follower.joinFleetId = target.id;
        fleets.splice(fleets.indexOf(group), 1);
        merged(group, target);
        joined = true;
      }
    } while (joined);
  }

  static plan(
    fleets: readonly PursuingFleet[],
    path: (fleet: PursuingFleet) => readonly HexCoordinate[],
    speed: (fleet: PursuingFleet) => number,
    encounter: (fleets: PursuingFleet[]) => readonly CombatResult[] = () => [],
  ): readonly TurnFrame[] {
    const forecast = fleets.map((fleet) => ({
      ...fleet,
      ships: { ...fleet.ships },
      ...(fleet.shipUnits ? { shipUnits: [...fleet.shipUnits] } : {}),
    }));
    const remaining = new Map(
      forecast.map((fleet) => [fleet.id, speed(fleet)]),
    );
    const paths = new Map(
      forecast
        .filter((fleet) => !fleet.joinFleetId)
        .map((fleet) => [fleet.id, [...path(fleet)]]),
    );
    const frames: TurnFrame[] = [];
    const steps = Math.max(0, ...remaining.values());
    for (let step = 0; step < steps; step++) {
      const next = new Map<string, HexCoordinate | null>();
      const visiting = new Set<string>();
      const positionAfterStep = (
        fleet: PursuingFleet,
      ): HexCoordinate | null => {
        if (next.has(fleet.id)) return next.get(fleet.id)!;
        if (visiting.has(fleet.id))
          throw new Error('Reinforcement orders cannot form a cycle.');
        visiting.add(fleet.id);
        let position = fleet.position;
        if ((remaining.get(fleet.id) ?? 0) > 0 && position) {
          if (fleet.joinFleetId) {
            const target = forecast.find(
              (target) => target.id === fleet.joinFleetId,
            );
            const destination = target ? positionAfterStep(target) : null;
            if (destination && destination.key !== position.key)
              position =
                path({ ...fleet, destination, courseOrigin: position })[0] ??
                position;
          } else position = paths.get(fleet.id)?.shift() ?? position;
        }
        visiting.delete(fleet.id);
        next.set(fleet.id, position);
        return position;
      };
      for (const fleet of forecast) positionAfterStep(fleet);
      const movements: TurnFrame['movements'][number][] = [];
      for (const fleet of forecast) {
        const to = next.get(fleet.id);
        if (!to || to.key === fleet.position?.key) continue;
        movements.push(
          Object.freeze({ fleetId: fleet.id, from: fleet.position!, to }),
        );
        fleet.position = to;
        remaining.set(fleet.id, remaining.get(fleet.id)! - 1);
      }
      const combats = encounter(forecast);
      this.merge(forecast, (group, target) => {
        // A merge must not grant either group extra movement this year.
        remaining.set(
          target.id,
          Math.min(remaining.get(target.id)!, remaining.get(group.id)!),
        );
      });
      if (movements.length || combats.length)
        frames.push(
          Object.freeze({ movements: Object.freeze(movements), combats }),
        );
    }
    return Object.freeze(frames);
  }
}
