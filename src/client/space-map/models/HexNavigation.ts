import type { Galaxy } from './Galaxy.js';
import type { HexCoordinate } from '../../common/HexCoordinate.js';

interface Node {
  point: HexCoordinate;
  cost: number;
  estimate: number;
  deviation: number;
  previous: Node | null;
}

interface CachedRoute {
  readonly points: readonly HexCoordinate[];
  readonly costs: readonly string[];
}

/** asteroidbalten / ofarbara-stjarnhexar: shared knowledge-aware navigation. */
export class HexNavigation {
  readonly #routes = new Map<string, CachedRoute>();

  constructor(readonly galaxy: Galaxy) {}

  path(
    start: HexCoordinate,
    target: HexCoordinate,
    speed: number,
    known: ReadonlySet<string>,
    origin = start,
  ): readonly HexCoordinate[] {
    const key = `${origin.key}|${target.key}|${speed}`;
    const costAt = (point: HexCoordinate): string => {
      if (!known.has(point.key)) return '';
      const terrain = this.galaxy.terrainAt(point);
      return terrain === 'dense-asteroids' || terrain === 'sparse-asteroids'
        ? terrain
        : '';
    };
    const cached = this.#routes.get(key);
    const index =
      cached?.points.findIndex((point) => point.key === start.key) ?? -1;
    if (
      cached &&
      index >= 0 &&
      cached.points
        .slice(index)
        .every(
          (point, offset) => costAt(point) === cached.costs[index + offset],
        )
    )
      return cached.points.slice(index + 1);
    if (
      start.key === target.key ||
      !this.galaxy.contains(target) ||
      this.galaxy.isStar(target) ||
      (known.has(target.key) && !this.galaxy.isPassable(target))
    )
      return [];
    const base = 60 / Math.max(1, speed);
    const open: Node[] = [];
    const best = new Map<string, { cost: number; deviation: number }>([
      [start.key, { cost: 0, deviation: 0 }],
    ]);
    const compare = (a: Node, b: Node) =>
      Math.abs(a.estimate - b.estimate) > 1e-8
        ? a.estimate - b.estimate
        : a.deviation - b.deviation;
    const push = (node: Node) => {
      open.push(node);
      let index = open.length - 1;
      while (index > 0) {
        const parent = (index - 1) >> 1;
        if (compare(open[parent]!, node) <= 0) break;
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
            compare(open[child + 1]!, open[child]!) < 0
          )
            child++;
          if (compare(open[child]!, last) >= 0) break;
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
      deviation: 0,
      previous: null,
    });
    while (open.length) {
      const node = pop();
      const knownBest = best.get(node.point.key);
      if (
        !knownBest ||
        node.cost !== knownBest.cost ||
        node.deviation !== knownBest.deviation
      )
        continue;
      if (node.point.key === target.key) {
        const result: HexCoordinate[] = [];
        for (
          let current: Node | null = node;
          current?.previous;
          current = current.previous
        )
          result.push(current.point);
        result.reverse();
        const points = [start, ...result];
        this.#routes.delete(key);
        this.#routes.set(key, { points, costs: points.map(costAt) });
        if (this.#routes.size > 16)
          this.#routes.delete(this.#routes.keys().next().value!);
        return result;
      }
      for (const next of node.point.neighbors()) {
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
        // rakare-vag: the squared cross product is proportional to the
        // squared distance from the line in the hex grid's physical geometry.
        const cross =
          (target.q - origin.q) * (next.r - origin.r) -
          (target.r - origin.r) * (next.q - origin.q);
        const deviation = node.deviation + cross * cross;
        const previousBest = best.get(next.key);
        if (
          previousBest &&
          (cost > previousBest.cost + 1e-8 ||
            (Math.abs(cost - previousBest.cost) <= 1e-8 &&
              deviation >= previousBest.deviation))
        )
          continue;
        best.set(next.key, { cost, deviation });
        push({
          point: next,
          cost,
          estimate: cost + next.distanceTo(target) * base,
          deviation,
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
