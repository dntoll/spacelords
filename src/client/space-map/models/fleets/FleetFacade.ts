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

  beginDestination(id: string): void {
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
}
