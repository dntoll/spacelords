import {
  EventPlayback,
  type EventPlaybackSnapshot,
  type EventDecision,
} from './EventPlayback.js';
import type {
  TurnMovementPlayback,
  TurnMovement,
} from './TurnMovementPlayback.js';
import type {
  ExplorationOrder,
  SavedTurnSimulation,
} from './TurnSimulation.js';
import { pirateAsFleet, type PirateSnapshot } from './PirateFleet.js';
import {
  isMapScreen,
  BUILD_RING_EXTENT,
  type MapScreen,
  type MapViewport,
  type MapProductionCategory,
  type ProductionMapSnapshot,
  type ProductionGuidance,
  type MapProblem,
} from './ProductionMap.js';
import {
  emptySupplyChain,
  type SupplyChainSnapshot,
} from './ProjectSupplyChain.js';
import type { ProjectSupplySnapshot } from './ProjectSupply.js';
import { shipTransferIssue } from './FleetTransfer.js';
import { StarMapTrade, type MapTradeSnapshot } from './StarMapTrade.js';
import type { SaveRepository } from './SaveRepository.js';
import type { SupplyOverview } from './SupplyOverview.js';
import {
  ResearchTreeCamera,
  type ResearchCameraSnapshot,
} from './ResearchTree.js';
import type { Component } from './Economy.js';
import type { WreckSnapshot, ShipyardSnapshot } from './Salvage.js';
import { hitSalvageMarker } from './SalvageMapLayout.js';
import {
  decisionScreen,
  needsAttention,
  type Decision,
  type DecisionScreen,
} from './Decisions.js';
import type { ShipmentSnapshot, TradeRouteSnapshot } from './Logistics.js';
import { FleetMapLayout } from './FleetMapLayout.js';
import { Camera, type CameraSnapshot } from './Camera.js';
import { createExampleGalaxy } from './exampleGalaxy.js';
import {
  Game,
  BUILDINGS,
  projectDefinition,
  type ProjectType,
  type ProductionReceipt,
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
  | 'route'
  | 'production'
  | 'decisions';

export interface SaveSlotSnapshot {
  readonly id: number;
  readonly lastPlayed: string | null;
  readonly round: number | null;
  readonly cells: readonly MapCell[];
  readonly error: string | null;
}

export interface AppReadModel {
  readonly turnMovement: TurnMovement | null;
  readonly eventPlayback: EventPlaybackSnapshot | null;
  readonly presentedEventIds: readonly string[];
  readonly wrecks: readonly WreckSnapshot[];
  readonly shipyards: readonly ShipyardSnapshot[];
  readonly salvageSelection: string | null;
  readonly shipyardPlacement: {
    readonly planetId: string;
    readonly site: number | undefined;
    readonly yardId: string | null;
    readonly choices: readonly HexCoordinate[];
  } | null;
  readonly planetTab: PlanetTab;
  readonly productionCategory: ProductionCategory;
  readonly productionProduct: string | null;
  readonly productionFleetId: string | null;
  readonly expandedProjectIds: readonly string[];
  readonly focusedProjectId: string | null;
  readonly projectSupply: readonly ProjectSupplySnapshot[];
  readonly decisions: readonly Decision[];
  readonly attentionScreens: readonly DecisionScreen[];
  readonly tradeRoutes: readonly TradeRouteSnapshot[];
  readonly supply: SupplyOverview;
  readonly shipments: readonly ShipmentSnapshot[];
  readonly productionMap: ProductionMapSnapshot;
  readonly productionGuidance: ProductionGuidance | null;
  readonly supplyChain: SupplyChainSnapshot;
  readonly mapProblems: readonly MapProblem[];
  readonly mapTrade: MapTradeSnapshot;
  readonly ownedPlanets: readonly PlanetGameSnapshot[];
  readonly pendingEndTurn: boolean;
  readonly pendingResearchRemoval: Technology | null;
  readonly saveSlots: readonly SaveSlotSnapshot[];
  readonly pendingClearSlot: number | null;
  readonly research: ResearchSnapshot;
  readonly researchCamera: ResearchCameraSnapshot;
  readonly inspectedResearch: Technology | null;
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
  readonly selectedPlanetInfo: ReturnType<Game['planetKnowledge']>;
  readonly camera: CameraSnapshot;
  readonly planet: PlanetGameSnapshot | null;
  readonly round: number;
  readonly phase: GamePhase;
  readonly interruption: SavedTurnSimulation | null;
  readonly fleets: readonly FleetSnapshot[];
  readonly pirates: readonly PirateSnapshot[];
  readonly selectedFleet: FleetSnapshot | null;
  readonly fleetNameEdit: {
    readonly id: string;
    readonly draft: string;
  } | null;
  readonly shipTransfer: {
    readonly fleetId: string;
    readonly shipId?: string | undefined;
    readonly ship: ShipType;
  } | null;
  readonly mapFleetId: string | null;
  readonly hoveredFleetId: string | null;
  readonly fleetDestinationPreview: HexCoordinate | null;
  readonly fleetDragging: boolean;
  readonly destinationFleetId: string | null;
  readonly events: readonly GameEvent[];
  readonly notice: string | null;
  readonly productionReceipt: ProductionReceipt | null;
}

export class AppModel {
  #movementPlayback: TurnMovementPlayback | null = null;
  #movementOrigin: AppReadModel | null = null;
  #eventPlayback: EventPlayback | null = null;
  readonly #presentedEventIds = new Set<string>();
  #eventCamera: Camera | null = null;
  #turnContext: {
    readonly screen: Screen;
    readonly selected: HexCoordinate;
    readonly mapFleetId: string | null;
    readonly selectedFleetId: string | null;
    readonly salvageSelection: string | null;
    readonly camera: CameraSnapshot;
  } | null = null;
  #salvageSelection: string | null = null;
  #shipyardPlacement: AppReadModel['shipyardPlacement'] = null;
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
  #inspectedResearch: Technology | null = null;
  #mapProductionCategory: MapProductionCategory = 'Buildings';
  #mapProductionPage = 0;
  #mapProductionOption: ProjectType | null = null;
  #mapProjectId: string | null = null;
  #mapViewport: MapViewport | null = null;
  readonly #mapTrade = new StarMapTrade(
    () => this.#game,
    () => this.#camera,
  );
  #returnSite: number | null = null;
  #selectedFleetId: string | null = null;
  #fleetNameEdit: { readonly id: string; readonly draft: string } | null = null;
  #shipTransfer: {
    readonly fleetId: string;
    readonly ship: ShipType;
    readonly shipId?: string | undefined;
  } | null = null;
  #mapFleetId: string | null = null;
  #hoveredFleetId: string | null = null;
  #fleetDestinationPreview: HexCoordinate | null = null;
  #fleetDragging = false;
  #destinationFleetId: string | null = null;
  #notice: string | null = null;
  #productionReceipt: ProductionReceipt | null = null;

  #activeSlot: number | null = null;
  #pendingClearSlot: number | null = null;
  #saveSlots: readonly SaveSlotSnapshot[] = [];

  constructor(
    private readonly initialGalaxy = createExampleGalaxy(),
    private readonly saves?: SaveRepository,
  ) {
    const galaxy = this.initialGalaxy;
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
              game?.mapSnapshot().filter((cell) => cell.explored) ?? [],
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
      : new Game(this.initialGalaxy);
    // Save before switching so a failed write leaves the previous session intact.
    this.saves.save(id, {
      lastPlayed: new Date().toISOString(),
      state: game.exportState(),
    });
    this.#mapTrade.clearSelection();
    this.#mapProductionCategory = 'Buildings';
    this.#mapProductionPage = 0;
    this.#mapProductionOption = null;
    this.#mapProjectId = null;
    this.#game = game;
    this.#inspectedResearch = null;
    this.#eventPlayback = null;
    this.#presentedEventIds.clear();
    for (const eventId of game.interruption?.presentedEventIds ?? [])
      this.#presentedEventIds.add(eventId);
    this.#movementPlayback = null;
    this.#movementOrigin = null;
    this.#eventCamera = null;
    this.#turnContext = null;
    this.#salvageSelection = null;
    this.#shipyardPlacement = null;
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
    this.#productionReceipt = null;
    if (game.interruption?.handling) this.#focusInterruptedFleet();
    else if (game.phase === 'interrupted') this.beginEventPlayback();
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
    if (this.#movementPlayback && this.#movementOrigin) {
      return Object.freeze({
        ...this.#movementOrigin,
        screen: 'map',
        phase: 'simulating',
        turnMovement: this.#movementPlayback.current,
        camera: this.#eventCamera!.snapshot,
        selected: null,
        mapFleetId: this.#movementPlayback.current?.fleetId ?? null,
        fleets: this.#movementPlayback.fleets,
        pirates: this.#movementPlayback.pirates,
        destinationFleetId: null,
      });
    }
    const decisions = this.#game.decisions;
    const projectSupply =
      (this.#screen === 'planet' && this.#planetTab === 'queue') ||
      this.#screen === 'production'
        ? this.#game.projectSupply(this.#game.planetAt(this.#selected)?.id)
        : [];
    return Object.freeze({
      turnMovement: null,
      eventPlayback: this.#eventPlayback?.snapshot ?? null,
      presentedEventIds: Object.freeze([
        ...new Set([
          ...this.#presentedEventIds,
          ...(this.#game.interruption?.presentedEventIds ?? []),
        ]),
      ]),
      wrecks: this.#game.wrecks,
      shipyards: this.#game.shipyards,
      salvageSelection: this.#salvageSelection,
      shipyardPlacement: this.#shipyardPlacement,
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
      decisions,
      attentionScreens: Object.freeze([
        ...new Set(decisions.filter(needsAttention).map(decisionScreen)),
      ]),
      tradeRoutes: this.#game.tradeRoutes,
      supply: this.#game.supplyOverview(),
      shipments: this.#game.shipments,
      productionMap: this.#productionMapSnapshot(),
      productionGuidance:
        (this.#screen === 'production' || this.#screen === 'planet') &&
        this.#game.planetAt(this.#selected)
          ? this.#game.productionGuidance(this.#game.planetAt(this.#selected)!)
          : null,
      supplyChain:
        this.#screen === 'production'
          ? this.#game.supplyChain(this.#selectedMapProject())
          : emptySupplyChain(),
      mapProblems: Object.freeze(
        decisions.filter(needsAttention).flatMap((decision): MapProblem[] => {
          const screen =
            decision.id.startsWith('supply-') || decision.kind === 'route'
              ? 'route'
              : decision.id.startsWith('staff-') ||
                  decision.id.startsWith('production-')
                ? 'production'
                : null;
          return screen
            ? [
                Object.freeze({
                  decisionId: decision.id,
                  planetId: decision.planetId,
                  routeId: decision.routeId,
                  screen,
                  explanation: decision.label,
                }),
              ]
            : [];
        }),
      ),
      mapTrade: this.#mapTrade.snapshot,
      ownedPlanets: this.#game.ownedPlanetSnapshots(),
      pendingEndTurn: this.#pendingEndTurn,
      pendingResearchRemoval: this.#pendingResearchRemoval,
      saveSlots: this.#saveSlots,
      pendingClearSlot: this.#pendingClearSlot,
      research: this.#game.research,
      researchCamera: this.#researchCamera.snapshot,
      inspectedResearch: this.#inspectedResearch,
      planetOrders: this.#game.planetOrders(),
      constructionSite: this.#constructionSite,
      screen: this.#eventPlayback ? 'map' : this.#screen,
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
      camera: this.#eventCamera?.snapshot ?? this.#camera.snapshot,
      selectedPlanetInfo: this.#game.planetKnowledge(this.#selected),
      planet:
        this.#screen === 'planet' ||
        this.#screen === 'build-selection' ||
        this.#screen === 'production'
          ? this.#game.planetAt(this.#selected)
            ? this.#game.planetSnapshot(
                this.#game.planetAt(this.#selected)!,
                this.#constructionSite ?? undefined,
              )
            : null
          : null,
      round: this.#game.round,
      phase: this.#game.phase,
      interruption: this.#game.interruption,
      fleets: this.#game.fleetSnapshots(),
      pirates: this.#game.pirateSnapshots(),
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
      productionReceipt: this.#productionReceipt,
    });
  }

  select(position: HexCoordinate): void {
    if (!this.#isMapScreen()) return;
    if (this.#shipyardPlacement) {
      this.placeShipyard(position);
      return;
    }
    this.#salvageSelection = null;
    if (!this.#game.galaxy.cellAt(position)) {
      if (this.#screen === 'production') {
        this.#selected = position;
        this.#mapProjectId = null;
        this.#mapProductionOption = null;
        this.#mapProductionPage = 0;
      }
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
      if (this.#selected.key !== position.key) {
        this.#mapProductionOption = null;
        this.#mapProductionPage = 0;
        this.#mapProjectId = null;
      }
      this.#selected = position;
      this.#mapFleetId = null;
      this.#fitProduction();
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
      this.#screen === 'production' ||
      this.#destinationFleetId ||
      this.#mapTrade.snapshot.sourcePlanetId
    )
      return null;
    return FleetMapLayout.hit(
      [
        ...this.#game.fleetSnapshots(),
        ...this.#game.pirateSnapshots().map(pirateAsFleet),
      ],
      this.#camera.screenToWorld(point),
      this.#screen === 'route' ? this.#game.tradeRoutes : [],
      this.#camera.snapshot.zoom,
    );
  }
  selectMapFleet(id: string): void {
    this.#salvageSelection = null;
    if (!this.#isMapScreen() || this.#screen === 'production') return;
    const pirate = this.#game
      .pirateSnapshots()
      .find((pirate) => pirate.id === id);
    const fleet =
      this.#game.fleet(id) ?? (pirate ? pirateAsFleet(pirate) : null);
    if (fleet && Object.values(fleet.ships).some((count) => count > 0)) {
      this.#mapTrade.clearSelection();
      this.#mapFleetId = id;
    }
  }
  hoverMapFleet(point: Point | null): boolean {
    const next = point ? this.fleetAtPoint(point) : null;
    const changed = this.#mapTrade.hover(
      this.#screen === 'fleets' || this.#screen === 'production' || next
        ? null
        : point,
    );
    if (next === this.#hoveredFleetId) return changed;
    this.#hoveredFleetId = next;
    return true;
  }
  previewFleetDestination(point: Point): void {
    if (
      !this.#isMapScreen() ||
      this.#screen === 'production' ||
      !this.#mapFleetId ||
      !this.#game.fleet(this.#mapFleetId) ||
      !this.#game.canIssueFleetOrders(this.#mapFleetId)
    )
      return;
    this.#fleetDragging = true;
    if (
      this.#game.phase === 'planning' &&
      (this.#screen === 'map' || this.#screen === 'route') &&
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
      (this.#screen === 'map' || this.#screen === 'route') &&
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
      (this.#screen === 'map' || this.#screen === 'route') &&
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
      (this.#screen !== 'map' && this.#screen !== 'route') ||
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
    if (this.#screen !== 'map' && this.#screen !== 'route') return;
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
    if (this.#screen === 'production') this.openRoute();
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

  inspectResearch(technology: Technology | null): void {
    if (
      technology !== null &&
      !this.#game.research.available.includes(technology)
    )
      return;
    this.#inspectedResearch = technology;
  }

  openResearch(): void {
    this.#screen = 'research';
  }
  #isMapScreen(): boolean {
    return isMapScreen(this.#screen);
  }
  #openMapScreen(screen: MapScreen): void {
    this.cancelMapPointer();
    this.cancelShipTransfer();
    this.cancelFleetRename();
    if (screen === 'fleets' || this.#screen === 'fleets')
      this.#mapTrade.clearSelection();
    this.#destinationFleetId = null;
    this.#screen = screen;
    if (screen === 'production') {
      this.#mapFleetId = null;
      this.#mapTrade.clearSelection();
      this.#fitProduction();
    }
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
    this.#mapProjectId = null;
    this.#mapProductionOption = null;
    this.#mapProductionPage = 0;
    this.#fitProduction();
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
  openSupplyPlanet(id: string): void {
    this.openPlanet(id);
  }
  openSupplyRoute(id: string): void {
    const route = this.#game.tradeRoutes.find((r) => r.id === id);
    if (!route) return;
    this.openRoute();
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
  openRoute(planetId?: string): void {
    this.#openMapScreen('route');
    if (planetId) this.#focusMapPlanet(planetId);
  }
  openProduction(planetId?: string): void {
    if (planetId) this.#focusMapPlanet(planetId);
    this.#openMapScreen('production');
  }
  #focusMapPlanet(id: string): void {
    const planet = this.#game.ownedPlanetSnapshots().find((p) => p.id === id);
    if (!planet) return;
    if (planet.position.key !== this.#selected.key) {
      this.#mapProductionOption = null;
      this.#mapProductionPage = 0;
      this.#mapProjectId = null;
    }
    this.#selected = planet.position;
    this.#camera.focus(planet.position);
  }
  #selectedMapProject(): string | null {
    const projects = this.#game.planetAt(this.#selected)
      ? this.#game.planetSnapshot(this.#game.planetAt(this.#selected)!)!
          .projects
      : [];
    return (
      projects.find((p) => p.id === this.#mapProjectId)?.id ??
      projects[0]?.id ??
      null
    );
  }
  #productionMapSnapshot(): ProductionMapSnapshot {
    const planet =
      this.#screen === 'production'
        ? this.#game.planetAt(this.#selected)
        : null;
    const options = planet ? this.#game.productionOptions(planet) : [];
    const categorized = options.length > 8;
    const filtered = categorized
      ? options.filter((o) => o.category === this.#mapProductionCategory)
      : options;
    const viewport = this.#mapViewport;
    const pageSize =
      (viewport?.fontScale ?? 1) > 1.5
        ? 2
        : viewport &&
            (viewport.width <= 600 ||
              viewport.availableWidth < 440 ||
              viewport.availableHeight < 440)
          ? 4
          : 8;
    const radius = viewport
      ? Math.max(
          64,
          Math.min(
            pageSize === 8 ? 160 : 106,
            (viewport.availableWidth - 100) / 2,
            (viewport.availableHeight - 120) / 2,
          ),
        )
      : 160;
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const page = Math.min(this.#mapProductionPage, pages - 1);
    return Object.freeze({
      category: this.#mapProductionCategory,
      categorized,
      page,
      pages,
      radius,
      options: Object.freeze(
        filtered.slice(page * pageSize, page * pageSize + pageSize),
      ),
      selectedOption:
        options.find((o) => o.type === this.#mapProductionOption) ?? null,
      selectedProjectId:
        this.#screen === 'production' ? this.#selectedMapProject() : null,
    });
  }
  selectMapProductionCategory(category: MapProductionCategory): void {
    this.#mapProductionCategory = category;
    this.#mapProductionPage = 0;
    this.#mapProductionOption = null;
  }
  selectMapProductionPage(page: number): void {
    if (Number.isInteger(page))
      this.#mapProductionPage = Math.max(
        0,
        Math.min(page, this.#productionMapSnapshot().pages - 1),
      );
  }
  selectMapProductionOption(type: ProjectType | null): void {
    if (type === null) {
      this.#mapProductionOption = null;
      return;
    }
    const planet = this.#game.planetAt(this.#selected);
    const option = planet
      ? this.#game
          .productionOptions(planet)
          .find((option) => option.type === type)
      : null;
    if (!option) return;
    if (option.category !== this.#mapProductionCategory) {
      const categorized = this.#productionMapSnapshot().categorized;
      this.#mapProductionCategory = option.category;
      if (categorized) this.#mapProductionPage = 0;
    }
    this.#mapProductionOption = type;
  }
  selectMapProject(id: string): void {
    const planet = this.#game.planetAt(this.#selected);
    if (
      planet &&
      this.#game.planetSnapshot(planet)?.projects.some((p) => p.id === id)
    )
      this.#mapProjectId = id;
  }
  orderMapProduction(option?: ProjectType): void {
    if (this.#screen !== 'production') return;
    const planet = this.#game.planetAt(this.#selected);
    if (!planet) return;
    this.#productionReceipt = null;
    if (option !== undefined) {
      if (
        !this.#game
          .productionOptions(planet)
          .some((candidate) => candidate.type === option)
      )
        throw new Error('This production option is no longer available.');
      this.selectMapProductionOption(option);
    }
    const type = this.#mapProductionOption;
    if (!type) return;
    if (type === 'Orbital shipyard') {
      this.beginShipyardPlacement(planet.id);
      return;
    }
    this.#productionReceipt = Object.hasOwn(BUILDINGS, type)
      ? this.#game.scheduleBuild(planet, type as BuildType)
      : projectDefinition(type).ship
        ? this.#game.scheduleShip(planet, type as ShipType)
        : this.#game.scheduleComponent(planet, type as Component);
  }
  clearProductionReceipt(): void {
    this.#productionReceipt = null;
  }
  resizeMap(viewport: MapViewport): void {
    if (!Object.values(viewport).every((v) => Number.isFinite(v) && v > 0))
      return;
    this.#mapViewport = Object.freeze({ ...viewport });
    if (this.#eventPlayback?.current?.decision) this.#focusEvent();
    this.#fitProduction();
  }
  #fitProduction(): void {
    if (
      this.#screen !== 'production' ||
      !this.#mapViewport ||
      !this.#game.planetAt(this.#selected)
    )
      return;
    const viewport = this.#mapViewport;
    this.#camera.reveal(this.#selected, {
      left: (viewport.ringLeft ?? BUILD_RING_EXTENT) - viewport.width / 2,
      right:
        viewport.availableWidth -
        (viewport.ringRight ?? BUILD_RING_EXTENT) -
        viewport.width / 2,
      top: (viewport.ringTop ?? BUILD_RING_EXTENT) - viewport.height / 2,
      bottom:
        viewport.availableHeight -
        (viewport.ringBottom ?? BUILD_RING_EXTENT) -
        viewport.height / 2,
    });
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
    if (decision.id.startsWith('shipyard-')) {
      this.selectSalvage(decision.id.slice('shipyard-'.length));
      return;
    }
    const target = decisionScreen(decision);
    if (target === 'research') this.openResearch();
    else if (target === 'fleets' && decision.fleetId)
      this.openFleet(decision.fleetId);
    else if (target === 'route' && decision.routeId)
      this.openSupplyRoute(decision.routeId);
    else if (decision.planetId) {
      if (target === 'route') this.openRoute(decision.planetId);
      else this.openProduction(decision.planetId);
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
    if (
      this.#eventPlayback ||
      this.#movementPlayback ||
      this.#game.phase !== 'planning'
    )
      return false;
    this.#pendingEndTurn = this.#game.decisions.some(needsAttention);
    return !this.#pendingEndTurn;
  }
  cancelEndTurn(): void {
    this.#pendingEndTurn = false;
  }
  createTradeRoute(a: string, b: string): void {
    const id = this.#game.createTradeRoute(a, b);
    if (this.#screen === 'map' || this.#screen === 'route')
      this.selectMapRoute(id);
  }
  assignTradeFleet(routeId: string, fleetId: string): void {
    if (this.#screen === 'map' || this.#screen === 'route')
      this.assignMapTradeFleet(routeId, fleetId);
    else this.#game.assignTradeFleet(routeId, fleetId);
  }
  releaseTradeFleet(id: string): void {
    this.#game.releaseTradeFleet(id);
  }
  closeTradeRoute(id: string): void {
    this.#game.closeTradeRoute(id);
  }
  colonize(id: string): void {
    const discoveries = this.#game.colonize(id);
    if (discoveries.length)
      this.#notice = `New discoveries: ${discoveries.map((discovery) => discovery.name).join(', ')}.`;
  }
  build(type: BuildType, slotIndex?: number): void {
    const planet = this.#game.planetAt(this.#selected);
    if (planet && type === 'Orbital shipyard') {
      this.beginShipyardPlacement(
        planet.id,
        slotIndex ?? this.#constructionSite ?? undefined,
      );
      return;
    }
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
    this.#fleetNameEdit = Object.freeze({
      id,
      draft: fleet.ownName ?? fleet.name,
    });
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
  chooseShipTransfer(fleetId: string, ship: ShipType, shipId?: string): void {
    if (this.#game.phase !== 'planning') return;
    const fleet = this.#game.fleet(fleetId);
    if (!fleet || shipTransferIssue(fleet) || !(fleet.ships[ship] > 0)) return;
    this.#selectedFleetId = fleetId;
    if (this.#isMapScreen()) this.#mapFleetId = fleetId;
    this.#shipTransfer =
      this.#shipTransfer?.fleetId === fleetId &&
      this.#shipTransfer.ship === ship &&
      this.#shipTransfer.shipId === shipId
        ? null
        : Object.freeze({ fleetId, ship, shipId });
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
        this.#shipTransfer.shipId,
      );
  }
  transferShips(
    source: string,
    ship: ShipType,
    amount: number,
    target: string | null,
    shipId?: string,
  ): void {
    const received = this.#game.transferShips(
      source,
      ship,
      amount,
      target,
      shipId,
    );
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
    if (this.#game.canIssueFleetOrders(id)) {
      this.#mapTrade.clearSelection();
      this.#destinationFleetId = id;
      if (!this.#isMapScreen() || this.#screen === 'production')
        this.#screen = 'map';
    }
  }
  setDestination(id: string, q: number, r: number): void {
    this.#game.setDestination(id, new HexCoordinate(q, r));
  }
  clearDestination(id: string): void {
    this.#game.clearDestination(id);
  }
  startTurn(): void {
    if (this.#eventPlayback || this.#movementPlayback) return;
    this.#presentedEventIds.clear();
    this.#turnContext = {
      screen: this.#screen,
      selected: this.#selected,
      mapFleetId: this.#mapFleetId,
      selectedFleetId: this.#selectedFleetId,
      salvageSelection: this.#salvageSelection,
      camera: this.#camera.snapshot,
    };
    this.#pendingEndTurn = false;
    this.cancelMapPointer();
    if (
      !['decisions', 'research', 'planet'].includes(this.#screen) &&
      !this.#isMapScreen()
    )
      this.#screen = 'map';
    this.#destinationFleetId = null;
    this.#game.startTurn();
  }
  nextTurnFrame(): TurnFrame | null {
    return this.#game.nextTurnFrame();
  }
  exploreFleet(id: string, order: ExplorationOrder): void {
    this.#game.setExploration(id, order);
  }
  patrolFleet(id: string): void {
    this.#game.setPatrol(id);
  }
  handleDiscoveries(): void {
    this.#game.handleDiscoveries();
    this.#focusInterruptedFleet();
  }
  #focusInterruptedFleet(): void {
    this.cancelMapPointer();
    this.#screen = 'map';
    const interruption = this.#game.interruption;
    const items = [
      ...(interruption?.battles ?? []),
      ...(interruption?.discoveries ?? []),
    ];
    const discovery =
      items.find((item) => item.eventId === interruption?.activeEventId) ??
      items[0];
    const fleet = discovery?.fleetId
      ? this.#game.fleet(discovery.fleetId)
      : null;
    this.#mapFleetId = null;
    this.#selectedFleetId = null;
    if (!fleet?.position && discovery) {
      this.#selected = new HexCoordinate(
        discovery.position.q,
        discovery.position.r,
      );
      this.#camera.focus(this.#selected);
    }
    if (fleet?.position) {
      this.#selected = fleet.position;
      this.#mapFleetId = fleet.id;
      this.#camera.focus(fleet.position);
    }
  }
  allowOtherFleetOrders(): void {
    this.#game.allowOtherFleetOrders();
  }
  continueTurn(): void {
    this.#destinationFleetId = null;
    this.cancelMapPointer();
    this.#game.continueTurn();
  }
  applyTurnFrame(frame: TurnFrame): void {
    this.#game.applyFrame(frame);
  }
  finishTurn(): void {
    this.#game.finishTurn();
  }

  beginEventPlayback(): void {
    if (
      this.#game.phase === 'simulating' ||
      this.#game.interruption?.handling ||
      this.#eventPlayback
    )
      return;
    const round =
      this.#game.phase === 'interrupted'
        ? this.#game.round
        : this.#game.round - 1;
    for (const id of this.#game.interruption?.presentedEventIds ?? [])
      this.#presentedEventIds.add(id);
    const events = this.#game.events.filter((event) => event.round === round);
    const playback = new EventPlayback(
      round,
      events
        .filter((event) => !this.#presentedEventIds.has(event.id))
        .map((event) => {
          const decision = this.#eventDecision(event.id);
          return decision ? Object.freeze({ ...event, decision }) : event;
        }),
      events.filter((event) => this.#presentedEventIds.has(event.id)),
    );
    if (!playback.current) {
      if (this.#game.phase === 'planning') this.finishEventPlayback();
      return;
    }
    this.#eventPlayback = playback;
    this.#eventCamera = new Camera(
      this.#game.galaxy.homePlanet.position,
      this.#game.galaxy.radius,
    );
    this.#eventCamera.restore(this.#camera.snapshot);
    this.#focusEvent();
  }

  #eventDecision(id: string): EventDecision | undefined {
    const interruption = this.#game.interruption;
    const battle = interruption?.battles?.find(
      (battle) => battle.eventId === id,
    );
    const discovery = interruption?.discoveries.find(
      (discovery) => discovery.eventId === id,
    );
    const item = battle ?? discovery;
    if (!item) return undefined;
    const fleet = item.fleetId
      ? this.#game.fleetSnapshots().find((fleet) => fleet.id === item.fleetId)
      : null;
    const title = battle
      ? 'Battle report'
      : discovery!.kind === 'pirate'
        ? 'Pirate ship in sight'
        : discovery!.kind === 'wreck'
          ? 'Wreck discovered'
          : discovery!.kind === 'star'
            ? 'Star explored'
            : 'Planet discovered';
    const details = [
      `HEX ${item.position.q},${item.position.r}${fleet ? ` · ${fleet.name} · ${fleet.remainingMovement ?? 0} hex remaining` : ''}`,
    ];
    if (battle)
      details.push(
        battle.summary,
        `${battle.wreckIds.length} wrecks remain in the hex.`,
      );
    if (discovery?.kind === 'pirate') {
      const pirate = this.#game
        .pirateSnapshots()
        .find((pirate) => pirate.id === discovery.id);
      if (pirate)
        details.push(
          `${pirate.count} pirate ${pirate.count === 1 ? 'ship' : 'ships'} in sight.`,
        );
    }
    details.push(
      interruption!.economyApplied
        ? 'The year is paused after production. No movement remains this year.'
        : battle
          ? 'The year is paused after combat. Handle to change orders, or Ignore to continue without changes.'
          : 'The year is paused. Fleets already sharing a hex will fight before the next movement.',
    );
    return Object.freeze({
      title,
      details: Object.freeze(details),
      fleetId: item.fleetId,
    });
  }

  chooseEvent(choice: 'handle' | 'ignore'): void {
    const playback = this.#eventPlayback;
    if (playback?.snapshot.stage !== 'awaiting-choice' || !playback.current)
      return;
    if (choice === 'handle') this.#game.handleEvent(playback.current.id);
    else this.#game.presentEvent(playback.current.id);
    playback.choose(choice);
  }

  continueEventHandling(): void {
    this.#game.finishHandlingEvent();
    this.beginEventPlayback();
  }

  advanceEventPlayback(): void {
    const playback = this.#eventPlayback;
    if (!playback) return;
    if (playback.snapshot.stage === 'filing' && playback.current) {
      this.#presentedEventIds.add(playback.current.id);
      this.#game.presentEvent(playback.current.id);
      if (playback.snapshot.choice === 'handle') {
        this.#eventPlayback = null;
        this.#eventCamera = null;
        this.#focusInterruptedFleet();
        return;
      }
    }
    if (!playback.advance()) {
      if (this.#game.phase === 'planning') this.finishEventPlayback();
      else {
        this.#eventPlayback = null;
        this.#eventCamera = null;
      }
    } else this.#focusEvent();
  }

  #focusEvent(): void {
    const position = this.#eventPlayback?.current?.position;
    if (
      !position ||
      !this.#eventCamera ||
      !Number.isSafeInteger(position.q) ||
      !Number.isSafeInteger(position.r)
    )
      return;
    const hex = new HexCoordinate(position.q, position.r);
    if (!this.#game.galaxy.contains(hex)) return;
    this.#eventCamera.restore({ ...this.#eventCamera.snapshot, zoom: 1 });
    this.#eventCamera.focus(hex);
    if (this.#eventPlayback?.current?.decision && this.#mapViewport) {
      const center = HexGeometry.toPoint(hex);
      this.#eventCamera.restore({
        center: {
          x: center.x,
          y: center.y + Math.max(0, this.#mapViewport.height / 2 - 45),
        },
        zoom: 1,
      });
    }
  }

  finishEventPlayback(): void {
    this.#eventPlayback = null;
    this.#eventCamera = null;
    const context = this.#turnContext;
    this.#turnContext = null;
    if (!context) return;
    this.#screen = context.screen;
    this.#selected = context.selected;
    this.#mapFleetId =
      context.mapFleetId && this.#game.fleet(context.mapFleetId)
        ? context.mapFleetId
        : null;
    this.#selectedFleetId =
      context.selectedFleetId && this.#game.fleet(context.selectedFleetId)
        ? context.selectedFleetId
        : null;
    this.#salvageSelection =
      context.salvageSelection &&
      [...this.#game.wrecks, ...this.#game.shipyards].some(
        (item) => item.id === context.salvageSelection,
      )
        ? context.salvageSelection
        : null;
    this.#camera.restore(context.camera);
  }

  beginMovementPlayback(
    playback: TurnMovementPlayback,
    origin: AppReadModel,
  ): void {
    this.#movementPlayback = playback;
    this.#movementOrigin = origin;
    this.#eventCamera = new Camera(
      this.#game.galaxy.homePlanet.position,
      this.#game.galaxy.radius,
    );
  }

  focusTurnMovement(movement: TurnMovement): void {
    this.#movementPlayback!.begin(movement);
    this.#eventCamera!.focus(movement.from);
  }

  completeTurnMovement(): void {
    this.#movementPlayback!.complete();
  }

  endMovementPlayback(): void {
    this.#movementPlayback = null;
    this.#movementOrigin = null;
    this.#eventCamera = null;
  }

  salvageAtPoint(point: Point): string | null {
    if (
      !this.#isMapScreen() ||
      this.#destinationFleetId ||
      this.#shipyardPlacement
    )
      return null;
    return (
      hitSalvageMarker(
        this.#game.wrecks,
        this.#game.shipyards,
        this.#camera.snapshot.zoom,
        this.#camera.screenToWorld(point),
      )?.id ?? null
    );
  }
  selectSalvage(id: string): void {
    this.#shipyardPlacement = null;
    this.#screen = 'map';
    this.#salvageSelection = id;
    this.#mapFleetId = null;
  }
  orderSalvage(fleetId: string, wreckId: string): void {
    this.#game.orderSalvage(fleetId, wreckId);
    this.#salvageSelection = null;
    this.#mapFleetId = fleetId;
  }
  dropSalvage(point: Point): void {
    const fleetId = this.#salvageDropTarget(point);
    if (!fleetId || !this.#salvageSelection)
      throw new Error('Drop the wreck onto a fleet with a Salvage ship.');
    this.orderSalvage(fleetId, this.#salvageSelection);
    this.#hoveredFleetId = null;
  }
  previewSalvage(point: Point): void {
    this.#hoveredFleetId = this.#salvageDropTarget(point);
  }
  #salvageDropTarget(point: Point): string | null {
    const world = this.#camera.screenToWorld(point);
    return (
      FleetMapLayout.markers(
        this.#game.fleetSnapshots(),
        [],
        this.#camera.snapshot.zoom,
      )
        .filter(
          ({ fleet }) =>
            this.#game.canIssueFleetOrders(fleet.id) &&
            fleet.ships['Salvage ship'] >
              this.#game.wrecks.filter(
                (wreck) =>
                  wreck.reservedBy === fleet.id || wreck.towedBy === fleet.id,
              ).length,
        )
        .map((marker) => ({
          id: marker.fleet.id,
          distance: Math.hypot(
            marker.point.x - world.x,
            marker.point.y - world.y,
          ),
        }))
        .filter((marker) => marker.distance <= 22 / this.#camera.snapshot.zoom)
        .sort((a, b) => a.distance - b.distance)[0]?.id ?? null
    );
  }
  returnToShipyard(id: string): void {
    this.#game.returnToShipyard(id);
  }
  releaseWreck(fleetId: string, id: string): void {
    this.#game.releaseWreck(fleetId, id);
  }
  beginShipyardPlacement(
    planetId: string,
    site?: number,
    yardId: string | null = null,
  ): void {
    const choices = this.#game.freeShipyardHexes(planetId);
    if (!choices.length)
      throw new Error('No free neighboring hex is available.');
    this.#shipyardPlacement = Object.freeze({
      planetId,
      site,
      yardId,
      choices,
    });
    this.#screen = 'map';
    this.#salvageSelection = null;
    this.#mapFleetId = null;
  }
  rebuildShipyard(id: string): void {
    const yard = this.#game.shipyards.find((item) => item.id === id);
    if (yard) this.beginShipyardPlacement(yard.planetId, undefined, id);
  }
  moveRepair(yardId: string, wreckId: string, index: number): void {
    this.#game.moveRepair(yardId, wreckId, index);
  }
  cancelShipyardPlacement(): void {
    this.#shipyardPlacement = null;
  }
  placeShipyard(position: HexCoordinate): void {
    const placement = this.#shipyardPlacement;
    if (!placement) return;
    if (placement.yardId)
      this.#game.scheduleRebuildShipyard(placement.yardId, position);
    else
      this.#game.scheduleBuild(
        this.#game.galaxy.systems
          .flatMap((system) => system.planets)
          .find((planet) => planet.id === placement.planetId)!,
        'Orbital shipyard',
        placement.site,
        position,
      );
    this.#shipyardPlacement = null;
    this.#notice = 'Shipyard construction queued.';
  }
}
