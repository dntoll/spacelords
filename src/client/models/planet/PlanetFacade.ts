import type { Component } from '../Economy.js';
import { type BuildType, type ShipType } from '../Game.js';
import { discoveriesNotice } from '../app/PlayerNotice.js';
import type {
  AppHost,
  BuildingCategory,
  PlanetTab,
  ProductionCategory,
} from '../AppModel.js';

export class PlanetFacade {
  constructor(private readonly host: AppHost) {}

  openPlanet(id?: string): void {
    const planet = id
      ? this.host.game
          .ownedPlanetSnapshots()
          .find((candidate) => candidate.id === id)
      : this.host.game.planetAt(this.host.selected);
    if (planet) {
      this.host.selected = planet.position;
      this.host.screen = 'planet';
      this.host.planetTab = 'overview';
      this.host.productionCategory = 'Ships';
      this.host.productionProduct = null;
      this.host.productionFleetId = null;
      this.host.closedProjectIds.clear();
      this.host.expandedProjectIds = new Set();
      const head = (
        'projects' in planet ? planet : this.host.game.planetSnapshot(planet)
      )?.projects[0];
      if (head) this.host.expandedProjectIds.add(head.id);
      this.host.focusedProjectId = null;
      this.host.constructionSite = null;
      this.host.returnSite = null;
    }
  }

  selectPlanetTab(tab: PlanetTab): void {
    if (this.host.screen !== 'planet') return;
    this.host.planetTab = tab;
    this.host.focusedProjectId = null;
  }

  selectProduction(category: ProductionCategory, product: string | null): void {
    this.host.productionCategory = category;
    this.host.productionProduct = product;
  }

  selectProductionFleet(id: string | null): void {
    this.host.productionFleetId = id;
  }

  toggleProjectSupply(id: string, open: boolean): void {
    if (open) {
      this.host.expandedProjectIds.add(id);
      this.host.closedProjectIds.delete(id);
    } else {
      this.host.expandedProjectIds.delete(id);
      this.host.closedProjectIds.add(id);
    }
  }

  openPlanetProject(planetId: string, projectId: string): void {
    const current = this.host.game.planetAt(this.host.selected);
    if (current?.id !== planetId || this.host.screen !== 'planet')
      this.host.openPlanet(planetId);
    if (this.host.game.planetAt(this.host.selected)?.id !== planetId) return;
    this.host.planetTab = 'queue';
    this.host.expandedProjectIds.add(projectId);
    this.host.closedProjectIds.delete(projectId);
    this.host.focusedProjectId = projectId;
  }

  openBuildSite(index: number | null): void {
    if (index === null) {
      if (this.host.screen !== 'build-selection') return;
      this.host.returnSite = this.host.constructionSite;
      this.host.constructionSite = null;
      this.host.screen = 'planet';
      this.host.planetTab = 'sites';
      return;
    }
    if (this.host.screen !== 'planet' || this.host.game.phase !== 'planning')
      return;
    const planet = this.host.game.planetAt(this.host.selected);
    const site = planet
      ? this.host.game.planetSnapshot(planet)?.sites[index]
      : null;
    if (!site || site.locked || site.building || site.project) return;
    this.host.constructionSite = index;
    this.host.buildSearch = '';
    this.host.buildingCategory = 'All';
    this.host.selectedBuilding = null;
    this.host.screen = 'build-selection';
  }

  searchBuildings(query: string): void {
    this.host.buildSearch = query;
    this.host.selectedBuilding = null;
  }

  selectBuildingCategory(category: BuildingCategory): void {
    this.host.buildingCategory = category;
    this.host.selectedBuilding = null;
  }

  selectBuilding(type: BuildType | null): void {
    this.host.selectedBuilding = type;
  }

  colonize(id: string): void {
    const discoveries = this.host.game.colonize(id);
    if (discoveries.length)
      this.host.notice = discoveriesNotice(
        discoveries.map((discovery) => discovery.name),
      );
  }

  build(type: BuildType, slotIndex?: number): void {
    const planet = this.host.game.planetAt(this.host.selected);
    if (planet && type === 'Orbital shipyard') {
      this.host.beginShipyardPlacement(
        planet.id,
        slotIndex ?? this.host.constructionSite ?? undefined,
      );
      return;
    }
    if (planet)
      this.host.game.scheduleBuild(
        planet,
        type,
        slotIndex ?? this.host.constructionSite ?? undefined,
      );
    if (this.host.screen === 'build-selection') this.host.openBuildSite(null);
  }

  scheduleShip(
    ship: ShipType,
    fleetId: string | null,
    factoryId?: string,
  ): void {
    const planet = this.host.game.planetAt(this.host.selected);
    if (planet)
      this.host.game.scheduleShip(
        planet,
        ship,
        fleetId,
        factoryId,
        this.host.shipStartOrder?.ship === ship
          ? this.host.shipStartOrder.order
          : undefined,
      );
  }

  moveProject(id: string, index: number): void {
    const planet = this.host.game.planetAt(this.host.selected);
    if (planet) this.host.game.moveProject(planet, id, index);
  }

  scheduleComponent(component: Component): void {
    const planet = this.host.game.planetAt(this.host.selected);
    if (planet) this.host.game.scheduleComponent(planet, component);
  }

  setProjectFleet(id: string, fleetId: string | null): void {
    const planet = this.host.game.planetAt(this.host.selected);
    if (planet) this.host.game.setProjectFleet(planet, id, fleetId);
  }

  cancelProject(id: string): void {
    const planet = this.host.game.planetAt(this.host.selected);
    if (planet) this.host.game.cancelProject(planet, id);
  }

  toggleDemolition(id: string): void {
    const planet = this.host.game.planetAt(this.host.selected);
    if (planet) this.host.game.toggleDemolition(planet, id);
  }

  upgradeBuilding(id: string): void {
    const planet = this.host.game.planetAt(this.host.selected);
    if (planet) this.host.game.scheduleUpgrade(planet, id);
  }

  produceFighter(): void {
    const planet = this.host.game.planetAt(this.host.selected);
    if (planet) this.host.game.produceFighter(planet);
  }

  canBuild(type: BuildType): string | null {
    const planet = this.host.game.planetAt(this.host.selected);
    return planet
      ? this.host.game.canBuild(planet, type)
      : 'No owned planet selected.';
  }
}
