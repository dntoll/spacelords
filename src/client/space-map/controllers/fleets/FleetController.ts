import type { FleetFacade } from '../../models/fleets/FleetFacade.js';

export class FleetController {
  constructor(private readonly facade: FleetFacade) {}

  reorderShip(shipId: string, index: number): void {
    this.facade.reorderShip(shipId, index);
  }

  moveEquipment(
    from: {
      shipId: string;
      slot: number | 'engine' | 'weapon';
      index?: number;
    },
    to: { shipId: string; slot: number | 'engine' | 'weapon'; index?: number },
  ): void {
    this.facade.moveEquipment(from, to);
  }

  rejoinShip(shipId: string): void {
    this.facade.rejoinShip(shipId);
  }
  openCrew(): void {
    this.facade.openCrew();
  }
  assignCrewRole(
    personId: string,
    role: 'pilot' | 'engineer' | 'gunner' | 'boarder',
    assigned: boolean,
  ): void {
    this.facade.assignCrewRole(personId, role, assigned);
  }
  moveCrew(personId: string, shipId: string): void {
    this.facade.moveCrew(personId, shipId);
  }
  swapCrewEquipment(
    firstId: string,
    secondId: string,
    slot: 'weapon' | 'gadget',
  ): void {
    this.facade.swapCrewEquipment(firstId, secondId, slot);
  }

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

  beginDestination(id: string): void {
    return this.facade.beginDestination(id);
  }

  clearDestination(id: string): void {
    return this.facade.clearDestination(id);
  }
}
