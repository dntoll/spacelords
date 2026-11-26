import type { GameState } from '../../src/client/space-map/models/Game.js';
import type { CrewPerson } from '../../src/client/space-map/models/Crew.js';

/** Supplies trained people when a scenario replaces the standard starting ships. */
export function staffFleet<T extends GameState>(state: T): T {
  const fleet = state.fleets[0]!;
  const shipIds = fleet.shipUnits?.length
    ? fleet.shipUnits.map((ship) => ship.id)
    : Object.entries(fleet.ships).flatMap(([type, count]) =>
        Array.from(
          { length: count ?? 0 },
          (_, index) => `${fleet.id}-legacy-${type}-${index}`,
        ),
      );
  const people: CrewPerson[] = shipIds.flatMap((shipId) =>
    Array.from(
      { length: 4 },
      (_, index) =>
        ({
          id: `${shipId}-crew-${index}`,
          name: `Crew ${index + 1}`,
          shipId,
          roles:
            index === 0
              ? ['pilot', 'engineer', 'gunner', 'boarder']
              : ['boarder'],
          attributes: {
            maxHitPoints: 10,
            agility: 12,
            accuracy: 4,
            defense: 11,
          },
          hitPoints: 10,
          status: 'active',
          weapon: 'rifle',
          gadget: { type: 'frag-grenade', uses: 3 },
        }) satisfies CrewPerson,
    ),
  );
  return { ...state, crew: people };
}
