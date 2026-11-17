import type {
  BoardingFeature,
  BoardingPerson,
} from '../../models/battle/BoardingBattle.js';
import { BOARDING_METERS } from '../rendering/BoardingScale.js';

/**
 * meny-ovanfor-valt-mal: how tall the selected thing stands, so its title and
 * buttons sit above it instead of over it.
 */
export function boardingContextLiftMeters(
  target: BoardingPerson | BoardingFeature | undefined,
): number {
  if (!target) return 0;
  if ('side' in target)
    return target.status === 'incapacitated'
      ? BOARDING_METERS.incapacitatedPerson
      : target.crouched
        ? BOARDING_METERS.crouchedPerson
        : BOARDING_METERS.person;
  if (target.destroyed) return 0;
  if (target.kind === 'door') return BOARDING_METERS.opening;
  if (target.kind === 'cover') return BOARDING_METERS.cover;
  if (target.kind === 'reactor') return BOARDING_METERS.reactor;
  if (
    target.kind === 'wall' ||
    target.kind === 'hull' ||
    target.kind === 'thin-wall' ||
    target.kind === 'window'
  )
    return target.low ? BOARDING_METERS.cover : BOARDING_METERS.wall;
  return 0;
}

/** hp-i-valt-mal: hit points follow the title of anything that can be damaged. */
export function boardingContextTitle(
  title: string,
  target: BoardingPerson | BoardingFeature | undefined,
): string {
  if (!target || target.maxHitPoints <= 0) return title;
  if (!('side' in target) && (target.kind === 'hull' || target.kind === 'exit'))
    return title;
  return `${title} · ${target.hitPoints}/${target.maxHitPoints} HP`;
}

/**
 * meny-ovanfor-valt-mal: the menu's top-left, centred over the target's top
 * (`point.y - liftPx`), flipped below the tile only when there is no room above.
 */
export function boardingContextMenuPosition(options: {
  readonly point: Readonly<{ x: number; y: number }>;
  readonly liftPx: number;
  readonly width: number;
  readonly height: number;
  readonly canvasWidth: number;
  readonly maxBottom: number;
}): Readonly<{ left: number; top: number }> {
  const { point, liftPx, width, height, canvasWidth, maxBottom } = options;
  const left = Math.max(
    8 + width / 2,
    Math.min(canvasWidth - 8 - width / 2, point.x),
  );
  let top = point.y - liftPx - height - 50;
  if (top < 8) top = point.y + 34;
  top = Math.max(8, Math.min(maxBottom - height, top));
  return Object.freeze({ left, top });
}

/** skott-genom-dubbelklick: the longest pause between the two taps. */
export const BOARDING_DOUBLE_TAP_MS = 400;

export function boardingIsDoubleTap(first: number, second: number): boolean {
  return second - first >= 0 && second - first <= BOARDING_DOUBLE_TAP_MS;
}
