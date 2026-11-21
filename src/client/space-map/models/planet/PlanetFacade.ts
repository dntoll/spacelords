import type { Component } from '../Economy.js';
import { type BuildType, type ShipType } from '../Game.js';
import { discoveriesNotice } from '../../../app/models/PlayerNotice.js';
import type { AppHost, PlanetTab } from '../../../app/models/AppModel.js';

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
    }
  }

  selectPlanetTab(tab: PlanetTab): void {
    if (this.host.screen !== 'planet') return;
    this.host.planetTab = tab;
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
      this.host.beginShipyardPlacement(planet.id, slotIndex);
      return;
    }
    if (planet) this.host.game.scheduleBuild(planet, type, slotIndex);
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
