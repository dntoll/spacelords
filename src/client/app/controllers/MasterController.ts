import {
  SaveController,
  ResearchController,
  FleetController,
  ProductionController,
  StarMapController,
  TurnController,
} from '../../space-map/controllers/index.js';
import {
  BoardingController,
  BoardingEditorController,
} from '../../boarding/controllers/index.js';
import { BattleController } from '../../space-battle/controllers/index.js';
import type { AppModel, AppReadModel } from '../models/AppModel.js';
import {
  TurnMovementPlayback,
  isMapScreen,
} from '../../space-map/models/index.js';
import type { AppIntent, AppPort } from '../views/ViewContracts.js';
import type { Point } from '../../common/HexCoordinate.js';
import { MapGesture } from '../../space-map/views/index.js';

/** handelser-som-toppnotis: how long each top notice stays. */
const NOTICE_DURATION = 1600;

export class MasterController {
  readonly #saveCase: SaveController;
  readonly #boarding: BoardingController;
  readonly #editor: BoardingEditorController;
  readonly #battle: BattleController;
  readonly #research: ResearchController;
  readonly #fleets: FleetController;
  readonly #production: ProductionController;
  readonly #starMap: StarMapController;
  readonly #turn: TurnController;
  readonly #model: AppModel;
  readonly #view: AppPort;
  readonly #gesture = new MapGesture();
  #presented: AppReadModel | null = null;
  #runningTurn = false;
  #lastVoyageMovement: { position: string; destination: string } | null = null;
  #disposed = false;
  #battleAnimating = false;
  #playbackTimer: ReturnType<typeof setTimeout> | undefined;
  #fleetPointer: {
    id: number;
    fleetId: string;
    again: boolean;
    start: Point;
    dragged: boolean;
  } | null = null;

  constructor(model: AppModel, view: AppPort) {
    this.#model = model;
    this.#view = view;
    this.#saveCase = new SaveController(model.saveCase);
    this.#boarding = new BoardingController(model.boarding);
    this.#editor = new BoardingEditorController(model.editorCase);
    this.#battle = new BattleController(model.battle);
    this.#research = new ResearchController(model.researchCase);
    this.#fleets = new FleetController(model.fleets);
    this.#production = new ProductionController(model.production);
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
    clearTimeout(this.#playbackTimer);
    clearTimeout(this.#noticeTimer);
    this.#cancelPointer();
    this.#view.dispose();
  }

  #handle(intent: AppIntent): void {
    try {
      if (this.#navigate(intent)) return;
      if (intent.type !== 'map-size') this.#model.clearNotice();
      this.#handleIntent(intent);
    } catch (error) {
      // Refused orders use Error and become a player notice. Other throws stay visible.
      if (!(error instanceof Error) || error.name !== 'Error')
        console.warn(error);
      this.#turn.endMovementPlayback();
      this.#model.reportError(error);
      this.#render();
      this.#schedulePlayback();
    }
  }

  #noticeTimer: ReturnType<typeof setTimeout> | undefined;

  #render(given?: AppReadModel): void {
    // handelser-som-toppnotis: events show at the top as soon as they happen.
    this.#turn.publishEvents();
    const snapshot = given ?? this.#model.snapshot;
    this.#scheduleNotice(snapshot);
    const previous =
      this.#presented?.battleFeedback ?? this.#presented?.tacticalBattle;
    const battle = snapshot.battleFeedback ?? snapshot.tacticalBattle;
    this.#presented = snapshot;
    this.#view.render(snapshot);
    const shot = battle?.lastShot;
    const maneuver = battle?.lastManeuver;
    if (
      !this.#battleAnimating &&
      maneuver &&
      previous?.id === battle.id &&
      previous.lastManeuver?.id !== maneuver.id &&
      snapshot.screen !== 'saves' &&
      this.#view.animateBattleManeuver
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
      void this.#view.animateBattleManeuver(maneuver).then(finish, (error) => {
        this.#model.reportError(error);
        finish();
      });
      return;
    }
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
      previous.boardingBattle ||
      previous.editor ||
      previous.tacticalBattle ||
      previous.battleFeedback ||
      (!startingPinch &&
        (this.#fleetPointer ||
          previous.fleetDragging ||
          previous.fleetDestinationPreview))
    )
      return false;
    // kamera-med-dod-zon: the player may pan and zoom while the ship moves.
    const moving = !!previous.turnMovement || this.#runningTurn;
    if (moving && intent.type === 'pointer-start') {
      this.#gesture.start(intent.id, intent.point);
      return true;
    }
    if (moving && intent.type === 'pointer-end') {
      this.#gesture.end(intent.id);
      return true;
    }
    if (
      moving &&
      !['pan', 'zoom', 'pointer-move', 'map-leave'].includes(intent.type)
    )
      return false;
    if (intent.type === 'pointer-start') {
      if (!startingPinch) {
        if (this.#starMap.fleetAtPoint(intent.point)) return false;
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
      this.#cancelPointer();
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
    const before = this.#presented ?? this.#model.snapshot;
    if (before.turnMovement) return;
    let mapOrder = false;
    if (intent.type.startsWith('open-')) {
      this.#fleets.cancelFleetRename();
    }
    if (
      intent.type.startsWith('open-') ||
      ['home', 'pan', 'zoom', 'begin-destination'].includes(intent.type)
    )
      this.#cancelPointer();
    if (
      before.screen === 'saves' &&
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
        'editor-picture-aspect',
        'editor-adjust-sprite',
        'editor-projection',
        'editor-opacity',
        'editor-fill-rooms',
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
        this.#boarding.startTestBoarding(intent.selection);
        this.#schedulePlayback();
        break;
      case 'handle-discoveries':
        this.#turn.handleDiscoveries();
        break;
      case 'continue-turn':
        if (this.#model.snapshot.interruption?.handling) {
          this.#turn.finishEventHandling();
          this.#model.save();
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
      case 'map-select-fleet':
        this.#starMap.selectMapFleet(intent.id);
        break;
      case 'open-production':
        this.#production.openProduction();
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
      case 'move-research':
        this.#research.moveResearch(intent.technology, intent.index);
        break;
      case 'remove-research':
        this.#research.requestResearchRemoval(intent.technology);
        break;
      case 'confirm-research-removal':
        this.#research.confirmResearchRemoval();
        break;
      case 'cancel-research-removal':
        this.#research.requestResearchRemoval(null);
        break;
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
      case 'editor-picture-aspect':
        this.#editor.pictureAspect(intent.value);
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
      case 'editor-fill-rooms':
        this.#editor.fillRooms(intent.value);
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
      case 'open-research':
        this.#research.openResearch();
        break;
      case 'open-fleets':
        this.#fleets.openFleets();
        break;
      case 'home':
        this.#starMap.home();
        break;
      case 'select': {
        const selection = this.#starMap.select(intent.position);
        mapOrder = selection === 'destination';
        if (selection === 'travel') return this.#travel();
        if (selection === 'resume') return this.#resumePausedTurn();
        break;
      }
      case 'pan':
        this.#starMap.pan(intent.delta);
        break;
      case 'zoom':
        this.#starMap.zoom(intent.factor, intent.anchor);
        break;
      case 'research':
        this.#research.research(intent.technology);
        break;
      case 'open-fleet':
        this.#fleets.openFleet(intent.id);
        break;
      case 'begin-destination':
        this.#fleets.beginDestination(intent.id);
        break;
      case 'clear-destination':
        this.#fleets.clearDestination(intent.id);
        break;
      case 'pointer-start': {
        this.#gesture.start(intent.id, intent.point);
        if (this.#gesture.pointerCount > 1) {
          this.#fleetPointer = null;
          this.#starMap.cancelMapPointer();
        } else {
          const fleetId = this.#starMap.fleetAtPoint(intent.point);
          if (!fleetId) return;
          // hexval-med-vag: a second tap on a selected pirate travels on release.
          const again = this.#model.snapshot.mapFleetId === fleetId;
          if (!again) this.#starMap.selectMapFleet(fleetId);
          this.#fleetPointer = {
            id: intent.id,
            fleetId,
            again,
            start: intent.point,
            dragged: false,
          };
        }
        break;
      }
      case 'map-leave':
        if (!this.#starMap.hoverMapFleet(null)) return;
        break;
      case 'pointer-cancel':
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
          if (this.#fleetPointer.dragged)
            this.#starMap.previewFleetDestination(intent.point);
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
          const pointer = this.#fleetPointer;
          this.#gesture.end(intent.id);
          this.#fleetPointer = null;
          if (
            !dragged &&
            pointer.again &&
            this.#starMap.selectMapFleet(pointer.fleetId) === 'travel'
          )
            return this.#travel();
          if (dragged) {
            mapOrder = true;
            this.#starMap.previewFleetDestination(intent.point);
            this.#starMap.commitFleetDestination();
          }
          break;
        }
        this.#gesture.move(intent.id, intent.point);
        const selected = this.#gesture.end(intent.id);
        if (selected) {
          const selection = this.#starMap.selectPoint(selected);
          mapOrder = selection === 'destination';
          if (selection === 'travel') return this.#travel();
          if (selection === 'resume') return this.#resumePausedTurn();
        }
        break;
      }
    }
    if (
      !(['select', 'pointer-end'].includes(intent.type) && !mapOrder) &&
      !intent.type.startsWith('research-') &&
      !intent.type.startsWith('open-') &&
      !intent.type.startsWith('editor-') &&
      intent.type !== 'close-editor' &&
      intent.type !== 'cancel-editor-switch' &&
      ![
        'pointer-cancel',
        'map-size',
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
      ].includes(intent.type)
    )
      this.#model.save();
    this.#render();
    this.#schedulePlayback();
  }

  /**
   * handelser-som-toppnotis: each top notice stays briefly, then the next.
   * Notices never stop the game; only a stopping discovery waits for them.
   */
  #scheduleNotice(snapshot: AppReadModel): void {
    if (this.#noticeTimer || snapshot.notice?.kind !== 'discovery') return;
    this.#noticeTimer = setTimeout(() => {
      this.#noticeTimer = undefined;
      if (this.#disposed) return;
      this.#model.advanceDiscoveryFlash();
      this.#render();
      if (!this.#runningTurn) this.#schedulePlayback();
    }, NOTICE_DURATION);
  }

  /** hexval-med-vag: the confirmed hex starts the round at once. */
  #travel(): void {
    this.#model.save();
    if (this.#turn.canStartTurn()) void this.#runTurn();
    else this.#render();
  }

  /** upptackt-stannar-resan: a new hex continues the paused round, not the chain. */
  #resumePausedTurn(): void {
    this.#model.save();
    if (this.#model.snapshot.phase === 'interrupted') void this.#runTurn(true);
    else this.#render();
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

  #cancelPointer(): void {
    this.#gesture.cancel();
    this.#fleetPointer = null;
    this.#starMap.cancelMapPointer();
  }

  #schedulePlayback(): void {
    clearTimeout(this.#playbackTimer);
    if (this.#disposed || this.#battleAnimating) return;
    const activated = this.#battle.autoSelectBattleShip();
    const snapshot = activated
      ? this.#model.snapshot
      : (this.#presented ?? this.#model.snapshot);
    if (this.#boarding.shouldPlayBoardingStep()) {
      // tydlig-bordningsstatus: let the shot finish before the defender step.
      const presentation = this.#view.boardingPresentation?.() ?? null;
      if (presentation) {
        void presentation.then(() => {
          if (!this.#disposed) this.#schedulePlayback();
        });
        return;
      }
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
    // The boarding view hides the tactical battle. Continuing the round here
    // reports an error and rebuilds the controls, so clicks never land.
    if (snapshot.boardingBattle) return;
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
    if (this.#turn.discoveryPause()) {
      this.#turn.publishDiscoveryFlashes();
      this.#render();
      // fiendeupptackt-utan-end-turn: the round goes on after the notices.
      if (
        this.#turn.enemyDiscoveryResume() &&
        this.#model.snapshot.notice?.kind !== 'discovery'
      )
        this.#playbackTimer = setTimeout(() => {
          if (this.#turn.enemyDiscoveryResume()) void this.#runTurn(true);
        }, 0);
      return;
    }
    if (
      snapshot.phase === 'interrupted' &&
      !snapshot.interruption?.handling &&
      !snapshot.interruption?.tacticalBattles?.length
    )
      this.#playbackTimer = setTimeout(() => {
        void this.#runTurn(true);
      }, 0);
    else if (!this.#runningTurn && this.#turn.continueVoyage())
      // resa-utan-synliga-pirater / somlos-forflyttning: without an active
      // enemy the next round follows at once, so the journey has no break.
      this.#playbackTimer = setTimeout(() => {
        if (this.#turn.continueVoyage()) void this.#runTurn();
      }, 0);
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
      const result = this.#model.snapshot;
      const batches = movementPlayback.batches;
      if (batches.length) {
        this.#turn.beginMovementPlayback(movementPlayback, origin);
        for (const batch of batches) {
          this.#turn.focusTurnMovement(batch.map((track) => track[0]!));
          // kamera-foljer-skepp: stay on the ship instead of framing the route.
          const first = batch
            .flatMap((track) => (track[0] ? [track[0]] : []))
            .find((movement) => movement.fleetId === origin.fleet.id);
          if (
            !first ||
            this.#lastVoyageMovement?.position !== first.from.key ||
            this.#lastVoyageMovement.destination !==
              origin.fleet.destination?.key
          )
            this.#turn.followTurnMovement(0);
          this.#render();
          if (this.#disposed) return;
          const steps = Math.max(...batch.map((track) => track.length));
          const stepDuration = 480;
          for (let index = 0; index < steps; index++) {
            const movements = batch.flatMap((track) =>
              track[index] ? [track[index]!] : [],
            );
            this.#turn.focusTurnMovement(movements);
            this.#render();
            const own = movements.find(
              (movement) => movement.fleetId === origin.fleet.id,
            );
            const destination = origin.fleet.destination?.key;
            const start =
              !own ||
              !destination ||
              this.#lastVoyageMovement?.position !== own.from.key ||
              this.#lastVoyageMovement.destination !== destination;
            const end =
              !own ||
              !destination ||
              own.to.key === destination ||
              (index === steps - 1 &&
                (result.phase === 'interrupted' || result.pirates.length > 0));
            await (this.#view.animateTurnStep?.(
              { movements },
              (progress, point, crossed) => {
                if (this.#disposed) return;
                this.#turn.followTurnMovement(progress, point);
                if (
                  this.#turn.advanceTurnMovement(
                    crossed === undefined ? progress : crossed ? 1 : 0,
                  )
                )
                  this.#render();
                else this.#view.renderCamera?.(this.#model.snapshot);
              },
              stepDuration,
              { start, end },
            ) ?? Promise.resolve());
            if (this.#disposed) return;
            if (own)
              this.#lastVoyageMovement =
                !end && destination
                  ? { position: own.to.key, destination }
                  : null;
            this.#turn.completeTurnMovement();
          }
        }
        this.#turn.endMovementPlayback();
      }
      if (this.#model.snapshot.phase === 'planning')
        this.#turn.restoreTurnContext();
      this.#render();
      this.#schedulePlayback();
    } catch (error) {
      console.warn(error);
      this.#turn.endMovementPlayback();
      this.#model.reportError(error);
      this.#render();
    } finally {
      this.#runningTurn = false;
      // resa-utan-synliga-pirater: a finished round may start the next one.
      if (!this.#disposed) this.#schedulePlayback();
    }
  }
}
