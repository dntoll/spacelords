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

/**
 * True blocks the whole tile. dorrar-som-tunna-vaggar: 'q' or 'r' blocks only
 * a slab one third of a tile thick through the middle, thin along that axis,
 * as full thin walls and closed doors do.
 */
export type BoardingSightBlocker = (
  q: number,
  r: number,
) => boolean | 'q' | 'r';

/** Sight reaches eight tiles; the extra half keeps the eighth tile whole. */
export const BOARDING_SIGHT_RADIUS = 8.5;
/** delvis-synligt-mal: a tile counts as seen from a tenth upwards. */
export const BOARDING_SEEN_SHARE = 0.1;

const SAMPLES = [-0.4, -0.2, 0, 0.2, 0.4] as const;
const EPSILON = 1e-9;
const ARC_STEP = Math.PI / 180;
/** Half the thickness of a thin wall or door slab, in tiles. */
const SLAB_HALF = 1 / 6;

/**
 * dorrar-som-tunna-vaggar: distance at which a ray inside tile (q, r) between
 * `entered` and `exited` meets what blocks there, or null if it slips past.
 */
function solidHit(
  from: BoardingSightPoint,
  direction: BoardingSightPoint,
  q: number,
  r: number,
  solid: boolean | 'q' | 'r',
  entered: number,
  exited: number,
): number | null {
  if (!solid) return null;
  if (solid === true) return entered;
  const start = solid === 'q' ? from.q : from.r;
  const step = solid === 'q' ? direction.q : direction.r;
  const centre = solid === 'q' ? q : r;
  let low = -Infinity;
  let high = Infinity;
  if (Math.abs(step) < EPSILON) {
    if (Math.abs(start - centre) > SLAB_HALF) return null;
  } else {
    const a = (centre - SLAB_HALF - start) / step;
    const b = (centre + SLAB_HALF - start) / step;
    low = Math.min(a, b);
    high = Math.max(a, b);
  }
  const hit = Math.max(low, entered);
  return hit <= Math.min(high, exited) ? hit : null;
}

/** The corners of what blocks in tile (q, r), for exact shadow edges. */
function solidCorners(
  q: number,
  r: number,
  solid: boolean | 'q' | 'r',
): readonly (readonly [number, number])[] {
  const dq = solid === 'q' ? SLAB_HALF : 0.5;
  const dr = solid === 'r' ? SLAB_HALF : 0.5;
  return [
    [q - dq, r - dr],
    [q + dq, r - dr],
    [q + dq, r + dr],
    [q - dq, r + dr],
  ];
}

/**
 * Walks the tiles a ray crosses after its own start tile, in order, until the
 * visitor stops it or the ray reaches `length`. The visitor gets the distances
 * at which the ray enters and leaves the tile and returns true to stop where
 * the tile was entered, a distance to stop there, or false to go on.
 */
function walk(
  from: BoardingSightPoint,
  direction: BoardingSightPoint,
  length: number,
  stop: (
    q: number,
    r: number,
    entered: number,
    exited: number,
  ) => boolean | number | null,
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
    const result = stop(q, r, entered, Math.min(nextQ, nextR));
    if (result === true) return entered;
    if (typeof result === 'number' && result <= length) return result;
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
 * personer-som-pelare-i-sikt: a person is a 0.5-tile-wide pillar in the
 * middle of their tile. Standing people block sight; crouched people only
 * give half cover.
 */
export interface BoardingSightBody {
  readonly q: number;
  readonly r: number;
  readonly cover: boolean;
}

export const BOARDING_BODY_RADIUS = 0.25;

/** Distance along a unit ray at which it first enters the body, or null. */
function rayBody(
  eye: BoardingSightPoint,
  direction: BoardingSightPoint,
  length: number,
  body: BoardingSightPoint,
): number | null {
  const fq = eye.q - body.q;
  const fr = eye.r - body.r;
  const b = fq * direction.q + fr * direction.r;
  const c = fq * fq + fr * fr - BOARDING_BODY_RADIUS * BOARDING_BODY_RADIUS;
  if (c <= 0) return null;
  const discriminant = b * b - c;
  if (discriminant < 0) return null;
  const entered = -b - Math.sqrt(discriminant);
  return entered > EPSILON && entered < length ? entered : null;
}

const ownTile = (body: BoardingSightPoint, cell: BoardingSightPoint) =>
  body.q === Math.round(cell.q) && body.r === Math.round(cell.r);

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
  bodies: readonly BoardingSightBody[],
): RayResult {
  const dq = point.q - eye.q;
  const dr = point.r - eye.r;
  const length = Math.hypot(dq, dr);
  if (length < EPSILON) return 'clear';
  const direction = { q: dq / length, r: dr / length };
  // Assigned inside the walk callback, so TypeScript cannot narrow it.
  let result = 'clear' as RayResult;
  walk(eye, direction, length, (q, r, entered, exited) => {
    if (q === target.q && r === target.r) return true;
    const hit = solidHit(eye, direction, q, r, blocks(q, r), entered, exited);
    if (hit !== null && hit <= length) {
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
  if (result === 'blocked') return result;
  for (const body of bodies) {
    if (ownTile(body, target) || ownTile(body, eye)) continue;
    if (rayBody(eye, direction, length, body) === null) continue;
    if (!body.cover) return 'blocked';
    if (Math.max(Math.abs(body.q - target.q), Math.abs(body.r - target.r)) <= 1)
      result = 'covered';
  }
  return result;
}

/**
 * granat-over-halvskydd-inte-genom-vagg: what stops a grenade thrown from the
 * centre of `from` to the centre of `target`. Solid tiles stop it, standing
 * people catch it, and crouched people and half cover are thrown over.
 */
export function boardingThrowObstacle(
  from: BoardingSightPoint,
  target: BoardingSightPoint,
  solid: BoardingSightBlocker,
  bodies: readonly BoardingSightBody[] = [],
): 'wall' | 'person' | null {
  const dq = target.q - from.q;
  const dr = target.r - from.r;
  const length = Math.hypot(dq, dr);
  if (length < EPSILON) return null;
  const direction = { q: dq / length, r: dr / length };
  const wall = walk(from, direction, length, (q, r, entered, exited) =>
    q === target.q && r === target.r
      ? false
      : solidHit(from, direction, q, r, solid(q, r), entered, exited),
  );
  if (wall !== null) return 'wall';
  const blocked = bodies.some(
    (body) =>
      !body.cover &&
      !ownTile(body, target) &&
      !ownTile(body, from) &&
      rayBody(from, direction, length, body) !== null,
  );
  return blocked ? 'person' : null;
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
  bodies: readonly BoardingSightBody[] = [],
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
      const result = trace(eye, point, target, blocks, halfCover, bodies);
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
  bodies: readonly BoardingSightBody[] = [],
  radius = BOARDING_SIGHT_RADIUS,
): number {
  return boardingTileSight(eye, forward, target, blocks, none, bodies, radius)
    .visible;
}

/**
 * personer-som-pelare-i-sikt: the half-cover shadow behind a crouched person,
 * from the two tangent points of their pillar out to `reach` past its centre.
 */
export function boardingBodyShadow(
  eye: BoardingSightPoint,
  body: BoardingSightPoint,
  reach = 1.5,
): readonly BoardingSightPoint[] {
  const distance = Math.hypot(body.q - eye.q, body.r - eye.r);
  if (distance <= BOARDING_BODY_RADIUS) return Object.freeze([]);
  const centreAngle = Math.atan2(body.r - eye.r, body.q - eye.q);
  const spread = Math.asin(BOARDING_BODY_RADIUS / distance);
  const tangent = Math.sqrt(
    distance * distance - BOARDING_BODY_RADIUS * BOARDING_BODY_RADIUS,
  );
  const at = (angle: number, length: number): BoardingSightPoint =>
    Object.freeze({
      q: eye.q + Math.cos(angle) * length,
      r: eye.r + Math.sin(angle) * length,
    });
  return Object.freeze([
    at(centreAngle - spread, tangent),
    at(centreAngle + spread, tangent),
    at(centreAngle + spread, distance + reach),
    at(centreAngle - spread, distance + reach),
  ]);
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
  bodies: readonly BoardingSightBody[] = [],
  radius = BOARDING_SIGHT_RADIUS,
): readonly BoardingSightPoint[] {
  const pillars = bodies.filter((body) => !body.cover && !ownTile(body, eye));
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
      const solid = q === centreQ && r === centreR ? false : blocks(q, r);
      if (!solid) continue;
      for (const [cq, cr] of solidCorners(q, r, solid)) {
        if (Math.hypot(cq - eye.q, cr - eye.r) > radius) continue;
        let angle = Math.atan2(cr - eye.r, cq - eye.q);
        while (angle < start) angle += Math.PI * 2;
        while (angle > start + Math.PI * 2) angle -= Math.PI * 2;
        for (const offset of [-1e-4, 1e-4])
          if (angle + offset > start && angle + offset < end)
            angles.push(angle + offset);
      }
    }
  for (const pillar of pillars) {
    const distance = Math.hypot(pillar.q - eye.q, pillar.r - eye.r);
    if (distance > radius + BOARDING_BODY_RADIUS) continue;
    let centre = Math.atan2(pillar.r - eye.r, pillar.q - eye.q);
    while (centre < start) centre += Math.PI * 2;
    while (centre > start + Math.PI * 2) centre -= Math.PI * 2;
    const spread = Math.asin(BOARDING_BODY_RADIUS / distance);
    for (const edge of [centre - spread, centre + spread])
      for (const offset of [-1e-4, 1e-4])
        if (edge + offset > start && edge + offset < end)
          angles.push(edge + offset);
  }
  angles.sort((a, b) => a - b);
  const outline: BoardingSightPoint[] = [{ q: eye.q, r: eye.r }];
  for (const angle of angles) {
    const direction = { q: Math.cos(angle), r: Math.sin(angle) };
    const hit = walk(eye, direction, radius, (q, r, entered, exited) =>
      solidHit(eye, direction, q, r, blocks(q, r), entered, exited),
    );
    let distance = hit ?? radius;
    for (const pillar of pillars) {
      const entered = rayBody(eye, direction, distance, pillar);
      if (entered !== null) distance = entered;
    }
    outline.push({
      q: eye.q + direction.q * distance,
      r: eye.r + direction.r * distance,
    });
  }
  return Object.freeze(outline.map((point) => Object.freeze(point)));
}
