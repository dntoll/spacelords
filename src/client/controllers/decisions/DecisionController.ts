import type { DecisionFacade } from '../../models/decisions/DecisionFacade.js';

export class DecisionController {
  constructor(private readonly facade: DecisionFacade) {}

  prepareRouteTransport(routeId: string): void {
    this.facade.prepareRouteTransport(routeId);
  }

  openDecisions(): void {
    return this.facade.openDecisions();
  }

  openDecision(id?: string): void {
    return this.facade.openDecision(id);
  }

  skipDecision(id: string): void {
    return this.facade.skipDecision(id);
  }

  muteDecision(id: string): void {
    return this.facade.muteDecision(id);
  }

  unmuteDecision(id: string): void {
    return this.facade.unmuteDecision(id);
  }

  requestEndTurn(): boolean {
    return this.facade.requestEndTurn();
  }

  cancelEndTurn(): void {
    return this.facade.cancelEndTurn();
  }

  handleDiscoveries(): void {
    return this.facade.handleDiscoveries();
  }

  allowOtherFleetOrders(): void {
    return this.facade.allowOtherFleetOrders();
  }

  addPirateToAttackQueue(pirateId: string): void {
    return this.facade.addPirateToAttackQueue(pirateId);
  }

  removePirateFromAttackQueue(pirateId: string): void {
    return this.facade.removePirateFromAttackQueue(pirateId);
  }

  movePirateAttackQueue(pirateId: string, index: number): void {
    return this.facade.movePirateAttackQueue(pirateId, index);
  }

  requestColonyShip(planetId: string): void {
    return this.facade.requestColonyShip(planetId);
  }
}
