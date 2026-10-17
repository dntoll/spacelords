import {
  type HexCoordinate,
  HexGeometry,
  type Point,
} from './HexCoordinate.js';

export interface CameraSnapshot {
  readonly center: Point;
  readonly zoom: number;
}

export class Camera {
  #center: Point;
  #zoom = 1;

  constructor(
    readonly home: HexCoordinate,
    readonly radius: number,
  ) {
    this.#center = HexGeometry.toPoint(home);
  }

  get snapshot(): CameraSnapshot {
    return Object.freeze({
      center: Object.freeze({ ...this.#center }),
      zoom: this.#zoom,
    });
  }

  screenToWorld(point: Point): Point {
    return {
      x: point.x / this.#zoom + this.#center.x,
      y: point.y / this.#zoom + this.#center.y,
    };
  }

  panBy(delta: Point): void {
    if (!Number.isFinite(delta.x) || !Number.isFinite(delta.y)) return;
    this.#setCenter({
      x: this.#center.x - delta.x / this.#zoom,
      y: this.#center.y - delta.y / this.#zoom,
    });
  }

  zoomAt(factor: number, anchor: Point): void {
    if (
      !Number.isFinite(factor) ||
      factor <= 0 ||
      !Number.isFinite(anchor.x) ||
      !Number.isFinite(anchor.y)
    )
      return;
    const world = this.screenToWorld(anchor);
    this.#zoom = Math.max(0.35, Math.min(2.5, this.#zoom * factor));
    this.#setCenter({
      x: world.x - anchor.x / this.#zoom,
      y: world.y - anchor.y / this.#zoom,
    });
  }

  reset(): void {
    this.#zoom = 1;
    this.#center = HexGeometry.toPoint(this.home);
  }

  #setCenter(point: Point): void {
    const { q, r } = HexGeometry.fractional(point);
    const extent = Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));
    const scale = extent > this.radius ? this.radius / extent : 1;
    this.#center = { x: point.x * scale, y: point.y * scale };
  }
}
