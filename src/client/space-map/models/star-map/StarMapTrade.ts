import type { Camera } from '../Camera.js';
import type { Game } from '../Game.js';
import type { Point } from '../../../common/HexCoordinate.js';
import { tradeAssignmentIssue } from './TradeAssignment.js';
import { TradeRouteMapLayout } from './TradeRouteMapLayout.js';

export interface MapTradeSnapshot {
  readonly routeId: string | null;
  readonly candidateRouteIds: readonly string[];
  readonly assignmentFleetId: string | null;
  readonly hoveredRouteIds: readonly string[];
}

// Transient map interaction only; the Game remains the authority for orders.
export class StarMapTrade {
  #routeId: string | null = null;
  #candidateRouteIds: readonly string[] = [];
  #assignmentFleetId: string | null = null;
  #hoveredRouteIds: readonly string[] = [];

  constructor(
    private readonly game: () => Game,
    private readonly camera: () => Camera,
  ) {}

  get snapshot(): MapTradeSnapshot {
    const routes = this.game().tradeRoutes;
    return Object.freeze({
      routeId: routes.some((r) => r.id === this.#routeId)
        ? this.#routeId
        : null,
      candidateRouteIds: Object.freeze(
        this.#candidateRouteIds.filter((id) => routes.some((r) => r.id === id)),
      ),
      assignmentFleetId: this.#assignmentFleetId,
      hoveredRouteIds: Object.freeze([...this.#hoveredRouteIds]),
    });
  }
  cancel(): void {
    this.#candidateRouteIds = [];
    this.#assignmentFleetId = null;
    this.#hoveredRouteIds = [];
  }
  clearSelection(): void {
    this.cancel();
    this.#routeId = null;
  }
  selectRoute(id: string): void {
    if (!this.game().tradeRoutes.some((r) => r.id === id)) return;
    this.clearSelection();
    this.#routeId = id;
  }
  hits(point: Point, radius = 14): readonly string[] {
    return TradeRouteMapLayout.hit(
      this.game().tradeRoutes,
      this.camera().screenToWorld(point),
      this.camera().snapshot.zoom,
      radius,
    );
  }
  choose(ids: readonly string[], fleetId: string | null = null): void {
    this.cancel();
    this.#candidateRouteIds = Object.freeze([...ids]);
    this.#assignmentFleetId = fleetId;
  }
  hover(point: Point | null): boolean {
    const next = point ? this.hits(point) : [];
    const changed = next.join(',') !== this.#hoveredRouteIds.join(',');
    this.#hoveredRouteIds = next;
    return changed;
  }
  hoverAssignment(fleetId: string, point: Point): boolean {
    this.#hoveredRouteIds = this.hits(point, 20);
    this.#assignmentFleetId = this.#hoveredRouteIds.length ? fleetId : null;
    return this.#hoveredRouteIds.length > 0;
  }
  assignmentIssue(fleetId: string, routeId: string): string | null {
    if (this.game().phase !== 'planning')
      return 'Wait until planning to assign a fleet.';
    const fleet = this.game()
      .fleetSnapshots()
      .find((f) => f.id === fleetId);
    const route = this.game().tradeRoutes.find((r) => r.id === routeId);
    return fleet && route
      ? tradeAssignmentIssue(fleet, route, this.game().fleetSnapshots())
      : 'Fleet or route is no longer available.';
  }
  assign(fleetId: string, routeId: string): void {
    const issue = this.assignmentIssue(fleetId, routeId);
    if (issue) {
      this.cancel();
      throw new Error(issue);
    }
    this.game().assignTradeFleet(routeId, fleetId);
    this.selectRoute(routeId);
  }
}
