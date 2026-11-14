import { type Point } from '../../../common/HexCoordinate.js';
import type { RouteFacade } from '../../models/routes/RouteFacade.js';

export class RouteController {
  constructor(private readonly facade: RouteFacade) {}

  mapRouteDragSource(point: Point): string | null {
    return this.facade.mapRouteDragSource(point);
  }

  beginMapRoute(id: string): void {
    return this.facade.beginMapRoute(id);
  }

  previewMapRoute(point: Point): void {
    return this.facade.previewMapRoute(point);
  }

  commitMapRoute(): void {
    return this.facade.commitMapRoute();
  }

  selectMapRoute(id: string): void {
    return this.facade.selectMapRoute(id);
  }

  assignMapTradeFleet(routeId: string, fleetId: string): void {
    return this.facade.assignMapTradeFleet(routeId, fleetId);
  }

  openSupplyPlanet(id: string): void {
    return this.facade.openSupplyPlanet(id);
  }

  openSupplyRoute(id: string): void {
    return this.facade.openSupplyRoute(id);
  }

  openRoute(planetId?: string): void {
    return this.facade.openRoute(planetId);
  }

  createTradeRoute(a: string, b: string): void {
    return this.facade.createTradeRoute(a, b);
  }

  assignTradeFleet(routeId: string, fleetId: string): void {
    return this.facade.assignTradeFleet(routeId, fleetId);
  }

  releaseTradeFleet(id: string): void {
    return this.facade.releaseTradeFleet(id);
  }

  closeTradeRoute(id: string): void {
    return this.facade.closeTradeRoute(id);
  }
}
