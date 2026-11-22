import type { ShipType, ShipUnit, TurnFrame } from './Game.js';
import type { CombatResult } from './FleetCombat.js';
import type { HexCoordinate } from '../../common/HexCoordinate.js';

export interface PursuingFleet {
  id: string;
  name: string;
  position: HexCoordinate | null;
  destination: HexCoordinate | null;
  courseOrigin?: HexCoordinate;
  ships: Record<ShipType, number>;
  shipUnits?: ShipUnit[];
}

/** Plans simultaneous travel one step at a time. */
export class FleetPursuit {
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
      forecast.map((fleet) => [fleet.id, [...path(fleet)]]),
    );
    const frames: TurnFrame[] = [];
    const steps = Math.max(0, ...remaining.values());
    for (let step = 0; step < steps; step++) {
      const movements: TurnFrame['movements'][number][] = [];
      for (const fleet of forecast) {
        if ((remaining.get(fleet.id) ?? 0) <= 0 || !fleet.position) continue;
        const to = paths.get(fleet.id)?.shift();
        if (!to || to.key === fleet.position.key) continue;
        movements.push(
          Object.freeze({ fleetId: fleet.id, from: fleet.position, to }),
        );
        fleet.position = to;
        remaining.set(fleet.id, remaining.get(fleet.id)! - 1);
      }
      const combats = encounter(forecast);
      if (movements.length || combats.length)
        frames.push(
          Object.freeze({ movements: Object.freeze(movements), combats }),
        );
    }
    return Object.freeze(frames);
  }
}
