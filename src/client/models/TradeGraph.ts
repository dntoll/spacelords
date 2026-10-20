import {
  HexGeometry,
  type HexCoordinate,
  type Point,
} from './HexCoordinate.js';
import type { FleetSnapshot, PlanetGameSnapshot } from './Game.js';
import type { TradeRouteSnapshot } from './Logistics.js';

export interface GraphBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
export interface GraphCameraSnapshot {
  readonly offset: Point;
  readonly zoom: number;
}
export interface TradeGraphSnapshot {
  readonly camera: GraphCameraSnapshot;
  readonly planets: readonly string[];
  readonly routeId: string | null;
  readonly fleetId: string | null;
}

export class TradeGraphLayout {
  static readonly scale = 12;
  static readonly planetWidth = 300;
  static readonly planetHeight = 360;
  static readonly dockSize = 220;
  readonly planets: readonly Readonly<{ id: string; x: number; y: number }>[];
  readonly fleets: readonly Readonly<{
    id: string;
    x: number;
    y: number;
    anchor: Point;
  }>[];
  readonly bounds: GraphBounds;
  readonly routes: readonly Readonly<{
    id: string;
    x: number;
    y: number;
    anchor: Point;
  }>[];

  static point(position: HexCoordinate): Point {
    const point = HexGeometry.toPoint(position);
    return Object.freeze({ x: point.x * this.scale, y: point.y * this.scale });
  }

  constructor(
    planets: readonly PlanetGameSnapshot[],
    fleets: readonly FleetSnapshot[],
    routes: readonly TradeRouteSnapshot[] = [],
  ) {
    this.planets = Object.freeze(
      planets.map((planet) =>
        Object.freeze({
          id: planet.id,
          ...TradeGraphLayout.point(planet.position),
        }),
      ),
    );
    const colocated = new Map<string, number>();
    this.fleets = Object.freeze(
      fleets
        .filter((fleet) => fleet.position)
        .map((fleet) => {
          const anchor = TradeGraphLayout.point(fleet.position!);
          const index = colocated.get(fleet.position!.key) ?? 0;
          colocated.set(fleet.position!.key, index + 1);
          return Object.freeze({
            id: fleet.id,
            anchor,
            x: anchor.x + 174,
            y: anchor.y - 110 + index * 132,
          });
        }),
    );
    const occupied: GraphBounds[] = [
      ...this.planets.map((n) => ({
        x: n.x - 150,
        y: n.y - 180,
        width: 300,
        height: 360,
      })),
      ...this.fleets.map((n) => ({ x: n.x, y: n.y, width: 184, height: 120 })),
    ];
    this.routes = Object.freeze(
      routes.map((route, index) => {
        const from = TradeGraphLayout.point(route.start),
          to = TradeGraphLayout.point(route.end);
        const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
        let chosen: { x: number; y: number; anchor: Point } | null = null;
        for (const offset of [0, 160, -160, 280, -280, 440, -440]) {
          for (const fraction of [0.5, 0.35, 0.65, 0.2, 0.8]) {
            const anchor = {
              x: from.x + (to.x - from.x) * fraction,
              y: from.y + (to.y - from.y) * fraction,
            };
            const candidate = {
              x: anchor.x - ((to.y - from.y) / length) * offset - 110,
              y: anchor.y + ((to.x - from.x) / length) * offset - 110,
              width: 220,
              height: 220,
            };
            if (
              !occupied.some(
                (rect) =>
                  candidate.x < rect.x + rect.width + 16 &&
                  candidate.x + 220 + 16 > rect.x &&
                  candidate.y < rect.y + rect.height + 16 &&
                  candidate.y + 220 + 16 > rect.y,
              )
            ) {
              chosen = { x: candidate.x, y: candidate.y, anchor };
              break;
            }
          }
          if (chosen) break;
        }
        const placement = chosen ?? {
          x: Math.min(...occupied.map((r) => r.x), 0) - 260,
          y: index * 260,
          anchor: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 },
        };
        occupied.push({
          x: placement.x,
          y: placement.y,
          width: 220,
          height: 220,
        });
        return Object.freeze({
          id: route.id,
          x: placement.x,
          y: placement.y,
          anchor: Object.freeze(placement.anchor),
        });
      }),
    );
    if (!occupied.length)
      occupied.push({ x: 0, y: 0, width: 200, height: 200 });
    const left = Math.min(...occupied.map((rect) => rect.x));
    const top = Math.min(...occupied.map((rect) => rect.y));
    const right = Math.max(...occupied.map((rect) => rect.x + rect.width));
    const bottom = Math.max(...occupied.map((rect) => rect.y + rect.height));
    this.bounds = Object.freeze({
      x: left - 70,
      y: top - 70,
      width: right - left + 140,
      height: bottom - top + 140,
    });
  }
}

export class TradeGraphState {
  #width = 800;
  #height = 600;
  #bounds: GraphBounds = { x: 0, y: 0, width: 800, height: 600 };
  #initialized = false;
  #zoom = 1;
  #offset: Point = { x: 0, y: 0 };
  #planets: string[] = [];
  #routeId: string | null = null;
  #fleetId: string | null = null;

  get snapshot(): TradeGraphSnapshot {
    return Object.freeze({
      camera: Object.freeze({
        offset: Object.freeze({ ...this.#offset }),
        zoom: this.#zoom,
      }),
      planets: Object.freeze([...this.#planets]),
      routeId: this.#routeId,
      fleetId: this.#fleetId,
    });
  }
  selectPlanet(id: string): void {
    this.#routeId = null;
    this.#planets = this.#planets.includes(id)
      ? this.#planets.filter((p) => p !== id)
      : [...this.#planets.slice(-1), id];
  }
  selectRoute(id: string | null): void {
    this.#routeId = id;
    this.#planets = [];
  }
  selectFleet(id: string): void {
    this.#fleetId = id;
  }
  resize(width: number, height: number, bounds: GraphBounds): void {
    if (![width, height].every((n) => Number.isFinite(n) && n > 0)) return;
    this.#width = width;
    this.#height = height;
    this.#bounds = bounds;
    if (!this.#initialized) {
      this.#initialized = true;
      this.fit();
    }
    this.#bound();
  }
  fit(): void {
    this.#zoom = Math.max(
      0.015,
      Math.min(
        1,
        this.#width / this.#bounds.width,
        this.#height / this.#bounds.height,
      ),
    );
    this.#offset = {
      x:
        (this.#width - this.#bounds.width * this.#zoom) / 2 -
        this.#bounds.x * this.#zoom,
      y:
        (this.#height - this.#bounds.height * this.#zoom) / 2 -
        this.#bounds.y * this.#zoom,
    };
  }
  focus(point: Point): void {
    this.#zoom = 1;
    this.#offset = {
      x: this.#width / 2 - point.x,
      y: this.#height / 2 - point.y,
    };
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
    const zoom = Math.max(0.015, Math.min(2, this.#zoom * factor));
    this.#offset = {
      x: anchor.x - ((anchor.x - this.#offset.x) * zoom) / this.#zoom,
      y: anchor.y - ((anchor.y - this.#offset.y) * zoom) / this.#zoom,
    };
    this.#zoom = zoom;
    this.#bound();
  }
  #bound(): void {
    const b = this.#bounds;
    this.#offset = {
      x: Math.max(
        64 - (b.x + b.width) * this.#zoom,
        Math.min(this.#width - 64 - b.x * this.#zoom, this.#offset.x),
      ),
      y: Math.max(
        64 - (b.y + b.height) * this.#zoom,
        Math.min(this.#height - 64 - b.y * this.#zoom, this.#offset.y),
      ),
    };
  }
}

export function tradeAssignmentIssue(
  fleet: FleetSnapshot,
  route: TradeRouteSnapshot,
): string | null {
  if (route.closing) return 'Route is closing';
  if (fleet.routeId) return 'Already assigned to a route';
  if (fleet.joinFleetId) return 'Reinforcement order active';
  if (fleet.destination) return 'Fleet is travelling';
  if (!fleet.ships['Transport ship']) return 'Needs a Transport ship';
  if (
    !fleet.position ||
    ![route.start.key, route.end.key].includes(fleet.position.key)
  )
    return 'Must be at a route endpoint';
  return null;
}
