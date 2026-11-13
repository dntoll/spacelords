import { BOARDING_SPRITE_METRICS } from './BoardingSpriteMetrics.js';
import { BOARDING_SPRITE_SQUASH } from './BoardingScale.js';
import type {
  BoardingCell,
  BoardingFeatureKind,
} from '../../models/boarding/BoardingMap.js';
import airlockUrl from '../../assets/boarding/airlock.webp';
import reactorUrl from '../../assets/boarding/reactor.webp';
import crateUrl from '../../assets/boarding/crate.webp';
import doorClosedQUrl from '../../assets/boarding/door-closed-q.webp';
import doorOpenQUrl from '../../assets/boarding/door-open-q.webp';
import doorClosedRUrl from '../../assets/boarding/door-closed-r.webp';
import doorOpenRUrl from '../../assets/boarding/door-open-r.webp';

export type BoardingArtwork =
  | 'airlock'
  | 'reactor'
  | 'crate'
  | 'door-closed-q'
  | 'door-open-q'
  | 'door-closed-r'
  | 'door-open-r';
/** Artwork still drawn for the 2:1 camera and compressed to 60 degrees. */
const LEGACY_2TO1_ARTWORK: ReadonlySet<BoardingArtwork> = new Set([
  'airlock',
  'door-closed-q',
  'door-open-q',
  'door-closed-r',
  'door-open-r',
]);
type WallAt = (q: number, r: number) => boolean;

export const BOARDING_OBJECT_IMAGES: Readonly<Record<BoardingArtwork, string>> =
  {
    airlock: airlockUrl,
    reactor: reactorUrl,
    crate: crateUrl,
    'door-closed-q': doorClosedQUrl,
    'door-open-q': doorOpenQUrl,
    'door-closed-r': doorClosedRUrl,
    'door-open-r': doorOpenRUrl,
  };

/** isometriska-bordningsobjekt: infer orientation from the original terrain, including destroyed walls. */
export function boardingDoorAxis(
  position: BoardingCell,
  wallAt: WallAt,
): 'q' | 'r' {
  const q =
    Number(wallAt(position.q - 1, position.r)) +
    Number(wallAt(position.q + 1, position.r));
  const r =
    Number(wallAt(position.q, position.r - 1)) +
    Number(wallAt(position.q, position.r + 1));
  return r > q ? 'r' : 'q';
}

export function boardingObjectArtwork(
  feature: {
    readonly kind: BoardingFeatureKind;
    readonly position: BoardingCell;
    readonly open?: boolean;
    readonly destroyed?: boolean;
  },
  wallAt: WallAt,
): BoardingArtwork | null {
  if (feature.destroyed) return null;
  if (feature.kind === 'door')
    return `door-${feature.open ? 'open' : 'closed'}-${boardingDoorAxis(feature.position, wallAt)}`;
  if (feature.kind === 'reactor') return 'reactor';
  // kameravinkel-60-i-bordning: a crate replaces the earlier Half cover artwork.
  if (feature.kind === 'cover') return 'crate';
  return null;
}

export function boardingObjectBounds(
  kind: BoardingArtwork,
  center: { readonly x: number; readonly y: number },
): { x: number; y: number; width: number; height: number } {
  const metric = BOARDING_SPRITE_METRICS[kind];
  const squash = LEGACY_2TO1_ARTWORK.has(kind) ? BOARDING_SPRITE_SQUASH : 1;
  return {
    x: center.x - metric.anchorX,
    y: center.y - metric.anchorY * squash,
    width: metric.width,
    height: metric.height * squash,
  };
}
