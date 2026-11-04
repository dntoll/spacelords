import { BOARDING_SPRITE_METRICS } from './BoardingSpriteMetrics.js';
import type {
  BoardingCell,
  BoardingFeatureKind,
} from '../models/BoardingMap.js';

export type BoardingArtwork =
  | 'airlock'
  | 'reactor'
  | 'half-cover'
  | 'door-closed-q'
  | 'door-open-q'
  | 'door-closed-r'
  | 'door-open-r';
type WallAt = (q: number, r: number) => boolean;

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
  if (feature.kind === 'cover') return 'half-cover';
  return null;
}

export function boardingObjectBounds(
  kind: BoardingArtwork,
  center: { readonly x: number; readonly y: number },
): { x: number; y: number; width: number; height: number } {
  const metric = BOARDING_SPRITE_METRICS[kind];
  return {
    x: center.x - metric.anchorX,
    y: center.y - metric.anchorY,
    width: metric.width,
    height: metric.height,
  };
}
