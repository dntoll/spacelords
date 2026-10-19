import type { SaveRepository } from './SaveRepository.js';
import type { Decision } from './Decisions.js';
import type { TradeRouteSnapshot } from './Logistics.js';
import { FleetMapLayout } from './FleetMapLayout.js';
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

export type Screen =
  | 'saves'
  | 'map'
  | 'planet'
  | 'build-selection'
  | 'research'
  | 'fleets'
  | 'trade-routes'
  | 'decisions';

export interface SaveSlotSnapshot {
  readonly id: number;
  readonly lastPlayed: string | null;
  readonly round: number | null;
  readonly cells: readonly MapCell[];
  readonly error: string | null;
}

export interface AppReadModel {
  readonly decisions: readonly Decision[];
  readonly tradeRoutes: readonly TradeRouteSnapshot[];
  readonly ownedPlanets: readonly PlanetGameSnapshot[];
  readonly pendingEndTurn: boolean;
  readonly pendingResearchRemoval: Technology | null;
  readonly saveSlots: readonly SaveSlotSnapshot[];
  readonly pendingClearSlot: number | null;
  readonly research: ResearchSnapshot;
  readonly planetOrders: readonly PlanetOrderSnapshot[];
  readonly constructionSite: number | null;
  readonly screen: Screen;
  readonly buildSearch: string;
  readonly returnSite: number | null;
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
  readonly shipTransfer: {
    readonly fleetId: string;
    readonly ship: ShipType;
  } | null;
  readonly mapFleetId: string | null;
  readonly hoveredFleetId: string | null;
  readonly fleetDestinationPreview: HexCoordinate | null;
  readonly fleetDragging: boolean;
  readonly destinationFleetId: string | null;
  readonly events: readonly GameEvent[];
  readonly notice: string | null;
}

export class AppModel {
  #pendingEndTurn = false;
  #pendingResearchRemoval: Technology | null = null;
  #game: Game;
  #camera: Camera;
  #selected: HexCoordinate;
  #constructionSite: number | null = null;
  #screen: Screen = 'map';
  #buildSearch = '';
  #returnSite: number | null = null;
  #selectedFleetId: string | null = null;
  #shipTransfer: { readonly fleetId: string; readonly ship: ShipType } | null =
    null;
  #mapFleetId: string | null = null;
  #hoveredFleetId: string | null = null;
  #fleetDestinationPreview: HexCoordinate | null = null;
  #fleetDragging = false;
  #destinationFleetId: string | null = null;
  #notice: string | null = null;

  #activeSlot: number | null = null;
  #pendingClearSlot: number | null = null;
  #saveSlots: readonly SaveSlotSnapshot[] = [];

  constructor(
    galaxy = createExampleGalaxy(),
    private readonly saves?: SaveRepository,
  ) {
    this.#game = new Game(galaxy);
    this.#camera = new Camera(galaxy.homePlanet.position, galaxy.radius);
    this.#selected = galaxy.homePlanet.position;
    if (saves) {
      this.#screen = 'saves';
      this.#refreshSlots();
    }
  }

  #refreshSlots(): void {
    this.#saveSlots = Object.freeze(
      [1, 2, 3].map((id) => {
        try {
          const saved = this.saves?.load(id);
          const game = saved ? Game.restore(saved.state) : null;
          return Object.freeze({
            id,
            lastPlayed: saved?.lastPlayed ?? null,
            round: game?.round ?? null,
            cells: Object.freeze(
              game?.mapSnapshot().filter((cell) => cell.visible) ?? [],
            ),
            error: null,
          });
        } catch {
          return Object.freeze({
            id,
            lastPlayed: null,
            round: null,
            cells: Object.freeze([]),
            error: 'Saved game unavailable. Clear this slot to start again.',
          });
        }
      }),
    );
  }

  startSlot(id: number): void {
    if (this.#screen !== 'saves' || !this.saves || ![1, 2, 3].includes(id))
      return;
    const saved = this.saves.load(id);
    const game = saved
      ? Game.restore(saved.state)
      : new Game(createExampleGalaxy());
    // Save before switching so a failed write leaves the previous session intact.
    this.saves.save(id, {
      lastPlayed: new Date().toISOString(),
      state: game.exportState(),
    });
    this.#game = game;
    this.#pendingEndTurn = false;
    this.#pendingResearchRemoval = null;
    this.#activeSlot = id;
    this.#camera = new Camera(
      game.galaxy.homePlanet.position,
      game.galaxy.radius,
    );
    this.#selected = game.galaxy.homePlanet.position;
    this.#screen = 'map';
    this.#pendingClearSlot = null;
    this.#constructionSite = null;
    this.#selectedFleetId = null;
    this.#shipTransfer = null;
    this.#mapFleetId = null;
    this.#destinationFleetId = null;
    this.#returnSite = null;
    this.#buildSearch = '';
    this.cancelMapPointer();
  }

  save(): void {
    if (
      this.saves &&
      this.#activeSlot !== null &&
      this.#screen !== 'saves' &&
      this.#game.phase !== 'simulating'
    )
      this.saves.save(this.#activeSlot, {
        lastPlayed: new Date().toISOString(),
        state: this.#game.exportState(),
      });
  }

  openSaves(): void {
    if (!this.saves || this.#game.phase === 'simulating') return;
    this.save();
    this.cancelMapPointer();
    this.#screen = 'saves';
    this.#pendingClearSlot = null;
    this.#refreshSlots();
  }
  requestClearSlot(id: number): void {
    if (this.#screen === 'saves' && [1, 2, 3].includes(id))
      this.#pendingClearSlot = id;
  }
  cancelClearSlot(): void {
    this.#pendingClearSlot = null;
  }
  confirmClearSlot(): void {
    if (this.#screen !== 'saves' || this.#pendingClearSlot === null) return;
    this.saves?.clear(this.#pendingClearSlot);
    if (this.#activeSlot === this.#pendingClearSlot) this.#activeSlot = null;
    this.#pendingClearSlot = null;
    this.#refreshSlots();
  }

  // mvc-arkitektur: no write operations or hidden world data cross into views.
  get snapshot(): AppReadModel {
    return Object.freeze({
      decisions: this.#game.decisions,
      tradeRoutes: this.#game.tradeRoutes,
      ownedPlanets: this.#game.ownedPlanetSnapshots(),
      pendingEndTurn: this.#pendingEndTurn,
      pendingResearchRemoval: this.#pendingResearchRemoval,
      saveSlots: this.#saveSlots,
      pendingClearSlot: this.#pendingClearSlot,
      research: this.#game.research,
      planetOrders: this.#game.planetOrders(),
      constructionSite: this.#constructionSite,
      screen: this.#screen,
      buildSearch: this.#buildSearch,
      returnSite: this.#returnSite,
      playerName: this.#game.galaxy.player.name,
      radius: this.#game.galaxy.radius,
      cells: this.#game.mapSnapshot(),
      selected:
        this.#game
          .mapSnapshot()
          .find((cell) => cell.position.key === this.#selected.key) ?? null,
      camera: this.#camera.snapshot,
      planet:
        this.#screen === 'planet' || this.#screen === 'build-selection'
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
      shipTransfer: this.#shipTransfer,
      mapFleetId: this.#mapFleetId,
      hoveredFleetId: this.#hoveredFleetId,
      fleetDestinationPreview: this.#fleetDestinationPreview,
      fleetDragging: this.#fleetDragging,
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
    } else {
      this.#selected = position;
      this.#mapFleetId = null;
    }
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

  fleetAtPoint(point: Point): string | null {
    if (this.#screen !== 'map' || this.#destinationFleetId) return null;
    return FleetMapLayout.hit(
      this.#game.fleetSnapshots(),
      this.#camera.screenToWorld(point),
    );
  }
  selectMapFleet(id: string): void {
    if (this.#screen !== 'map') return;
    const fleet = this.#game.fleet(id);
    if (fleet && Object.values(fleet.ships).some((count) => count > 0))
      this.#mapFleetId = id;
  }
  hoverMapFleet(point: Point | null): boolean {
    const next = point ? this.fleetAtPoint(point) : null;
    if (next === this.#hoveredFleetId) return false;
    this.#hoveredFleetId = next;
    return true;
  }
  previewFleetDestination(point: Point): void {
    if (
      this.#screen !== 'map' ||
      !this.#mapFleetId ||
      this.#game.fleet(this.#mapFleetId)?.routeId ||
      this.#game.phase !== 'planning'
    )
      return;
    const target = HexGeometry.fromPoint(this.#camera.screenToWorld(point));
    this.#fleetDragging = true;
    this.#fleetDestinationPreview = this.#game.galaxy.cellAt(target)
      ? target
      : null;
  }
  commitFleetDestination(): void {
    try {
      if (
        this.#mapFleetId &&
        this.#fleetDragging &&
        this.#fleetDestinationPreview
      )
        this.#game.setDestination(
          this.#mapFleetId,
          this.#fleetDestinationPreview,
        );
    } finally {
      this.cancelMapPointer();
    }
  }
  cancelMapPointer(): void {
    this.#hoveredFleetId = null;
    this.#fleetDestinationPreview = null;
    this.#fleetDragging = false;
  }

  selectPoint(point: Point): void {
    this.select(HexGeometry.fromPoint(this.#camera.screenToWorld(point)));
  }

  openPlanet(): void {
    if (this.#game.planetAt(this.#selected)) {
      this.#screen = 'planet';
      this.#constructionSite = null;
      this.#returnSite = null;
    }
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
    if (!this.#selectedFleetId)
      this.#selectedFleetId = this.#game.fleetSnapshots()[0]?.id ?? null;
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
    this.#mapFleetId = null;
  }

  openBuildSite(index: number | null): void {
    if (index === null) {
      if (this.#screen !== 'build-selection') return;
      this.#returnSite = this.#constructionSite;
      this.#constructionSite = null;
      this.#screen = 'planet';
      return;
    }
    if (this.#screen !== 'planet' || this.#game.phase !== 'planning') return;
    const planet = this.#game.planetAt(this.#selected);
    const site = planet
      ? this.#game.planetSnapshot(planet)?.sites[index]
      : null;
    if (!site || site.building || site.project) return;
    this.#constructionSite = index;
    this.#buildSearch = '';
    this.#screen = 'build-selection';
  }
  searchBuildings(query: string): void {
    this.#buildSearch = query;
  }
  research(type: Technology | null): void {
    this.#game.selectResearch(type);
  }
  moveResearch(type: Technology, index: number): void {
    this.#game.moveResearch(type, index);
  }
  requestResearchRemoval(type: Technology | null): void {
    this.#pendingResearchRemoval = type;
  }
  confirmResearchRemoval(): void {
    if (this.#pendingResearchRemoval)
      this.#game.removeResearch(this.#pendingResearchRemoval);
    this.#pendingResearchRemoval = null;
  }
  openTradeRoutes(): void {
    this.#screen = 'trade-routes';
  }
  openDecisions(): void {
    this.#screen = 'decisions';
  }
  openDecision(id?: string): void {
    const decision = id
      ? this.#game.decisions.find((d) => d.id === id)
      : this.#game.decisions.find((d) => !d.skipped);
    if (!decision) {
      this.openDecisions();
      return;
    }
    if (decision.kind === 'research') this.openResearch();
    else if (decision.kind === 'route') this.openTradeRoutes();
    else if (decision.fleetId) this.openFleet(decision.fleetId);
    else {
      const planet = this.#game
        .ownedPlanetSnapshots()
        .find((p) => p.id === decision.planetId);
      if (planet) {
        this.#selected = planet.position;
        this.openPlanet();
      }
    }
  }
  skipDecision(id: string): void {
    this.#game.skipDecision(id);
  }
  requestEndTurn(): boolean {
    this.#pendingEndTurn = this.#game.decisions.some((d) => !d.skipped);
    return !this.#pendingEndTurn;
  }
  cancelEndTurn(): void {
    this.#pendingEndTurn = false;
  }
  createTradeRoute(a: string, b: string): void {
    this.#game.createTradeRoute(a, b);
  }
  assignTradeFleet(routeId: string, fleetId: string): void {
    this.#game.assignTradeFleet(routeId, fleetId);
  }
  releaseTradeFleet(id: string): void {
    this.#game.releaseTradeFleet(id);
  }
  closeTradeRoute(id: string): void {
    this.#game.closeTradeRoute(id);
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
    if (this.#screen === 'build-selection') this.openBuildSite(null);
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
  chooseShipTransfer(fleetId: string, ship: ShipType): void {
    if (this.#game.phase !== 'planning') return;
    const fleet = this.#game.fleet(fleetId);
    if (!fleet || !(fleet.ships[ship] > 0)) return;
    this.#selectedFleetId = fleetId;
    this.#shipTransfer =
      this.#shipTransfer?.fleetId === fleetId &&
      this.#shipTransfer.ship === ship
        ? null
        : Object.freeze({ fleetId, ship });
  }
  cancelShipTransfer(): void {
    this.#shipTransfer = null;
  }
  transferChosenShip(target: string): void {
    if (this.#shipTransfer)
      this.transferShips(
        this.#shipTransfer.fleetId,
        this.#shipTransfer.ship,
        1,
        target,
      );
  }
  transferShips(
    source: string,
    ship: ShipType,
    amount: number,
    target: string | null,
  ): void {
    this.#game.transferShips(source, ship, amount, target);
    this.#shipTransfer = null;
    if (target) this.#selectedFleetId = target;
  }
  createFleet(source?: string): void {
    this.#selectedFleetId = this.#game.createFleet(source).id;
  }
  deleteFleet(id: string): void {
    this.#game.deleteFleet(id);
    if (this.#selectedFleetId === id)
      this.#selectedFleetId = this.#game.fleetSnapshots()[0]?.id ?? null;
  }
  beginDestination(id: string): void {
    if (this.#game.fleet(id)?.routeId) {
      this.openTradeRoutes();
      return;
    }
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
    this.#pendingEndTurn = false;
    this.cancelMapPointer();
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
}
