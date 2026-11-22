import {
  SaveFacade,
  ResearchFacade,
  FleetFacade,
  OrderFacade,
  ProductionFacade,
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
  type MapScreen,
  type MapViewport,
  type SaveRepository,
  ResearchTreeCamera,
  type ResearchCameraSnapshot,
  Camera,
  type CameraSnapshot,
  CameraFraming,
  createExampleGalaxy,
  Game,
  type FleetSnapshot,
  type GameEvent,
  type GamePhase,
  type ShipType,
  type TurnFrame,
  type Technology,
  type ResearchSnapshot,
  type MapCell,
  FLEET_CATEGORIES,
  type FleetCategory,
} from '../../space-map/models/index.js';
import {
  BoardingFacade,
  BoardingEditorFacade,
  type BoardingEditorCatalogItem,
  type BoardingEditorSnapshot,
  type BoardingBattle,
  type BoardingBattleState,
  type TestBoardingSelection,
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

export type Screen =
  'saves' | 'map' | 'research' | 'fleets' | 'production' | 'orders';

export interface SaveSlotSnapshot {
  readonly id: number;
  readonly lastPlayed: string | null;
  readonly round: number | null;
  readonly cells: readonly MapCell[];
  readonly error: string | null;
}

export interface AppReadModel {
  readonly orderView?: OrderSelectionSnapshot | null;
  readonly boardingBattle?: BoardingBattleState | null;
  readonly boardingPresentation?: readonly BoardingBattleState[];
  readonly boardingShot?: BoardingShot | null;
  readonly tacticalBattle: BattleState | null;
  readonly battleFeedback: BattleState | null;
  readonly turnMovement: TurnMovement | null;
  readonly turnMovements: readonly TurnMovement[];
  readonly eventPlayback: EventPlaybackSnapshot | null;
  readonly presentedEventIds: readonly string[];
  readonly mapFocusRevision: number;
  readonly pendingResearchRemoval: Technology | null;
  readonly saveSlots: readonly SaveSlotSnapshot[];
  readonly pendingClearSlot: number | null;
  readonly research: ResearchSnapshot;
  readonly researchCamera: ResearchCameraSnapshot;
  readonly inspectedResearch: Technology | null;
  readonly screen: Screen;
  readonly radius: number;
  readonly cells: readonly MapCell[];
  readonly selected: MapCell | null;
  readonly selectedPlanetInfo: ReturnType<Game['planetIntel']>;
  readonly camera: CameraSnapshot;
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
  /** flottkategorier: categories the player hid from the Fleets map. */
  readonly hiddenFleetCategories: readonly FleetCategory[];
  readonly hoveredFleetId: string | null;
  readonly fleetDestinationPreview: HexCoordinate | null;
  readonly fleetDragging: boolean;
  readonly destinationFleetId: string | null;
  readonly events: readonly GameEvent[];
  readonly notice: PlayerNotice;
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
  readonly fleets: FleetFacade;
  readonly orders: OrderFacade;
  readonly production: ProductionFacade;
  readonly starMap: StarMapFacade;
  readonly turn: TurnFacade;

  #orderSelection: OrderSelection | null = null;
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
    readonly camera: CameraSnapshot;
  } | null = null;
  #hiddenFleetCategories = new Set<FleetCategory>();
  #pendingResearchRemoval: Technology | null = null;
  #game: Game;
  #testBattle: TacticalBattle | null = null;
  #testBoarding: BoardingBattle | null = null;
  #battleFeedback: BattleState | null = null;
  #camera: Camera;
  #selected: HexCoordinate;
  #screen: Screen = 'map';
  readonly #researchCamera = new ResearchTreeCamera();
  #inspectedResearch: Technology | null = null;
  #mapViewport: MapViewport | null = null;
  #mapFocusRevision = 0;
  #pendingMapFocus: HexCoordinate | null = null;
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
  #notice: PlayerNotice = null;

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
    this.fleets = new FleetFacade(host);
    this.orders = new OrderFacade(host);
    this.production = new ProductionFacade(host);
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
        // handelser-vid-ankomst: arrival events show during movement.
        eventPlayback: this.#eventPlayback?.snapshot ?? null,
      });
    }
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
      orderView: this.#orderSnapshot(),
      mapFocusRevision: this.#mapFocusRevision,
      pendingResearchRemoval: this.#pendingResearchRemoval,
      saveSlots: this.#saveSlots,
      pendingClearSlot: this.#pendingClearSlot,
      research: this.#game.research,
      researchCamera: this.#researchCamera.snapshot,
      inspectedResearch: this.#inspectedResearch,
      screen: this.#eventCamera ? 'map' : this.#screen,
      radius: this.#game.galaxy.radius,
      cells: this.#game.mapSnapshot(),
      selected:
        this.#game
          .mapSnapshot()
          .find((cell) => cell.position.key === this.#selected.key) ?? null,
      camera: this.#eventCamera?.snapshot ?? this.#camera.snapshot,
      selectedPlanetInfo: this.#game.planetIntel(this.#selected),
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
      hiddenFleetCategories: Object.freeze(
        FLEET_CATEGORIES.filter((item) =>
          this.#hiddenFleetCategories.has(item),
        ),
      ),
      hoveredFleetId: this.#hoveredFleetId,
      fleetDestinationPreview: this.#fleetDestinationPreview,
      fleetDragging: this.#fleetDragging,
      destinationFleetId: this.#destinationFleetId,
      events: this.#game.events,
      notice: this.#notice,
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
  cancelMapPointer(): void {
    return this.starMap.cancelMapPointer();
  }

  selectPoint(point: Point): void {
    return this.starMap.selectPoint(point);
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
    this.#destinationFleetId = null;
    this.#screen = screen;
    if (screen !== 'orders') this.#orderSelection = null;
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
    const fleet = this.#game.fleet(selection.fleetId);
    return Object.freeze({
      ...selection,
      options: ShipOrders.options(fleet?.ships ?? {}),
      fleetTargets: Object.freeze(
        this.#game
          .fleetSnapshots()
          .filter(
            (target) => target.id !== selection.fleetId && target.position,
          ),
      ),
    });
  }
  openFleetOrders(id: string): void {
    return this.orders.openFleetOrders(id);
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
  #closeOrders(joinedFleetId?: string): void {
    const selection = this.#orderSelection;
    if (!selection) return;
    this.#orderSelection = null;
    this.#screen =
      selection.returnScreen === 'orders' ? 'fleets' : selection.returnScreen;
    const fleet =
      this.#game.fleet(selection.fleetId) ??
      (joinedFleetId ? this.#game.fleet(joinedFleetId) : null);
    this.#mapFleetId = fleet?.id ?? null;
    this.#selected = fleet?.position ?? selection.origin;
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
  moveResearch(type: Technology, index: number): void {
    return this.researchCase.moveResearch(type, index);
  }
  requestResearchRemoval(type: Technology | null): void {
    return this.researchCase.requestResearchRemoval(type);
  }
  confirmResearchRemoval(): void {
    return this.researchCase.confirmResearchRemoval();
  }
  openProduction(): void {
    return this.production.openProduction();
  }
  #requestMapFocus(position: HexCoordinate): void {
    this.#camera.focus(position);
    this.#pendingMapFocus = position;
    this.#mapFocusRevision += 1;
  }
  resizeMap(viewport: MapViewport): void {
    return this.starMap.resizeMap(viewport);
  }
  requestEndTurn(): boolean {
    return this.turn.requestEndTurn();
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
  setDestination(id: string, q: number, r: number): void {
    return this.fleets.setDestination(id, q, r);
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
  patrolFleet(id: string): void {
    return this.fleets.patrolFleet(id);
  }
  handleDiscoveries(): void {
    return this.turn.handleDiscoveries();
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
    return this.turn.allowOtherFleetOrders();
  }
  continueTurn(): void {
    return this.turn.continueTurn();
  }
  commandBattle(command: BattleCommand): void {
    return this.battle.commandBattle(command);
  }
  startTestBoarding(selection?: TestBoardingSelection): void {
    return this.boarding.startTestBoarding(selection);
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
      if (intel?.surveyed) details.push(`Type: ${intel.environment}.`);
    }
    if (interruption!.economyApplied)
      details.push(
        'The round is paused at the end of the year. No movement remains this round.',
      );
    return Object.freeze({
      title,
      details: Object.freeze(details),
      fleetId: item.fleetId,
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

  #createHost(): AppHost {
    // The object literal cannot see private fields through `this`.
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const model = this;
    return {
      get orderSelection() {
        return model.#orderSelection;
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
      get hiddenFleetCategories() {
        return model.#hiddenFleetCategories;
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
      get screen() {
        return model.#screen;
      },
      get researchCamera() {
        return model.#researchCamera;
      },
      get inspectedResearch() {
        return model.#inspectedResearch;
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
      get notice() {
        return model.#notice;
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
      set screen(value) {
        model.#screen = value;
      },
      set inspectedResearch(value) {
        model.#inspectedResearch = value;
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
      set notice(value) {
        model.#notice = value;
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
      cancelMapPointer: () => model.cancelMapPointer(),
      selectPoint: (point: Point) => model.selectPoint(point),
      inspectResearch: (technology: Technology | null) =>
        model.inspectResearch(technology),
      openResearch: () => model.openResearch(),
      isMapScreen: () => model.#isMapScreen(),
      openMapScreen: (screen: MapScreen) => model.#openMapScreen(screen),
      openMap: () => model.openMap(),
      openFleets: () => model.openFleets(),
      orderSnapshot: () => model.#orderSnapshot(),
      openFleetOrders: (id: string) => model.openFleetOrders(id),
      chooseOrder: (kind: OrderKind) => model.chooseOrder(kind),
      completeOrder: (order: ShipOrder) => model.completeOrder(order),
      orderBack: () => model.orderBack(),
      closeOrders: (joinedFleetId?: string) =>
        model.#closeOrders(joinedFleetId),
      openFleet: (id: string) => model.openFleet(id),
      pan: (delta: Point) => model.pan(delta),
      zoom: (factor: number, anchor: Point) => model.zoom(factor, anchor),
      home: () => model.home(),
      research: (type: Technology | null) => model.research(type),
      resizeResearch: (width: number, height: number) =>
        model.resizeResearch(width, height),
      panResearch: (delta: Point) => model.panResearch(delta),
      zoomResearch: (factor: number, anchor: Point) =>
        model.zoomResearch(factor, anchor),
      fitResearch: () => model.fitResearch(),
      moveResearch: (type: Technology, index: number) =>
        model.moveResearch(type, index),
      requestResearchRemoval: (type: Technology | null) =>
        model.requestResearchRemoval(type),
      confirmResearchRemoval: () => model.confirmResearchRemoval(),
      openProduction: () => model.openProduction(),
      requestMapFocus: (position: HexCoordinate) =>
        model.#requestMapFocus(position),
      resizeMap: (viewport: MapViewport) => model.resizeMap(viewport),
      requestEndTurn: () => model.requestEndTurn(),
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
      setDestination: (id: string, q: number, r: number) =>
        model.setDestination(id, q, r),
      clearDestination: (id: string) => model.clearDestination(id),
      startTurn: () => model.startTurn(),
      nextTurnFrame: () => model.nextTurnFrame(),
      exploreFleet: (id: string, order: ExplorationOrder) =>
        model.exploreFleet(id, order),
      patrolFleet: (id: string) => model.patrolFleet(id),
      handleDiscoveries: () => model.handleDiscoveries(),
      focusInterruptedFleet: () => model.#focusInterruptedFleet(),
      allowOtherFleetOrders: () => model.allowOtherFleetOrders(),
      continueTurn: () => model.continueTurn(),
      commandBattle: (command: BattleCommand) => model.commandBattle(command),
      startTestBoarding: (selection?: TestBoardingSelection) =>
        model.startTestBoarding(selection),
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
    };
  }
}

export interface AppHost {
  orderSelection: OrderSelection | null;
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
    readonly camera: CameraSnapshot;
  } | null;
  readonly hiddenFleetCategories: Set<FleetCategory>;
  pendingResearchRemoval: Technology | null;
  game: Game;
  testBattle: TacticalBattle | null;
  testBoarding: BoardingBattle | null;
  battleFeedback: BattleState | null;
  camera: Camera;
  selected: HexCoordinate;
  screen: Screen;
  researchCamera: ResearchTreeCamera;
  inspectedResearch: Technology | null;
  mapViewport: MapViewport | null;
  mapFocusRevision: number;
  pendingMapFocus: HexCoordinate | null;
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
  notice: PlayerNotice;
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
  cancelMapPointer(): void;
  selectPoint(point: Point): void;
  inspectResearch(technology: Technology | null): void;
  openResearch(): void;
  isMapScreen(): boolean;
  openMapScreen(screen: MapScreen): void;
  openMap(): void;
  openFleets(): void;
  orderSnapshot(): OrderSelectionSnapshot | null;
  openFleetOrders(id: string): void;
  chooseOrder(kind: OrderKind): void;
  completeOrder(order: ShipOrder): void;
  orderBack(): void;
  closeOrders(joinedFleetId?: string): void;
  openFleet(id: string): void;
  pan(delta: Point): void;
  zoom(factor: number, anchor: Point): void;
  home(): void;
  research(type: Technology | null): void;
  resizeResearch(width: number, height: number): void;
  panResearch(delta: Point): void;
  zoomResearch(factor: number, anchor: Point): void;
  fitResearch(): void;
  moveResearch(type: Technology, index: number): void;
  requestResearchRemoval(type: Technology | null): void;
  confirmResearchRemoval(): void;
  openProduction(): void;
  requestMapFocus(position: HexCoordinate): void;
  resizeMap(viewport: MapViewport): void;
  requestEndTurn(): boolean;
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
  setDestination(id: string, q: number, r: number): void;
  clearDestination(id: string): void;
  startTurn(): void;
  nextTurnFrame(): TurnFrame | null;
  exploreFleet(id: string, order: ExplorationOrder): void;
  patrolFleet(id: string): void;
  handleDiscoveries(): void;
  focusInterruptedFleet(): void;
  allowOtherFleetOrders(): void;
  continueTurn(): void;
  commandBattle(command: BattleCommand): void;
  startTestBoarding(selection?: TestBoardingSelection): void;
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
}
