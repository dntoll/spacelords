import { PREREQUISITES, TECHNOLOGIES, type Technology } from './Research.js';
import type { Point } from '../../../common/HexCoordinate.js';
import type { ResearchSnapshot } from '../Game.js';

/** forskningens-avslojande: queued and recovered knowledge remains identifiable. */
export function isResearchIdentified(
  research: ResearchSnapshot,
  technology: Technology,
): boolean {
  return (
    research.completed.includes(technology) ||
    research.queue.includes(technology) ||
    !!research.recovered?.includes(technology) ||
    PREREQUISITES[technology].every((type) => research.completed.includes(type))
  );
}

type Edge = Readonly<{ from: Technology; to: Technology }>;
type Node = Readonly<{ technology: Technology; x: number; y: number }>;

/**
 * forskningstrad-utan-korsningar: crossings between dependency lines, counted
 * on straight lines from a card's right edge to the next card's left edge.
 */
export function researchEdgeCrossings(layout: {
  readonly cardWidth: number;
  readonly cardHeight: number;
  readonly edges: readonly Edge[];
  readonly nodes: readonly Node[];
}): number {
  const at = new Map(layout.nodes.map((node) => [node.technology, node]));
  const lines = layout.edges.map((edge) => {
    const from = at.get(edge.from)!;
    const to = at.get(edge.to)!;
    return {
      edge,
      a: { x: from.x + layout.cardWidth, y: from.y + layout.cardHeight / 2 },
      b: { x: to.x, y: to.y + layout.cardHeight / 2 },
    };
  });
  const side = (p: Point, q: Point, r: Point) =>
    Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  let crossings = 0;
  for (const [index, first] of lines.entries())
    for (const second of lines.slice(index + 1)) {
      const shared = [first.edge.from, first.edge.to].some(
        (end) => end === second.edge.from || end === second.edge.to,
      );
      if (shared) continue;
      if (
        side(first.a, first.b, second.a) * side(first.a, first.b, second.b) <
          0 &&
        side(second.a, second.b, first.a) * side(second.a, second.b, first.b) <
          0
      )
        crossings += 1;
    }
  return crossings;
}

export class ResearchTreeLayout {
  readonly cardWidth: number = 108;
  readonly cardHeight: number = 36;
  readonly edges: readonly Edge[];
  readonly nodes: readonly Node[];
  readonly width: number;
  readonly height: number;

  constructor(technologies: readonly Technology[] = TECHNOLOGIES) {
    this.edges = Object.freeze(
      technologies.flatMap((to) =>
        PREREQUISITES[to]
          .filter((from) => technologies.includes(from))
          .map((from) => Object.freeze({ from, to })),
      ),
    );
    const depths = new Map<Technology, number>();
    const depth = (technology: Technology): number => {
      const known = depths.get(technology);
      if (known !== undefined) return known;
      const parents = this.#parents(technology);
      const value = parents.length ? 1 + Math.max(...parents.map(depth)) : 0;
      depths.set(technology, value);
      return value;
    };
    const layers: Technology[][] = [];
    for (const technology of technologies)
      (layers[depth(technology)] ??= []).push(technology);
    // forskningstrad-utan-korsningar: order each layer by the mean position of
    // its neighbours, then swap neighbours while that removes crossings.
    let best = this.#place(layers);
    let fewest = this.#crossings(best);
    const consider = (candidate: Technology[][]) => {
      const placed = this.#place(candidate);
      const count = this.#crossings(placed);
      if (count < fewest) {
        fewest = count;
        best = placed;
        layers.splice(
          0,
          layers.length,
          ...candidate.map((layer) => [...layer]),
        );
        return true;
      }
      return false;
    };
    for (let sweep = 0; sweep < 8 && fewest > 0; sweep++) {
      const down = sweep % 2 === 0;
      const order = layers.map((layer) => [...layer]);
      const indices = down
        ? order.keys()
        : [...order.keys()].reverse().values();
      for (const index of indices) {
        const position = new Map(
          order.flatMap((layer) => layer.map((t, i) => [t, i] as const)),
        );
        const barycenter = (technology: Technology) => {
          const near = down
            ? this.#parents(technology)
            : this.#children(technology);
          return near.length
            ? near.reduce((sum, t) => sum + position.get(t)!, 0) / near.length
            : position.get(technology)!;
        };
        order[index]!.sort((a, b) => barycenter(a) - barycenter(b));
      }
      consider(order);
    }
    let improved = true;
    while (improved && fewest > 0) {
      improved = false;
      for (const [index, layer] of layers.entries())
        for (let i = 0; i + 1 < layer.length; i++) {
          const candidate = layers.map((item) => [...item]);
          const swapped = candidate[index]!;
          [swapped[i], swapped[i + 1]] = [swapped[i + 1]!, swapped[i]!];
          if (consider(candidate)) improved = true;
        }
    }
    this.nodes = best;
    this.width =
      Math.max(...this.nodes.map((node) => node.x)) + this.cardWidth + 32;
    this.height =
      Math.max(...this.nodes.map((node) => node.y)) + this.cardHeight + 32;
  }

  #parents(technology: Technology): Technology[] {
    return this.edges
      .filter((edge) => edge.to === technology)
      .map((edge) => edge.from);
  }

  #children(technology: Technology): Technology[] {
    return this.edges
      .filter((edge) => edge.from === technology)
      .map((edge) => edge.to);
  }

  #crossings(nodes: readonly Node[]): number {
    return researchEdgeCrossings({
      cardWidth: this.cardWidth,
      cardHeight: this.cardHeight,
      edges: this.edges,
      nodes,
    });
  }

  /**
   * Cards keep their layer order. Each sits level with the mean of its
   * prerequisites, and prerequisites then move level with their dependants.
   */
  #place(layers: readonly (readonly Technology[])[]): readonly Node[] {
    const step = this.cardHeight + 12;
    const y = new Map<Technology, number>();
    const settle = (
      layer: readonly Technology[],
      wanted: (t: Technology) => number,
    ) => {
      let bottom = -Infinity;
      for (const technology of layer) {
        const value = Math.max(wanted(technology), bottom + step);
        y.set(technology, value);
        bottom = value;
      }
    };
    const mean = (items: readonly Technology[], fallback: number) =>
      items.length
        ? items.reduce((sum, t) => sum + y.get(t)!, 0) / items.length
        : fallback;
    settle(layers[0] ?? [], () => 0);
    for (const layer of layers.slice(1))
      settle(layer, (t) => mean(this.#parents(t), 0));
    for (const layer of layers.slice(0, -1).reverse())
      settle(layer, (t) => mean(this.#children(t), y.get(t)!));
    const top = Math.min(...y.values());
    return Object.freeze(
      layers.flatMap((layer, depth) =>
        layer.map((technology) =>
          Object.freeze({
            technology,
            x: 32 + depth * (this.cardWidth + 24),
            y: 32 + y.get(technology)! - top,
          }),
        ),
      ),
    );
  }
}

export const RESEARCH_TREE = new ResearchTreeLayout();

export interface ResearchCameraSnapshot {
  readonly offset: Point;
  readonly zoom: number;
}

export class ResearchTreeCamera {
  #layout = RESEARCH_TREE;
  #technologies: readonly Technology[] = TECHNOLOGIES;

  setTechnologies(technologies: readonly Technology[]): void {
    if (
      technologies.length === this.#technologies.length &&
      technologies.every((type, index) => type === this.#technologies[index])
    )
      return;
    this.#technologies = [...technologies];
    this.#layout = new ResearchTreeLayout(technologies);
    this.#bound();
  }
  #width = 800;
  #height = 600;
  #initialized = false;
  #zoom = 1;
  #offset: Point = { x: 24, y: 24 };

  get snapshot(): ResearchCameraSnapshot {
    return Object.freeze({
      zoom: this.#zoom,
      offset: Object.freeze({ ...this.#offset }),
    });
  }

  resize(width: number, height: number): void {
    if (![width, height].every((n) => Number.isFinite(n) && n > 0)) return;
    this.#width = width;
    this.#height = height;
    if (!this.#initialized) {
      this.#initialized = true;
      this.fit();
      if (this.#zoom < 0.55) {
        const root = this.#layout.nodes.find(
          (n) => !PREREQUISITES[n.technology].length,
        )!;
        this.#zoom = 1;
        this.#offset = {
          x: width / 2 - root.x - this.#layout.cardWidth / 2,
          y: height / 2 - root.y - this.#layout.cardHeight / 2,
        };
      }
    }
    this.#bound();
  }

  fit(): void {
    this.#zoom = this.#minimumZoom();
    this.#bound();
  }

  panBy(delta: Point): void {
    if (![delta.x, delta.y].every(Number.isFinite)) return;
    this.#offset = { x: this.#offset.x + delta.x, y: this.#offset.y + delta.y };
    this.#bound();
  }

  zoomAt(factor: number, anchor: Point): void {
    if (![factor, anchor.x, anchor.y].every(Number.isFinite) || factor <= 0)
      return;
    const zoom = Math.max(
      this.#minimumZoom(),
      Math.min(1.8, this.#zoom * factor),
    );
    if (zoom === this.#zoom) return;
    this.#offset = {
      x: anchor.x - ((anchor.x - this.#offset.x) * zoom) / this.#zoom,
      y: anchor.y - ((anchor.y - this.#offset.y) * zoom) / this.#zoom,
    };
    this.#zoom = zoom;
    this.#bound();
  }

  #minimumZoom(): number {
    return Math.min(
      1.8,
      Math.max(1, this.#width - 32) / (this.#layout.width - 64),
      Math.max(1, this.#height - 32) / (this.#layout.height - 64),
    );
  }

  #bound(): void {
    this.#zoom = Math.max(this.#minimumZoom(), this.#zoom);
    const bound = (offset: number, viewport: number, content: number) => {
      const size = (content - 64) * this.#zoom;
      return size <= viewport - 32 + 0.001
        ? (viewport - size) / 2 - 32 * this.#zoom
        : Math.max(
            viewport - 16 - (content - 32) * this.#zoom,
            Math.min(16 - 32 * this.#zoom, offset),
          );
    };
    this.#offset = {
      x: bound(this.#offset.x, this.#width, this.#layout.width),
      y: bound(this.#offset.y, this.#height, this.#layout.height),
    };
  }
}
