import { HexCoordinate } from '../../../common/HexCoordinate.js';
import type { AppHost } from '../../../app/models/AppModel.js';

export class FleetFacade {
  constructor(private readonly host: AppHost) {}

  reorderShip(shipId: string, index: number): void {
    this.host.game.reorderShip(shipId, index);
  }

  moveEquipment(
    from: {
      shipId: string;
      slot: number | 'engine' | 'weapon';
      index?: number;
    },
    to: { shipId: string; slot: number | 'engine' | 'weapon'; index?: number },
  ): void {
    this.host.game.moveEquipment(from, to);
  }

  rejoinShip(shipId: string): void {
    this.host.game.rejoinShip(shipId);
  }
  openCrew(): void {
    this.host.openMapScreen('crew');
  }
  assignCrewRole(
    personId: string,
    role: 'pilot' | 'engineer' | 'gunner' | 'boarder',
    assigned: boolean,
  ): void {
    this.host.game.assignCrewRole(personId, role, assigned);
  }
  moveCrew(personId: string, shipId: string): void {
    this.host.game.moveCrew(personId, shipId);
  }
  placeCrew(
    personId: string,
    fromShip: string,
    fromRole: 'pilot' | 'engineer' | 'gunner' | 'boarder' | null,
    toShip: string,
    toRole: 'pilot' | 'engineer' | 'gunner' | 'boarder',
    occupantId: string | null,
  ): void {
    this.host.game.placeCrew(
      personId,
      fromShip,
      fromRole,
      toShip,
      toRole,
      occupantId,
    );
  }
  swapCrewEquipment(
    firstId: string,
    secondId: string,
    slot: 'weapon' | 'gadget',
  ): void {
    this.host.game.swapCrewEquipment(firstId, secondId, slot);
  }

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
    this.host.voyage = false;
  }
}
