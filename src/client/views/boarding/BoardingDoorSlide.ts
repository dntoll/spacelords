import { boardingAnimTick } from './BoardingProjection.js';

/** animerade-dorrar: how long a door takes to slide open or closed. */
export const BOARDING_DOOR_SLIDE_MS = 450;

/**
 * animerade-dorrar: how far open (0–1) a door is drawn. `started` is when it
 * last changed state in the view, or null when it has not moved.
 */
export function boardingDoorOpenness(
  open: boolean,
  started: number | null,
  now: number,
): number {
  if (started === null) return open ? 1 : 0;
  const { progress } = boardingAnimTick(started, BOARDING_DOOR_SLIDE_MS, now);
  return open ? progress : 1 - progress;
}

/** A visible door leaf: its span along the slab and the texture it shows. */
export interface BoardingDoorLeaf {
  readonly span: readonly [number, number];
  readonly texture: readonly [number, number];
}

/**
 * animerade-dorrar: the two halves of a door slide apart into the wall. The
 * part of a leaf that has entered the wall is hidden, so its texture moves
 * with it rather than being squeezed.
 */
export function boardingDoorLeaves(
  openness: number,
): readonly BoardingDoorLeaf[] {
  if (openness <= 0) return [{ span: [-0.5, 0.5], texture: [0, 1] }];
  if (openness >= 1) return [];
  const slid = openness / 2;
  return [
    { span: [-0.5, -slid], texture: [slid, 0.5] },
    { span: [slid, 0.5], texture: [0.5, 1 - slid] },
  ];
}
