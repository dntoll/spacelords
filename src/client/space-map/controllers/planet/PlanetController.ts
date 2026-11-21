import type { PlanetTab } from '../../../app/models/AppModel.js';
import type { PlanetFacade } from '../../models/planet/PlanetFacade.js';

export class PlanetController {
  constructor(private readonly facade: PlanetFacade) {}

  openPlanet(id?: string): void {
    return this.facade.openPlanet(id);
  }

  selectPlanetTab(tab: PlanetTab): void {
    return this.facade.selectPlanetTab(tab);
  }

  colonize(id: string): void {
    return this.facade.colonize(id);
  }

  cancelProject(id: string): void {
    return this.facade.cancelProject(id);
  }

  toggleDemolition(id: string): void {
    return this.facade.toggleDemolition(id);
  }
}
