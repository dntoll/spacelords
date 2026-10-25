import { PREREQUISITES, TECHNOLOGIES, type Technology } from './Research.js';
import type { Point } from './HexCoordinate.js';

export class ResearchTreeLayout {
  readonly cardWidth = 224;
  readonly cardHeight = 204;
  readonly edges: readonly Readonly<{ from: Technology; to: Technology }>[];
  readonly nodes: readonly Readonly<{
    technology: Technology;
    x: number;
    y: number;
  }>[];
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
    const rows = new Map<Technology, number>();
    let leaf = 0;
    const row = (technology: Technology): number => {
      const cached = rows.get(technology);
      if (cached !== undefined) return cached;
      const children = this.edges
        .filter((e) => e.from === technology)
        .map((e) => row(e.to));
      const value = children.length
        ? (Math.min(...children) + Math.max(...children)) / 2
        : leaf++;
      rows.set(technology, value);
      return value;
    };
    const depth = (technology: Technology): number =>
      PREREQUISITES[technology].length
        ? 1 + Math.max(...PREREQUISITES[technology].map(depth))
        : 0;
    const nodes = technologies.map((technology) =>
      Object.freeze({
        technology,
        x: 32 + depth(technology) * 336,
        y: 32 + row(technology) * 256,
      }),
    );
    this.nodes = nodes;
    // forsknings-tradnavigation: shared dependencies may place siblings on the same row.
    for (const x of new Set(this.nodes.map((node) => node.x))) {
      let bottom = -Infinity;
      for (const node of this.nodes
        .filter((node) => node.x === x)
        .toSorted((a, b) => a.y - b.y)) {
        const y = Math.max(node.y, bottom + 256);
        if (y !== node.y)
          nodes[nodes.indexOf(node)] = Object.freeze({ ...node, y });
        bottom = y;
      }
    }
    Object.freeze(nodes);
    this.width = Math.max(...this.nodes.map((n) => n.x)) + this.cardWidth + 32;
    this.height =
      Math.max(...this.nodes.map((n) => n.y)) + this.cardHeight + 32;
    Object.freeze(this.edges);
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
    this.#zoom = Math.max(
      0.15,
      Math.min(
        1,
        this.#width / this.#layout.width,
        this.#height / this.#layout.height,
      ),
    );
    this.#offset = {
      x: (this.#width - this.#layout.width * this.#zoom) / 2,
      y: (this.#height - this.#layout.height * this.#zoom) / 2,
    };
  }

  panBy(delta: Point): void {
    if (![delta.x, delta.y].every(Number.isFinite)) return;
    this.#offset = { x: this.#offset.x + delta.x, y: this.#offset.y + delta.y };
    this.#bound();
  }

  zoomAt(factor: number, anchor: Point): void {
    if (![factor, anchor.x, anchor.y].every(Number.isFinite) || factor <= 0)
      return;
    const zoom = Math.max(0.15, Math.min(1.8, this.#zoom * factor));
    this.#offset = {
      x: anchor.x - ((anchor.x - this.#offset.x) * zoom) / this.#zoom,
      y: anchor.y - ((anchor.y - this.#offset.y) * zoom) / this.#zoom,
    };
    this.#zoom = zoom;
    this.#bound();
  }

  #bound(): void {
    this.#offset = {
      x: Math.max(
        64 - this.#layout.width * this.#zoom,
        Math.min(this.#width - 64, this.#offset.x),
      ),
      y: Math.max(
        64 - this.#layout.height * this.#zoom,
        Math.min(this.#height - 64, this.#offset.y),
      ),
    };
  }
}
