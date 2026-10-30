import type { CameraSnapshot } from './Camera.js';
import { HexGeometry, type Point } from './HexCoordinate.js';

export interface CameraBounds {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export interface CameraTransition {
  readonly from: CameraSnapshot;
  readonly to: CameraSnapshot;
  readonly duration: number;
  readonly pivot: Point;
}

const snapshot = (center: Point, zoom: number): CameraSnapshot =>
  Object.freeze({ center: Object.freeze({ ...center }), zoom });

/** handelseanpassad-kartkamera: fit known presentation targets independently of p5. */
export class CameraFraming {
  readonly transitions: readonly CameraTransition[];
  readonly target: CameraSnapshot;

  constructor(
    from: CameraSnapshot,
    positions: readonly Point[],
    bounds: CameraBounds,
    focus?: Point,
    overviewBounds: CameraBounds = bounds,
  ) {
    if (!positions.length) throw new RangeError('Camera targets are required.');
    const extent = HexGeometry.size;
    const left = Math.min(...positions.map((p) => p.x)) - extent;
    const right = Math.max(...positions.map((p) => p.x)) + extent;
    const top = Math.min(...positions.map((p) => p.y)) - extent;
    const bottom = Math.max(...positions.map((p) => p.y)) + extent;
    const midpoint = { x: (left + right) / 2, y: (top + bottom) / 2 };
    const anchor = focus ?? {
      x: (bounds.left + bounds.right) / 2,
      y: (bounds.top + bounds.bottom) / 2,
    };
    const zoom = Math.min(
      1,
      (anchor.x - bounds.left) / (midpoint.x - left),
      (bounds.right - anchor.x) / (right - midpoint.x),
      (anchor.y - bounds.top) / (midpoint.y - top),
      (bounds.bottom - anchor.y) / (bottom - midpoint.y),
    );
    this.target = snapshot(
      { x: midpoint.x - anchor.x / zoom, y: midpoint.y - anchor.y / zoom },
      zoom,
    );
    const phases: CameraTransition[] = [];
    let current = snapshot(from.center, from.zoom);
    // The overview uses the current center; the subsequent phase establishes focus.
    const limits = [
      [left - current.center.x, overviewBounds.left],
      [right - current.center.x, overviewBounds.right],
      [top - current.center.y, overviewBounds.top],
      [bottom - current.center.y, overviewBounds.bottom],
    ] as const;
    let overviewZoom = current.zoom;
    for (const [distance, edge] of limits) {
      if (distance < 0 && edge < 0)
        overviewZoom = Math.min(overviewZoom, edge / distance);
      if (distance > 0 && edge > 0)
        overviewZoom = Math.min(overviewZoom, edge / distance);
    }
    const append = (to: CameraSnapshot, duration: number) => {
      if (
        Math.abs(current.zoom - to.zoom) < 1e-9 &&
        Math.hypot(
          current.center.x - to.center.x,
          current.center.y - to.center.y,
        ) < 1e-7
      )
        return;
      phases.push(
        Object.freeze({
          from: current,
          to,
          duration,
          pivot: Object.freeze(midpoint),
        }),
      );
      current = to;
    };
    append(snapshot(current.center, overviewZoom), 300);
    append(this.target, 450);
    this.transitions = Object.freeze(phases);
    Object.freeze(this);
  }

  static sample(
    transition: CameraTransition,
    progress: number,
  ): CameraSnapshot {
    const t = Math.max(0, Math.min(1, progress));
    if (t === 0) return transition.from;
    if (t === 1) return transition.to;
    const eased = t * t * (3 - 2 * t);
    const zoom = Math.exp(
      Math.log(transition.from.zoom) +
        Math.log(transition.to.zoom / transition.from.zoom) * eased,
    );
    if (
      transition.from.center.x === transition.to.center.x &&
      transition.from.center.y === transition.to.center.y
    )
      return snapshot(transition.from.center, zoom);
    // Interpolate the target's screen position so zooming cannot push it out of frame.
    const center = (axis: 'x' | 'y') => {
      const pivot = transition.pivot[axis];
      const start =
        (pivot - transition.from.center[axis]) * transition.from.zoom;
      const end = (pivot - transition.to.center[axis]) * transition.to.zoom;
      return pivot - (start + (end - start) * eased) / zoom;
    };
    return snapshot({ x: center('x'), y: center('y') }, zoom);
  }
}
