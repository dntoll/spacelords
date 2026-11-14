import type { ExplorationOrder } from '../../models/TurnSimulation.js';
import { type ShipType } from '../../models/Game.js';
import type { FleetFacade } from '../../models/fleets/FleetFacade.js';

export class FleetController {
  constructor(private readonly facade: FleetFacade) {}

  openFleets(): void {
    return this.facade.openFleets();
  }

  openFleet(id: string): void {
    return this.facade.openFleet(id);
  }

  selectFleet(id: string): void {
    return this.facade.selectFleet(id);
  }

  renameFleet(id: string, name: string): void {
    return this.facade.renameFleet(id, name);
  }

  beginFleetRename(id: string): void {
    return this.facade.beginFleetRename(id);
  }

  editFleetName(draft: string): void {
    return this.facade.editFleetName(draft);
  }

  cancelFleetRename(): void {
    return this.facade.cancelFleetRename();
  }

  submitFleetName(): void {
    return this.facade.submitFleetName();
  }

  chooseShipTransfer(fleetId: string, ship: ShipType, shipId?: string): void {
    return this.facade.chooseShipTransfer(fleetId, ship, shipId);
  }

  cancelShipTransfer(): void {
    return this.facade.cancelShipTransfer();
  }

  transferChosenShip(target: string | null): void {
    return this.facade.transferChosenShip(target);
  }

  transferShips(
    source: string,
    ship: ShipType,
    amount: number,
    target: string | null,
    shipId?: string,
  ): void {
    return this.facade.transferShips(source, ship, amount, target, shipId);
  }

  createFleet(source?: string): void {
    return this.facade.createFleet(source);
  }

  deleteFleet(id: string): void {
    return this.facade.deleteFleet(id);
  }

  beginDestination(id: string): void {
    return this.facade.beginDestination(id);
  }

  upgradeFleet(id: string): void {
    return this.facade.upgradeFleet(id);
  }

  setDestination(id: string, q: number, r: number): void {
    return this.facade.setDestination(id, q, r);
  }

  beginColonization(id: string): void {
    return this.facade.beginColonization(id);
  }

  beginSalvage(id: string): void {
    return this.facade.beginSalvage(id);
  }

  clearDestination(id: string): void {
    return this.facade.clearDestination(id);
  }

  exploreFleet(id: string, order: ExplorationOrder): void {
    return this.facade.exploreFleet(id, order);
  }

  automateSalvage(id: string): void {
    return this.facade.automateSalvage(id);
  }

  civilianTransport(id: string): void {
    return this.facade.civilianTransport(id);
  }

  automateTransport(id: string): void {
    return this.facade.automateTransport(id);
  }

  patrolFleet(id: string): void {
    return this.facade.patrolFleet(id);
  }

  resumeFleetOrders(id: string): void {
    return this.facade.resumeFleetOrders(id);
  }
}
