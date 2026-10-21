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
  static readonly planetWidth = 160;
  static readonly planetHeight = 130;

  readonly planets: readonly Readonly<{ id: string; x: number; y: number }>[];
  readonly fleets: readonly Readonly<{
    id: string;
    x: number;
    y: number;
    anchor: Point | null;
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
    let unpositioned = 0;
    this.fleets = Object.freeze(
      fleets
        .filter((fleet) => !fleet.routeId)
        .map((fleet) => {
          if (!fleet.position)
            return Object.freeze({
              id: fleet.id,
              anchor: null,
              x: Math.min(...this.planets.map((p) => p.x), 0) - 380,
              y: unpositioned++ * 132,
            });
          const anchor = TradeGraphLayout.point(fleet.position);
          const index = colocated.get(fleet.position.key) ?? 0;
          colocated.set(fleet.position.key, index + 1);
          return Object.freeze({
            id: fleet.id,
            anchor,
            x: anchor.x + 112,
            y: anchor.y - 60 + index * 132,
          });
        }),
    );
    const occupied: GraphBounds[] = [
      ...this.planets.map((n) => ({
        x: n.x - TradeGraphLayout.planetWidth / 2,
        y: n.y - TradeGraphLayout.planetHeight / 2,
        width: TradeGraphLayout.planetWidth,
        height: TradeGraphLayout.planetHeight,
      })),
      ...fleets
        .filter((fleet) => fleet.position)
        .map((fleet) => ({
          ...TradeGraphLayout.point(fleet.position!),
          width: 0,
          height: 0,
        })),
      ...this.fleets
        .filter((n) => !n.anchor)
        .map((n) => ({ x: n.x, y: n.y, width: 0, height: 0 })),
    ];
    this.routes = Object.freeze(
      routes.map((route) => {
        const from = TradeGraphLayout.point(route.start);
        const to = TradeGraphLayout.point(route.end);
        const anchor = Object.freeze({
          x: (from.x + to.x) / 2,
          y: (from.y + to.y) / 2,
        });
        return Object.freeze({
          id: route.id,
          x: anchor.x,
          y: anchor.y,
          anchor,
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
    this.#fleetId = null;
    this.#planets = this.#planets.includes(id)
      ? this.#planets.filter((p) => p !== id)
      : [...this.#planets.slice(-1), id];
  }
  selectRoute(id: string | null): void {
    this.#routeId = id;
    this.#fleetId = null;
    this.#planets = [];
  }
  selectFleet(id: string): void {
    this.#fleetId = id;
    this.#routeId = null;
    this.#planets = [];
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
  }
  panBy(delta: Point): void {
    if (![delta.x, delta.y].every(Number.isFinite)) return;
    this.#offset = { x: this.#offset.x + delta.x, y: this.#offset.y + delta.y };
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
  if (!fleet.position) return 'Fleet has no position';
  return null;
}
