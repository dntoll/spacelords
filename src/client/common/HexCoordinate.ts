export interface Point {
  readonly x: number;
  readonly y: number;
}

export class HexCoordinate {
  readonly q: number;
  readonly r: number;

  constructor(q: number, r: number) {
    if (!Number.isInteger(q) || !Number.isInteger(r)) {
      throw new RangeError('Hex coordinates must be integers.');
    }
    this.q = Object.is(q, -0) ? 0 : q;
    this.r = Object.is(r, -0) ? 0 : r;
    Object.freeze(this);
  }

  get key(): string {
    return `${this.q},${this.r}`;
  }

  distanceTo(other: HexCoordinate): number {
    return Math.max(
      Math.abs(this.q - other.q),
      Math.abs(this.r - other.r),
      Math.abs(this.q + this.r - other.q - other.r),
    );
  }

  neighbors(): readonly HexCoordinate[] {
    return Object.freeze(
      [
        [1, 0],
        [1, -1],
        [0, -1],
        [-1, 0],
        [-1, 1],
        [0, 1],
      ].map(([q = 0, r = 0]) => new HexCoordinate(this.q + q, this.r + r)),
    );
  }

  static disk(radius: number): readonly HexCoordinate[] {
    const result: HexCoordinate[] = [];
    for (let q = -radius; q <= radius; q += 1) {
      for (
        let r = Math.max(-radius, -q - radius);
        r <= Math.min(radius, -q + radius);
        r += 1
      ) {
        result.push(new HexCoordinate(q, r));
      }
    }
    return Object.freeze(result);
  }
}

export class HexGeometry {
  static readonly size = 36;

  static toPoint(coordinate: HexCoordinate): Point {
    return Object.freeze({
      x: Math.sqrt(3) * HexGeometry.size * (coordinate.q + coordinate.r / 2),
      y: HexGeometry.size * 1.5 * coordinate.r,
    });
  }

  static fractional(point: Point): { q: number; r: number } {
    return {
      q: ((Math.sqrt(3) / 3) * point.x - point.y / 3) / HexGeometry.size,
      r: ((2 / 3) * point.y) / HexGeometry.size,
    };
  }

  static fromPoint(point: Point): HexCoordinate {
    const { q, r } = HexGeometry.fractional(point);
    let roundedQ = Math.round(q);
    let roundedR = Math.round(r);
    const roundedS = Math.round(-q - r);
    const qError = Math.abs(roundedQ - q);
    const rError = Math.abs(roundedR - r);
    const sError = Math.abs(roundedS + q + r);
    if (qError > rError && qError > sError) roundedQ = -roundedR - roundedS;
    else if (rError > sError) roundedR = -roundedQ - roundedS;
    return new HexCoordinate(roundedQ, roundedR);
  }
}
