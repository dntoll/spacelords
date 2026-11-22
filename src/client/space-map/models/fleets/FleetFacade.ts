import type { ExplorationOrder } from '../TurnSimulation.js';
import { type ShipType } from '../Game.js';
import { HexCoordinate } from '../../../common/HexCoordinate.js';
import type { AppHost } from '../../../app/models/AppModel.js';

export class FleetFacade {
  constructor(private readonly host: AppHost) {}

  openFleets(): void {
    this.host.openMapScreen('fleets');
  }

  openFleet(id: string): void {
    const fleet = this.host.game.fleet(id);
    if (fleet) {
      this.host.openFleets();
      this.host.selectedFleetId = id;
      this.host.mapFleetId = fleet.position ? id : null;
      if (fleet.position) this.host.requestMapFocus(fleet.position);
    }
  }

  selectFleet(id: string): void {
    this.host.selectedFleetId = this.host.game.fleet(id) ? id : null;
  }

  renameFleet(id: string, name: string): void {
    this.host.game.renameFleet(id, name);
  }

  beginFleetRename(id: string): void {
    const fleet = this.host.game.fleet(id);
    if (!fleet || this.host.game.phase !== 'planning') return;
    this.host.fleetNameEdit = Object.freeze({
      id,
      draft: fleet.ownName ?? fleet.name,
    });
  }

  editFleetName(draft: string): void {
    if (this.host.fleetNameEdit)
      this.host.fleetNameEdit = Object.freeze({
        ...this.host.fleetNameEdit,
        draft,
      });
  }

  cancelFleetRename(): void {
    this.host.fleetNameEdit = null;
  }

  submitFleetName(): void {
    if (!this.host.fleetNameEdit) return;
    this.host.renameFleet(
      this.host.fleetNameEdit.id,
      this.host.fleetNameEdit.draft,
    );
    this.host.cancelFleetRename();
  }

  chooseShipTransfer(fleetId: string, ship: ShipType, shipId?: string): void {
    if (this.host.game.phase !== 'planning') return;
    const fleet = this.host.game.fleet(fleetId);
    if (!fleet || !(fleet.ships[ship] > 0)) return;
    this.host.selectedFleetId = fleetId;
    if (this.host.isMapScreen()) this.host.mapFleetId = fleetId;
    this.host.shipTransfer =
      this.host.shipTransfer?.fleetId === fleetId &&
      this.host.shipTransfer.ship === ship &&
      this.host.shipTransfer.shipId === shipId
        ? null
        : Object.freeze({ fleetId, ship, shipId });
  }

  cancelShipTransfer(): void {
    this.host.shipTransfer = null;
  }

  transferChosenShip(target: string | null): void {
    if (this.host.shipTransfer)
      this.host.transferShips(
        this.host.shipTransfer.fleetId,
        this.host.shipTransfer.ship,
        1,
        target,
        this.host.shipTransfer.shipId,
      );
  }

  transferShips(
    source: string,
    ship: ShipType,
    amount: number,
    target: string | null,
    shipId?: string,
  ): void {
    const received = this.host.game.transferShips(
      source,
      ship,
      amount,
      target,
      shipId,
    );
    this.host.shipTransfer = null;
    this.host.selectedFleetId = target ?? received.id;
    if (this.host.isMapScreen()) {
      this.host.mapFleetId = received.id;
      if (!target) this.host.beginFleetRename(received.id);
    }
  }

  createFleet(source?: string): void {
    this.host.selectedFleetId = this.host.game.createFleet(source).id;
  }

  deleteFleet(id: string): void {
    this.host.game.deleteFleet(id);
    if (this.host.selectedFleetId === id)
      this.host.selectedFleetId =
        this.host.game.fleetSnapshots()[0]?.id ?? null;
  }

  beginDestination(id: string): void {
    this.host.cancelShipTransfer();
    this.host.cancelFleetRename();
    if (this.host.game.canIssueFleetOrders(id)) {
      this.host.destinationFleetId = id;
      if (!this.host.isMapScreen()) this.host.screen = 'map';
    }
  }

  setDestination(id: string, q: number, r: number): void {
    this.host.game.setDestination(id, new HexCoordinate(q, r));
  }

  clearDestination(id: string): void {
    this.host.game.clearDestination(id);
  }

  exploreFleet(id: string, order: ExplorationOrder): void {
    this.host.game.setExploration(id, order);
  }

  patrolFleet(id: string): void {
    this.host.game.setPatrol(id);
  }

  resumeFleetOrders(id: string): void {
    this.host.game.resumeFleetOrders(id);
  }
}
