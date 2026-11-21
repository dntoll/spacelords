import type { RouteFacade } from '../../models/routes/RouteFacade.js';

export class RouteController {
  constructor(private readonly facade: RouteFacade) {}

  selectMapRoute(id: string): void {
    return this.facade.selectMapRoute(id);
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
