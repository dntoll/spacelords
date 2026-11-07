import type { Component } from '../../models/Economy.js';
import { type BuildType, type ShipType } from '../../models/Game.js';
import type {
  BuildingCategory,
  PlanetTab,
  ProductionCategory,
} from '../../models/AppModel.js';
import type { PlanetFacade } from '../../models/planet/PlanetFacade.js';

export class PlanetController {
  constructor(private readonly facade: PlanetFacade) {}

  openPlanet(id?: string): void {
    return this.facade.openPlanet(id);
  }

  selectPlanetTab(tab: PlanetTab): void {
    return this.facade.selectPlanetTab(tab);
  }

  selectProduction(category: ProductionCategory, product: string | null): void {
    return this.facade.selectProduction(category, product);
  }

  selectProductionFleet(id: string | null): void {
    return this.facade.selectProductionFleet(id);
  }

  toggleProjectSupply(id: string, open: boolean): void {
    return this.facade.toggleProjectSupply(id, open);
  }

  openPlanetProject(planetId: string, projectId: string): void {
    return this.facade.openPlanetProject(planetId, projectId);
  }

  openBuildSite(index: number | null): void {
    return this.facade.openBuildSite(index);
  }

  searchBuildings(query: string): void {
    return this.facade.searchBuildings(query);
  }

  selectBuildingCategory(category: BuildingCategory): void {
    return this.facade.selectBuildingCategory(category);
  }

  selectBuilding(type: BuildType | null): void {
    return this.facade.selectBuilding(type);
  }

  colonize(id: string): void {
    return this.facade.colonize(id);
  }

  build(type: BuildType, slotIndex?: number): void {
    return this.facade.build(type, slotIndex);
  }

  scheduleShip(
    ship: ShipType,
    fleetId: string | null,
    factoryId?: string,
  ): void {
    return this.facade.scheduleShip(ship, fleetId, factoryId);
  }

  moveProject(id: string, index: number): void {
    return this.facade.moveProject(id, index);
  }

  scheduleComponent(component: Component): void {
    return this.facade.scheduleComponent(component);
  }

  setProjectFleet(id: string, fleetId: string | null): void {
    return this.facade.setProjectFleet(id, fleetId);
  }

  cancelProject(id: string): void {
    return this.facade.cancelProject(id);
  }

  toggleDemolition(id: string): void {
    return this.facade.toggleDemolition(id);
  }

  upgradeBuilding(id: string): void {
    return this.facade.upgradeBuilding(id);
  }

  produceFighter(): void {
    return this.facade.produceFighter();
  }

  canBuild(type: BuildType): string | null {
    return this.facade.canBuild(type);
  }
}
