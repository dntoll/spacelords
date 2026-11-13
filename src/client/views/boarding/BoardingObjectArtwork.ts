import { BOARDING_SPRITE_METRICS } from './BoardingSpriteMetrics.js';
import { BOARDING_SPRITE_SQUASH } from './BoardingScale.js';
import type {
  BoardingCell,
  BoardingFeatureKind,
} from '../../models/boarding/BoardingMap.js';
import airlockUrl from '../../assets/boarding/airlock.webp';
import reactorUrl from '../../assets/boarding/reactor.webp';
import crateUrl from '../../assets/boarding/crate.webp';

// dorrar-som-tunna-vaggar: doors are thin walls with a door face, not sprites.
export type BoardingArtwork = 'airlock' | 'reactor' | 'crate';
/** Artwork still drawn for the 2:1 camera and compressed to 60 degrees. */
const LEGACY_2TO1_ARTWORK: ReadonlySet<BoardingArtwork> = new Set(['airlock']);

export const BOARDING_OBJECT_IMAGES: Readonly<Record<BoardingArtwork, string>> =
  {
    airlock: airlockUrl,
    reactor: reactorUrl,
    crate: crateUrl,
  };

export function boardingObjectArtwork(feature: {
  readonly kind: BoardingFeatureKind;
  readonly position: BoardingCell;
  readonly open?: boolean;
  readonly destroyed?: boolean;
}): BoardingArtwork | null {
  if (feature.destroyed) return null;
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
