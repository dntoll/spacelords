import type { ProjectSupplySnapshot } from './ProjectSupply.js';
import { shipTransferIssue } from './FleetTransfer.js';
import { StarMapTrade, type MapTradeSnapshot } from './StarMapTrade.js';
import type { SaveRepository } from './SaveRepository.js';
import {
  SupplySelection,
  type SupplySelectionSnapshot,
  type SupplyOverview,
} from './SupplyOverview.js';
import {
  ResearchTreeCamera,
  type ResearchCameraSnapshot,
} from './ResearchTree.js';
import type { Component } from './Economy.js';
import { needsAttention, type Decision } from './Decisions.js';
import type { ShipmentSnapshot, TradeRouteSnapshot } from './Logistics.js';
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

export type PlanetTab = 'overview' | 'sites' | 'queue' | 'production';
export type ProductionCategory = 'Ships' | 'Components';
export type BuildingCategory =
  | 'All'
  | 'Resources'
  | 'Research'
  | 'Shipyards'
  | 'Components'
  | 'Terraforming';

export type Screen =
  | 'saves'
  | 'map'
  | 'planet'
  | 'build-selection'
  | 'research'
  | 'fleets'
  | 'supply'
  | 'decisions';

export interface SaveSlotSnapshot {
  readonly id: number;
  readonly lastPlayed: string | null;
  readonly round: number | null;
  readonly cells: readonly MapCell[];
  readonly error: string | null;
}

export interface AppReadModel {
  readonly planetTab: PlanetTab;
  readonly productionCategory: ProductionCategory;
  readonly productionProduct: string | null;
  readonly productionFleetId: string | null;
  readonly expandedProjectIds: readonly string[];
  readonly focusedProjectId: string | null;
  readonly projectSupply: readonly ProjectSupplySnapshot[];
  readonly decisions: readonly Decision[];
  readonly tradeRoutes: readonly TradeRouteSnapshot[];
  readonly supply: SupplyOverview;
  readonly shipments: readonly ShipmentSnapshot[];
  readonly supplySelection: SupplySelectionSnapshot;
  readonly mapTrade: MapTradeSnapshot;
  readonly ownedPlanets: readonly PlanetGameSnapshot[];
  readonly pendingEndTurn: boolean;
  readonly pendingResearchRemoval: Technology | null;
  readonly saveSlots: readonly SaveSlotSnapshot[];
  readonly pendingClearSlot: number | null;
  readonly research: ResearchSnapshot;
  readonly researchCamera: ResearchCameraSnapshot;
  readonly planetOrders: readonly PlanetOrderSnapshot[];
  readonly constructionSite: number | null;
  readonly screen: Screen;
  readonly buildSearch: string;
  readonly buildingCategory: BuildingCategory;
  readonly selectedBuilding: BuildType | null;
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
  readonly fleetNameEdit: {
    readonly id: string;
    readonly draft: string;
  } | null;
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
  #planetTab: PlanetTab = 'overview';
  #productionCategory: ProductionCategory = 'Ships';
  #productionProduct: string | null = null;
  #productionFleetId: string | null = null;
  #closedProjectIds = new Set<string>();
  #expandedProjectIds = new Set<string>();
  #focusedProjectId: string | null = null;
  #pendingEndTurn = false;
  #pendingResearchRemoval: Technology | null = null;
  #game: Game;
  #camera: Camera;
  #selected: HexCoordinate;
  #constructionSite: number | null = null;
  #screen: Screen = 'map';
  #buildSearch = '';
  #buildingCategory: BuildingCategory = 'All';
  #selectedBuilding: BuildType | null = null;
  readonly #researchCamera = new ResearchTreeCamera();
  readonly #supplySelection = new SupplySelection();
  readonly #mapTrade = new StarMapTrade(
    () => this.#game,
    () => this.#camera,
  );
  #returnSite: number | null = null;
  #selectedFleetId: string | null = null;
  #fleetNameEdit: { readonly id: string; readonly draft: string } | null = null;
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
    this.#mapTrade.clearSelection();
    this.#supplySelection.reset();
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
    this.#fleetNameEdit = null;
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
    const projectSupply =
      this.#screen === 'planet' && this.#planetTab === 'queue'
        ? this.#game.projectSupply(this.#game.planetAt(this.#selected)?.id)
        : [];
    return Object.freeze({
      planetTab: this.#planetTab,
      productionCategory: this.#productionCategory,
      productionProduct: this.#productionProduct,
      productionFleetId: this.#productionFleetId,
      expandedProjectIds: Object.freeze([
        ...this.#expandedProjectIds,
        ...(() => {
          const id = projectSupply[0]?.projectId;
          return id && !this.#closedProjectIds.has(id) ? [id] : [];
        })(),
      ]),
      focusedProjectId: this.#focusedProjectId,
      projectSupply,
      decisions: this.#game.decisions,
      tradeRoutes: this.#game.tradeRoutes,
      supply: this.#game.supplyOverview(),
      shipments: this.#game.shipments,
      supplySelection: this.#supplySelection.snapshot,
      mapTrade: this.#mapTrade.snapshot,
      ownedPlanets: this.#game.ownedPlanetSnapshots(),
      pendingEndTurn: this.#pendingEndTurn,
      pendingResearchRemoval: this.#pendingResearchRemoval,
      saveSlots: this.#saveSlots,
      pendingClearSlot: this.#pendingClearSlot,
      research: this.#game.research,
      researchCamera: this.#researchCamera.snapshot,
      planetOrders: this.#game.planetOrders(),
      constructionSite: this.#constructionSite,
      screen: this.#screen,
      buildSearch: this.#buildSearch,
      buildingCategory: this.#buildingCategory,
      selectedBuilding: this.#selectedBuilding,
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
            ? this.#game.planetSnapshot(
                this.#game.planetAt(this.#selected)!,
                this.#constructionSite ?? undefined,
              )
            : null
          : null,
      round: this.#game.round,
      phase: this.#game.phase,
      fleets: this.#game.fleetSnapshots(),
      selectedFleet: this.#selectedFleetId
        ? this.#game.fleet(this.#selectedFleetId)
        : null,
      shipTransfer: this.#shipTransfer,
      fleetNameEdit: this.#fleetNameEdit,
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
    if (!this.#isMapScreen()) return;
    if (!this.#game.galaxy.cellAt(position)) {
      if (this.#screen === 'fleets' && !this.#destinationFleetId) {
        this.cancelShipTransfer();
        this.cancelFleetRename();
        this.#mapFleetId = null;
      }
      return;
    }
    if (this.#destinationFleetId) {
      this.#game.setDestination(this.#destinationFleetId, position);
      this.#destinationFleetId = null;
    } else if (this.#mapTrade.snapshot.sourcePlanetId) {
      const world = HexGeometry.toPoint(position);
      const camera = this.#camera.snapshot;
      this.previewMapRoute({
        x: (world.x - camera.center.x) * camera.zoom,
        y: (world.y - camera.center.y) * camera.zoom,
      });
      this.commitMapRoute();
    } else {
      this.cancelShipTransfer();
      this.cancelFleetRename();
      this.#mapTrade.clearSelection();
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
    if (
      !this.#isMapScreen() ||
      this.#destinationFleetId ||
      this.#mapTrade.snapshot.sourcePlanetId
    )
      return null;
    return FleetMapLayout.hit(
      this.#game.fleetSnapshots(),
      this.#camera.screenToWorld(point),
    );
  }
  selectMapFleet(id: string): void {
    if (!this.#isMapScreen()) return;
    const fleet = this.#game.fleet(id);
    if (fleet && Object.values(fleet.ships).some((count) => count > 0)) {
      this.#mapTrade.clearSelection();
      this.#mapFleetId = id;
    }
  }
  hoverMapFleet(point: Point | null): boolean {
    const next = point ? this.fleetAtPoint(point) : null;
    const changed = this.#mapTrade.hover(
      this.#screen === 'fleets' || next ? null : point,
    );
    if (next === this.#hoveredFleetId) return changed;
    this.#hoveredFleetId = next;
    return true;
  }
  previewFleetDestination(point: Point): void {
    if (
      !this.#isMapScreen() ||
      !this.#mapFleetId ||
      this.#game.phase !== 'planning'
    )
      return;
    this.#fleetDragging = true;
    if (
      this.#screen === 'map' &&
      this.#mapTrade.hoverAssignment(this.#mapFleetId, point)
    ) {
      this.#fleetDestinationPreview = null;
      return;
    }
    const target = HexGeometry.fromPoint(this.#camera.screenToWorld(point));
    this.#fleetDestinationPreview =
      !this.#game.fleet(this.#mapFleetId)?.routeId &&
      this.#game.galaxy.cellAt(target)
        ? target
        : null;
  }
  commitFleetDestination(): void {
    const trade = this.#mapTrade.snapshot;
    if (
      this.#screen === 'map' &&
      this.#mapFleetId &&
      trade.hoveredRouteIds.length
    ) {
      const id = this.#mapFleetId;
      const candidates = trade.hoveredRouteIds;
      this.cancelMapPointer();
      if (candidates.length > 1) this.#mapTrade.choose(candidates, id);
      else this.assignMapTradeFleet(candidates[0]!, id);
      return;
    }
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
  cancelMapPointer(keepRouteSource = false): void {
    this.#mapTrade.cancel(keepRouteSource);
    this.#hoveredFleetId = null;
    this.#fleetDestinationPreview = null;
    this.#fleetDragging = false;
  }

  selectPoint(point: Point): void {
    const world = this.#camera.screenToWorld(point);
    const hex = HexGeometry.fromPoint(world);
    if (
      this.#screen === 'map' &&
      !this.#destinationFleetId &&
      !this.#mapTrade.snapshot.sourcePlanetId
    ) {
      const cell = this.#game
        .mapSnapshot()
        .find((c) => c.position.key === hex.key);
      const center = HexGeometry.toPoint(hex);
      const onPlanet =
        cell?.object?.kind === 'planet' &&
        Math.hypot(world.x - center.x, world.y - center.y) <=
          Math.max(8.5, 12 / this.#camera.snapshot.zoom);
      const routes = onPlanet ? [] : this.#mapTrade.hits(point);
      if (routes.length === 1) {
        this.selectMapRoute(routes[0]!);
        return;
      }
      if (routes.length > 1) {
        this.#mapFleetId = null;
        this.#mapTrade.clearSelection();
        this.#mapTrade.choose(routes);
        return;
      }
    }
    this.select(hex);
  }
  mapRouteDragSource(point: Point): string | null {
    if (
      this.#screen !== 'map' ||
      this.#destinationFleetId ||
      this.#mapFleetId ||
      this.#mapTrade.snapshot.sourcePlanetId ||
      this.#mapTrade.snapshot.routeId
    )
      return null;
    const world = this.#camera.screenToWorld(point);
    const planet = this.#game
      .ownedPlanetSnapshots()
      .find((p) => p.position.key === this.#selected.key);
    if (!planet) return null;
    const center = HexGeometry.toPoint(planet.position);
    return Math.hypot(world.x - center.x, world.y - center.y) <=
      Math.max(8.5, 12 / this.#camera.snapshot.zoom)
      ? planet.id
      : null;
  }
  beginMapRoute(id: string): void {
    if (this.#screen !== 'map') return;
    this.cancelShipTransfer();
    this.cancelFleetRename();
    this.#mapFleetId = null;
    this.#destinationFleetId = null;
    this.#mapTrade.begin(id);
  }
  previewMapRoute(point: Point): void {
    this.#mapTrade.preview(point);
  }
  commitMapRoute(): void {
    if (this.#mapTrade.commit()) this.#mapFleetId = null;
  }
  selectMapRoute(id: string): void {
    if (this.#screen === 'fleets') this.openMap();
    this.cancelShipTransfer();
    this.cancelFleetRename();
    this.#mapFleetId = null;
    this.#mapTrade.selectRoute(id);
  }
  assignMapTradeFleet(routeId: string, fleetId: string): void {
    this.#mapTrade.assign(fleetId, routeId);
    this.#mapFleetId = null;
  }

  openPlanet(id?: string): void {
    const planet = id
      ? this.#game
          .ownedPlanetSnapshots()
          .find((candidate) => candidate.id === id)
      : this.#game.planetAt(this.#selected);
    if (planet) {
      this.#selected = planet.position;
      this.#screen = 'planet';
      this.#planetTab = 'overview';
      this.#productionCategory = 'Ships';
      this.#productionProduct = null;
      this.#productionFleetId = null;
      this.#closedProjectIds.clear();
      this.#expandedProjectIds = new Set();
      const head = (
        'projects' in planet ? planet : this.#game.planetSnapshot(planet)
      )?.projects[0];
      if (head) this.#expandedProjectIds.add(head.id);
      this.#focusedProjectId = null;
      this.#constructionSite = null;
      this.#returnSite = null;
    }
  }

  selectPlanetTab(tab: PlanetTab): void {
    if (this.#screen !== 'planet') return;
    this.#planetTab = tab;
    this.#focusedProjectId = null;
  }
  selectProduction(category: ProductionCategory, product: string | null): void {
    this.#productionCategory = category;
    this.#productionProduct = product;
  }
  selectProductionFleet(id: string | null): void {
    this.#productionFleetId = id;
  }
  toggleProjectSupply(id: string, open: boolean): void {
    if (open) {
      this.#expandedProjectIds.add(id);
      this.#closedProjectIds.delete(id);
    } else {
      this.#expandedProjectIds.delete(id);
      this.#closedProjectIds.add(id);
    }
  }
  openPlanetProject(planetId: string, projectId: string): void {
    const current = this.#game.planetAt(this.#selected);
    if (current?.id !== planetId || this.#screen !== 'planet')
      this.openPlanet(planetId);
    if (this.#game.planetAt(this.#selected)?.id !== planetId) return;
    this.#planetTab = 'queue';
    this.#expandedProjectIds.add(projectId);
    this.#closedProjectIds.delete(projectId);
    this.#focusedProjectId = projectId;
  }

  openResearch(): void {
    this.#screen = 'research';
  }
  #isMapScreen(): boolean {
    return this.#screen === 'map' || this.#screen === 'fleets';
  }
  #openMapScreen(screen: 'map' | 'fleets'): void {
    this.cancelMapPointer();
    this.cancelShipTransfer();
    this.cancelFleetRename();
    if (screen === 'fleets' || this.#screen === 'fleets')
      this.#mapTrade.clearSelection();
    this.#destinationFleetId = null;
    this.#screen = screen;
  }
  openMap(): void {
    this.#openMapScreen('map');
  }
  openFleets(): void {
    this.#openMapScreen('fleets');
  }
  openFleet(id: string): void {
    const fleet = this.#game.fleet(id);
    if (fleet) {
      this.openFleets();
      this.#selectedFleetId = id;
      this.#mapFleetId = fleet.position ? id : null;
      if (fleet.position) this.#camera.focus(fleet.position);
    }
  }
  pan(delta: Point): void {
    this.#camera.panBy(delta);
  }
  zoom(factor: number, anchor: Point): void {
    this.#camera.zoomAt(factor, anchor);
  }

  home(): void {
    this.#mapTrade.clearSelection();
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
      this.#planetTab = 'sites';
      return;
    }
    if (this.#screen !== 'planet' || this.#game.phase !== 'planning') return;
    const planet = this.#game.planetAt(this.#selected);
    const site = planet
      ? this.#game.planetSnapshot(planet)?.sites[index]
      : null;
    if (!site || site.locked || site.building || site.project) return;
    this.#constructionSite = index;
    this.#buildSearch = '';
    this.#buildingCategory = 'All';
    this.#selectedBuilding = null;
    this.#screen = 'build-selection';
  }
  searchBuildings(query: string): void {
    this.#buildSearch = query;
    this.#selectedBuilding = null;
  }
  selectBuildingCategory(category: BuildingCategory): void {
    this.#buildingCategory = category;
    this.#selectedBuilding = null;
  }
  selectBuilding(type: BuildType | null): void {
    this.#selectedBuilding = type;
  }
  research(type: Technology | null): void {
    this.#game.selectResearch(type);
  }
  resizeResearch(width: number, height: number): void {
    this.#researchCamera.setTechnologies(this.#game.research.available);
    this.#researchCamera.resize(width, height);
  }
  panResearch(delta: Point): void {
    this.#researchCamera.panBy(delta);
  }
  zoomResearch(factor: number, anchor: Point): void {
    this.#researchCamera.zoomAt(factor, anchor);
  }
  fitResearch(): void {
    this.#researchCamera.fit();
  }
  searchSupply(query: string): void {
    this.#supplySelection.search(query);
  }
  selectSupplyMaterial(material: string | null): void {
    if (
      material === null ||
      this.#game.supplyOverview().materials.includes(material)
    )
      this.#supplySelection.select(material);
  }
  toggleSupplyPlanet(id: string, inventory = false): void {
    if (this.#game.ownedPlanetSnapshots().some((p) => p.id === id))
      this.#supplySelection.toggle(id, inventory);
  }
  openSupplyPlanet(id: string): void {
    const planet = this.#game.ownedPlanetSnapshots().find((p) => p.id === id);
    if (planet) {
      this.#selected = planet.position;
      this.openPlanet();
    }
  }
  openSupplyRoute(id: string): void {
    const route = this.#game.tradeRoutes.find((r) => r.id === id);
    if (!route) return;
    this.cancelMapPointer();
    this.openMap();
    this.#selected = route.start;
    this.#camera.focus(route.start);
    this.selectMapRoute(id);
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
  openSupply(): void {
    this.cancelMapPointer();
    this.#screen = 'supply';
  }
  openDecisions(): void {
    this.#screen = 'decisions';
  }
  openDecision(id?: string): void {
    const decision = id
      ? this.#game.decisions.find((d) => d.id === id)
      : this.#game.decisions.find(needsAttention);
    if (!decision) {
      this.openDecisions();
      return;
    }
    if (decision.kind === 'research') this.openResearch();
    else if (decision.routeId) this.openSupplyRoute(decision.routeId);
    else if (decision.fleetId) this.openFleet(decision.fleetId);
    else {
      const planet = this.#game
        .ownedPlanetSnapshots()
        .find((p) => p.id === decision.planetId);
      if (planet && decision.id.startsWith('supply-')) {
        this.#supplySelection.select(null);
        this.#supplySelection.expand(planet.id);
        this.openSupply();
      } else if (planet) {
        this.#selected = planet.position;
        this.openPlanet();
      }
    }
  }
  skipDecision(id: string): void {
    this.#game.skipDecision(id);
  }
  muteDecision(id: string): void {
    this.#game.muteDecision(id);
  }
  unmuteDecision(id: string): void {
    this.#game.unmuteDecision(id);
  }
  requestEndTurn(): boolean {
    this.#pendingEndTurn = this.#game.decisions.some(needsAttention);
    return !this.#pendingEndTurn;
  }
  cancelEndTurn(): void {
    this.#pendingEndTurn = false;
  }
  createTradeRoute(a: string, b: string): void {
    const id = this.#game.createTradeRoute(a, b);
    if (this.#screen === 'map') this.selectMapRoute(id);
  }
  assignTradeFleet(routeId: string, fleetId: string): void {
    if (this.#screen === 'map') this.assignMapTradeFleet(routeId, fleetId);
    else this.#game.assignTradeFleet(routeId, fleetId);
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
  scheduleComponent(component: Component): void {
    const planet = this.#game.planetAt(this.#selected);
    if (planet) this.#game.scheduleComponent(planet, component);
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
  beginFleetRename(id: string): void {
    const fleet = this.#game.fleet(id);
    if (!fleet || this.#game.phase !== 'planning') return;
    this.#fleetNameEdit = Object.freeze({ id, draft: fleet.name });
  }
  editFleetName(draft: string): void {
    if (this.#fleetNameEdit)
      this.#fleetNameEdit = Object.freeze({ ...this.#fleetNameEdit, draft });
  }
  cancelFleetRename(): void {
    this.#fleetNameEdit = null;
  }
  submitFleetName(): void {
    if (!this.#fleetNameEdit) return;
    this.renameFleet(this.#fleetNameEdit.id, this.#fleetNameEdit.draft);
    this.cancelFleetRename();
  }
  chooseShipTransfer(fleetId: string, ship: ShipType): void {
    if (this.#game.phase !== 'planning') return;
    const fleet = this.#game.fleet(fleetId);
    if (!fleet || shipTransferIssue(fleet) || !(fleet.ships[ship] > 0)) return;
    this.#selectedFleetId = fleetId;
    if (this.#isMapScreen()) this.#mapFleetId = fleetId;
    this.#shipTransfer =
      this.#shipTransfer?.fleetId === fleetId &&
      this.#shipTransfer.ship === ship
        ? null
        : Object.freeze({ fleetId, ship });
  }
  cancelShipTransfer(): void {
    this.#shipTransfer = null;
  }
  transferChosenShip(target: string | null): void {
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
    const received = this.#game.transferShips(source, ship, amount, target);
    this.#shipTransfer = null;
    this.#selectedFleetId = target ?? received.id;
    if (this.#isMapScreen()) {
      this.#mapFleetId = received.id;
      if (!target) this.beginFleetRename(received.id);
    }
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
    this.cancelShipTransfer();
    this.cancelFleetRename();
    if (this.#game.fleet(id)?.routeId) {
      this.openSupplyRoute(this.#game.fleet(id)!.routeId!);
      return;
    }
    if (this.#game.fleet(id)) {
      this.#mapTrade.clearSelection();
      this.#destinationFleetId = id;
      if (!this.#isMapScreen()) this.#screen = 'map';
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
    if (this.#screen !== 'decisions') this.#screen = 'map';
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
