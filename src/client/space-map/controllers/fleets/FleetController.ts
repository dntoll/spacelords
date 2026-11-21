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

  beginDestination(id: string): void {
    return this.facade.beginDestination(id);
  }

  clearDestination(id: string): void {
    return this.facade.clearDestination(id);
  }

  resumeFleetOrders(id: string): void {
    return this.facade.resumeFleetOrders(id);
  }
}
