/** A point on the projected map. */
export interface BoardingOutlinePoint {
  readonly x: number;
  readonly y: number;
}

/**
 * bordning-jamn-bildfrekvens: the sight outline casts a ray past every wall
 * corner in reach, so it holds thousands of points, most of them in line
 * along walls. Drawing and clipping with all of them every frame cost tens
 * of milliseconds. Douglas–Peucker keeps every point that bends the outline
 * by more than `tolerance`, so the drawn shape is unchanged to the eye.
 */
export function boardingSimplifiedOutline<T extends BoardingOutlinePoint>(
  points: readonly T[],
  tolerance: number,
): readonly T[] {
  if (points.length <= 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop()!;
    const a = points[first]!,
      b = points[last]!;
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    let farthest = -1,
      distance = tolerance;
    for (let index = first + 1; index < last; index++) {
      const point = points[index]!;
      const offset =
        length > 0
          ? Math.abs(dy * (point.x - a.x) - dx * (point.y - a.y)) / length
          : Math.hypot(point.x - a.x, point.y - a.y);
      if (offset > distance) {
        distance = offset;
        farthest = index;
      }
    }
    if (farthest < 0) continue;
    keep[farthest] = 1;
    stack.push([first, farthest], [farthest, last]);
  }
  return points.filter((_, index) => keep[index] === 1);
}
