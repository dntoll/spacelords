import type { AppHost } from '../../../app/models/AppModel.js';

/**
 * Routes on the Star map can be selected, manned and closed. They are created
 * in Factories (Connect); the Route screen and map route creation are gone.
 */
export class RouteFacade {
  constructor(private readonly host: AppHost) {}

  selectMapRoute(id: string): void {
    if (this.host.screen !== 'map') this.host.openMap();
    this.host.cancelShipTransfer();
    this.host.cancelFleetRename();
    this.host.mapFleetId = null;
    this.host.mapTrade.selectRoute(id);
  }

  assignMapTradeFleet(routeId: string, fleetId: string): void {
    this.host.mapTrade.assign(fleetId, routeId);
    this.host.mapFleetId = null;
  }

  assignTradeFleet(routeId: string, fleetId: string): void {
    if (this.host.screen === 'map')
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
