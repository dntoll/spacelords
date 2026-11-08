import { SaveController } from '../saves/SaveController.js';
import { BoardingController } from '../boarding/BoardingController.js';
import { BoardingEditorController } from '../boarding/BoardingEditorController.js';
import { BattleController } from '../battle/BattleController.js';
import { ResearchController } from '../research/ResearchController.js';
import { PlanetController } from '../planet/PlanetController.js';
import { FleetController } from '../fleets/FleetController.js';
import { RouteController } from '../routes/RouteController.js';
import { ProductionController } from '../production/ProductionController.js';
import { OrderController } from '../orders/OrderController.js';
import { DecisionController } from '../decisions/DecisionController.js';
import { StarMapController } from '../star-map/StarMapController.js';
import { TurnController } from './TurnController.js';
import type { AppModel, AppReadModel } from '../../models/AppModel.js';
import { TurnMovementPlayback } from '../../models/app/TurnMovementPlayback.js';
import type { AppIntent, AppPort } from '../../views/ViewContracts.js';
import type { Point } from '../../models/HexCoordinate.js';
import { MapGesture } from '../../views/star-map/MapGesture.js';
import { isMapScreen } from '../../models/ProductionMap.js';

export class MasterController {
  readonly #saveCase: SaveController;
  readonly #boarding: BoardingController;
  readonly #editor: BoardingEditorController;
  readonly #battle: BattleController;
  readonly #research: ResearchController;
  readonly #planet: PlanetController;
  readonly #fleets: FleetController;
  readonly #routes: RouteController;
  readonly #production: ProductionController;
  readonly #orders: OrderController;
  readonly #decisions: DecisionController;
  readonly #starMap: StarMapController;
  readonly #turn: TurnController;
  readonly #model: AppModel;
  readonly #view: AppPort;
  readonly #gesture = new MapGesture();
  #presented: AppReadModel | null = null;
  #runningTurn = false;
  #disposed = false;
  #framingEvent = false;
  #battleAnimating = false;
  #receiptTimer: ReturnType<typeof setTimeout> | undefined;
  #playbackTimer: ReturnType<typeof setTimeout> | undefined;
  #fleetPointer: {
    id: number;
    start: Point;
    dragged: boolean;
    kind: 'fleet' | 'route' | 'wreck' | 'salvage-target';
    wreckId?: string;
  } | null = null;

  constructor(model: AppModel, view: AppPort) {
    this.#model = model;
    this.#view = view;
    this.#saveCase = new SaveController(model.saveCase);
    this.#boarding = new BoardingController(model.boarding);
    this.#editor = new BoardingEditorController(model.editorCase);
    this.#battle = new BattleController(model.battle);
    this.#research = new ResearchController(model.researchCase);
    this.#planet = new PlanetController(model.planet);
    this.#fleets = new FleetController(model.fleets);
    this.#routes = new RouteController(model.routes);
    this.#production = new ProductionController(model.production);
    this.#orders = new OrderController(model.orders);
    this.#decisions = new DecisionController(model.decisions);
    this.#starMap = new StarMapController(model.starMap);
    this.#turn = new TurnController(model.turn);
  }

  start(): void {
    this.#view.bind((intent) => this.#handle(intent));
    this.#battle.autoSelectBattleShip();
    this.#render();
    if (import.meta.env.BASE_URL === '/')
      void this.#editor.refresh().then(() => {
        if (!this.#disposed) this.#render();
      });
    this.#schedulePlayback();
  }

  dispose(): void {
    this.#disposed = true;
    clearTimeout(this.#receiptTimer);
    clearTimeout(this.#playbackTimer);
    this.#cancelPointer();
    this.#view.dispose();
  }

  #handle(intent: AppIntent): void {
    try {
      if (this.#navigate(intent)) return;
      if (intent.type !== 'map-size') this.#model.clearNotice();
      const receipt = this.#model.snapshot.productionReceipt;
      this.#handleIntent(intent);
      if (this.#model.snapshot.productionReceipt !== receipt) {
        clearTimeout(this.#receiptTimer);
        if (this.#model.snapshot.productionReceipt)
          this.#receiptTimer = setTimeout(() => {
            this.#production.clearProductionReceipt();
            this.#render();
          }, 3000);
      }
    } catch (error) {
      console.warn(error);
      this.#turn.endMovementPlayback();
      this.#model.reportError(error);
      this.#render();
      this.#schedulePlayback();
    }
  }

  #render(snapshot = this.#model.snapshot): void {
    const previous =
      this.#presented?.battleFeedback ?? this.#presented?.tacticalBattle;
    const battle = snapshot.battleFeedback ?? snapshot.tacticalBattle;
    this.#presented = snapshot;
    this.#view.render(snapshot);
    const shot = battle?.lastShot;
    if (
      !this.#battleAnimating &&
      shot &&
      previous?.id === battle.id &&
      previous.lastShot?.id !== shot.id &&
      snapshot.screen !== 'saves' &&
      this.#view.animateBattleShot
    ) {
      this.#battleAnimating = true;
      clearTimeout(this.#playbackTimer);
      const finish = () => {
        this.#battleAnimating = false;
        if (this.#disposed) return;
        this.#battle.autoSelectBattleShip();
        this.#render();
        this.#schedulePlayback();
      };
      void this.#view.animateBattleShot(shot).then(finish, (error) => {
        this.#model.reportError(error);
        finish();
      });
    }
  }

  // responsiv-stjarnkarta: camera gestures reuse the last immutable empire snapshot.
  #navigate(intent: AppIntent): boolean {
    const previous = this.#presented;
    const startingPinch =
      intent.type === 'pointer-start' && this.#gesture.pointerCount > 0;
    if (
      !previous ||
      !isMapScreen(previous.screen) ||
      previous.eventPlayback ||
      previous.turnMovement ||
      previous.boardingBattle ||
      previous.editor ||
      previous.tacticalBattle ||
      previous.battleFeedback ||
      previous.notice ||
      this.#runningTurn ||
      (!startingPinch &&
        (this.#fleetPointer ||
          previous.fleetDragging ||
          previous.fleetDestinationPreview ||
          previous.mapTrade.preview ||
          previous.mapTrade.candidateRouteIds.length ||
          previous.mapTrade.assignmentFleetId))
    )
      return false;
    if (intent.type === 'pointer-start') {
      if (!startingPinch) {
        if (
          this.#starMap.salvageAtPoint(intent.point) ||
          this.#starMap.fleetAtPoint(intent.point) ||
          this.#routes.mapRouteDragSource(intent.point)
        )
          return false;
        this.#gesture.start(intent.id, intent.point);
        return true;
      }
      this.#gesture.start(intent.id, intent.point);
      this.#fleetPointer = null;
      this.#starMap.cancelMapPointer();
    } else if (
      intent.type === 'pointer-end' &&
      this.#gesture.pointerCount > 0 &&
      this.#gesture.consumed
    ) {
      this.#gesture.end(intent.id);
      return true;
    } else if (intent.type === 'pan' || intent.type === 'zoom') {
      this.#cancelPointer(true);
      if (intent.type === 'pan') this.#starMap.pan(intent.delta);
      else this.#starMap.zoom(intent.factor, intent.anchor);
    } else if (
      intent.type === 'pointer-move' &&
      this.#gesture.pointerCount > 0
    ) {
      const action = this.#gesture.move(intent.id, intent.point);
      if (action.type === 'none') return true;
      this.#starMap.hoverMapFleet(null);
      if (action.type === 'pan') this.#starMap.pan(action.delta);
      else {
        this.#starMap.zoom(action.factor, action.previousCenter);
        this.#starMap.pan({
          x: action.center.x - action.previousCenter.x,
          y: action.center.y - action.previousCenter.y,
        });
      }
    } else if (
      intent.type === 'pointer-move' &&
      this.#gesture.pointerCount === 0
    ) {
      if (this.#starMap.hoverMapFleet(intent.point)) this.#render();
      return true;
    } else if (intent.type === 'map-leave') {
      if (this.#starMap.hoverMapFleet(null)) this.#render();
      return true;
    } else return false;
    const snapshot = this.#model.navigationSnapshot(previous);
    this.#presented = snapshot;
    if (this.#view.renderCamera) this.#view.renderCamera(snapshot);
    else this.#view.render(snapshot);
    return true;
  }

  #handleIntent(intent: AppIntent): void {
    if (intent.type === 'boarding-command') {
      this.#boarding.commandBoarding(intent.command);
      this.#render();
      this.#schedulePlayback();
      return;
    }
    if (intent.type === 'close-boarding') {
      this.#boarding.closeTestBoarding();
      this.#render();
      return;
    }
    if (intent.type === 'battle-command') {
      if (this.#battleAnimating) return;
      this.#battle.commandBattle(intent.command);
      this.#battle.autoSelectBattleShip();
      this.#render();
      this.#schedulePlayback();
      return;
    }
    if (intent.type === 'map-size') {
      this.#starMap.resizeMap(intent.viewport);
      this.#render();
      return;
    }
    const playback = this.#model.snapshot.eventPlayback;
    if (playback) {
      const current = playback.events[playback.index];
      if (
        playback.stage === 'awaiting-choice' &&
        ['handle-discoveries', 'ignore-discoveries'].includes(intent.type)
      ) {
        this.#turn.chooseEvent(
          intent.type === 'handle-discoveries' ? 'handle' : 'ignore',
        );
        this.#model.save();
        this.#render();
        this.#schedulePlayback();
      }
      if (
        playback.stage === 'awaiting-choice' &&
        intent.type === 'add-planet-queue' &&
        current?.decision?.queueAction?.kind === intent.kind &&
        current.decision.queueAction.planetId === intent.planetId
      ) {
        this.#model.addPlanetToQueue(intent.kind, intent.planetId);
        this.#turn.chooseEvent('ignore');
        this.#model.save();
        this.#render();
        this.#schedulePlayback();
      }
      return;
    }
    if (this.#model.snapshot.turnMovement) return;
    let mapOrder = false;
    if (intent.type.startsWith('open-') || intent.type === 'end-turn') {
      this.#starMap.cancelShipyardPlacement();
      this.#fleets.cancelShipTransfer();
      this.#fleets.cancelFleetRename();
    }
    if (
      intent.type.startsWith('open-') ||
      [
        'home',
        'pan',
        'zoom',
        'begin-destination',
        'begin-colonization',
        'begin-salvage',
        'end-turn',
      ].includes(intent.type)
    )
      this.#cancelPointer(['pan', 'zoom'].includes(intent.type));
    if (
      this.#model.snapshot.screen === 'saves' &&
      ![
        'start-slot',
        'test-battle',
        'test-boarding',
        'boarding-command',
        'close-boarding',
        'open-editor',
        'close-editor',
        'editor-select-map',
        'editor-resize',
        'editor-bind-tool',
        'editor-paint',
        'editor-sprite-transform',
        'editor-adjust-sprite',
        'editor-projection',
        'editor-opacity',
        'editor-undo',
        'editor-redo',
        'editor-save',
        'confirm-editor-switch',
        'cancel-editor-switch',
        'request-clear-slot',
        'cancel-clear-slot',
        'confirm-clear-slot',
      ].includes(intent.type)
    )
      return;
    switch (intent.type) {
      case 'test-battle':
        this.#battle.startTestBattle();
        this.#battle.autoSelectBattleShip();
        this.#schedulePlayback();
        break;
      case 'test-boarding':
        this.#boarding.startTestBoarding();
        this.#schedulePlayback();
        break;
      case 'salvage-wreck':
        this.#starMap.orderSalvage(intent.fleetId, intent.wreckId);
        break;
      case 'release-wreck':
        this.#starMap.releaseWreck(intent.fleetId, intent.id);
        break;
      case 'return-shipyard':
        this.#starMap.returnToShipyard(intent.id);
        break;
      case 'select-salvage':
        this.#starMap.selectSalvage(intent.id);
        break;
      case 'rebuild-shipyard':
        this.#starMap.rebuildShipyard(intent.id);
        break;
      case 'move-repair':
        this.#starMap.moveRepair(intent.yardId, intent.wreckId, intent.index);
        break;
      case 'cancel-shipyard-placement':
        this.#starMap.cancelShipyardPlacement();
        break;
      case 'place-shipyard':
        this.#starMap.placeShipyard(intent.position);
        break;
      case 'explore-fleet':
        this.#fleets.exploreFleet(intent.id, intent.order);
        break;
      case 'auto-salvage':
        this.#fleets.automateSalvage(intent.id);
        break;
      case 'civilian-transport':
        this.#fleets.civilianTransport(intent.id);
        break;
      case 'open-fleet-orders':
        this.#orders.openFleetOrders(intent.id);
        break;
      case 'open-ship-orders':
        this.#orders.openShipOrders(intent.ship, intent.projectId);
        break;
      case 'order-kind':
        this.#orders.chooseOrder(intent.kind);
        break;
      case 'apply-ship-order':
        this.#orders.completeOrder(intent.order);
        break;
      case 'order-back':
        this.#orders.orderBack();
        break;
      case 'clear-start-order':
        this.#orders.clearStartOrder();
        break;
      case 'guard-routes':
        this.#fleets.automateTransport(intent.id);
        break;
      case 'upgrade-fleet':
        this.#fleets.upgradeFleet(intent.id);
        break;
      case 'patrol-fleet':
        this.#fleets.patrolFleet(intent.id);
        break;
      case 'handle-discoveries':
        this.#decisions.handleDiscoveries();
        break;
      case 'allow-other-fleet-orders':
        this.#decisions.allowOtherFleetOrders();
        break;
      case 'continue-turn':
        if (this.#model.snapshot.interruption?.handling) {
          this.#turn.continueEventHandling();
          this.#model.save();
          this.#render();
          this.#schedulePlayback();
          return;
        }
        void this.#runTurn(true);
        return;
      case 'ignore-discoveries':
        void this.#runTurn(true);
        return;
      case 'begin-fleet-rename':
        this.#fleets.beginFleetRename(intent.id);
        break;
      case 'edit-fleet-name':
        this.#fleets.editFleetName(intent.draft);
        break;
      case 'cancel-fleet-rename':
        this.#fleets.cancelFleetRename();
        // flottnamn-direktredigering: keep the blurred-to control alive until its click.
        if (intent.reason === 'blur') return;
        break;
      case 'submit-fleet-name':
        this.#fleets.submitFleetName();
        break;
      case 'map-select-route':
        this.#routes.selectMapRoute(intent.id);
        break;
      case 'map-select-fleet':
        this.#starMap.selectMapFleet(intent.id);
        break;
      case 'begin-map-route':
        this.#routes.beginMapRoute(intent.id);
        break;
      case 'cancel-map-trade':
        this.#cancelPointer();
        break;
      case 'open-route':
        this.#routes.openRoute(intent.planetId);
        break;
      case 'open-production':
        this.#production.openProduction(intent.planetId);
        break;
      case 'map-production-category':
        this.#production.selectMapProductionCategory(intent.category);
        break;
      case 'map-production-page':
        this.#production.selectMapProductionPage(intent.page);
        break;
      case 'map-production-option':
        this.#production.selectMapProductionOption(intent.option);
        break;
      case 'map-production-project':
        this.#production.selectMapProject(intent.id);
        break;
      case 'map-production-build':
        this.#production.orderMapProduction(intent.option);
        break;
      case 'supply-open-planet':
        this.#routes.openSupplyPlanet(intent.id);
        break;
      case 'supply-open-route':
        this.#routes.openSupplyRoute(intent.id);
        break;
      case 'research-size':
        this.#research.resizeResearch(intent.width, intent.height);
        break;
      case 'research-pan':
        this.#research.panResearch(intent.delta);
        break;
      case 'research-zoom':
        this.#research.zoomResearch(intent.factor, intent.anchor);
        break;
      case 'research-fit':
        this.#research.fitResearch();
        break;
      case 'inspect-research':
        this.#research.inspectResearch(intent.technology);
        break;
      case 'open-decisions':
        this.#decisions.openDecisions();
        break;
      case 'open-decision':
        this.#decisions.openDecision(intent.id);
        break;
      case 'skip-decision':
        this.#decisions.skipDecision(intent.id);
        break;
      case 'mute-decision':
        this.#decisions.muteDecision(intent.id);
        break;
      case 'unmute-decision':
        this.#decisions.unmuteDecision(intent.id);
        break;
      case 'create-trade-route':
        this.#routes.createTradeRoute(intent.a, intent.b);
        break;
      case 'assign-trade-fleet':
        this.#routes.assignTradeFleet(intent.routeId, intent.fleetId);
        break;
      case 'resume-fleet-orders':
        this.#fleets.resumeFleetOrders(intent.id);
        break;
      case 'release-trade-fleet':
        this.#routes.releaseTradeFleet(intent.id);
        break;
      case 'close-trade-route':
        this.#routes.closeTradeRoute(intent.id);
        break;
      case 'move-research':
        this.#research.moveResearch(intent.technology, intent.index);
        break;
      case 'remove-research':
        this.#research.requestResearchRemoval(intent.technology);
        break;
      case 'add-planet-queue':
        this.#model.addPlanetToQueue(intent.kind, intent.planetId);
        break;
      case 'remove-planet-queue':
        this.#model.removePlanetFromQueue(intent.kind, intent.planetId);
        break;
      case 'move-planet-queue':
        this.#model.movePlanetQueue(intent.kind, intent.planetId, intent.index);
        break;
      case 'confirm-research-removal':
        this.#research.confirmResearchRemoval();
        break;
      case 'cancel-research-removal':
        this.#research.requestResearchRemoval(null);
        break;
      case 'cancel-end-turn':
        this.#decisions.cancelEndTurn();
        break;
      case 'confirm-end-turn':
        void this.#runTurn();
        return;
      case 'open-saves':
        this.#cancelPointer();
        this.#saveCase.openSaves();
        this.#schedulePlayback();
        break;
      case 'start-slot':
        this.#saveCase.startSlot(intent.id);
        this.#schedulePlayback();
        break;
      case 'request-clear-slot':
        this.#saveCase.requestClearSlot(intent.id);
        break;
      case 'cancel-clear-slot':
        this.#saveCase.cancelClearSlot();
        break;
      case 'confirm-clear-slot':
        this.#saveCase.confirmClearSlot();
        break;
      case 'open-editor':
        void this.#runEditor(() => this.#editor.open());
        return;
      case 'close-editor':
        this.#editor.close();
        break;
      case 'editor-select-map':
        void this.#runEditor(() => this.#editor.select(intent.id));
        return;
      case 'editor-resize':
        this.#editor.resize(intent.width, intent.height);
        break;
      case 'editor-bind-tool':
        this.#editor.bindTool(intent.button, intent.tool);
        break;
      case 'editor-paint':
        this.#editor.paint(intent.button, intent.cells);
        break;
      case 'editor-sprite-transform':
        this.#editor.spriteTransform(intent.sprite);
        break;
      case 'editor-adjust-sprite':
        this.#editor.adjustSprite(intent.value);
        break;
      case 'editor-projection':
        this.#editor.projection(intent.value);
        break;
      case 'editor-opacity':
        this.#editor.opacity(intent.value);
        break;
      case 'editor-undo':
        this.#editor.undo();
        break;
      case 'editor-redo':
        this.#editor.redo();
        break;
      case 'editor-save':
        void this.#runEditor(() => this.#editor.save());
        return;
      case 'confirm-editor-switch':
        void this.#runEditor(() => this.#editor.confirmSwitch());
        return;
      case 'cancel-editor-switch':
        this.#editor.cancelSwitch();
        break;
      case 'open-map':
        this.#starMap.openMap();
        break;
      case 'open-planet':
        this.#planet.openPlanet(intent.id);
        break;
      case 'open-research':
        this.#research.openResearch();
        break;
      case 'open-fleets':
        this.#fleets.openFleets();
        break;
      case 'building-category':
        this.#planet.selectBuildingCategory(intent.category);
        break;
      case 'building-selection':
        this.#planet.selectBuilding(intent.building);
        break;
      case 'build-search':
        this.#planet.searchBuildings(intent.query);
        break;
      case 'home':
        this.#starMap.home();
        break;
      case 'select': {
        const snapshot = this.#model.snapshot;
        mapOrder =
          !!snapshot.destinationFleetId ||
          !!snapshot.mapTrade.sourcePlanetId ||
          snapshot.orderView?.page === 'patrol' ||
          snapshot.orderView?.page === 'colonize';
        this.#starMap.select(intent.position);
        break;
      }
      case 'pan':
        this.#starMap.pan(intent.delta);
        break;
      case 'zoom':
        this.#starMap.zoom(intent.factor, intent.anchor);
        break;
      case 'build':
        this.#planet.build(intent.building, intent.slotIndex);
        break;
      case 'planet-tab':
        this.#planet.selectPlanetTab(intent.tab);
        break;
      case 'production-selection':
        this.#planet.selectProduction(intent.category, intent.product);
        break;
      case 'production-fleet':
        this.#planet.selectProductionFleet(intent.id);
        break;
      case 'project-supply':
        this.#planet.toggleProjectSupply(intent.id, intent.open);
        break;
      case 'open-planet-project':
        this.#planet.openPlanetProject(intent.planetId, intent.projectId);
        break;
      case 'build-site':
        this.#planet.openBuildSite(intent.index);
        break;
      case 'research':
        this.#research.research(intent.technology);
        break;
      case 'colonize':
        this.#planet.colonize(intent.id);
        break;
      case 'queue-ship':
        this.#planet.scheduleShip(
          intent.ship,
          intent.fleetId,
          intent.factoryId,
        );
        break;
      case 'queue-component':
        this.#planet.scheduleComponent(intent.component);
        break;
      case 'move-project':
        this.#planet.moveProject(intent.id, intent.index);
        break;
      case 'project-fleet':
        this.#planet.setProjectFleet(intent.id, intent.fleetId);
        break;
      case 'cancel-project':
        this.#planet.cancelProject(intent.id);
        break;
      case 'toggle-demolition':
        this.#planet.toggleDemolition(intent.id);
        break;
      case 'upgrade-building':
        this.#planet.upgradeBuilding(intent.id);
        break;
      case 'produce-fighter':
        this.#planet.produceFighter();
        break;
      case 'select-fleet':
        this.#fleets.selectFleet(intent.id);
        break;
      case 'open-fleet':
        this.#fleets.openFleet(intent.id);
        break;
      case 'rename-fleet':
        this.#fleets.renameFleet(intent.id, intent.name);
        break;
      case 'choose-ship-transfer':
        this.#fleets.chooseShipTransfer(
          intent.fleetId,
          intent.ship,
          intent.shipId,
        );
        break;
      case 'transfer-chosen-ship':
        this.#fleets.transferChosenShip(intent.target);
        break;
      case 'cancel-ship-transfer':
        this.#fleets.cancelShipTransfer();
        break;
      case 'transfer-ships':
        this.#fleets.transferShips(
          intent.source,
          intent.ship,
          intent.amount,
          intent.target,
          intent.shipId,
        );
        break;
      case 'begin-destination':
        this.#fleets.beginDestination(intent.id);
        break;
      case 'begin-colonization':
        this.#fleets.beginColonization(intent.id);
        break;
      case 'begin-salvage':
        this.#fleets.beginSalvage(intent.id);
        break;
      case 'clear-destination':
        this.#fleets.clearDestination(intent.id);
        break;
      case 'create-fleet':
        this.#fleets.createFleet(intent.id);
        break;
      case 'delete-fleet':
        this.#fleets.deleteFleet(intent.id);
        break;
      case 'end-turn':
        if (this.#decisions.requestEndTurn()) {
          void this.#runTurn();
          return;
        }
        break;
      case 'pointer-start': {
        this.#gesture.start(intent.id, intent.point);
        if (this.#gesture.pointerCount > 1) {
          this.#fleetPointer = null;
          this.#starMap.cancelMapPointer();
        } else {
          const salvageId = this.#starMap.salvageAtPoint(intent.point);
          if (salvageId) {
            if (
              (this.#model.snapshot.destinationFleetId &&
                this.#model.snapshot.destinationOrder === 'salvage') ||
              this.#model.snapshot.orderView?.page === 'salvage'
            ) {
              this.#fleetPointer = {
                id: intent.id,
                start: intent.point,
                dragged: false,
                kind: 'salvage-target',
                wreckId: salvageId,
              };
              break;
            }
            this.#starMap.selectSalvage(salvageId);
            this.#fleetPointer = {
              id: intent.id,
              start: intent.point,
              dragged: false,
              kind: 'wreck',
            };
            break;
          }
          const fleetId = this.#starMap.fleetAtPoint(intent.point);
          const source = fleetId
            ? null
            : this.#routes.mapRouteDragSource(intent.point);
          if (!fleetId && !source) return;
          if (fleetId) this.#starMap.selectMapFleet(fleetId);
          this.#fleetPointer = {
            id: intent.id,
            start: intent.point,
            dragged: false,
            kind: fleetId ? 'fleet' : 'route',
          };
        }
        break;
      }
      case 'map-leave':
        if (!this.#starMap.hoverMapFleet(null)) return;
        break;
      case 'pointer-cancel':
        this.#starMap.cancelShipyardPlacement();
        this.#cancelPointer();
        if (this.#model.snapshot.screen === 'fleets') this.#fleets.openFleets();
        break;
      case 'pointer-move': {
        if (this.#fleetPointer?.id === intent.id) {
          this.#gesture.move(intent.id, intent.point);
          if (
            Math.hypot(
              intent.point.x - this.#fleetPointer.start.x,
              intent.point.y - this.#fleetPointer.start.y,
            ) > 6
          )
            this.#fleetPointer.dragged = true;
          if (this.#fleetPointer.dragged) {
            if (this.#fleetPointer.kind === 'salvage-target') break;
            if (this.#fleetPointer.kind === 'wreck') {
              this.#starMap.previewSalvage(intent.point);
              break;
            }
            if (this.#fleetPointer.kind === 'route') {
              const source = this.#routes.mapRouteDragSource(
                this.#fleetPointer.start,
              );
              if (source) this.#routes.beginMapRoute(source);
              this.#routes.previewMapRoute(intent.point);
            } else this.#starMap.previewFleetDestination(intent.point);
          }
          break;
        }
        if (this.#gesture.pointerCount === 0) {
          if (!this.#starMap.hoverMapFleet(intent.point)) return;
          break;
        }
        const action = this.#gesture.move(intent.id, intent.point);
        if (action.type === 'none') return;
        this.#starMap.hoverMapFleet(null);
        if (action.type === 'pan') this.#starMap.pan(action.delta);
        else {
          this.#starMap.zoom(action.factor, action.previousCenter);
          this.#starMap.pan({
            x: action.center.x - action.previousCenter.x,
            y: action.center.y - action.previousCenter.y,
          });
        }
        break;
      }
      case 'pointer-end': {
        if (this.#fleetPointer?.id === intent.id) {
          const dragged =
            this.#fleetPointer.dragged ||
            Math.hypot(
              intent.point.x - this.#fleetPointer.start.x,
              intent.point.y - this.#fleetPointer.start.y,
            ) > 6;
          this.#gesture.end(intent.id);
          const pointer = this.#fleetPointer;
          this.#fleetPointer = null;
          if (pointer.kind === 'salvage-target') {
            if (!dragged) {
              this.#starMap.selectSalvage(pointer.wreckId!);
              mapOrder = true;
            }
            break;
          }
          if (dragged) {
            mapOrder = true;
            if (pointer.kind === 'wreck') {
              this.#starMap.dropSalvage(intent.point);
            } else if (pointer.kind === 'route') {
              const source = this.#routes.mapRouteDragSource(pointer.start);
              if (source) this.#routes.beginMapRoute(source);
              this.#routes.previewMapRoute(intent.point);
              this.#routes.commitMapRoute();
            } else {
              this.#starMap.previewFleetDestination(intent.point);
              this.#starMap.commitFleetDestination();
            }
          }
          break;
        }
        this.#gesture.move(intent.id, intent.point);
        const selected = this.#gesture.end(intent.id);
        if (selected) {
          const snapshot = this.#model.snapshot;
          mapOrder =
            !!snapshot.destinationFleetId ||
            !!snapshot.mapTrade.sourcePlanetId ||
            snapshot.orderView?.page === 'patrol' ||
            snapshot.orderView?.page === 'colonize';
          this.#starMap.selectPoint(selected);
        }
        break;
      }
    }
    if (
      !(['select', 'pointer-end'].includes(intent.type) && !mapOrder) &&
      !intent.type.startsWith('research-') &&
      !intent.type.startsWith('supply-') &&
      !intent.type.startsWith('open-') &&
      !intent.type.startsWith('editor-') &&
      intent.type !== 'close-editor' &&
      intent.type !== 'cancel-editor-switch' &&
      !(
        intent.type.startsWith('map-production-') &&
        intent.type !== 'map-production-build'
      ) &&
      ![
        'pointer-cancel',
        'begin-map-route',
        'cancel-map-trade',
        'map-size',
        'map-select-route',
        'map-select-fleet',
        'pointer-move',
        'pointer-start',
        'pan',
        'zoom',
        'home',
        'map-leave',
        'edit-fleet-name',
        'begin-fleet-rename',
        'cancel-fleet-rename',
        'planet-tab',
        'building-category',
        'building-selection',
        'build-search',
        'production-selection',
        'production-fleet',
        'project-supply',
        'open-planet-project',
      ].includes(intent.type)
    )
      this.#model.save();
    this.#render();
    this.#schedulePlayback();
  }

  async #runEditor(action: () => Promise<void>): Promise<void> {
    try {
      await action();
    } catch (error) {
      this.#model.reportError(error);
    }
    if (this.#disposed) return;
    this.#render();
  }

  #cancelPointer(keepRouteSource = false): void {
    this.#gesture.cancel();
    this.#fleetPointer = null;
    this.#starMap.cancelMapPointer(keepRouteSource);
  }

  #schedulePlayback(): void {
    clearTimeout(this.#playbackTimer);
    if (this.#disposed || this.#battleAnimating) return;
    const activated = this.#battle.autoSelectBattleShip();
    const snapshot = this.#model.snapshot;
    const playback = snapshot.eventPlayback;
    if (this.#boarding.shouldPlayBoardingStep()) {
      this.#playbackTimer = setTimeout(() => {
        try {
          this.#boarding.playBoardingStep();
        } catch (error) {
          this.#model.reportError(error);
        }
        this.#render();
        this.#schedulePlayback();
      }, 450);
      return;
    }
    if (snapshot.screen === 'saves') return;
    if (snapshot.battleFeedback) {
      this.#playbackTimer = setTimeout(() => {
        this.#battle.finishBattleFeedback();
        this.#battle.autoSelectBattleShip();
        this.#model.save();
        this.#render();
        this.#schedulePlayback();
      }, 2800);
      return;
    }
    const battle = snapshot.tacticalBattle;
    if (activated) this.#render(snapshot);
    if (battle) {
      if (battle.phase === 'fighting' && battle.turn === 'enemy')
        this.#playbackTimer = setTimeout(() => {
          try {
            this.#battle.playBattleActivation(true);
            this.#battle.autoSelectBattleShip();
          } catch (error) {
            this.#model.reportError(error);
          }
          this.#render();
          this.#schedulePlayback();
        }, 450);
      return;
    }
    if (playback?.stage === 'framing') {
      if (!this.#framingEvent) void this.#frameEvent();
      return;
    }
    if (!playback) {
      if (snapshot.phase === 'interrupted' && !snapshot.interruption?.handling)
        this.#playbackTimer = setTimeout(() => {
          void this.#runTurn(true);
        }, 0);
      return;
    }
    if (playback.stage === 'awaiting-choice') return;
    this.#playbackTimer = setTimeout(
      () => {
        if (this.#disposed) return;
        this.#turn.advanceEventPlayback();
        this.#model.save();
        this.#render();
        this.#schedulePlayback();
      },
      playback.stage === 'announcing' ? 1400 : 450,
    );
  }

  async #frameEvent(): Promise<void> {
    this.#framingEvent = true;
    try {
      await this.#animateCamera();
      if (!this.#disposed) {
        this.#render();
        this.#schedulePlayback();
      }
    } catch (error) {
      if (!this.#disposed) {
        this.#turn.finishCameraFraming();
        this.#model.reportError(error);
        this.#render();
        this.#schedulePlayback();
      }
    } finally {
      this.#framingEvent = false;
    }
  }

  async #animateCamera(): Promise<void> {
    while (!this.#disposed && this.#model.cameraFraming) {
      const framing = this.#model.cameraFraming;
      for (let index = 0; index < framing.transitions.length; index++) {
        const onProgress = (progress: number) => {
          if (
            !this.#disposed &&
            this.#turn.advanceCameraFraming(framing, index, progress)
          ) {
            const snapshot = this.#model.snapshot;
            if (this.#view.renderCamera) this.#view.renderCamera(snapshot);
            else this.#render(snapshot);
            return true;
          }
          return false;
        };
        if (this.#view.animatePresentation)
          await this.#view.animatePresentation(
            framing.transitions[index]!.duration,
            onProgress,
          );
        else onProgress(1);
        if (this.#disposed || this.#model.cameraFraming !== framing) break;
      }
    }
  }

  async #runTurn(resume = false): Promise<void> {
    if (
      this.#runningTurn ||
      this.#disposed ||
      this.#model.snapshot.phase !== (resume ? 'interrupted' : 'planning')
    )
      return;
    this.#runningTurn = true;
    try {
      if (resume) this.#turn.continueTurn();
      else this.#turn.startTurn();
      this.#render();
      const origin = this.#model.snapshot;
      const movementPlayback = new TurnMovementPlayback(origin);
      let frame;
      while (!this.#disposed && (frame = this.#turn.nextTurnFrame())) {
        const before = this.#model.snapshot;
        this.#turn.applyTurnFrame(frame);
        const after = this.#model.snapshot;
        movementPlayback.record(frame, before, after);
        if (after.phase === 'interrupted') break;
      }
      if (this.#disposed) return;
      if (this.#model.snapshot.phase !== 'interrupted') this.#turn.finishTurn();
      this.#model.save();
      const batches = movementPlayback.batches;
      if (batches.length) {
        this.#turn.beginMovementPlayback(movementPlayback, origin);
        for (const batch of batches) {
          this.#turn.focusTurnMovement(batch.map((track) => track[0]!));
          this.#turn.frameTurnTrack(batch.flat());
          this.#render();
          await this.#animateCamera();
          if (this.#disposed) return;
          const steps = Math.max(...batch.map((track) => track.length));
          const stepDuration = movementPlayback.isAutonomous(
            batch[0]![0]!.fleetId,
          )
            ? Math.min(400, 4000 / steps)
            : 400;
          for (let index = 0; index < steps; index++) {
            const movements = batch.flatMap((track) =>
              track[index] ? [track[index]!] : [],
            );
            this.#turn.focusTurnMovement(movements);
            this.#render();
            await (this.#view.animateTurnStep?.(
              { movements },
              (progress) => {
                if (!this.#disposed && this.#turn.advanceTurnMovement(progress))
                  this.#render();
              },
              stepDuration,
            ) ?? Promise.resolve());
            if (this.#disposed) return;
            this.#turn.completeTurnMovement();
          }
        }
        this.#turn.endMovementPlayback(true);
      }
      this.#turn.beginEventPlayback();
      this.#render();
      this.#schedulePlayback();
    } catch (error) {
      console.warn(error);
      this.#turn.endMovementPlayback();
      this.#model.reportError(error);
      this.#render();
    } finally {
      this.#runningTurn = false;
    }
  }
}
