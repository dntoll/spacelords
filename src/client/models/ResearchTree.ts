import { PREREQUISITES, TECHNOLOGIES, type Technology } from './Research.js';
import type { Point } from './HexCoordinate.js';

class ResearchTreeLayout {
  readonly cardWidth = 224;
  readonly cardHeight = 204;
  readonly edges = TECHNOLOGIES.flatMap((to) =>
    PREREQUISITES[to].map((from) => Object.freeze({ from, to })),
  );
  readonly nodes: readonly Readonly<{
    technology: Technology;
    x: number;
    y: number;
  }>[];
  readonly width: number;
  readonly height: number;

  constructor() {
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
    this.nodes = Object.freeze(
      TECHNOLOGIES.map((technology) =>
        Object.freeze({
          technology,
          x: 32 + depth(technology) * 336,
          y: 32 + row(technology) * 256,
        }),
      ),
    );
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
        const root = RESEARCH_TREE.nodes.find(
          (n) => !PREREQUISITES[n.technology].length,
        )!;
        this.#zoom = 1;
        this.#offset = {
          x: width / 2 - root.x - RESEARCH_TREE.cardWidth / 2,
          y: height / 2 - root.y - RESEARCH_TREE.cardHeight / 2,
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
        this.#width / RESEARCH_TREE.width,
        this.#height / RESEARCH_TREE.height,
      ),
    );
    this.#offset = {
      x: (this.#width - RESEARCH_TREE.width * this.#zoom) / 2,
      y: (this.#height - RESEARCH_TREE.height * this.#zoom) / 2,
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
        64 - RESEARCH_TREE.width * this.#zoom,
        Math.min(this.#width - 64, this.#offset.x),
      ),
      y: Math.max(
        64 - RESEARCH_TREE.height * this.#zoom,
        Math.min(this.#height - 64, this.#offset.y),
      ),
    };
  }
}
