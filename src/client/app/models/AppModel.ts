import {
  SaveFacade,
  ResearchFacade,
  PlanetFacade,
  FleetFacade,
  RouteFacade,
  ProductionFacade,
  OrderFacade,
  DecisionFacade,
  StarMapFacade,
  TurnFacade,
  ShipOrders,
  type ShipOrder,
  type OrderKind,
  type OrderSelection,
  type OrderSelectionSnapshot,
  type EventPlayback,
  type EventPlaybackSnapshot,
  type EventDecision,
  type TurnMovementPlayback,
  type TurnMovement,
  type ExplorationOrder,
  type SavedTurnSimulation,
  type PirateSnapshot,
  isMapScreen,
  BUILD_RING_EXTENT,
  type MapScreen,
  type MapViewport,
  type MapProductionCategory,
  type ProductionMapSnapshot,
  type ProductionGuidance,
  type MapProblem,
  emptySupplyChain,
  type SupplyChainSnapshot,
  type ProjectSupplySnapshot,
  StarMapTrade,
  type MapTradeSnapshot,
  type SaveRepository,
  type SupplyOverview,
  ResearchTreeCamera,
  type ResearchCameraSnapshot,
  type Component,
  Salvage,
  type WreckSnapshot,
  type ShipyardSnapshot,
  decisionScreen,
  needsAttention,
  type Decision,
  type DecisionScreen,
  type ShipmentSnapshot,
  type TradeRouteSnapshot,
  FleetMapLayout,
  Camera,
  type CameraSnapshot,
  CameraFraming,
  type PlanetQueueKind,
  createExampleGalaxy,
  Game,
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
  type MapCell,
} from '../../space-map/models/index.js';
import {
  BoardingFacade,
  BoardingEditorFacade,
  type BoardingEditorCatalogItem,
  type BoardingEditorSnapshot,
  type BoardingBattle,
  type BoardingBattleState,
  type BoardingCommand,
  type BoardingShot,
} from '../../boarding/models/index.js';
import {
  BattleFacade,
  type TacticalBattle,
  type BattleState,
  type BattleCommand,
} from '../../space-battle/models/index.js';
import {
  HexCoordinate,
  HexGeometry,
  type Point,
} from '../../common/HexCoordinate.js';
import { actionFailed, type PlayerNotice } from './PlayerNotice.js';

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
  | 'decisions'
  | 'orders';

export interface SaveSlotSnapshot {
  readonly id: number;
  readonly lastPlayed: string | null;
  readonly round: number | null;
  readonly cells: readonly MapCell[];
  readonly error: string | null;
}

export interface AppReadModel {
  readonly orderView?: OrderSelectionSnapshot | null;
  readonly productionStartOrder?: ShipOrder | null;
  readonly boardingBattle?: BoardingBattleState | null;
  readonly boardingPresentation?: readonly BoardingBattleState[];
  readonly boardingShot?: BoardingShot | null;
  readonly tacticalBattle: BattleState | null;
  readonly battleFeedback: BattleState | null;
  readonly turnMovement: TurnMovement | null;
  readonly turnMovements: readonly TurnMovement[];
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
  readonly mapFocusRevision: number;
  readonly projectSupply: readonly ProjectSupplySnapshot[];
  readonly decisions: readonly Decision[];
  readonly planetQueues: Game['planetQueues'];
  readonly salvageQueue: Game['salvageQueue'];
  readonly attackQueue: Game['attackQueue'];
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
  readonly selectedPlanetInfo: ReturnType<Game['planetIntel']>;
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
  readonly destinationOrder: 'move' | 'colonize' | 'salvage';
  readonly events: readonly GameEvent[];
  readonly notice: PlayerNotice;
  readonly productionReceipt: ProductionReceipt | null;
  readonly editorAvailable: boolean;
  readonly editorCatalog: readonly BoardingEditorCatalogItem[];
  readonly editor: BoardingEditorSnapshot | null;
  readonly pendingEditorDiscard: BoardingEditorCatalogItem['id'] | null;
}

export class AppModel {
  readonly saveCase: SaveFacade;
  readonly editorCase = new BoardingEditorFacade();
  readonly boarding: BoardingFacade;
  readonly battle: BattleFacade;
  readonly researchCase: ResearchFacade;
  readonly planet: PlanetFacade;
  readonly fleets: FleetFacade;
  readonly routes: RouteFacade;
  readonly production: ProductionFacade;
  readonly orders: OrderFacade;
  readonly decisions: DecisionFacade;
  readonly starMap: StarMapFacade;
  readonly turn: TurnFacade;

  #orderSelection: OrderSelection | null = null;
  #shipStartOrder: {
    readonly ship: ShipType;
    readonly order: ShipOrder;
  } | null = null;
  #movementPlayback: TurnMovementPlayback | null = null;
  #movementOrigin: AppReadModel | null = null;
  #eventPlayback: EventPlayback | null = null;
  readonly #presentedEventIds = new Set<string>();
  #eventCamera: Camera | null = null;
  #cameraFraming: CameraFraming | null = null;
  #playbackPositions: readonly Point[] = [];
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
  #testBattle: TacticalBattle | null = null;
  #testBoarding: BoardingBattle | null = null;
  #battleFeedback: BattleState | null = null;
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
  #mapFocusRevision = 0;
  #pendingMapFocus: HexCoordinate | null = null;
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
  #destinationOrder: 'move' | 'colonize' | 'salvage' = 'move';
  #notice: PlayerNotice = null;
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
    const host = this.#createHost();
    this.saveCase = new SaveFacade(host);
    this.boarding = new BoardingFacade(host);
    this.battle = new BattleFacade(host);
    this.researchCase = new ResearchFacade(host);
    this.planet = new PlanetFacade(host);
    this.fleets = new FleetFacade(host);
    this.routes = new RouteFacade(host);
    this.production = new ProductionFacade(host);
    this.orders = new OrderFacade(host);
    this.decisions = new DecisionFacade(host);
    this.starMap = new StarMapFacade(host);
    this.turn = new TurnFacade(host);
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
    return this.saveCase.startSlot(id);
  }

  save(): void {
    if (
      this.saves &&
      !this.#testBattle &&
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
    return this.saveCase.openSaves();
  }
  requestClearSlot(id: number): void {
    return this.saveCase.requestClearSlot(id);
  }
  cancelClearSlot(): void {
    return this.saveCase.cancelClearSlot();
  }
  confirmClearSlot(): void {
    return this.saveCase.confirmClearSlot();
  }

  // mvc-arkitektur: no write operations or hidden world data cross into views.
  get snapshot(): AppReadModel {
    if (this.#movementPlayback && this.#movementOrigin) {
      return Object.freeze({
        ...this.#movementOrigin,
        screen: 'map',
        phase: 'simulating',
        turnMovement: this.#movementPlayback.current,
        turnMovements: this.#movementPlayback.currents,
        camera: this.#eventCamera!.snapshot,
        selected: null,
        mapFleetId: this.#movementPlayback.current?.fleetId ?? null,
        fleets: this.#movementPlayback.fleets,
        pirates: this.#movementPlayback.pirates,
        cells: this.#movementPlayback.cells,
        destinationFleetId: null,
        destinationOrder: 'move',
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
      turnMovements: Object.freeze([]),
      boardingBattle:
        this.#testBoarding?.visibleSnapshot ?? this.#game.boardingBattle,
      boardingPresentation: Object.freeze([
        ...(this.#testBoarding?.presentation ??
          this.#game.boardingPresentation),
      ]),
      boardingShot: this.#testBoarding?.shot ?? this.#game.boardingShot,
      tacticalBattle:
        this.#testBattle?.visibleSnapshot ?? this.#game.tacticalBattle,
      battleFeedback: this.#battleFeedback,
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
      orderView: this.#orderSnapshot(),
      productionStartOrder:
        this.#shipStartOrder?.ship ===
        (this.#screen === 'production'
          ? this.#mapProductionOption
          : this.#productionProduct)
          ? this.#shipStartOrder.order
          : null,
      expandedProjectIds: Object.freeze([
        ...this.#expandedProjectIds,
        ...(() => {
          const id = projectSupply[0]?.projectId;
          return id && !this.#closedProjectIds.has(id) ? [id] : [];
        })(),
      ]),
      focusedProjectId: this.#focusedProjectId,
      mapFocusRevision: this.#mapFocusRevision,
      projectSupply,
      decisions: Object.freeze([...decisions, ...this.#game.messageSettings]),
      planetQueues: this.#game.planetQueues,
      salvageQueue: this.#game.salvageQueue,
      attackQueue: this.#game.attackQueue,
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
      screen: this.#eventCamera ? 'map' : this.#screen,
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
      selectedPlanetInfo: this.#game.planetIntel(this.#selected),
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
      fleets: this.#game
        .fleetSnapshots()
        .filter(
          (fleet) =>
            this.#screen !== 'orders' ||
            this.#orderSelection?.page !== 'fleets' ||
            !fleet.routeId,
        ),
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
      destinationOrder: this.#destinationFleetId
        ? this.#destinationOrder
        : 'move',
      events: this.#game.events,
      notice: this.#notice,
      productionReceipt: this.#productionReceipt,
      editorAvailable: this.editorCase.available,
      editorCatalog: this.editorCase.catalog,
      editor: this.editorCase.editor,
      pendingEditorDiscard: this.editorCase.pendingDiscard,
    });
  }

  /** responsiv-stjarnkarta: only presentation state changes during camera gestures. */
  navigationSnapshot(previous: AppReadModel): AppReadModel {
    return Object.freeze({
      ...previous,
      camera: this.#camera.snapshot,
      hoveredFleetId: this.#hoveredFleetId,
      mapTrade: this.#mapTrade.snapshot,
      fleetDestinationPreview: this.#fleetDestinationPreview,
      fleetDragging: this.#fleetDragging,
    });
  }

  select(position: HexCoordinate): void {
    return this.starMap.select(position);
  }
  reportError(error: unknown): void {
    this.#notice = actionFailed(error);
  }
  clearNotice(): void {
    this.#notice = null;
  }
  setEditorCatalog(maps: readonly BoardingEditorCatalogItem[]): void {
    this.editorCase.setCatalog(maps);
  }
  openEditor(id: BoardingEditorCatalogItem['id'], source: string): void {
    this.editorCase.open(id, source);
  }
  editorBindTool(...args: Parameters<BoardingEditorFacade['bindTool']>): void {
    this.editorCase.bindTool(...args);
  }
  editorPaint(...args: Parameters<BoardingEditorFacade['paint']>): void {
    this.editorCase.paint(...args);
  }
  editorResize(...args: Parameters<BoardingEditorFacade['resize']>): void {
    this.editorCase.resize(...args);
  }
  editorUndo(): void {
    this.editorCase.undo();
  }
  editorAdjustSprite(
    ...args: Parameters<BoardingEditorFacade['adjustSprite']>
  ): void {
    this.editorCase.adjustSprite(...args);
  }
  editorProjection(
    ...args: Parameters<BoardingEditorFacade['projection']>
  ): void {
    this.editorCase.projection(...args);
  }
  requestEditorMap(id: BoardingEditorCatalogItem['id']): void {
    this.editorCase.requestMap(id);
  }

  fleetAtPoint(point: Point): string | null {
    return this.starMap.fleetAtPoint(point);
  }
  selectMapFleet(id: string): void {
    return this.starMap.selectMapFleet(id);
  }
  hoverMapFleet(point: Point | null): boolean {
    return this.starMap.hoverMapFleet(point);
  }
  previewFleetDestination(point: Point): void {
    return this.starMap.previewFleetDestination(point);
  }
  commitFleetDestination(): void {
    return this.starMap.commitFleetDestination();
  }
  cancelMapPointer(keepRouteSource = false): void {
    return this.starMap.cancelMapPointer(keepRouteSource);
  }

  selectPoint(point: Point): void {
    return this.starMap.selectPoint(point);
  }
  mapRouteDragSource(point: Point): string | null {
    return this.routes.mapRouteDragSource(point);
  }
  beginMapRoute(id: string): void {
    return this.routes.beginMapRoute(id);
  }
  previewMapRoute(point: Point): void {
    return this.routes.previewMapRoute(point);
  }
  commitMapRoute(): void {
    return this.routes.commitMapRoute();
  }
  selectMapRoute(id: string): void {
    return this.routes.selectMapRoute(id);
  }
  assignMapTradeFleet(routeId: string, fleetId: string): void {
    return this.routes.assignMapTradeFleet(routeId, fleetId);
  }

  openPlanet(id?: string): void {
    return this.planet.openPlanet(id);
  }

  selectPlanetTab(tab: PlanetTab): void {
    return this.planet.selectPlanetTab(tab);
  }
  selectProduction(category: ProductionCategory, product: string | null): void {
    return this.planet.selectProduction(category, product);
  }
  selectProductionFleet(id: string | null): void {
    return this.planet.selectProductionFleet(id);
  }
  toggleProjectSupply(id: string, open: boolean): void {
    return this.planet.toggleProjectSupply(id, open);
  }
  openPlanetProject(planetId: string, projectId: string): void {
    return this.planet.openPlanetProject(planetId, projectId);
  }

  inspectResearch(technology: Technology | null): void {
    return this.researchCase.inspectResearch(technology);
  }

  openResearch(): void {
    return this.researchCase.openResearch();
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
    if (screen !== 'orders') this.#orderSelection = null;
    if (screen === 'production') {
      this.#mapFleetId = null;
      this.#mapTrade.clearSelection();
      this.#fitProduction();
    }
  }
  openMap(): void {
    return this.starMap.openMap();
  }
  openFleets(): void {
    return this.fleets.openFleets();
  }
  #orderSnapshot(): OrderSelectionSnapshot | null {
    const selection = this.#screen === 'orders' ? this.#orderSelection : null;
    if (!selection) return null;
    const fleet = selection.fleetId
      ? this.#game.fleet(selection.fleetId)
      : null;
    const ships =
      fleet?.ships ?? (selection.ship ? { [selection.ship]: 1 } : {});
    const type = ships['Transport ship'] ? 'Transport ship' : 'Fighter';
    const planets = this.#game.ownedPlanetSnapshots();
    return Object.freeze({
      ...selection,
      options: Object.freeze(
        ShipOrders.options(
          ships,
          this.#game.research.completed,
          !!fleet?.upgradeable,
          !!fleet?.towing?.length,
        ).map((option) =>
          Object.freeze({
            ...option,
            blockedReason:
              option.kind === 'upgrade' && fleet?.upgrade
                ? 'An Upgrade order is already active.'
                : option.kind === 'salvage' &&
                    fleet &&
                    Salvage.availableCapacity(fleet, this.#game.wrecks) === 0
                  ? 'No free Salvage ship is available.'
                  : option.blockedReason,
          }),
        ),
      ),
      routes: ShipOrders.routes(
        type,
        selection.origin,
        this.#game.tradeRoutes,
        this.#game.fleetSnapshots(),
        (route, origin) =>
          Math.min(
            ...[route.a, route.b].map((id) => {
              const planet = planets.find((planet) => planet.id === id);
              return planet ? origin.distanceTo(planet.position) : Infinity;
            }),
          ),
      ),
      fleetTargets: Object.freeze(
        this.#game
          .fleetSnapshots()
          .filter(
            (target) =>
              target.id !== selection.fleetId &&
              !target.routeId &&
              !target.upgrade &&
              !target.civilian?.passengers &&
              target.position,
          ),
      ),
    });
  }
  openFleetOrders(id: string): void {
    return this.orders.openFleetOrders(id);
  }
  openShipOrders(ship: ShipType, projectId?: string): void {
    return this.orders.openShipOrders(ship, projectId);
  }
  chooseOrder(kind: OrderKind): void {
    return this.orders.chooseOrder(kind);
  }
  completeOrder(order: ShipOrder): void {
    return this.orders.completeOrder(order);
  }
  orderBack(): void {
    return this.orders.orderBack();
  }
  clearStartOrder(): void {
    return this.orders.clearStartOrder();
  }
  #closeOrders(joinedFleetId?: string): void {
    const selection = this.#orderSelection;
    if (!selection) return;
    this.#orderSelection = null;
    this.#screen =
      selection.returnScreen === 'orders' ? 'fleets' : selection.returnScreen;
    if (selection.fleetId) {
      const fleet =
        this.#game.fleet(selection.fleetId) ??
        (joinedFleetId ? this.#game.fleet(joinedFleetId) : null);
      this.#mapFleetId = fleet?.id ?? null;
      if (fleet?.position) this.#selected = fleet.position;
    } else this.#selected = selection.origin;
    this.#fitProduction();
  }
  openFleet(id: string): void {
    return this.fleets.openFleet(id);
  }
  pan(delta: Point): void {
    return this.starMap.pan(delta);
  }
  zoom(factor: number, anchor: Point): void {
    return this.starMap.zoom(factor, anchor);
  }

  home(): void {
    return this.starMap.home();
  }

  openBuildSite(index: number | null): void {
    return this.planet.openBuildSite(index);
  }
  searchBuildings(query: string): void {
    return this.planet.searchBuildings(query);
  }
  selectBuildingCategory(category: BuildingCategory): void {
    return this.planet.selectBuildingCategory(category);
  }
  selectBuilding(type: BuildType | null): void {
    return this.planet.selectBuilding(type);
  }
  research(type: Technology | null): void {
    return this.researchCase.research(type);
  }
  resizeResearch(width: number, height: number): void {
    return this.researchCase.resizeResearch(width, height);
  }
  panResearch(delta: Point): void {
    return this.researchCase.panResearch(delta);
  }
  zoomResearch(factor: number, anchor: Point): void {
    return this.researchCase.zoomResearch(factor, anchor);
  }
  fitResearch(): void {
    return this.researchCase.fitResearch();
  }
  openSupplyPlanet(id: string): void {
    return this.routes.openSupplyPlanet(id);
  }
  openSupplyRoute(id: string): void {
    return this.routes.openSupplyRoute(id);
  }
  moveResearch(type: Technology, index: number): void {
    return this.researchCase.moveResearch(type, index);
  }
  requestResearchRemoval(type: Technology | null): void {
    return this.researchCase.requestResearchRemoval(type);
  }
  confirmResearchRemoval(): void {
    return this.researchCase.confirmResearchRemoval();
  }
  addPlanetToQueue(kind: PlanetQueueKind, planetId: string): void {
    this.#game.addPlanetToQueue(kind, planetId);
  }
  removePlanetFromQueue(kind: PlanetQueueKind, planetId: string): void {
    this.#game.removePlanetFromQueue(kind, planetId);
  }
  movePlanetQueue(
    kind: PlanetQueueKind,
    planetId: string,
    index: number,
  ): void {
    this.#game.movePlanetQueue(kind, planetId, index);
  }
  openRoute(planetId?: string): void {
    return this.routes.openRoute(planetId);
  }
  openProduction(planetId?: string): void {
    return this.production.openProduction(planetId);
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
    this.#requestMapFocus(planet.position);
  }
  #requestMapFocus(position: HexCoordinate): void {
    this.#camera.focus(position);
    this.#pendingMapFocus = position;
    this.#mapFocusRevision += 1;
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
      (viewport?.fontScale ?? 1) > 1.5 ||
      (!!viewport && viewport.width <= 360 && (viewport.fontScale ?? 1) >= 1.25)
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
    return this.production.selectMapProductionCategory(category);
  }
  selectMapProductionPage(page: number): void {
    return this.production.selectMapProductionPage(page);
  }
  selectMapProductionOption(type: ProjectType | null): void {
    return this.production.selectMapProductionOption(type);
  }
  selectMapProject(id: string): void {
    return this.production.selectMapProject(id);
  }
  orderMapProduction(option?: ProjectType): void {
    return this.production.orderMapProduction(option);
  }
  clearProductionReceipt(): void {
    return this.production.clearProductionReceipt();
  }
  resizeMap(viewport: MapViewport): void {
    return this.starMap.resizeMap(viewport);
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
    return this.decisions.openDecisions();
  }
  openDecision(id?: string): void {
    return this.decisions.openDecision(id);
  }
  skipDecision(id: string): void {
    return this.decisions.skipDecision(id);
  }
  muteDecision(id: string): void {
    return this.decisions.muteDecision(id);
  }
  unmuteDecision(id: string): void {
    return this.decisions.unmuteDecision(id);
  }
  requestEndTurn(): boolean {
    return this.decisions.requestEndTurn();
  }
  cancelEndTurn(): void {
    return this.decisions.cancelEndTurn();
  }
  createTradeRoute(a: string, b: string): void {
    return this.routes.createTradeRoute(a, b);
  }
  assignTradeFleet(routeId: string, fleetId: string): void {
    return this.routes.assignTradeFleet(routeId, fleetId);
  }
  releaseTradeFleet(id: string): void {
    return this.routes.releaseTradeFleet(id);
  }
  closeTradeRoute(id: string): void {
    return this.routes.closeTradeRoute(id);
  }
  colonize(id: string): void {
    return this.planet.colonize(id);
  }
  build(type: BuildType, slotIndex?: number): void {
    return this.planet.build(type, slotIndex);
  }
  scheduleShip(
    ship: ShipType,
    fleetId: string | null,
    factoryId?: string,
  ): void {
    return this.planet.scheduleShip(ship, fleetId, factoryId);
  }
  moveProject(id: string, index: number): void {
    return this.planet.moveProject(id, index);
  }
  scheduleComponent(component: Component): void {
    return this.planet.scheduleComponent(component);
  }
  setProjectFleet(id: string, fleetId: string | null): void {
    return this.planet.setProjectFleet(id, fleetId);
  }
  cancelProject(id: string): void {
    return this.planet.cancelProject(id);
  }
  toggleDemolition(id: string): void {
    return this.planet.toggleDemolition(id);
  }
  upgradeBuilding(id: string): void {
    return this.planet.upgradeBuilding(id);
  }
  produceFighter(): void {
    return this.planet.produceFighter();
  }
  canBuild(type: BuildType): string | null {
    return this.planet.canBuild(type);
  }
  selectFleet(id: string): void {
    return this.fleets.selectFleet(id);
  }
  renameFleet(id: string, name: string): void {
    return this.fleets.renameFleet(id, name);
  }
  beginFleetRename(id: string): void {
    return this.fleets.beginFleetRename(id);
  }
  editFleetName(draft: string): void {
    return this.fleets.editFleetName(draft);
  }
  cancelFleetRename(): void {
    return this.fleets.cancelFleetRename();
  }
  submitFleetName(): void {
    return this.fleets.submitFleetName();
  }
  chooseShipTransfer(fleetId: string, ship: ShipType, shipId?: string): void {
    return this.fleets.chooseShipTransfer(fleetId, ship, shipId);
  }
  cancelShipTransfer(): void {
    return this.fleets.cancelShipTransfer();
  }
  transferChosenShip(target: string | null): void {
    return this.fleets.transferChosenShip(target);
  }
  transferShips(
    source: string,
    ship: ShipType,
    amount: number,
    target: string | null,
    shipId?: string,
  ): void {
    return this.fleets.transferShips(source, ship, amount, target, shipId);
  }
  createFleet(source?: string): void {
    return this.fleets.createFleet(source);
  }
  deleteFleet(id: string): void {
    return this.fleets.deleteFleet(id);
  }
  beginDestination(id: string): void {
    return this.fleets.beginDestination(id);
  }
  upgradeFleet(id: string): void {
    return this.fleets.upgradeFleet(id);
  }
  setDestination(id: string, q: number, r: number): void {
    return this.fleets.setDestination(id, q, r);
  }
  beginColonization(id: string): void {
    return this.fleets.beginColonization(id);
  }
  beginSalvage(id: string): void {
    return this.fleets.beginSalvage(id);
  }
  clearDestination(id: string): void {
    return this.fleets.clearDestination(id);
  }
  startTurn(): void {
    return this.turn.startTurn();
  }
  nextTurnFrame(): TurnFrame | null {
    return this.turn.nextTurnFrame();
  }
  exploreFleet(id: string, order: ExplorationOrder): void {
    return this.fleets.exploreFleet(id, order);
  }
  automateSalvage(id: string): void {
    return this.fleets.automateSalvage(id);
  }
  civilianTransport(id: string): void {
    return this.fleets.civilianTransport(id);
  }
  automateTransport(id: string): void {
    return this.fleets.automateTransport(id);
  }
  patrolFleet(id: string): void {
    return this.fleets.patrolFleet(id);
  }
  handleDiscoveries(): void {
    return this.decisions.handleDiscoveries();
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
    return this.decisions.allowOtherFleetOrders();
  }
  continueTurn(): void {
    return this.turn.continueTurn();
  }
  commandBattle(command: BattleCommand): void {
    return this.battle.commandBattle(command);
  }
  startTestBoarding(): void {
    return this.boarding.startTestBoarding();
  }
  closeTestBoarding(): void {
    return this.boarding.closeTestBoarding();
  }
  finishBoarding(outcome: 'victory' | 'defeat' | 'aborted' = 'aborted'): void {
    return this.boarding.finishBoarding(outcome);
  }
  commandBoarding(command: BoardingCommand): void {
    return this.boarding.commandBoarding(command);
  }
  shouldPlayBoardingStep(): boolean {
    return this.boarding.shouldPlayBoardingStep();
  }
  playBoardingStep(): boolean {
    return this.boarding.playBoardingStep();
  }
  startTestBattle(): void {
    return this.battle.startTestBattle();
  }
  autoSelectBattleShip(): boolean {
    return this.battle.autoSelectBattleShip();
  }
  #afterBattleAction(result: BattleState): void {
    if (result.phase === 'complete') this.#battleFeedback = result;
    this.save();
    if (
      !this.#game.tacticalBattle &&
      !this.#battleFeedback &&
      !this.#testBattle
    )
      this.beginEventPlayback();
  }
  playBattleActivation(
    singleStep = false,
    options?: { readonly allowDock?: boolean },
  ): void {
    return this.battle.playBattleActivation(singleStep, options);
  }
  finishBattleFeedback(): void {
    return this.battle.finishBattleFeedback();
  }
  resumeFleetOrders(id: string): void {
    return this.fleets.resumeFleetOrders(id);
  }
  applyTurnFrame(frame: TurnFrame): void {
    return this.turn.applyTurnFrame(frame);
  }
  finishTurn(): void {
    return this.turn.finishTurn();
  }

  beginEventPlayback(): void {
    return this.turn.beginEventPlayback();
  }

  #eventDecision(id: string): EventDecision | undefined {
    const interruption = this.#game.interruption;
    const discovery = interruption?.discoveries.find(
      (discovery) => discovery.eventId === id,
    );
    const item = discovery;
    if (!item || discovery.kind === 'star') return undefined;
    const fleet = item.fleetId
      ? this.#game.fleetSnapshots().find((fleet) => fleet.id === item.fleetId)
      : null;
    const title =
      discovery.kind === 'pirate'
        ? 'Pirate ship in sight'
        : discovery.kind === 'wreck'
          ? 'Wreck discovered'
          : discovery.kind === 'planet-explored'
            ? 'Planet explored'
            : 'Planet discovered';
    const details = [
      `HEX ${item.position.q},${item.position.r}${fleet ? ` · ${fleet.name} · ${fleet.remainingMovement ?? 0} hex remaining` : ''}`,
    ];
    if (discovery?.kind === 'pirate') {
      const pirate = this.#game
        .pirateSnapshots()
        .find((pirate) => pirate.id === discovery.id);
      if (pirate)
        details.push(
          `${pirate.count} raider${pirate.count === 1 ? '' : 's'}${pirate.transports ? ` and ${pirate.transports} transport` : ''} in sight.`,
        );
    }
    if (discovery.kind === 'planet-explored') {
      const intel = this.#game.planetIntel(
        new HexCoordinate(item.position.q, item.position.r),
      );
      if (intel?.surveyed)
        details.push(
          `Type: ${intel.environment} · Build slots: ${intel.maxBuildSlots}.`,
        );
    }
    if (interruption!.economyApplied)
      details.push(
        'The round is paused after production. No movement remains this round.',
      );
    const queueKind =
      discovery.kind === 'planet'
        ? ('exploration' as const)
        : discovery.kind === 'planet-explored'
          ? ('colonization' as const)
          : null;
    const queued = queueKind
      ? this.#game.planetQueues[queueKind].some(
          (entry) => entry.planetId === discovery.id,
        )
      : false;
    const attackQueued =
      discovery.kind === 'pirate' &&
      this.#game.attackQueue.some((entry) => entry.pirateId === discovery.id);
    const colonyShip =
      discovery.kind === 'planet-explored'
        ? this.#game.colonyShipRequest(discovery.id)
        : null;
    const offerColonyShip =
      colonyShip &&
      (!colonyShip.colonyShipBuildReason ||
        colonyShip.colonyShipBuildReason.startsWith('No reachable'));
    return Object.freeze({
      title,
      details: Object.freeze(details),
      fleetId: item.fleetId,
      ...(queueKind && !queued
        ? {
            queueAction: Object.freeze({
              kind: queueKind,
              planetId: discovery.id,
              label:
                queueKind === 'exploration'
                  ? 'Add to Exploration queue'
                  : 'Add to Colonization queue',
            }),
          }
        : {}),
      ...(discovery.kind === 'pirate' && !attackQueued
        ? {
            attackAction: Object.freeze({
              pirateId: discovery.id,
              label: 'Add to Attack queue',
            }),
          }
        : {}),
      ...(discovery.kind === 'wreck' &&
      !this.#game.salvageQueue.some(
        (entry) => entry.wreckId === discovery.id,
      ) &&
      this.#game.wrecks.some(
        (wreck) =>
          wreck.id === discovery.id &&
          !wreck.yardId &&
          !wreck.reservedBy &&
          !wreck.towedBy,
      )
        ? {
            salvageAction: Object.freeze({
              wreckId: discovery.id,
              label: 'Add to Salvage queue',
            }),
          }
        : {}),
      ...(offerColonyShip
        ? {
            colonyShipAction: Object.freeze({
              planetId: discovery.id,
              label: 'Build Colony ship',
              blockedReason: colonyShip.colonyShipBuildReason,
            }),
          }
        : {}),
    });
  }

  chooseEvent(choice: 'handle' | 'ignore'): void {
    return this.turn.chooseEvent(choice);
  }

  continueEventHandling(): void {
    return this.turn.continueEventHandling();
  }

  advanceEventPlayback(): void {
    return this.turn.advanceEventPlayback();
  }

  #focusEvent(): void {
    const position = this.#eventPlayback?.current?.position;
    this.#cameraFraming = null;
    this.#playbackPositions = [];
    if (
      !position ||
      !this.#eventCamera ||
      !Number.isSafeInteger(position.q) ||
      !Number.isSafeInteger(position.r)
    )
      return;
    const hex = new HexCoordinate(position.q, position.r);
    if (!this.#game.galaxy.contains(hex)) return;
    this.#playbackPositions = [HexGeometry.toPoint(hex)];
    this.#eventPlayback?.beginFraming();
    this.#prepareCameraFraming();
  }

  get cameraFraming(): CameraFraming | null {
    return this.#cameraFraming;
  }

  #prepareCameraFraming(): void {
    if (!this.#eventCamera || !this.#playbackPositions.length) return;
    const viewport = this.#mapViewport ?? {
      width: 800,
      height: 600,
      availableWidth: 800,
      availableHeight: 600,
    };
    const width = Math.max(
      1,
      Math.min(viewport.width, viewport.availableWidth),
    );
    const height = Math.max(
      1,
      Math.min(viewport.height, viewport.availableHeight),
    );
    const marginX = Math.min(24, width / 4);
    const marginY = Math.min(24, height / 4);
    const bounds = {
      left: -viewport.width / 2 + marginX,
      right: width - viewport.width / 2 - marginX,
      top: -viewport.height / 2 + marginY,
      bottom: height - viewport.height / 2 - marginY,
    };
    const isEvent = !!this.#eventPlayback;
    const clearance = marginY + Math.min(36, (height - marginY * 2) / 2);
    const markerY = Math.max(
      clearance,
      Math.min(height - clearance, Math.max(60, height / 2 - 120)),
    );
    const framing = new CameraFraming(
      this.#eventCamera.snapshot,
      this.#playbackPositions,
      bounds,
      isEvent
        ? {
            x: (bounds.left + bounds.right) / 2,
            y: markerY - viewport.height / 2,
          }
        : undefined,
      {
        left: -viewport.width / 2 + Math.min(24, viewport.width / 4),
        right: viewport.width / 2 - Math.min(24, viewport.width / 4),
        top: -viewport.height / 2 + Math.min(24, viewport.height / 4),
        bottom: viewport.height / 2 - Math.min(24, viewport.height / 4),
      },
    );
    this.#cameraFraming = framing;
    if (!framing.transitions.length) this.finishCameraFraming();
  }

  advanceCameraFraming(
    framing: CameraFraming,
    index: number,
    progress: number,
  ): boolean {
    return this.turn.advanceCameraFraming(framing, index, progress);
  }

  finishCameraFraming(): void {
    return this.turn.finishCameraFraming();
  }

  finishEventPlayback(): void {
    return this.turn.finishEventPlayback();
  }

  beginMovementPlayback(
    playback: TurnMovementPlayback,
    origin: AppReadModel,
  ): void {
    return this.turn.beginMovementPlayback(playback, origin);
  }

  frameTurnTrack(track: readonly TurnMovement[]): void {
    return this.turn.frameTurnTrack(track);
  }

  focusTurnMovement(movement: TurnMovement | readonly TurnMovement[]): void {
    return this.turn.focusTurnMovement(movement);
  }

  completeTurnMovement(): void {
    return this.turn.completeTurnMovement();
  }

  advanceTurnMovement(progress: number): boolean {
    return this.turn.advanceTurnMovement(progress);
  }

  endMovementPlayback(preserveCamera = false): void {
    return this.turn.endMovementPlayback(preserveCamera);
  }

  salvageAtPoint(point: Point): string | null {
    return this.starMap.salvageAtPoint(point);
  }
  selectSalvage(id: string): void {
    return this.starMap.selectSalvage(id);
  }
  orderSalvage(fleetId: string, wreckId: string): void {
    return this.starMap.orderSalvage(fleetId, wreckId);
  }
  dropSalvage(point: Point): void {
    return this.starMap.dropSalvage(point);
  }
  previewSalvage(point: Point): void {
    return this.starMap.previewSalvage(point);
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
            Salvage.availableCapacity(fleet, this.#game.wrecks) > 0,
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
    return this.starMap.returnToShipyard(id);
  }
  releaseWreck(fleetId: string, id: string): void {
    return this.starMap.releaseWreck(fleetId, id);
  }
  beginShipyardPlacement(
    planetId: string,
    site?: number,
    yardId: string | null = null,
  ): void {
    return this.starMap.beginShipyardPlacement(planetId, site, yardId);
  }
  rebuildShipyard(id: string): void {
    return this.starMap.rebuildShipyard(id);
  }
  moveRepair(yardId: string, wreckId: string, index: number): void {
    return this.starMap.moveRepair(yardId, wreckId, index);
  }
  cancelShipyardPlacement(): void {
    return this.starMap.cancelShipyardPlacement();
  }
  placeShipyard(position: HexCoordinate): void {
    return this.starMap.placeShipyard(position);
  }

  #createHost(): AppHost {
    // The object literal cannot see private fields through `this`.
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const model = this;
    return {
      get orderSelection() {
        return model.#orderSelection;
      },
      get shipStartOrder() {
        return model.#shipStartOrder;
      },
      get movementPlayback() {
        return model.#movementPlayback;
      },
      get movementOrigin() {
        return model.#movementOrigin;
      },
      get eventPlayback() {
        return model.#eventPlayback;
      },
      get presentedEventIds() {
        return model.#presentedEventIds;
      },
      get eventCamera() {
        return model.#eventCamera;
      },
      get cameraFraming() {
        return model.#cameraFraming;
      },
      get playbackPositions() {
        return model.#playbackPositions;
      },
      get turnContext() {
        return model.#turnContext;
      },
      get salvageSelection() {
        return model.#salvageSelection;
      },
      get shipyardPlacement() {
        return model.#shipyardPlacement;
      },
      get planetTab() {
        return model.#planetTab;
      },
      get productionCategory() {
        return model.#productionCategory;
      },
      get productionProduct() {
        return model.#productionProduct;
      },
      get productionFleetId() {
        return model.#productionFleetId;
      },
      get closedProjectIds() {
        return model.#closedProjectIds;
      },
      get expandedProjectIds() {
        return model.#expandedProjectIds;
      },
      get focusedProjectId() {
        return model.#focusedProjectId;
      },
      get pendingEndTurn() {
        return model.#pendingEndTurn;
      },
      get pendingResearchRemoval() {
        return model.#pendingResearchRemoval;
      },
      get game() {
        return model.#game;
      },
      get testBattle() {
        return model.#testBattle;
      },
      get testBoarding() {
        return model.#testBoarding;
      },
      get battleFeedback() {
        return model.#battleFeedback;
      },
      get camera() {
        return model.#camera;
      },
      get selected() {
        return model.#selected;
      },
      get constructionSite() {
        return model.#constructionSite;
      },
      get screen() {
        return model.#screen;
      },
      get buildSearch() {
        return model.#buildSearch;
      },
      get buildingCategory() {
        return model.#buildingCategory;
      },
      get selectedBuilding() {
        return model.#selectedBuilding;
      },
      get researchCamera() {
        return model.#researchCamera;
      },
      get inspectedResearch() {
        return model.#inspectedResearch;
      },
      get mapProductionCategory() {
        return model.#mapProductionCategory;
      },
      get mapProductionPage() {
        return model.#mapProductionPage;
      },
      get mapProductionOption() {
        return model.#mapProductionOption;
      },
      get mapProjectId() {
        return model.#mapProjectId;
      },
      get mapViewport() {
        return model.#mapViewport;
      },
      get mapFocusRevision() {
        return model.#mapFocusRevision;
      },
      get pendingMapFocus() {
        return model.#pendingMapFocus;
      },
      get mapTrade() {
        return model.#mapTrade;
      },
      get returnSite() {
        return model.#returnSite;
      },
      get selectedFleetId() {
        return model.#selectedFleetId;
      },
      get fleetNameEdit() {
        return model.#fleetNameEdit;
      },
      get shipTransfer() {
        return model.#shipTransfer;
      },
      get mapFleetId() {
        return model.#mapFleetId;
      },
      get hoveredFleetId() {
        return model.#hoveredFleetId;
      },
      get fleetDestinationPreview() {
        return model.#fleetDestinationPreview;
      },
      get fleetDragging() {
        return model.#fleetDragging;
      },
      get destinationFleetId() {
        return model.#destinationFleetId;
      },
      get destinationOrder() {
        return model.#destinationOrder;
      },
      get notice() {
        return model.#notice;
      },
      get productionReceipt() {
        return model.#productionReceipt;
      },
      get activeSlot() {
        return model.#activeSlot;
      },
      get pendingClearSlot() {
        return model.#pendingClearSlot;
      },
      get saveSlots() {
        return model.#saveSlots;
      },
      set orderSelection(value) {
        model.#orderSelection = value;
      },
      set shipStartOrder(value) {
        model.#shipStartOrder = value;
      },
      set movementPlayback(value) {
        model.#movementPlayback = value;
      },
      set movementOrigin(value) {
        model.#movementOrigin = value;
      },
      set eventPlayback(value) {
        model.#eventPlayback = value;
      },
      set eventCamera(value) {
        model.#eventCamera = value;
      },
      set cameraFraming(value) {
        model.#cameraFraming = value;
      },
      set playbackPositions(value) {
        model.#playbackPositions = value;
      },
      set turnContext(value) {
        model.#turnContext = value;
      },
      set salvageSelection(value) {
        model.#salvageSelection = value;
      },
      set shipyardPlacement(value) {
        model.#shipyardPlacement = value;
      },
      set planetTab(value) {
        model.#planetTab = value;
      },
      set productionCategory(value) {
        model.#productionCategory = value;
      },
      set productionProduct(value) {
        model.#productionProduct = value;
      },
      set productionFleetId(value) {
        model.#productionFleetId = value;
      },
      set closedProjectIds(value) {
        model.#closedProjectIds = value;
      },
      set expandedProjectIds(value) {
        model.#expandedProjectIds = value;
      },
      set focusedProjectId(value) {
        model.#focusedProjectId = value;
      },
      set pendingEndTurn(value) {
        model.#pendingEndTurn = value;
      },
      set pendingResearchRemoval(value) {
        model.#pendingResearchRemoval = value;
      },
      set game(value) {
        model.#game = value;
      },
      set testBattle(value) {
        model.#testBattle = value;
      },
      set testBoarding(value) {
        model.#testBoarding = value;
      },
      set battleFeedback(value) {
        model.#battleFeedback = value;
      },
      set camera(value) {
        model.#camera = value;
      },
      set selected(value) {
        model.#selected = value;
      },
      set constructionSite(value) {
        model.#constructionSite = value;
      },
      set screen(value) {
        model.#screen = value;
      },
      set buildSearch(value) {
        model.#buildSearch = value;
      },
      set buildingCategory(value) {
        model.#buildingCategory = value;
      },
      set selectedBuilding(value) {
        model.#selectedBuilding = value;
      },
      set inspectedResearch(value) {
        model.#inspectedResearch = value;
      },
      set mapProductionCategory(value) {
        model.#mapProductionCategory = value;
      },
      set mapProductionPage(value) {
        model.#mapProductionPage = value;
      },
      set mapProductionOption(value) {
        model.#mapProductionOption = value;
      },
      set mapProjectId(value) {
        model.#mapProjectId = value;
      },
      set mapViewport(value) {
        model.#mapViewport = value;
      },
      set mapFocusRevision(value) {
        model.#mapFocusRevision = value;
      },
      set pendingMapFocus(value) {
        model.#pendingMapFocus = value;
      },
      set returnSite(value) {
        model.#returnSite = value;
      },
      set selectedFleetId(value) {
        model.#selectedFleetId = value;
      },
      set fleetNameEdit(value) {
        model.#fleetNameEdit = value;
      },
      set shipTransfer(value) {
        model.#shipTransfer = value;
      },
      set mapFleetId(value) {
        model.#mapFleetId = value;
      },
      set hoveredFleetId(value) {
        model.#hoveredFleetId = value;
      },
      set fleetDestinationPreview(value) {
        model.#fleetDestinationPreview = value;
      },
      set fleetDragging(value) {
        model.#fleetDragging = value;
      },
      set destinationFleetId(value) {
        model.#destinationFleetId = value;
      },
      set destinationOrder(value) {
        model.#destinationOrder = value;
      },
      set notice(value) {
        model.#notice = value;
      },
      set productionReceipt(value) {
        model.#productionReceipt = value;
      },
      set activeSlot(value) {
        model.#activeSlot = value;
      },
      set pendingClearSlot(value) {
        model.#pendingClearSlot = value;
      },
      set saveSlots(value) {
        model.#saveSlots = value;
      },
      get initialGalaxy() {
        return model.initialGalaxy;
      },
      get saves() {
        return model.saves;
      },
      get snapshot() {
        return model.snapshot;
      },
      refreshSlots: () => model.#refreshSlots(),
      startSlot: (id: number) => model.startSlot(id),
      save: () => model.save(),
      openSaves: () => model.openSaves(),
      requestClearSlot: (id: number) => model.requestClearSlot(id),
      cancelClearSlot: () => model.cancelClearSlot(),
      confirmClearSlot: () => model.confirmClearSlot(),
      navigationSnapshot: (previous: AppReadModel) =>
        model.navigationSnapshot(previous),
      select: (position: HexCoordinate) => model.select(position),
      reportError: (error: unknown) => model.reportError(error),
      clearNotice: () => model.clearNotice(),
      fleetAtPoint: (point: Point) => model.fleetAtPoint(point),
      selectMapFleet: (id: string) => model.selectMapFleet(id),
      hoverMapFleet: (point: Point | null) => model.hoverMapFleet(point),
      previewFleetDestination: (point: Point) =>
        model.previewFleetDestination(point),
      commitFleetDestination: () => model.commitFleetDestination(),
      cancelMapPointer: (keepRouteSource = false) =>
        model.cancelMapPointer(keepRouteSource),
      selectPoint: (point: Point) => model.selectPoint(point),
      mapRouteDragSource: (point: Point) => model.mapRouteDragSource(point),
      beginMapRoute: (id: string) => model.beginMapRoute(id),
      previewMapRoute: (point: Point) => model.previewMapRoute(point),
      commitMapRoute: () => model.commitMapRoute(),
      selectMapRoute: (id: string) => model.selectMapRoute(id),
      assignMapTradeFleet: (routeId: string, fleetId: string) =>
        model.assignMapTradeFleet(routeId, fleetId),
      openPlanet: (id?: string) => model.openPlanet(id),
      selectPlanetTab: (tab: PlanetTab) => model.selectPlanetTab(tab),
      selectProduction: (
        category: ProductionCategory,
        product: string | null,
      ) => model.selectProduction(category, product),
      selectProductionFleet: (id: string | null) =>
        model.selectProductionFleet(id),
      toggleProjectSupply: (id: string, open: boolean) =>
        model.toggleProjectSupply(id, open),
      openPlanetProject: (planetId: string, projectId: string) =>
        model.openPlanetProject(planetId, projectId),
      inspectResearch: (technology: Technology | null) =>
        model.inspectResearch(technology),
      openResearch: () => model.openResearch(),
      isMapScreen: () => model.#isMapScreen(),
      openMapScreen: (screen: MapScreen) => model.#openMapScreen(screen),
      openMap: () => model.openMap(),
      openFleets: () => model.openFleets(),
      orderSnapshot: () => model.#orderSnapshot(),
      openFleetOrders: (id: string) => model.openFleetOrders(id),
      openShipOrders: (ship: ShipType, projectId?: string) =>
        model.openShipOrders(ship, projectId),
      chooseOrder: (kind: OrderKind) => model.chooseOrder(kind),
      completeOrder: (order: ShipOrder) => model.completeOrder(order),
      orderBack: () => model.orderBack(),
      clearStartOrder: () => model.clearStartOrder(),
      closeOrders: (joinedFleetId?: string) =>
        model.#closeOrders(joinedFleetId),
      openFleet: (id: string) => model.openFleet(id),
      pan: (delta: Point) => model.pan(delta),
      zoom: (factor: number, anchor: Point) => model.zoom(factor, anchor),
      home: () => model.home(),
      openBuildSite: (index: number | null) => model.openBuildSite(index),
      searchBuildings: (query: string) => model.searchBuildings(query),
      selectBuildingCategory: (category: BuildingCategory) =>
        model.selectBuildingCategory(category),
      selectBuilding: (type: BuildType | null) => model.selectBuilding(type),
      research: (type: Technology | null) => model.research(type),
      resizeResearch: (width: number, height: number) =>
        model.resizeResearch(width, height),
      panResearch: (delta: Point) => model.panResearch(delta),
      zoomResearch: (factor: number, anchor: Point) =>
        model.zoomResearch(factor, anchor),
      fitResearch: () => model.fitResearch(),
      openSupplyPlanet: (id: string) => model.openSupplyPlanet(id),
      openSupplyRoute: (id: string) => model.openSupplyRoute(id),
      moveResearch: (type: Technology, index: number) =>
        model.moveResearch(type, index),
      requestResearchRemoval: (type: Technology | null) =>
        model.requestResearchRemoval(type),
      confirmResearchRemoval: () => model.confirmResearchRemoval(),
      openRoute: (planetId?: string) => model.openRoute(planetId),
      openProduction: (planetId?: string) => model.openProduction(planetId),
      focusMapPlanet: (id: string) => model.#focusMapPlanet(id),
      requestMapFocus: (position: HexCoordinate) =>
        model.#requestMapFocus(position),
      selectedMapProject: () => model.#selectedMapProject(),
      productionMapSnapshot: () => model.#productionMapSnapshot(),
      selectMapProductionCategory: (category: MapProductionCategory) =>
        model.selectMapProductionCategory(category),
      selectMapProductionPage: (page: number) =>
        model.selectMapProductionPage(page),
      selectMapProductionOption: (type: ProjectType | null) =>
        model.selectMapProductionOption(type),
      selectMapProject: (id: string) => model.selectMapProject(id),
      orderMapProduction: (option?: ProjectType) =>
        model.orderMapProduction(option),
      clearProductionReceipt: () => model.clearProductionReceipt(),
      resizeMap: (viewport: MapViewport) => model.resizeMap(viewport),
      fitProduction: () => model.#fitProduction(),
      openDecisions: () => model.openDecisions(),
      openDecision: (id?: string) => model.openDecision(id),
      skipDecision: (id: string) => model.skipDecision(id),
      muteDecision: (id: string) => model.muteDecision(id),
      unmuteDecision: (id: string) => model.unmuteDecision(id),
      requestEndTurn: () => model.requestEndTurn(),
      cancelEndTurn: () => model.cancelEndTurn(),
      createTradeRoute: (a: string, b: string) => model.createTradeRoute(a, b),
      assignTradeFleet: (routeId: string, fleetId: string) =>
        model.assignTradeFleet(routeId, fleetId),
      releaseTradeFleet: (id: string) => model.releaseTradeFleet(id),
      closeTradeRoute: (id: string) => model.closeTradeRoute(id),
      colonize: (id: string) => model.colonize(id),
      build: (type: BuildType, slotIndex?: number) =>
        model.build(type, slotIndex),
      scheduleShip: (
        ship: ShipType,
        fleetId: string | null,
        factoryId?: string,
      ) => model.scheduleShip(ship, fleetId, factoryId),
      moveProject: (id: string, index: number) => model.moveProject(id, index),
      scheduleComponent: (component: Component) =>
        model.scheduleComponent(component),
      setProjectFleet: (id: string, fleetId: string | null) =>
        model.setProjectFleet(id, fleetId),
      cancelProject: (id: string) => model.cancelProject(id),
      toggleDemolition: (id: string) => model.toggleDemolition(id),
      upgradeBuilding: (id: string) => model.upgradeBuilding(id),
      produceFighter: () => model.produceFighter(),
      canBuild: (type: BuildType) => model.canBuild(type),
      selectFleet: (id: string) => model.selectFleet(id),
      renameFleet: (id: string, name: string) => model.renameFleet(id, name),
      beginFleetRename: (id: string) => model.beginFleetRename(id),
      editFleetName: (draft: string) => model.editFleetName(draft),
      cancelFleetRename: () => model.cancelFleetRename(),
      submitFleetName: () => model.submitFleetName(),
      chooseShipTransfer: (fleetId: string, ship: ShipType, shipId?: string) =>
        model.chooseShipTransfer(fleetId, ship, shipId),
      cancelShipTransfer: () => model.cancelShipTransfer(),
      transferChosenShip: (target: string | null) =>
        model.transferChosenShip(target),
      transferShips: (
        source: string,
        ship: ShipType,
        amount: number,
        target: string | null,
        shipId?: string,
      ) => model.transferShips(source, ship, amount, target, shipId),
      createFleet: (source?: string) => model.createFleet(source),
      deleteFleet: (id: string) => model.deleteFleet(id),
      beginDestination: (id: string) => model.beginDestination(id),
      upgradeFleet: (id: string) => model.upgradeFleet(id),
      setDestination: (id: string, q: number, r: number) =>
        model.setDestination(id, q, r),
      beginColonization: (id: string) => model.beginColonization(id),
      beginSalvage: (id: string) => model.beginSalvage(id),
      clearDestination: (id: string) => model.clearDestination(id),
      startTurn: () => model.startTurn(),
      nextTurnFrame: () => model.nextTurnFrame(),
      exploreFleet: (id: string, order: ExplorationOrder) =>
        model.exploreFleet(id, order),
      automateSalvage: (id: string) => model.automateSalvage(id),
      civilianTransport: (id: string) => model.civilianTransport(id),
      automateTransport: (id: string) => model.automateTransport(id),
      patrolFleet: (id: string) => model.patrolFleet(id),
      handleDiscoveries: () => model.handleDiscoveries(),
      focusInterruptedFleet: () => model.#focusInterruptedFleet(),
      allowOtherFleetOrders: () => model.allowOtherFleetOrders(),
      continueTurn: () => model.continueTurn(),
      commandBattle: (command: BattleCommand) => model.commandBattle(command),
      startTestBoarding: () => model.startTestBoarding(),
      closeTestBoarding: () => model.closeTestBoarding(),
      finishBoarding: (outcome: 'victory' | 'defeat' | 'aborted' = 'aborted') =>
        model.finishBoarding(outcome),
      commandBoarding: (command: BoardingCommand) =>
        model.commandBoarding(command),
      shouldPlayBoardingStep: () => model.shouldPlayBoardingStep(),
      playBoardingStep: () => model.playBoardingStep(),
      startTestBattle: () => model.startTestBattle(),
      autoSelectBattleShip: () => model.autoSelectBattleShip(),
      afterBattleAction: (result: BattleState) =>
        model.#afterBattleAction(result),
      playBattleActivation: (
        singleStep = false,
        options?: { readonly allowDock?: boolean },
      ) => model.playBattleActivation(singleStep, options),
      finishBattleFeedback: () => model.finishBattleFeedback(),
      resumeFleetOrders: (id: string) => model.resumeFleetOrders(id),
      applyTurnFrame: (frame: TurnFrame) => model.applyTurnFrame(frame),
      finishTurn: () => model.finishTurn(),
      beginEventPlayback: () => model.beginEventPlayback(),
      eventDecision: (id: string) => model.#eventDecision(id),
      chooseEvent: (choice: 'handle' | 'ignore') => model.chooseEvent(choice),
      continueEventHandling: () => model.continueEventHandling(),
      advanceEventPlayback: () => model.advanceEventPlayback(),
      focusEvent: () => model.#focusEvent(),
      prepareCameraFraming: () => model.#prepareCameraFraming(),
      advanceCameraFraming: (
        framing: CameraFraming,
        index: number,
        progress: number,
      ) => model.advanceCameraFraming(framing, index, progress),
      finishCameraFraming: () => model.finishCameraFraming(),
      finishEventPlayback: () => model.finishEventPlayback(),
      beginMovementPlayback: (
        playback: TurnMovementPlayback,
        origin: AppReadModel,
      ) => model.beginMovementPlayback(playback, origin),
      frameTurnTrack: (track: readonly TurnMovement[]) =>
        model.frameTurnTrack(track),
      focusTurnMovement: (movement: TurnMovement | readonly TurnMovement[]) =>
        model.focusTurnMovement(movement),
      completeTurnMovement: () => model.completeTurnMovement(),
      advanceTurnMovement: (progress: number) =>
        model.advanceTurnMovement(progress),
      endMovementPlayback: (preserveCamera = false) =>
        model.endMovementPlayback(preserveCamera),
      salvageAtPoint: (point: Point) => model.salvageAtPoint(point),
      selectSalvage: (id: string) => model.selectSalvage(id),
      orderSalvage: (fleetId: string, wreckId: string) =>
        model.orderSalvage(fleetId, wreckId),
      dropSalvage: (point: Point) => model.dropSalvage(point),
      previewSalvage: (point: Point) => model.previewSalvage(point),
      salvageDropTarget: (point: Point) => model.#salvageDropTarget(point),
      returnToShipyard: (id: string) => model.returnToShipyard(id),
      releaseWreck: (fleetId: string, id: string) =>
        model.releaseWreck(fleetId, id),
      beginShipyardPlacement: (
        planetId: string,
        site?: number,
        yardId: string | null = null,
      ) => model.beginShipyardPlacement(planetId, site, yardId),
      rebuildShipyard: (id: string) => model.rebuildShipyard(id),
      moveRepair: (yardId: string, wreckId: string, index: number) =>
        model.moveRepair(yardId, wreckId, index),
      cancelShipyardPlacement: () => model.cancelShipyardPlacement(),
      placeShipyard: (position: HexCoordinate) => model.placeShipyard(position),
    };
  }
}

export interface AppHost {
  orderSelection: OrderSelection | null;
  shipStartOrder: {
    readonly ship: ShipType;
    readonly order: ShipOrder;
  } | null;
  movementPlayback: TurnMovementPlayback | null;
  movementOrigin: AppReadModel | null;
  eventPlayback: EventPlayback | null;
  presentedEventIds: Set<string>;
  eventCamera: Camera | null;
  cameraFraming: CameraFraming | null;
  playbackPositions: readonly Point[];
  turnContext: {
    readonly screen: Screen;
    readonly selected: HexCoordinate;
    readonly mapFleetId: string | null;
    readonly selectedFleetId: string | null;
    readonly salvageSelection: string | null;
    readonly camera: CameraSnapshot;
  } | null;
  salvageSelection: string | null;
  shipyardPlacement: AppReadModel['shipyardPlacement'];
  planetTab: PlanetTab;
  productionCategory: ProductionCategory;
  productionProduct: string | null;
  productionFleetId: string | null;
  closedProjectIds: Set<string>;
  expandedProjectIds: Set<string>;
  focusedProjectId: string | null;
  pendingEndTurn: boolean;
  pendingResearchRemoval: Technology | null;
  game: Game;
  testBattle: TacticalBattle | null;
  testBoarding: BoardingBattle | null;
  battleFeedback: BattleState | null;
  camera: Camera;
  selected: HexCoordinate;
  constructionSite: number | null;
  screen: Screen;
  buildSearch: string;
  buildingCategory: BuildingCategory;
  selectedBuilding: BuildType | null;
  researchCamera: ResearchTreeCamera;
  inspectedResearch: Technology | null;
  mapProductionCategory: MapProductionCategory;
  mapProductionPage: number;
  mapProductionOption: ProjectType | null;
  mapProjectId: string | null;
  mapViewport: MapViewport | null;
  mapFocusRevision: number;
  pendingMapFocus: HexCoordinate | null;
  mapTrade: StarMapTrade;
  returnSite: number | null;
  selectedFleetId: string | null;
  fleetNameEdit: { readonly id: string; readonly draft: string } | null;
  shipTransfer: {
    readonly fleetId: string;
    readonly ship: ShipType;
    readonly shipId?: string | undefined;
  } | null;
  mapFleetId: string | null;
  hoveredFleetId: string | null;
  fleetDestinationPreview: HexCoordinate | null;
  fleetDragging: boolean;
  destinationFleetId: string | null;
  destinationOrder: 'move' | 'colonize' | 'salvage';
  notice: PlayerNotice;
  productionReceipt: ProductionReceipt | null;
  activeSlot: number | null;
  pendingClearSlot: number | null;
  saveSlots: readonly SaveSlotSnapshot[];
  readonly initialGalaxy: ReturnType<typeof createExampleGalaxy>;
  readonly saves: SaveRepository | undefined;
  readonly snapshot: AppReadModel;
  refreshSlots(): void;
  startSlot(id: number): void;
  save(): void;
  openSaves(): void;
  requestClearSlot(id: number): void;
  cancelClearSlot(): void;
  confirmClearSlot(): void;
  navigationSnapshot(previous: AppReadModel): AppReadModel;
  select(position: HexCoordinate): void;
  reportError(error: unknown): void;
  clearNotice(): void;
  fleetAtPoint(point: Point): string | null;
  selectMapFleet(id: string): void;
  hoverMapFleet(point: Point | null): boolean;
  previewFleetDestination(point: Point): void;
  commitFleetDestination(): void;
  cancelMapPointer(keepRouteSource?: boolean): void;
  selectPoint(point: Point): void;
  mapRouteDragSource(point: Point): string | null;
  beginMapRoute(id: string): void;
  previewMapRoute(point: Point): void;
  commitMapRoute(): void;
  selectMapRoute(id: string): void;
  assignMapTradeFleet(routeId: string, fleetId: string): void;
  openPlanet(id?: string): void;
  selectPlanetTab(tab: PlanetTab): void;
  selectProduction(category: ProductionCategory, product: string | null): void;
  selectProductionFleet(id: string | null): void;
  toggleProjectSupply(id: string, open: boolean): void;
  openPlanetProject(planetId: string, projectId: string): void;
  inspectResearch(technology: Technology | null): void;
  openResearch(): void;
  isMapScreen(): boolean;
  openMapScreen(screen: MapScreen): void;
  openMap(): void;
  openFleets(): void;
  orderSnapshot(): OrderSelectionSnapshot | null;
  openFleetOrders(id: string): void;
  openShipOrders(ship: ShipType, projectId?: string): void;
  chooseOrder(kind: OrderKind): void;
  completeOrder(order: ShipOrder): void;
  orderBack(): void;
  clearStartOrder(): void;
  closeOrders(joinedFleetId?: string): void;
  openFleet(id: string): void;
  pan(delta: Point): void;
  zoom(factor: number, anchor: Point): void;
  home(): void;
  openBuildSite(index: number | null): void;
  searchBuildings(query: string): void;
  selectBuildingCategory(category: BuildingCategory): void;
  selectBuilding(type: BuildType | null): void;
  research(type: Technology | null): void;
  resizeResearch(width: number, height: number): void;
  panResearch(delta: Point): void;
  zoomResearch(factor: number, anchor: Point): void;
  fitResearch(): void;
  openSupplyPlanet(id: string): void;
  openSupplyRoute(id: string): void;
  moveResearch(type: Technology, index: number): void;
  requestResearchRemoval(type: Technology | null): void;
  confirmResearchRemoval(): void;
  openRoute(planetId?: string): void;
  openProduction(planetId?: string): void;
  focusMapPlanet(id: string): void;
  requestMapFocus(position: HexCoordinate): void;
  selectedMapProject(): string | null;
  productionMapSnapshot(): ProductionMapSnapshot;
  selectMapProductionCategory(category: MapProductionCategory): void;
  selectMapProductionPage(page: number): void;
  selectMapProductionOption(type: ProjectType | null): void;
  selectMapProject(id: string): void;
  orderMapProduction(option?: ProjectType): void;
  clearProductionReceipt(): void;
  resizeMap(viewport: MapViewport): void;
  fitProduction(): void;
  openDecisions(): void;
  openDecision(id?: string): void;
  skipDecision(id: string): void;
  muteDecision(id: string): void;
  unmuteDecision(id: string): void;
  requestEndTurn(): boolean;
  cancelEndTurn(): void;
  createTradeRoute(a: string, b: string): void;
  assignTradeFleet(routeId: string, fleetId: string): void;
  releaseTradeFleet(id: string): void;
  closeTradeRoute(id: string): void;
  colonize(id: string): void;
  build(type: BuildType, slotIndex?: number): void;
  scheduleShip(
    ship: ShipType,
    fleetId: string | null,
    factoryId?: string,
  ): void;
  moveProject(id: string, index: number): void;
  scheduleComponent(component: Component): void;
  setProjectFleet(id: string, fleetId: string | null): void;
  cancelProject(id: string): void;
  toggleDemolition(id: string): void;
  upgradeBuilding(id: string): void;
  produceFighter(): void;
  canBuild(type: BuildType): string | null;
  selectFleet(id: string): void;
  renameFleet(id: string, name: string): void;
  beginFleetRename(id: string): void;
  editFleetName(draft: string): void;
  cancelFleetRename(): void;
  submitFleetName(): void;
  chooseShipTransfer(fleetId: string, ship: ShipType, shipId?: string): void;
  cancelShipTransfer(): void;
  transferChosenShip(target: string | null): void;
  transferShips(
    source: string,
    ship: ShipType,
    amount: number,
    target: string | null,
    shipId?: string,
  ): void;
  createFleet(source?: string): void;
  deleteFleet(id: string): void;
  beginDestination(id: string): void;
  upgradeFleet(id: string): void;
  setDestination(id: string, q: number, r: number): void;
  beginColonization(id: string): void;
  beginSalvage(id: string): void;
  clearDestination(id: string): void;
  startTurn(): void;
  nextTurnFrame(): TurnFrame | null;
  exploreFleet(id: string, order: ExplorationOrder): void;
  automateSalvage(id: string): void;
  civilianTransport(id: string): void;
  automateTransport(id: string): void;
  patrolFleet(id: string): void;
  handleDiscoveries(): void;
  focusInterruptedFleet(): void;
  allowOtherFleetOrders(): void;
  continueTurn(): void;
  commandBattle(command: BattleCommand): void;
  startTestBoarding(): void;
  closeTestBoarding(): void;
  finishBoarding(outcome?: 'victory' | 'defeat' | 'aborted'): void;
  commandBoarding(command: BoardingCommand): void;
  shouldPlayBoardingStep(): boolean;
  playBoardingStep(): boolean;
  startTestBattle(): void;
  autoSelectBattleShip(): boolean;
  afterBattleAction(result: BattleState): void;
  playBattleActivation(
    singleStep?: boolean,
    options?: { readonly allowDock?: boolean },
  ): void;
  finishBattleFeedback(): void;
  resumeFleetOrders(id: string): void;
  applyTurnFrame(frame: TurnFrame): void;
  finishTurn(): void;
  beginEventPlayback(): void;
  eventDecision(id: string): EventDecision | undefined;
  chooseEvent(choice: 'handle' | 'ignore'): void;
  continueEventHandling(): void;
  advanceEventPlayback(): void;
  focusEvent(): void;
  prepareCameraFraming(): void;
  advanceCameraFraming(
    framing: CameraFraming,
    index: number,
    progress: number,
  ): boolean;
  finishCameraFraming(): void;
  finishEventPlayback(): void;
  beginMovementPlayback(
    playback: TurnMovementPlayback,
    origin: AppReadModel,
  ): void;
  frameTurnTrack(track: readonly TurnMovement[]): void;
  focusTurnMovement(movement: TurnMovement | readonly TurnMovement[]): void;
  completeTurnMovement(): void;
  advanceTurnMovement(progress: number): boolean;
  endMovementPlayback(preserveCamera?: boolean): void;
  salvageAtPoint(point: Point): string | null;
  selectSalvage(id: string): void;
  orderSalvage(fleetId: string, wreckId: string): void;
  dropSalvage(point: Point): void;
  previewSalvage(point: Point): void;
  salvageDropTarget(point: Point): string | null;
  returnToShipyard(id: string): void;
  releaseWreck(fleetId: string, id: string): void;
  beginShipyardPlacement(
    planetId: string,
    site?: number,
    yardId?: string | null,
  ): void;
  rebuildShipyard(id: string): void;
  moveRepair(yardId: string, wreckId: string, index: number): void;
  cancelShipyardPlacement(): void;
  placeShipyard(position: HexCoordinate): void;
}
