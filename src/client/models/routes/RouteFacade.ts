import { HexGeometry, type Point } from '../HexCoordinate.js';
import type { AppHost } from '../AppModel.js';

export class RouteFacade {
  constructor(private readonly host: AppHost) {}

  mapRouteDragSource(point: Point): string | null {
    if (
      (this.host.screen !== 'map' && this.host.screen !== 'route') ||
      this.host.destinationFleetId ||
      this.host.mapFleetId ||
      this.host.mapTrade.snapshot.sourcePlanetId ||
      this.host.mapTrade.snapshot.routeId
    )
      return null;
    const world = this.host.camera.screenToWorld(point);
    const planet = this.host.game.planetAt(this.host.selected);
    if (!planet) return null;
    const center = HexGeometry.toPoint(planet.position);
    return Math.hypot(world.x - center.x, world.y - center.y) <=
      Math.max(8.5, 12 / this.host.camera.snapshot.zoom)
      ? planet.id
      : null;
  }

  beginMapRoute(id: string): void {
    if (this.host.screen !== 'map' && this.host.screen !== 'route') return;
    this.host.cancelShipTransfer();
    this.host.cancelFleetRename();
    this.host.mapFleetId = null;
    this.host.destinationFleetId = null;
    this.host.mapTrade.begin(id);
  }

  previewMapRoute(point: Point): void {
    this.host.mapTrade.preview(point);
  }

  commitMapRoute(): void {
    if (this.host.mapTrade.commit()) this.host.mapFleetId = null;
  }

  selectMapRoute(id: string): void {
    if (this.host.screen === 'fleets') this.host.openMap();
    if (this.host.screen === 'production') this.host.openRoute();
    this.host.cancelShipTransfer();
    this.host.cancelFleetRename();
    this.host.mapFleetId = null;
    this.host.mapTrade.selectRoute(id);
  }

  assignMapTradeFleet(routeId: string, fleetId: string): void {
    this.host.mapTrade.assign(fleetId, routeId);
    this.host.mapFleetId = null;
  }

  openSupplyPlanet(id: string): void {
    this.host.openPlanet(id);
  }

  openSupplyRoute(id: string): void {
    const route = this.host.game.tradeRoutes.find((r) => r.id === id);
    if (!route) return;
    this.host.openRoute();
    this.host.selected = route.start;
    this.host.requestMapFocus(route.start);
    this.host.selectMapRoute(id);
  }

  openRoute(planetId?: string): void {
    this.host.openMapScreen('route');
    if (planetId) this.host.focusMapPlanet(planetId);
  }

  createTradeRoute(a: string, b: string): void {
    const id = this.host.game.createTradeRoute(a, b);
    if (this.host.screen === 'map' || this.host.screen === 'route')
      this.host.selectMapRoute(id);
  }

  assignTradeFleet(routeId: string, fleetId: string): void {
    if (this.host.screen === 'map' || this.host.screen === 'route')
      this.host.assignMapTradeFleet(routeId, fleetId);
    else this.host.game.assignTradeFleet(routeId, fleetId);
  }

  releaseTradeFleet(id: string): void {
    this.host.game.releaseTradeFleet(id);
  }

  closeTradeRoute(id: string): void {
    this.host.game.closeTradeRoute(id);
  }
}
