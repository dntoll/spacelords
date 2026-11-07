import {
  BOARDING_MELEE_AP,
  BOARDING_RIFLE_AP,
  type BoardingBattle,
  type BoardingCommand,
  type BoardingPerson,
} from './BoardingBattle.js';
import type { BoardingCell } from './BoardingMap.js';

const adjacent = (a: BoardingCell, b: BoardingCell): boolean =>
  Math.abs(a.q - b.q) + Math.abs(a.r - b.r) === 1;

const DIRECTIONS: readonly BoardingCell[] = [
  { q: 1, r: 0 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: 0, r: 1 },
];

function destinations(target: BoardingCell): readonly BoardingCell[] {
  return [
    target,
    ...DIRECTIONS.map((direction) => ({
      q: target.q + direction.q,
      r: target.r + direction.r,
    })),
  ];
}

/**
 * forsvarare-och-civilister: chooses only from the public battle snapshot,
 * shared sight, noise markers and known breach.
 */
export function chooseDefenderCommand(
  battle: BoardingBattle,
  actor: BoardingPerson,
): BoardingCommand {
  const state = battle.snapshot;
  const visible = battle.visibleOpponents('defender');
  const shootable = visible
    .map((target) => ({
      target,
      preview: battle.attackPreview(actor.id, target.id),
    }))
    .filter(({ preview }) => preview.reason === null)
    .sort(
      (a, b) =>
        b.preview.chance - a.preview.chance ||
        a.target.hitPoints - b.target.hitPoints,
    );
  if (
    actor.cockpit &&
    battle.canAbort() &&
    !state.people.some(
      (entry) =>
        entry.side === 'defender' &&
        entry.status === 'active' &&
        !entry.cockpit,
    )
  )
    return { type: 'abort' };
  const remaining = state.activation?.remaining ?? 0;
  if (remaining >= BOARDING_RIFLE_AP && shootable[0])
    return { type: 'shoot', targetId: shootable[0].target.id };
  const adjacentHostile = state.people.find(
    (entry) =>
      entry.side === 'player' &&
      entry.status === 'active' &&
      adjacent(actor.position, entry.position),
  );
  if (remaining >= BOARDING_MELEE_AP && adjacentHostile)
    return { type: 'melee', targetId: adjacentHostile.id };

  const heard = state.noiseMarkers.find(
    (marker) => marker.audience === 'defender',
  )?.position;
  const remembered = state.defenderLastKnownEnemies[0]?.position;
  const breach = state.features.find(
    (feature) => feature.exit === 'breach',
  )?.position;
  const target = visible[0]?.position ?? remembered ?? heard ?? breach;
  if (target) {
    const route = destinations(target)
      .map((destination) => ({
        destination,
        path: battle.pathTo(actor.id, destination),
      }))
      .filter(
        (
          candidate,
        ): candidate is {
          destination: BoardingCell;
          path: NonNullable<typeof candidate.path>;
        } =>
          !!candidate.path &&
          candidate.path.cost > 0 &&
          candidate.path.cost <= (state.activation?.remaining ?? 0),
      )
      .sort((a, b) => a.path.cost - b.path.cost)[0];
    if (route) return { type: 'move', to: route.destination };
  }
  if (remaining >= BOARDING_RIFLE_AP) return { type: 'overwatch' };
  return { type: 'end-activation' };
}
