import type {
  BoardingBattle,
  BoardingCommand,
  BoardingPerson,
} from './BoardingBattle.js';
import type { BoardingHex } from './BoardingMap.js';

const DIRECTIONS: readonly BoardingHex[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

function destinations(target: BoardingHex): readonly BoardingHex[] {
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
  if ((state.activation?.remaining ?? 0) >= 4 && shootable[0])
    return { type: 'shoot', targetId: shootable[0].target.id };

  const heard = state.noiseMarkers.find(
    (marker) => marker.audience === 'defender',
  )?.position;
  const breach = state.features.find(
    (feature) => feature.exit === 'breach',
  )?.position;
  const target = visible[0]?.position ?? heard ?? breach;
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
          destination: BoardingHex;
          path: NonNullable<typeof candidate.path>;
        } =>
          !!candidate.path &&
          candidate.path.cost > 0 &&
          candidate.path.cost <= (state.activation?.remaining ?? 0),
      )
      .sort((a, b) => a.path.cost - b.path.cost)[0];
    if (route) return { type: 'move', to: route.destination };
  }
  if ((state.activation?.remaining ?? 0) >= 4) return { type: 'overwatch' };
  return { type: 'end-activation' };
}
