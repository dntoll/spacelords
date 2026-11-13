/**
 * geometrisk-sikt: continuous line of sight on the boarding grid. Tile (q, r)
 * is the unit square centred on (q, r); the eye sits in the centre of the
 * observer's tile. A blocking tile casts a real shadow, so a tile can be
 * partly visible. The rules stay independent of p5 and the view.
 */
export interface BoardingSightPoint {
  readonly q: number;
  readonly r: number;
}

export type BoardingSightBlocker = (q: number, r: number) => boolean;

/** Sight reaches eight tiles; the extra half keeps the eighth tile whole. */
export const BOARDING_SIGHT_RADIUS = 8.5;
/** delvis-synligt-mal: a tile counts as seen from a tenth upwards. */
export const BOARDING_SEEN_SHARE = 0.1;

const SAMPLES = [-0.4, -0.2, 0, 0.2, 0.4] as const;
const EPSILON = 1e-9;
const ARC_STEP = Math.PI / 180;

/**
 * Walks the tiles a ray crosses after its own start tile, in order, until the
 * visitor returns true or the ray reaches `length`. Returns the distance at
 * which the stopping tile was entered, or null.
 */
function walk(
  from: BoardingSightPoint,
  direction: BoardingSightPoint,
  length: number,
  stop: (q: number, r: number) => boolean,
): number | null {
  let q = Math.round(from.q);
  let r = Math.round(from.r);
  const stepQ = Math.sign(direction.q);
  const stepR = Math.sign(direction.r);
  const deltaQ = stepQ === 0 ? Infinity : 1 / Math.abs(direction.q);
  const deltaR = stepR === 0 ? Infinity : 1 / Math.abs(direction.r);
  let nextQ = stepQ === 0 ? Infinity : (q + stepQ * 0.5 - from.q) / direction.q;
  let nextR = stepR === 0 ? Infinity : (r + stepR * 0.5 - from.r) / direction.r;
  for (;;) {
    let entered: number;
    if (nextQ < nextR) {
      entered = nextQ;
      q += stepQ;
      nextQ += deltaQ;
    } else {
      entered = nextR;
      r += stepR;
      nextR += deltaR;
    }
    if (entered > length) return null;
    if (stop(q, r)) return entered;
  }
}

function inFront(
  eye: BoardingSightPoint,
  forward: BoardingSightPoint,
  point: BoardingSightPoint,
): boolean {
  return (
    (point.q - eye.q) * forward.q + (point.r - eye.r) * forward.r >= -EPSILON
  );
}

/** Whether the straight line from the eye to `point` is clear up to `target`. */
function clear(
  eye: BoardingSightPoint,
  point: BoardingSightPoint,
  target: BoardingSightPoint,
  blocks: BoardingSightBlocker,
): boolean {
  const dq = point.q - eye.q;
  const dr = point.r - eye.r;
  const length = Math.hypot(dq, dr);
  if (length < EPSILON) return true;
  const direction = { q: dq / length, r: dr / length };
  let blocked = false;
  walk(eye, direction, length, (q, r) => {
    if (q === target.q && r === target.r) return true;
    if (blocks(q, r)) blocked = true;
    return blocked;
  });
  return !blocked;
}

/**
 * geometrisk-sikt: the share (0–1) of `target` visible from `eye`, sampled on a
 * 5×5 grid. The target tile itself never blocks, so a wall face is visible.
 */
export function boardingVisibleShare(
  eye: BoardingSightPoint,
  forward: BoardingSightPoint,
  target: BoardingSightPoint,
  blocks: BoardingSightBlocker,
  radius = BOARDING_SIGHT_RADIUS,
): number {
  if (Math.round(eye.q) === target.q && Math.round(eye.r) === target.r)
    return 1;
  if (Math.hypot(target.q - eye.q, target.r - eye.r) > radius + 1) return 0;
  let seen = 0;
  for (const dq of SAMPLES)
    for (const dr of SAMPLES) {
      const point = { q: target.q + dq, r: target.r + dr };
      if (
        Math.hypot(point.q - eye.q, point.r - eye.r) <= radius &&
        inFront(eye, forward, point) &&
        clear(eye, point, target, blocks)
      )
        seen++;
    }
  return seen / (SAMPLES.length * SAMPLES.length);
}

/**
 * geometrisk-sikt: the outline of what the eye sees, starting at the eye and
 * sweeping the 180° field. Extra rays pass each blocking corner so shadow edges
 * are exact rather than stepped per tile.
 */
export function boardingSightOutline(
  eye: BoardingSightPoint,
  forward: BoardingSightPoint,
  blocks: BoardingSightBlocker,
  radius = BOARDING_SIGHT_RADIUS,
): readonly BoardingSightPoint[] {
  const facing = Math.atan2(forward.r, forward.q);
  const start = facing - Math.PI / 2;
  const end = facing + Math.PI / 2;
  const angles: number[] = [];
  for (let angle = start; angle < end; angle += ARC_STEP) angles.push(angle);
  angles.push(end);
  const reach = Math.ceil(radius) + 1;
  const centreQ = Math.round(eye.q);
  const centreR = Math.round(eye.r);
  for (let r = centreR - reach; r <= centreR + reach; r++)
    for (let q = centreQ - reach; q <= centreQ + reach; q++) {
      if ((q === centreQ && r === centreR) || !blocks(q, r)) continue;
      for (const [cq, cr] of [
        [q - 0.5, r - 0.5],
        [q + 0.5, r - 0.5],
        [q + 0.5, r + 0.5],
        [q - 0.5, r + 0.5],
      ] as const) {
        if (Math.hypot(cq - eye.q, cr - eye.r) > radius) continue;
        let angle = Math.atan2(cr - eye.r, cq - eye.q);
        while (angle < start) angle += Math.PI * 2;
        while (angle > start + Math.PI * 2) angle -= Math.PI * 2;
        for (const offset of [-1e-4, 1e-4])
          if (angle + offset > start && angle + offset < end)
            angles.push(angle + offset);
      }
    }
  angles.sort((a, b) => a - b);
  const outline: BoardingSightPoint[] = [{ q: eye.q, r: eye.r }];
  for (const angle of angles) {
    const direction = { q: Math.cos(angle), r: Math.sin(angle) };
    const hit = walk(eye, direction, radius, (q, r) => blocks(q, r));
    const distance = hit ?? radius;
    outline.push({
      q: eye.q + direction.q * distance,
      r: eye.r + direction.r * distance,
    });
  }
  return Object.freeze(outline.map((point) => Object.freeze(point)));
}
