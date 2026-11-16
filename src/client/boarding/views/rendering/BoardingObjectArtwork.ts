import { BOARDING_SPRITE_METRICS } from './BoardingSpriteMetrics.js';
import type {
  BoardingCell,
  BoardingFeatureKind,
} from '../../models/map/BoardingMap.js';
import airlockUrl from '../../assets/airlock.webp';
import reactorUrl from '../../assets/reactor.webp';
import breachUrl from '../../assets/breach.webp';
import escapePodUrl from '../../assets/escape-pod.webp';
import escapeHatchUrl from '../../assets/escape-hatch.webp';

// dorrar-som-tunna-vaggar and halvskydd-som-geometri: doors and Half cover
// are textured geometry, not sprites.
export type BoardingArtwork =
  'airlock' | 'reactor' | 'breach' | 'escape-pod' | 'escape-hatch';

export const BOARDING_OBJECT_IMAGES: Readonly<Record<BoardingArtwork, string>> =
  {
    airlock: airlockUrl,
    reactor: reactorUrl,
    breach: breachUrl,
    'escape-pod': escapePodUrl,
    'escape-hatch': escapeHatchUrl,
  };

export function boardingObjectArtwork(feature: {
  readonly kind: BoardingFeatureKind;
  readonly position: BoardingCell;
  readonly open?: boolean;
  readonly destroyed?: boolean;
  readonly exit?: 'breach' | 'escape-pod' | null;
}): BoardingArtwork | null {
  if (feature.kind === 'exit' && feature.exit === 'escape-pod')
    return feature.destroyed ? 'escape-hatch' : 'escape-pod';
  if (feature.destroyed) return null;
  if (feature.kind === 'exit' && feature.exit === 'breach') return 'breach';
  if (feature.kind === 'reactor') return 'reactor';
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
