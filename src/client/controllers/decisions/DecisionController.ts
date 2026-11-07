import type { DecisionFacade } from '../../models/decisions/DecisionFacade.js';

export class DecisionController {
  constructor(private readonly facade: DecisionFacade) {}

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
}
