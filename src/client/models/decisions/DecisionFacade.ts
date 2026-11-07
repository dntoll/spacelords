import { decisionScreen, needsAttention } from '../Decisions.js';
import type { AppHost } from '../AppModel.js';

export class DecisionFacade {
  constructor(private readonly host: AppHost) {}

  openDecisions(): void {
    this.host.screen = 'decisions';
  }

  openDecision(id?: string): void {
    const decision = id
      ? this.host.game.decisions.find((d) => d.id === id)
      : this.host.game.decisions.find(needsAttention);
    if (!decision) {
      this.host.openDecisions();
      return;
    }
    if (decision.id.startsWith('shipyard-')) {
      this.host.selectSalvage(decision.id.slice('shipyard-'.length));
      return;
    }
    const target = decisionScreen(decision);
    if (target === 'research') this.host.openResearch();
    else if (target === 'fleets' && decision.fleetId)
      this.host.openFleet(decision.fleetId);
    else if (target === 'route' && decision.routeId)
      this.host.openSupplyRoute(decision.routeId);
    else if (decision.planetId) {
      if (target === 'route') this.host.openRoute(decision.planetId);
      else this.host.openProduction(decision.planetId);
    }
  }

  skipDecision(id: string): void {
    this.host.game.skipDecision(id);
  }

  muteDecision(id: string): void {
    this.host.game.muteDecision(id);
  }

  unmuteDecision(id: string): void {
    this.host.game.unmuteDecision(id);
  }

  requestEndTurn(): boolean {
    if (
      this.host.eventPlayback ||
      this.host.movementPlayback ||
      this.host.game.phase !== 'planning'
    )
      return false;
    this.host.pendingEndTurn = this.host.game.decisions.some(needsAttention);
    return !this.host.pendingEndTurn;
  }

  cancelEndTurn(): void {
    this.host.pendingEndTurn = false;
  }

  handleDiscoveries(): void {
    this.host.game.handleDiscoveries();
    this.host.focusInterruptedFleet();
  }

  allowOtherFleetOrders(): void {
    this.host.game.allowOtherFleetOrders();
  }
}
