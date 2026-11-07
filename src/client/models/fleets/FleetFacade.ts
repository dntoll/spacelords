import type { ExplorationOrder } from '../TurnSimulation.js';
import { shipTransferIssue } from '../FleetTransfer.js';
import { Salvage } from '../Salvage.js';
import { type ShipType } from '../Game.js';
import { HexCoordinate } from '../HexCoordinate.js';
import type { AppHost } from '../AppModel.js';

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
    if (!fleet || shipTransferIssue(fleet) || !(fleet.ships[ship] > 0)) return;
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
    this.host.destinationOrder = 'move';
    this.host.cancelShipTransfer();
    this.host.cancelFleetRename();
    if (this.host.game.fleet(id)?.routeId) {
      this.host.openSupplyRoute(this.host.game.fleet(id)!.routeId!);
      return;
    }
    if (this.host.game.canIssueFleetOrders(id)) {
      this.host.mapTrade.clearSelection();
      this.host.destinationFleetId = id;
      if (!this.host.isMapScreen() || this.host.screen === 'production')
        this.host.screen = 'map';
    }
  }

  upgradeFleet(id: string): void {
    this.host.game.upgradeFleet(id);
    this.host.notice = Object.freeze({ kind: 'upgrade-ordered' });
  }

  setDestination(id: string, q: number, r: number): void {
    this.host.game.setDestination(id, new HexCoordinate(q, r));
  }

  beginColonization(id: string): void {
    if (!this.host.game.fleet(id)?.ships['Colony ship'])
      throw new Error('A Colony ship is required.');
    this.host.beginDestination(id);
    if (this.host.destinationFleetId === id)
      this.host.destinationOrder = 'colonize';
  }

  beginSalvage(id: string): void {
    const fleet = this.host.game.fleet(id);
    if (!fleet || !this.host.game.canIssueFleetOrders(id))
      throw new Error('This fleet cannot receive salvage orders now.');
    if (Salvage.availableCapacity(fleet, this.host.game.wrecks) === 0)
      throw new Error('One Salvage ship is required for each assigned wreck.');
    this.host.beginDestination(id);
    this.host.salvageSelection = null;
    this.host.shipyardPlacement = null;
    this.host.destinationOrder = 'salvage';
  }

  clearDestination(id: string): void {
    this.host.game.clearDestination(id);
  }

  exploreFleet(id: string, order: ExplorationOrder): void {
    this.host.game.setExploration(id, order);
  }

  automateSalvage(id: string): void {
    this.host.destinationFleetId = null;
    this.host.destinationOrder = 'move';
    this.host.game.setAutomaticSalvage(id);
  }

  civilianTransport(id: string): void {
    this.host.destinationFleetId = null;
    this.host.destinationOrder = 'move';
    this.host.game.setCivilianTransport(id);
  }

  automateTransport(id: string): void {
    this.host.destinationFleetId = null;
    this.host.destinationOrder = 'move';
    this.host.game.setGuardRoutes(id);
  }

  patrolFleet(id: string): void {
    this.host.game.setPatrol(id);
  }

  resumeFleetOrders(id: string): void {
    this.host.game.resumeFleetOrders(id);
  }
}
