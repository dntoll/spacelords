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
  #disposed = false;
  #framingEvent = false;
  #battleAnimating = false;
  #playbackTimer: ReturnType<typeof setTimeout> | undefined;
  #fleetPointer: {
    id: number;
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
    for (const resolve of this.#eventWaiters.splice(0)) resolve();
    clearTimeout(this.#playbackTimer);
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

  /** handelser-vid-ankomst: turn playback waits for arrival events to close. */
  #eventWaiters: (() => void)[] = [];

  #render(snapshot = this.#model.snapshot): void {
    if (!snapshot.eventPlayback && this.#eventWaiters.length)
      for (const resolve of this.#eventWaiters.splice(0))
        queueMicrotask(resolve);
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
          previous.fleetDestinationPreview))
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
    const playback = before.eventPlayback;
    if (playback) {
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
      return;
    }
    if (before.turnMovement) return;
    let mapOrder = false;
    if (intent.type.startsWith('open-') || intent.type === 'end-turn') {
      this.#fleets.cancelFleetRename();
    }
    if (
      intent.type.startsWith('open-') ||
      ['home', 'pan', 'zoom', 'begin-destination', 'end-turn'].includes(
        intent.type,
      )
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
      case 'end-turn':
        if (this.#turn.requestEndTurn()) {
          // upptackt-stannar-resan: End turn finishes the paused round only.
          void this.#runTurn(this.#model.snapshot.phase === 'interrupted');
          return;
        }
        break;
      case 'pointer-start': {
        this.#gesture.start(intent.id, intent.point);
        if (this.#gesture.pointerCount > 1) {
          this.#fleetPointer = null;
          this.#starMap.cancelMapPointer();
        } else {
          const fleetId = this.#starMap.fleetAtPoint(intent.point);
          if (!fleetId) return;
          this.#starMap.selectMapFleet(fleetId);
          this.#fleetPointer = {
            id: intent.id,
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
          this.#gesture.end(intent.id);
          this.#fleetPointer = null;
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

  /** fiendeupptackt-utan-end-turn: show each flash, then continue without End turn. */
  #scheduleEnemyResume(): void {
    const wait = this.#model.snapshot.notice?.kind === 'discovery' ? 1600 : 0;
    this.#playbackTimer = setTimeout(() => {
      if (this.#disposed || !this.#turn.enemyDiscoveryResume()) return;
      this.#model.advanceDiscoveryFlash();
      this.#render();
      if (this.#model.snapshot.notice?.kind === 'discovery') {
        this.#scheduleEnemyResume();
        return;
      }
      void this.#runTurn(true);
    }, wait);
  }

  /** upptackt-stannar-resan: each discovery stays briefly, then the next one. */
  #scheduleDiscoveryFlash(): void {
    if (this.#model.snapshot.notice?.kind !== 'discovery') return;
    this.#playbackTimer = setTimeout(() => {
      if (this.#disposed) return;
      this.#model.advanceDiscoveryFlash();
      this.#render();
      this.#schedulePlayback();
    }, 1600);
  }

  /** hexval-med-vag: the confirmed hex starts the round at once. */
  #travel(): void {
    this.#model.save();
    if (this.#turn.requestEndTurn()) void this.#runTurn();
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
    const playback = snapshot.eventPlayback;
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
    if (playback?.stage === 'framing') {
      if (!this.#framingEvent) void this.#frameEvent();
      return;
    }
    if (!playback) {
      if (this.#turn.discoveryPause()) {
        this.#turn.publishDiscoveryFlashes();
        this.#render();
        // fiendeupptackt-utan-end-turn: the pirate flash continues the round.
        if (this.#turn.enemyDiscoveryResume()) {
          this.#scheduleEnemyResume();
          return;
        }
        this.#scheduleDiscoveryFlash();
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
        // resa-utan-synliga-pirater: unseen pirates take no time.
        this.#playbackTimer = setTimeout(() => {
          if (this.#turn.continueVoyage()) void this.#runTurn();
        }, 250);
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
          // kamera-foljer-skepp: stay on the ship instead of framing the route.
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
            await (this.#view.animateTurnStep?.(
              { movements },
              (progress) => {
                if (this.#disposed) return;
                this.#turn.followTurnMovement(progress);
                if (this.#turn.advanceTurnMovement(progress)) this.#render();
                else this.#view.renderCamera?.(this.#model.snapshot);
              },
              stepDuration,
            ) ?? Promise.resolve());
            if (this.#disposed) return;
            this.#turn.completeTurnMovement();
            // handelser-vid-ankomst: what a ship found is shown as soon as it
            // arrives, before other fleets move on and the camera leaves.
            const arrived = batch
              .filter((track) => track.length === index + 1)
              .map((track) => track.at(-1)!.to);
            if (arrived.length) {
              this.#turn.beginEventPlayback(arrived);
              if (this.#model.snapshot.eventPlayback) {
                this.#render();
                this.#schedulePlayback();
                await new Promise<void>((resolve) =>
                  this.#eventWaiters.push(resolve),
                );
                if (this.#disposed) return;
              }
            }
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
      // resa-utan-synliga-pirater: a finished round may start the next one.
      if (!this.#disposed && !this.#model.snapshot.eventPlayback)
        this.#schedulePlayback();
    }
  }
}
