import type { ShipType } from './Game.js';
import type { PursuingFleet } from './FleetPursuit.js';
import type { HexCoordinate } from './HexCoordinate.js';

export interface CombatResult {
  readonly fleetId: string;
  readonly pirateId: string;
  readonly position: HexCoordinate;
  readonly losses: Readonly<Record<ShipType, number>>;
  readonly pirateLosses: number;
  readonly survivingPirates: number;
  readonly survivingFighters: number;
}

/** flottstrid-per-hex: separate fleets fight in stable order after simultaneous movement. */
export class FleetCombat {
  static resolve(
    fleets: PursuingFleet[],
    pirateIds: ReadonlySet<string>,
  ): readonly CombatResult[] {
    const results: CombatResult[] = [];
    const ordered = [...fleets].sort((a, b) => a.id.localeCompare(b.id));
    for (const fleet of ordered.filter((fleet) => !pirateIds.has(fleet.id))) {
      for (const pirate of ordered.filter((fleet) => pirateIds.has(fleet.id))) {
        if (
          !fleet.position ||
          !pirate.position ||
          fleet.position.key !== pirate.position.key
        )
          continue;
        const fighters = fleet.ships.Fighter;
        const pirates = pirate.ships.Fighter;
        const pirateLosses = Math.min(pirates, 2 * fighters);
        const survivingPirates = pirates - pirateLosses;
        const losses = {
          Fighter: Math.min(fighters, Math.floor(pirates / 2)),
          'Colony ship': survivingPirates ? fleet.ships['Colony ship'] : 0,
          'Exploration ship': survivingPirates
            ? fleet.ships['Exploration ship']
            : 0,
          'Transport ship': survivingPirates
            ? fleet.ships['Transport ship']
            : 0,
        };
        const result = Object.freeze({
          fleetId: fleet.id,
          pirateId: pirate.id,
          position: fleet.position,
          losses: Object.freeze(losses),
          pirateLosses,
          survivingPirates,
          survivingFighters: fighters - losses.Fighter,
        });
        this.applyLosses(fleet, result.losses);
        this.applyLosses(pirate, {
          Fighter: pirateLosses,
          'Colony ship': 0,
          'Exploration ship': 0,
          'Transport ship': 0,
        });
        results.push(result);
      }
    }
    return Object.freeze(results);
  }

  static applyLosses(
    fleet: PursuingFleet,
    losses: Readonly<Record<ShipType, number>>,
  ): void {
    for (const type of Object.keys(losses) as ShipType[]) {
      fleet.ships[type] -= losses[type];
      const killed = new Set(
        fleet.shipUnits
          ?.filter((unit) => unit.type === type)
          .sort((a, b) => a.id.localeCompare(b.id))
          .slice(0, losses[type])
          .map((unit) => unit.id),
      );
      if (fleet.shipUnits)
        fleet.shipUnits = fleet.shipUnits.filter(
          (unit) => !killed.has(unit.id),
        );
    }
    if (Object.values(fleet.ships).every((count) => count === 0)) {
      fleet.position = null;
      fleet.destination = null;
      delete fleet.courseOrigin;
      delete fleet.joinFleetId;
    }
  }
}
