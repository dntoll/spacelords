import type { Point } from '../models/HexCoordinate.js';

export type GestureAction =
  | { readonly type: 'none' }
  | { readonly type: 'pan'; readonly delta: Point }
  | {
      readonly type: 'pinch';
      readonly factor: number;
      readonly previousCenter: Point;
      readonly center: Point;
    };

export class MapGesture {
  readonly #pointers = new Map<number, Point>();
  #start: Point = { x: 0, y: 0 };
  #consumed = false;

  get pointerCount(): number {
    return this.#pointers.size;
  }

  start(id: number, point: Point): void {
    if (this.#pointers.size === 0) {
      this.#start = point;
      this.#consumed = false;
    } else this.#consumed = true;
    this.#pointers.set(id, point);
  }

  move(id: number, point: Point): GestureAction {
    const previous = this.#pointers.get(id);
    if (!previous) return { type: 'none' };
    const before = this.#pair();
    this.#pointers.set(id, point);
    const after = this.#pair();
    if (before && after) {
      return {
        type: 'pinch',
        factor: before.distance > 0 ? after.distance / before.distance : 1,
        previousCenter: before.center,
        center: after.center,
      };
    }
    if (Math.hypot(point.x - this.#start.x, point.y - this.#start.y) > 6)
      this.#consumed = true;
    return this.#consumed
      ? {
          type: 'pan',
          delta: { x: point.x - previous.x, y: point.y - previous.y },
        }
      : { type: 'none' };
  }

  end(id: number): Point | null {
    const point = this.#pointers.get(id);
    const selected =
      !this.#consumed && this.#pointers.size === 1 && point ? point : null;
    this.#pointers.delete(id);
    return selected;
  }

  cancel(): void {
    this.#pointers.clear();
    this.#consumed = true;
  }

  #pair(): { center: Point; distance: number } | null {
    const points = [...this.#pointers.values()];
    const first = points[0];
    const second = points[1];
    if (!first || !second) return null;
    return {
      center: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
      distance: Math.hypot(second.x - first.x, second.y - first.y),
    };
  }
}
