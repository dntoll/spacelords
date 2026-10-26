import type { Galaxy } from './Galaxy.js';
import type { HexCoordinate } from './HexCoordinate.js';

interface Node {
  point: HexCoordinate;
  cost: number;
  estimate: number;
  previous: Node | null;
}

/** asteroidbalten / ofarbara-stjarnhexar: shared knowledge-aware navigation. */
export class HexNavigation {
  constructor(readonly galaxy: Galaxy) {}

  path(
    start: HexCoordinate,
    target: HexCoordinate,
    speed: number,
    known: ReadonlySet<string>,
    origin = start,
  ): readonly HexCoordinate[] {
    if (
      start.key === target.key ||
      !this.galaxy.contains(target) ||
      this.galaxy.isStar(target) ||
      (known.has(target.key) && !this.galaxy.isPassable(target))
    )
      return [];
    const base = 60 / Math.max(1, speed);
    const open: Node[] = [];
    const best = new Map<string, number>([[start.key, 0]]);
    const push = (node: Node) => {
      open.push(node);
      let index = open.length - 1;
      while (index > 0) {
        const parent = (index - 1) >> 1;
        if (open[parent]!.estimate <= node.estimate) break;
        open[index] = open[parent]!;
        index = parent;
      }
      open[index] = node;
    };
    const pop = (): Node => {
      const first = open[0]!;
      const last = open.pop()!;
      if (open.length) {
        let index = 0;
        while (index * 2 + 1 < open.length) {
          let child = index * 2 + 1;
          if (
            child + 1 < open.length &&
            open[child + 1]!.estimate < open[child]!.estimate
          )
            child++;
          if (open[child]!.estimate >= last.estimate) break;
          open[index] = open[child]!;
          index = child;
        }
        open[index] = last;
      }
      return first;
    };
    push({
      point: start,
      cost: 0,
      estimate: start.distanceTo(target) * base,
      previous: null,
    });
    while (open.length) {
      const node = pop();
      if (node.cost !== best.get(node.point.key)) continue;
      if (node.point.key === target.key) {
        const result: HexCoordinate[] = [];
        for (
          let current: Node | null = node;
          current?.previous;
          current = current.previous
        )
          result.push(current.point);
        return result.reverse();
      }
      const progress =
        (origin.distanceTo(node.point) + 1) /
        Math.max(1, origin.distanceTo(target));
      const idealQ = origin.q + (target.q - origin.q) * progress;
      const idealR = origin.r + (target.r - origin.r) * progress;
      const deviation = (point: HexCoordinate) => {
        const q = point.q - idealQ,
          r = point.r - idealR;
        return q * q + r * r + (q + r) * (q + r);
      };
      const neighbors = [...node.point.neighbors()].sort(
        (a, b) =>
          a.distanceTo(target) - b.distanceTo(target) ||
          deviation(a) - deviation(b),
      );
      for (const next of neighbors) {
        if (
          !this.galaxy.contains(next) ||
          this.galaxy.isStar(next) ||
          (known.has(next.key) && !this.galaxy.isPassable(next))
        )
          continue;
        const slow = [node.point, next].some(
          (point) =>
            known.has(point.key) &&
            this.galaxy.terrainAt(point) === 'sparse-asteroids',
        );
        const cost = node.cost + (slow ? 60 : base);
        if (cost >= (best.get(next.key) ?? Infinity) - 1e-8) continue;
        best.set(next.key, cost);
        push({
          point: next,
          cost,
          estimate: cost + next.distanceTo(target) * base,
          previous: node,
        });
      }
    }
    return [];
  }

  stepSpeed(from: HexCoordinate, to: HexCoordinate, speed: number): number {
    return [from, to].some(
      (point) => this.galaxy.terrainAt(point) === 'sparse-asteroids',
    )
      ? 1
      : speed;
  }

  years(
    path: readonly HexCoordinate[],
    start: HexCoordinate,
    speed: number,
    known: ReadonlySet<string>,
  ): number {
    let elapsed = 0,
      from = start;
    for (const to of path) {
      const slow = [from, to].some(
        (point) =>
          known.has(point.key) &&
          this.galaxy.terrainAt(point) === 'sparse-asteroids',
      );
      const cost = slow ? 60 : 60 / speed;
      const used = elapsed % 60;
      if (used > 1e-8 && used + cost > 60 + 1e-8) elapsed += 60 - used;
      elapsed += cost;
      from = to;
    }
    return Math.ceil((elapsed - 1e-8) / 60);
  }
}
