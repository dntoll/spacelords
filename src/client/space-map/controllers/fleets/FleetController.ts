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

  beginDestination(id: string): void {
    return this.facade.beginDestination(id);
  }

  clearDestination(id: string): void {
    return this.facade.clearDestination(id);
  }
}
