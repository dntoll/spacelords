import {
  HexCoordinate,
  HexGeometry,
  type Point,
} from '../models/HexCoordinate.js';
import type { BattleHex } from '../models/TacticalBattle.js';

export interface BattleViewportSnapshot {
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly offset: Point;
  readonly bounds: {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
  };
  readonly minScale: number;
  readonly maxScale: number;
}

/** begransad-stridskamera: camera gestures never change combat state. */
export class BattleCameraController {
  #width = 1;
  #height = 1;
  #scale = 1;
  #offset: Point = { x: 0, y: 0 };
  #bounds = { left: 0, top: 0, right: 1, bottom: 1 };
  #map = '';

  get snapshot(): BattleViewportSnapshot {
    const minScale = Math.min(
      this.#width / (this.#bounds.right - this.#bounds.left),
      this.#height / (this.#bounds.bottom - this.#bounds.top),
    );
    return Object.freeze({
      width: this.#width,
      height: this.#height,
      scale: this.#scale,
      offset: Object.freeze({ ...this.#offset }),
      bounds: Object.freeze({ ...this.#bounds }),
      minScale,
      maxScale: Math.max(3, minScale),
    });
  }

  configure(
    map: {
      readonly width: number;
      readonly height: number;
      readonly id?: string;
    },
    width: number,
    height: number,
  ): void {
    const key = `${map.id ?? ''}:${map.width}:${map.height}`;
    const center = this.unproject({ x: this.#width / 2, y: this.#height / 2 });
    this.#width = Math.max(1, width);
    this.#height = Math.max(1, height);
    const pitch = Math.sqrt(3) * HexGeometry.size;
    this.#bounds = {
      left: -pitch / 2,
      top: -HexGeometry.size,
      right: (map.width - 1 + (map.height > 1 ? 0.5 : 0)) * pitch + pitch / 2,
      bottom: (map.height - 1) * 1.5 * HexGeometry.size + HexGeometry.size,
    };
    if (key !== this.#map) {
      this.#map = key;
      this.#scale = this.snapshot.minScale;
      this.#offset = {
        x:
          this.#width / 2 -
          ((this.#bounds.left + this.#bounds.right) / 2) * this.#scale,
        y:
          this.#height / 2 -
          ((this.#bounds.top + this.#bounds.bottom) / 2) * this.#scale,
      };
    } else {
      this.#scale = Math.max(
        this.snapshot.minScale,
        Math.min(this.snapshot.maxScale, this.#scale),
      );
      this.#offset = {
        x: this.#width / 2 - center.x * this.#scale,
        y: this.#height / 2 - center.y * this.#scale,
      };
    }
    this.#clamp();
  }

  project(at: BattleHex): Point {
    const point = HexGeometry.toPoint(new HexCoordinate(at.q, at.r));
    return {
      x: point.x * this.#scale + this.#offset.x,
      y: point.y * this.#scale + this.#offset.y,
    };
  }
  unproject(point: Point): Point {
    return {
      x: (point.x - this.#offset.x) / this.#scale,
      y: (point.y - this.#offset.y) / this.#scale,
    };
  }
  pan(delta: Point): void {
    if (!Number.isFinite(delta.x) || !Number.isFinite(delta.y)) return;
    this.#offset = { x: this.#offset.x + delta.x, y: this.#offset.y + delta.y };
    this.#clamp();
  }
  zoom(factor: number, anchor: Point): void {
    if (!Number.isFinite(factor) || factor <= 0) return;
    const world = this.unproject(anchor);
    const { minScale, maxScale } = this.snapshot;
    this.#scale = Math.max(minScale, Math.min(maxScale, this.#scale * factor));
    this.#offset = {
      x: anchor.x - world.x * this.#scale,
      y: anchor.y - world.y * this.#scale,
    };
    this.#clamp();
  }
  reveal(at: BattleHex, center = false): void {
    const point = this.project(at);
    const xMargin = Math.min(96, this.#width / 3);
    const top = Math.min(140, this.#height / 3);
    const bottom = this.#height - Math.min(150, this.#height / 3);
    const x = center
      ? this.#width / 2
      : Math.max(xMargin, Math.min(this.#width - xMargin, point.x));
    const y = center
      ? (top + bottom) / 2
      : Math.max(top, Math.min(bottom, point.y));
    this.pan({ x: x - point.x, y: y - point.y });
  }
  #clamp(): void {
    const margin = 24;
    const axis = (value: number, size: number, low: number, high: number) => {
      // begransad-stridskamera: center space on the short axis; keep the other filled.
      if ((high - low) * this.#scale <= size + 0.0001)
        return size / 2 - ((low + high) / 2) * this.#scale;
      return Math.max(
        size - margin - high * this.#scale,
        Math.min(margin - low * this.#scale, value),
      );
    };
    this.#offset = {
      x: axis(
        this.#offset.x,
        this.#width,
        this.#bounds.left,
        this.#bounds.right,
      ),
      y: axis(
        this.#offset.y,
        this.#height,
        this.#bounds.top,
        this.#bounds.bottom,
      ),
    };
  }
}
