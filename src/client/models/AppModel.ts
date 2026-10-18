import { Camera, type CameraSnapshot } from './Camera.js';
import { createExampleGalaxy } from './exampleGalaxy.js';
import {
  Game,
  type BuildType,
  type FleetSnapshot,
  type GameEvent,
  type GamePhase,
  type PlanetGameSnapshot,
  type ShipType,
  type TurnFrame,
  type Technology,
  type ResearchSnapshot,
  type PlanetOrderSnapshot,
} from './Game.js';
import type { MapCell } from './Galaxy.js';
import { HexCoordinate, HexGeometry, type Point } from './HexCoordinate.js';

export type PlanetTab = 'overview' | 'construction';

export type Screen = 'map' | 'planet' | 'research' | 'fleets';

export interface AppReadModel {
  readonly research: ResearchSnapshot;
  readonly planetOrders: readonly PlanetOrderSnapshot[];
  readonly constructionSite: number | null;
  readonly shipyardId: string | null;
  readonly screen: Screen;
  readonly planetTab: PlanetTab;
  readonly playerName: string;
  readonly radius: number;
  readonly cells: readonly MapCell[];
  readonly selected: MapCell | null;
  readonly camera: CameraSnapshot;
  readonly planet: PlanetGameSnapshot | null;
  readonly round: number;
  readonly phase: GamePhase;
  readonly fleets: readonly FleetSnapshot[];
  readonly selectedFleet: FleetSnapshot | null;
  readonly destinationFleetId: string | null;
  readonly events: readonly GameEvent[];
  readonly notice: string | null;
}

export class AppModel {
  readonly #game: Game;
  readonly #camera: Camera;
  #selected: HexCoordinate;
  #constructionSite: number | null = null;
  #shipyardId: string | null = null;
  #screen: Screen = 'map';
  #planetTab: PlanetTab = 'overview';
  #selectedFleetId: string | null = null;
  #destinationFleetId: string | null = null;
  #notice: string | null = null;

  constructor(galaxy = createExampleGalaxy()) {
    this.#game = new Game(galaxy);
    this.#camera = new Camera(galaxy.homePlanet.position, galaxy.radius);
    this.#selected = galaxy.homePlanet.position;
  }

  // mvc-arkitektur: no write operations or hidden world data cross into views.
  get snapshot(): AppReadModel {
    return Object.freeze({
      research: this.#game.research,
      planetOrders: this.#game.planetOrders(),
      constructionSite: this.#constructionSite,
      shipyardId: this.#shipyardId,
      screen: this.#screen,
      planetTab: this.#planetTab,
      playerName: this.#game.galaxy.player.name,
      radius: this.#game.galaxy.radius,
      cells: this.#game.mapSnapshot(),
      selected:
        this.#game
          .mapSnapshot()
          .find((cell) => cell.position.key === this.#selected.key) ?? null,
      camera: this.#camera.snapshot,
      planet:
        this.#screen === 'planet'
          ? this.#game.planetAt(this.#selected)
            ? this.#game.planetSnapshot(this.#game.planetAt(this.#selected)!)
            : null
          : null,
      round: this.#game.round,
      phase: this.#game.phase,
      fleets: this.#game.fleetSnapshots(),
      selectedFleet: this.#selectedFleetId
        ? this.#game.fleet(this.#selectedFleetId)
        : null,
      destinationFleetId: this.#destinationFleetId,
      events: this.#game.events,
      notice: this.#notice,
    });
  }

  select(position: HexCoordinate): void {
    if (this.#screen !== 'map' || !this.#game.galaxy.cellAt(position)) return;
    if (this.#destinationFleetId) {
      this.#game.setDestination(this.#destinationFleetId, position);
      this.#destinationFleetId = null;
    } else this.#selected = position;
  }
  reportError(error: unknown): void {
    this.#notice =
      error instanceof Error
        ? error.message
        : 'The order could not be completed.';
  }
  clearNotice(): void {
    this.#notice = null;
  }

  selectPoint(point: Point): void {
    this.select(HexGeometry.fromPoint(this.#camera.screenToWorld(point)));
  }

  openPlanet(): void {
    if (this.#game.planetAt(this.#selected)) {
      this.#screen = 'planet';
      this.#constructionSite = null;
      this.#shipyardId = null;
    }
  }

  showPlanetTab(tab: PlanetTab): void {
    if (this.#screen === 'planet') this.#planetTab = tab;
  }

  openResearch(): void {
    this.#screen = 'research';
  }
  openMap(): void {
    this.#screen = 'map';
    this.#destinationFleetId = null;
  }
  openFleets(): void {
    this.#screen = 'fleets';
  }
  openFleet(id: string): void {
    if (this.#game.fleet(id)) {
      this.#selectedFleetId = id;
      this.#screen = 'fleets';
    }
  }
  pan(delta: Point): void {
    this.#camera.panBy(delta);
  }
  zoom(factor: number, anchor: Point): void {
    this.#camera.zoomAt(factor, anchor);
  }

  home(): void {
    this.#camera.reset();
    this.#selected = this.#game.galaxy.homePlanet.position;
  }

  openBuildSite(index: number | null): void {
    this.#constructionSite = index;
  }
  openShipyard(id: string | null): void {
    this.#shipyardId = id;
  }
  research(type: Technology | null): void {
    this.#game.selectResearch(type);
  }
  colonize(id: string): void {
    this.#game.colonize(id);
  }
  build(type: BuildType, slotIndex?: number): void {
    const planet = this.#game.planetAt(this.#selected);
    if (planet)
      this.#game.scheduleBuild(
        planet,
        type,
        slotIndex ?? this.#constructionSite ?? undefined,
      );
    this.#constructionSite = null;
  }
  scheduleShip(
    ship: ShipType,
    fleetId: string | null,
    factoryId?: string,
  ): void {
    const planet = this.#game.planetAt(this.#selected);
    if (planet) this.#game.scheduleShip(planet, ship, fleetId, factoryId);
  }
  moveProject(id: string, index: number): void {
    const planet = this.#game.planetAt(this.#selected);
    if (planet) this.#game.moveProject(planet, id, index);
  }
  setProjectFleet(id: string, fleetId: string | null): void {
    const planet = this.#game.planetAt(this.#selected);
    if (planet) this.#game.setProjectFleet(planet, id, fleetId);
  }
  cancelProject(id: string): void {
    const planet = this.#game.planetAt(this.#selected);
    if (planet) this.#game.cancelProject(planet, id);
  }
  toggleDemolition(id: string): void {
    const planet = this.#game.planetAt(this.#selected);
    if (planet) this.#game.toggleDemolition(planet, id);
  }
  produceFighter(): void {
    const planet = this.#game.planetAt(this.#selected);
    if (planet) this.#game.produceFighter(planet);
  }
  canBuild(type: BuildType): string | null {
    const planet = this.#game.planetAt(this.#selected);
    return planet
      ? this.#game.canBuild(planet, type)
      : 'No owned planet selected.';
  }
  selectFleet(id: string): void {
    this.#selectedFleetId = this.#game.fleet(id) ? id : null;
  }
  renameFleet(id: string, name: string): void {
    this.#game.renameFleet(id, name);
  }
  transferShips(
    source: string,
    ship: ShipType,
    amount: number,
    target: string | null,
  ): void {
    this.#game.transferShips(source, ship, amount, target);
  }
  createFleet(source: string): void {
    this.#selectedFleetId = this.#game.createFleet(source).id;
  }
  deleteFleet(id: string): void {
    this.#game.deleteFleet(id);
    if (this.#selectedFleetId === id) this.#selectedFleetId = null;
  }
  beginDestination(id: string): void {
    if (this.#game.fleet(id)) {
      this.#destinationFleetId = id;
      this.#screen = 'map';
    }
  }
  setDestination(id: string, q: number, r: number): void {
    this.#game.setDestination(id, new HexCoordinate(q, r));
  }
  clearDestination(id: string): void {
    this.#game.clearDestination(id);
  }
  startTurn(): readonly TurnFrame[] {
    this.#screen = 'map';
    this.#destinationFleetId = null;
    return this.#game.startTurn();
  }
  applyTurnFrame(frame: TurnFrame): void {
    this.#game.applyFrame(frame);
  }
  finishTurn(): void {
    this.#game.finishTurn();
  }
  continuePlanning(): void {
    this.#game.continuePlanning();
  }
}
