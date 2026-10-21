import type { Camera } from './Camera.js';
import type { Game } from './Game.js';
import { HexGeometry, type Point } from './HexCoordinate.js';
import { tradeAssignmentIssue } from './TradeGraph.js';
import { TradeRouteMapLayout } from './TradeRouteMapLayout.js';

export interface MapRoutePreview {
  readonly start: Point;
  readonly end: Point;
  readonly targetId: string | null;
  readonly label: string;
  readonly issue: string | null;
}
export interface MapTradeSnapshot {
  readonly routeId: string | null;
  readonly sourcePlanetId: string | null;
  readonly preview: MapRoutePreview | null;
  readonly candidateRouteIds: readonly string[];
  readonly assignmentFleetId: string | null;
  readonly hoveredRouteIds: readonly string[];
}

// Transient map interaction only; the Game remains the authority for orders.
export class StarMapTrade {
  #routeId: string | null = null;
  #sourcePlanetId: string | null = null;
  #preview: MapRoutePreview | null = null;
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
      sourcePlanetId: this.#sourcePlanetId,
      preview: this.#preview,
      candidateRouteIds: Object.freeze(
        this.#candidateRouteIds.filter((id) => routes.some((r) => r.id === id)),
      ),
      assignmentFleetId: this.#assignmentFleetId,
      hoveredRouteIds: Object.freeze([...this.#hoveredRouteIds]),
    });
  }
  cancel(keepSource = false): void {
    if (!keepSource) this.#sourcePlanetId = null;
    this.#preview = null;
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
  begin(sourceId: string): void {
    this.clearSelection();
    this.#sourcePlanetId = sourceId;
  }
  creationIssue(): string | null {
    if (this.game().phase !== 'planning')
      return 'Wait until planning to create a route.';
    if (!this.game().research.completed.includes('Trade logistics'))
      return 'Research Trade logistics first.';
    return null;
  }
  preview(point: Point): void {
    const source = this.game()
      .ownedPlanetSnapshots()
      .find((p) => p.id === this.#sourcePlanetId);
    if (!source) return;
    const world = this.camera().screenToWorld(point);
    const hex = HexGeometry.fromPoint(world);
    const target = this.game()
      .ownedPlanetSnapshots()
      .find((p) => p.position.key === hex.key);
    const issue =
      this.creationIssue() ??
      (!target
        ? 'Choose another owned planet.'
        : target.id === source.id
          ? 'Choose a different planet.'
          : this.game().tradeRoutes.some(
                (r) =>
                  [r.a, r.b].includes(source.id) &&
                  [r.a, r.b].includes(target.id),
              )
            ? 'A trade route already connects these planets.'
            : null);
    this.#preview = Object.freeze({
      start: HexGeometry.toPoint(source.position),
      end: target
        ? HexGeometry.toPoint(target.position)
        : Object.freeze({ ...world }),
      targetId: target?.id ?? null,
      label: `${source.name} → ${target?.name ?? 'Choose an owned planet'}`,
      issue,
    });
  }
  commit(): string | null {
    const preview = this.#preview,
      source = this.#sourcePlanetId;
    this.cancel();
    if (!preview || preview.issue || !preview.targetId || !source) return null;
    const id = this.game().createTradeRoute(source, preview.targetId);
    this.selectRoute(id);
    return id;
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
      ? tradeAssignmentIssue(fleet, route)
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
