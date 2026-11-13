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

type RayResult = 'clear' | 'covered' | 'blocked';

/**
 * Follows the straight line from the eye to `point` up to `target`. A tile
 * that blocks stops it; half cover within one tile of the target shadows it.
 */
function trace(
  eye: BoardingSightPoint,
  point: BoardingSightPoint,
  target: BoardingSightPoint,
  blocks: BoardingSightBlocker,
  halfCover: BoardingSightBlocker,
): RayResult {
  const dq = point.q - eye.q;
  const dr = point.r - eye.r;
  const length = Math.hypot(dq, dr);
  if (length < EPSILON) return 'clear';
  const direction = { q: dq / length, r: dr / length };
  let result: RayResult = 'clear';
  walk(eye, direction, length, (q, r) => {
    if (q === target.q && r === target.r) return true;
    if (blocks(q, r)) {
      result = 'blocked';
      return true;
    }
    if (
      Math.max(Math.abs(q - target.q), Math.abs(r - target.r)) <= 1 &&
      halfCover(q, r)
    )
      result = 'covered';
    return false;
  });
  return result;
}

const none: BoardingSightBlocker = () => false;

/** geometrisk-sikt / halvskydd-skuggar-delvis: visible and shadowed shares. */
export interface BoardingTileSight {
  /** Share (0–1) of the tile the eye sees. */
  readonly visible: number;
  /** Share (0–1) of the visible part that lies in a half-cover shadow. */
  readonly covered: number;
}

/**
 * geometrisk-sikt: how much of `target` the eye sees, sampled on a 5×5 grid,
 * and how much of that is shadowed by adjacent half cover. The target tile
 * itself never blocks, so a wall face is visible.
 */
export function boardingTileSight(
  eye: BoardingSightPoint,
  forward: BoardingSightPoint,
  target: BoardingSightPoint,
  blocks: BoardingSightBlocker,
  halfCover: BoardingSightBlocker = none,
  radius = BOARDING_SIGHT_RADIUS,
): BoardingTileSight {
  if (Math.round(eye.q) === target.q && Math.round(eye.r) === target.r)
    return { visible: 1, covered: 0 };
  if (Math.hypot(target.q - eye.q, target.r - eye.r) > radius + 1)
    return { visible: 0, covered: 0 };
  let seen = 0;
  let shadowed = 0;
  for (const dq of SAMPLES)
    for (const dr of SAMPLES) {
      const point = { q: target.q + dq, r: target.r + dr };
      if (
        Math.hypot(point.q - eye.q, point.r - eye.r) > radius ||
        !inFront(eye, forward, point)
      )
        continue;
      const result = trace(eye, point, target, blocks, halfCover);
      if (result === 'blocked') continue;
      seen++;
      if (result === 'covered') shadowed++;
    }
  return {
    visible: seen / (SAMPLES.length * SAMPLES.length),
    covered: seen ? shadowed / seen : 0,
  };
}

/** geometrisk-sikt: the share (0–1) of `target` visible from `eye`. */
export function boardingVisibleShare(
  eye: BoardingSightPoint,
  forward: BoardingSightPoint,
  target: BoardingSightPoint,
  blocks: BoardingSightBlocker,
  radius = BOARDING_SIGHT_RADIUS,
): number {
  return boardingTileSight(eye, forward, target, blocks, none, radius).visible;
}

/**
 * halvskydd-skuggar-delvis: the shadow half cover casts away from the eye. It
 * starts at the tile's silhouette and reaches `reach` beyond its centre, so it
 * covers the tiles right behind it, matching the cover rule.
 */
export function boardingCoverShadow(
  eye: BoardingSightPoint,
  cover: BoardingSightPoint,
  reach = 1.5,
): readonly BoardingSightPoint[] {
  const centreAngle = Math.atan2(cover.r - eye.r, cover.q - eye.q);
  const corners = [
    { q: cover.q - 0.5, r: cover.r - 0.5 },
    { q: cover.q + 0.5, r: cover.r - 0.5 },
    { q: cover.q + 0.5, r: cover.r + 0.5 },
    { q: cover.q - 0.5, r: cover.r + 0.5 },
  ].map((corner) => {
    let angle = Math.atan2(corner.r - eye.r, corner.q - eye.q) - centreAngle;
    while (angle <= -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;
    return { corner, angle };
  });
  corners.sort((a, b) => a.angle - b.angle);
  const first = corners[0]!.corner;
  const last = corners[corners.length - 1]!.corner;
  const far = Math.hypot(cover.q - eye.q, cover.r - eye.r) + reach;
  const extend = (corner: BoardingSightPoint): BoardingSightPoint => {
    const dq = corner.q - eye.q;
    const dr = corner.r - eye.r;
    const length = Math.hypot(dq, dr);
    return Object.freeze({
      q: eye.q + (dq / length) * far,
      r: eye.r + (dr / length) * far,
    });
  };
  return Object.freeze([
    Object.freeze({ ...first }),
    Object.freeze({ ...last }),
    extend(last),
    extend(first),
  ]);
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
