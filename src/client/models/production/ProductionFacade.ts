import { type MapProductionCategory } from '../ProductionMap.js';
import type { Component } from '../Economy.js';
import {
  BUILDINGS,
  projectDefinition,
  type ProjectType,
  type BuildType,
  type ShipType,
} from '../Game.js';
import type { AppHost } from '../AppModel.js';

export class ProductionFacade {
  constructor(private readonly host: AppHost) {}

  openProduction(planetId?: string): void {
    if (planetId) this.host.focusMapPlanet(planetId);
    this.host.openMapScreen('production');
  }

  selectMapProductionCategory(category: MapProductionCategory): void {
    this.host.mapProductionCategory = category;
    this.host.mapProductionPage = 0;
    this.host.mapProductionOption = null;
  }

  selectMapProductionPage(page: number): void {
    if (Number.isInteger(page))
      this.host.mapProductionPage = Math.max(
        0,
        Math.min(page, this.host.productionMapSnapshot().pages - 1),
      );
  }

  selectMapProductionOption(type: ProjectType | null): void {
    if (type === null) {
      this.host.mapProductionOption = null;
      return;
    }
    const planet = this.host.game.planetAt(this.host.selected);
    const option = planet
      ? this.host.game
          .productionOptions(planet)
          .find((option) => option.type === type)
      : null;
    if (!option) return;
    if (option.category !== this.host.mapProductionCategory) {
      const categorized = this.host.productionMapSnapshot().categorized;
      this.host.mapProductionCategory = option.category;
      if (categorized) this.host.mapProductionPage = 0;
    }
    this.host.mapProductionOption = type;
  }

  selectMapProject(id: string): void {
    const planet = this.host.game.planetAt(this.host.selected);
    if (
      planet &&
      this.host.game.planetSnapshot(planet)?.projects.some((p) => p.id === id)
    )
      this.host.mapProjectId = id;
  }

  orderMapProduction(option?: ProjectType): void {
    if (this.host.screen !== 'production') return;
    const planet = this.host.game.planetAt(this.host.selected);
    if (!planet) return;
    this.host.productionReceipt = null;
    if (option !== undefined) {
      if (
        !this.host.game
          .productionOptions(planet)
          .some((candidate) => candidate.type === option)
      )
        throw new Error('This production option is no longer available.');
      this.host.selectMapProductionOption(option);
    }
    const type = this.host.mapProductionOption;
    if (!type) return;
    if (type === 'Orbital shipyard') {
      this.host.beginShipyardPlacement(planet.id);
      return;
    }
    this.host.productionReceipt = Object.hasOwn(BUILDINGS, type)
      ? this.host.game.scheduleBuild(planet, type as BuildType)
      : projectDefinition(type).ship
        ? this.host.game.scheduleShip(
            planet,
            type as ShipType,
            null,
            undefined,
            this.host.shipStartOrder?.ship === type
              ? this.host.shipStartOrder.order
              : undefined,
          )
        : this.host.game.scheduleComponent(planet, type as Component);
  }

  clearProductionReceipt(): void {
    this.host.productionReceipt = null;
  }
}
