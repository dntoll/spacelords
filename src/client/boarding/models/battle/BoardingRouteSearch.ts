import type { BoardingPath } from './BoardingBattle.js';
import type { BoardingCell } from '../map/BoardingMap.js';

export type BoardingRouteStep = BoardingPath['steps'][number];

/** One way to leave a pose: the step taken and the pose it leads to. */
export interface BoardingRouteMove {
  readonly position: BoardingCell;
  readonly facing: number;
  readonly step: BoardingRouteStep;
}

interface RouteNode {
  readonly position: BoardingCell;
  readonly facing: number;
  readonly cost: number;
  readonly turns: number;
  readonly parent: RouteNode | null;
  readonly step: BoardingRouteStep | null;
  readonly order: number;
}

const cellKey = (cell: BoardingCell): string => `${cell.q},${cell.r}`;

function before(a: RouteNode, b: RouteNode): boolean {
  return a.cost < b.cost || (a.cost === b.cost && a.order < b.order);
}

/** Binary min-heap on cost; equal costs leave in the order they were found. */
class RouteQueue {
  readonly #nodes: RouteNode[] = [];

  get size(): number {
    return this.#nodes.length;
  }

  push(node: RouteNode): void {
    const nodes = this.#nodes;
    nodes.push(node);
    let index = nodes.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (!before(nodes[index]!, nodes[parent]!)) break;
      [nodes[index], nodes[parent]] = [nodes[parent]!, nodes[index]!];
      index = parent;
    }
  }

  pop(): RouteNode {
    const nodes = this.#nodes;
    const top = nodes[0]!;
    const last = nodes.pop()!;
    if (nodes.length > 0) {
      nodes[0] = last;
      let index = 0;
      for (;;) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;
        if (left < nodes.length && before(nodes[left]!, nodes[smallest]!))
          smallest = left;
        if (right < nodes.length && before(nodes[right]!, nodes[smallest]!))
          smallest = right;
        if (smallest === index) break;
        [nodes[index], nodes[smallest]] = [nodes[smallest]!, nodes[index]!];
        index = smallest;
      }
    }
    return top;
  }
}

/**
 * snabb-bordningsvagsokning: every cheapest route from one pose, found by a
 * single Dijkstra search over tile and facing. A tile's route is the first
 * pose that reached it, the same one a search towards that tile alone stops at.
 */
export class BoardingRouteTree {
  readonly #reached: ReadonlyMap<string, RouteNode>;
  readonly #paths = new Map<string, BoardingPath>();

  private constructor(reached: ReadonlyMap<string, RouteNode>) {
    this.#reached = reached;
  }

  static search(
    position: BoardingCell,
    facing: number,
    moves: (
      position: BoardingCell,
      facing: number,
    ) => readonly BoardingRouteMove[],
  ): BoardingRouteTree {
    let order = 0;
    const start: RouteNode = {
      position,
      facing,
      cost: 0,
      turns: 0,
      parent: null,
      step: null,
      order: order++,
    };
    const best = new Map<string, number>([
      [`${cellKey(position)}:${facing}`, 0],
    ]);
    const reached = new Map<string, RouteNode>();
    const queue = new RouteQueue();
    queue.push(start);
    while (queue.size > 0) {
      const current = queue.pop();
      const poseKey = `${cellKey(current.position)}:${current.facing}`;
      // A cheaper way to this pose was already expanded.
      if (current.cost > best.get(poseKey)!) continue;
      const key = cellKey(current.position);
      if (!reached.has(key)) reached.set(key, current);
      for (const move of moves(current.position, current.facing)) {
        const cost = current.cost + move.step.cost;
        const nextKey = `${cellKey(move.position)}:${move.facing}`;
        if ((best.get(nextKey) ?? Infinity) <= cost) continue;
        best.set(nextKey, cost);
        queue.push({
          position: move.position,
          facing: move.facing,
          cost,
          turns: current.turns + (move.step.type === 'turn' ? 1 : 0),
          parent: current,
          step: move.step,
          order: order++,
        });
      }
    }
    return new BoardingRouteTree(reached);
  }

  pathTo(destination: BoardingCell): BoardingPath | null {
    const key = cellKey(destination);
    const cached = this.#paths.get(key);
    if (cached) return cached;
    const node = this.#reached.get(key);
    if (!node) return null;
    const steps: BoardingRouteStep[] = [];
    for (let at: RouteNode | null = node; at?.step; at = at.parent)
      steps.push(at.step);
    steps.reverse();
    const path: BoardingPath = Object.freeze({
      cost: node.cost,
      turns: node.turns,
      positions: Object.freeze(
        steps.flatMap((step) =>
          step.type === 'forward' ? [step.position] : [],
        ),
      ),
      finalFacing: node.facing,
      steps: Object.freeze(steps),
    });
    this.#paths.set(key, path);
    return path;
  }
}
