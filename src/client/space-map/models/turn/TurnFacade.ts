import { EventPlayback, type PlaybackEvent } from './EventPlayback.js';
import type {
  TurnMovementPlayback,
  TurnMovement,
} from './TurnMovementPlayback.js';
import { Camera } from '../Camera.js';
import { CameraFraming } from './CameraFraming.js';
import { type TurnFrame } from '../Game.js';
import { HexGeometry } from '../../../common/HexCoordinate.js';
import { travelFleet } from '../star-map/Travel.js';
import type { AppHost, AppReadModel } from '../../../app/models/AppModel.js';

export class TurnFacade {
  constructor(private readonly host: AppHost) {}

  startTurn(): void {
    if (this.host.eventPlayback || this.host.movementPlayback) return;
    this.host.turnContext = {
      screen: this.host.screen,
      selected: this.host.selected,
      mapFleetId: this.host.mapFleetId,
      selectedFleetId: this.host.selectedFleetId,
      camera: this.host.camera.snapshot,
    };
    this.host.cancelMapPointer();
    if (
      !['research', 'production'].includes(this.host.screen) &&
      !this.host.isMapScreen()
    )
      this.host.screen = 'map';
    this.host.destinationFleetId = null;
    // ap-pa-starmap: the enemies act once the player's AP are spent.
    this.host.game.startTurn(
      this.host.game.enemyTurnPending ? 'enemy' : 'player',
    );
  }

  nextTurnFrame(): TurnFrame | null {
    return this.host.game.nextTurnFrame();
  }

  canStartTurn(): boolean {
    // game-over-utan-skepp: a lost home fleet cannot start another round.
    if (this.host.game.defeated) return false;
    return (
      !this.host.eventPlayback &&
      !this.host.movementPlayback &&
      (this.host.game.phase === 'planning' || this.host.game.discoveryPause())
    );
  }

  discoveryPause(): boolean {
    return this.host.game.discoveryPause();
  }

  enemyDiscoveryResume(): boolean {
    return this.host.game.enemyDiscoveryResume();
  }

  /** upptackt-stannar-resan: log the discoveries and flash them, without a choice. */
  publishDiscoveryFlashes(): void {
    const interruption = this.host.game.interruption;
    if (!this.host.game.discoveryPause() || !interruption) return;
    this.host.noteDiscoveries(
      interruption.discoveries.map((discovery) =>
        Object.freeze({
          kind: discovery.kind,
          name: discovery.name,
          ...(discovery.eventId ? { eventId: discovery.eventId } : {}),
        }),
      ),
    );
  }

  /**
   * resa-utan-synliga-pirater: with no pirate in sight the next round begins
   * at once, until the fleet arrives or something needs the player.
   */
  continueVoyage(): boolean {
    if (!this.canStartTurn()) return false;
    // ap-pa-starmap: spent AP hand the round to the enemies at once.
    if (this.host.game.phase === 'planning' && this.host.game.enemyTurnPending)
      return true;
    if (!this.host.voyage) return false;
    const fleet = travelFleet(this.host.game);
    if (
      !fleet?.destination ||
      fleet.position?.key === fleet.destination.key ||
      !this.host.game.routePreview(fleet.id, fleet.destination).length ||
      this.host.game.pirateSnapshots().length ||
      this.host.game.tacticalBattle
    ) {
      this.host.voyage = false;
      return false;
    }
    return true;
  }

  handleDiscoveries(): void {
    this.host.game.handleDiscoveries();
    this.host.focusInterruptedFleet();
  }

  continueTurn(): void {
    this.host.destinationFleetId = null;
    this.host.cancelMapPointer();
    this.host.game.continueTurn();
  }

  applyTurnFrame(frame: TurnFrame): void {
    this.host.game.applyFrame(frame);
  }

  finishTurn(): void {
    this.host.game.finishTurn();
  }

  /**
   * handelser-vid-ankomst: with `at`, only events at those positions play,
   * right after the ships arrive there, while movement playback goes on.
   */
  beginEventPlayback(
    at?: readonly { readonly q: number; readonly r: number }[],
  ): void {
    // An exploration interrupts the year; its event still shows on arrival.
    if (at && !['planning', 'interrupted'].includes(this.host.game.phase))
      return;
    const here = at
      ? (event: PlaybackEvent) =>
          !!event.position &&
          at.some(
            (point) =>
              point.q === event.position!.q && point.r === event.position!.r,
          )
      : () => true;
    if (
      this.host.game.tacticalBattle ||
      this.host.battleFeedback ||
      this.host.game.phase === 'simulating' ||
      this.host.game.interruption?.handling ||
      this.host.eventPlayback
    )
      return;
    const round =
      this.host.game.phase === 'interrupted'
        ? this.host.game.round
        : this.host.game.round - 1;
    for (const id of this.host.game.interruption?.presentedEventIds ?? [])
      this.host.presentedEventIds.add(id);
    // stridsrapport-i-dialog: combat now presents its outcome on the battle board.
    for (const report of this.host.game.interruption?.battles ?? []) {
      if (!report.eventId) continue;
      this.host.presentedEventIds.add(report.eventId);
      this.host.game.presentEvent(report.eventId);
    }
    const events = this.host.game.events.filter(
      (event) => event.round === round,
    );
    const playback = new EventPlayback(
      round,
      events
        .filter((event) => !this.host.presentedEventIds.has(event.id))
        .map<PlaybackEvent>((event) => {
          const decision = this.host.eventDecision(event.id);
          return decision ? Object.freeze({ ...event, decision }) : event;
        })
        .filter(
          (event) => this.host.game.phase !== 'interrupted' || event.decision,
        )
        .filter(here),
      events.filter((event) => this.host.presentedEventIds.has(event.id)),
    );
    if (!playback.current) {
      if (this.host.game.phase === 'planning' && !this.host.movementPlayback)
        this.host.finishEventPlayback();
      return;
    }
    this.host.eventPlayback = playback;
    if (!this.host.eventCamera) {
      this.host.eventCamera = new Camera(
        this.host.game.galaxy.homePlanet.position,
        this.host.game.galaxy.radius,
      );
      this.host.eventCamera.restore(this.host.camera.snapshot);
    }
    this.host.focusEvent();
  }

  chooseEvent(choice: 'handle' | 'ignore'): void {
    const playback = this.host.eventPlayback;
    if (playback?.snapshot.stage !== 'awaiting-choice' || !playback.current)
      return;
    if (choice === 'handle') this.host.game.handleEvent(playback.current.id);
    else this.host.game.presentEvent(playback.current.id);
    playback.choose(choice);
  }

  continueEventHandling(): void {
    this.host.game.finishHandlingEvent();
    this.host.beginEventPlayback();
  }

  advanceEventPlayback(): void {
    const playback = this.host.eventPlayback;
    if (!playback) return;
    if (playback.snapshot.stage === 'framing') {
      this.host.finishCameraFraming();
      return;
    }
    const previousEvent = playback.current;
    if (playback.snapshot.stage === 'filing' && playback.current) {
      this.host.presentedEventIds.add(playback.current.id);
      this.host.game.presentEvent(playback.current.id);
      if (playback.snapshot.choice === 'handle') {
        this.host.eventPlayback = null;
        // handelser-vid-ankomst: movement still plays on the event camera.
        if (!this.host.movementPlayback) this.host.eventCamera = null;
        this.host.cameraFraming = null;
        this.host.playbackPositions = [];
        this.host.focusInterruptedFleet();
        return;
      }
    }
    if (!playback.advance()) {
      if (this.host.game.phase === 'planning' && !this.host.movementPlayback)
        this.host.finishEventPlayback();
      else {
        this.host.eventPlayback = null;
        this.host.cameraFraming = null;
        this.host.playbackPositions = [];
      }
    } else if (previousEvent !== playback.current) this.host.focusEvent();
  }

  advanceCameraFraming(
    framing: CameraFraming,
    index: number,
    progress: number,
  ): boolean {
    if (this.host.cameraFraming !== framing || !this.host.eventCamera)
      return false;
    this.host.eventCamera.restore(
      CameraFraming.sample(framing.transitions[index]!, progress),
    );
    if (progress >= 1 && index === framing.transitions.length - 1)
      this.host.finishCameraFraming();
    return true;
  }

  finishCameraFraming(): void {
    if (this.host.cameraFraming && this.host.eventCamera)
      this.host.eventCamera.restore(this.host.cameraFraming.target);
    this.host.cameraFraming = null;
    this.host.eventPlayback?.finishFraming();
  }

  finishEventPlayback(): void {
    this.host.eventPlayback = null;
    this.host.eventCamera = null;
    this.host.cameraFraming = null;
    this.host.playbackPositions = [];
    const context = this.host.turnContext;
    this.host.turnContext = null;
    if (!context) return;
    this.host.screen = context.screen;
    this.host.selected = context.selected;
    this.host.mapFleetId =
      context.mapFleetId && this.host.game.fleet(context.mapFleetId)
        ? context.mapFleetId
        : null;
    this.host.selectedFleetId =
      context.selectedFleetId && this.host.game.fleet(context.selectedFleetId)
        ? context.selectedFleetId
        : null;
    // kamera-foljer-skepp: the voyage leaves the camera on the ship.
  }

  beginMovementPlayback(
    playback: TurnMovementPlayback,
    origin: AppReadModel,
  ): void {
    this.host.movementPlayback = playback;
    this.host.movementOrigin = origin;
    if (!this.host.eventCamera) {
      this.host.eventCamera = new Camera(
        this.host.game.galaxy.homePlanet.position,
        this.host.game.galaxy.radius,
      );
      this.host.eventCamera.restore(this.host.camera.snapshot);
    }
  }

  frameTurnTrack(track: readonly TurnMovement[]): void {
    this.host.playbackPositions = track.flatMap((movement) => [
      HexGeometry.toPoint(movement.from),
      HexGeometry.toPoint(movement.to),
    ]);
    this.host.prepareCameraFraming();
  }

  focusTurnMovement(movement: TurnMovement | readonly TurnMovement[]): void {
    this.host.movementPlayback!.begin(movement);
  }

  /** kamera-foljer-skepp: slide the visible camera with the player's ship. */
  followTurnMovement(progress: number): void {
    const step = this.host.movementPlayback?.currents.find(
      (movement) => movement.fleetId === 'fleet-home',
    );
    const camera = this.host.eventCamera;
    if (!step || !camera) return;
    const from = HexGeometry.toPoint(step.from);
    const to = HexGeometry.toPoint(step.to);
    const t = Math.max(0, Math.min(1, progress));
    const eased = t * t * (3 - 2 * t);
    // The selection panel is hidden during the voyage, so the canvas center
    // is the visible middle. Keeping the planning offset draws one shifted frame.
    const point = {
      x: from.x + (to.x - from.x) * eased,
      y: from.y + (to.y - from.y) * eased,
    };
    camera.focusPoint(point);
    this.host.camera.focusPoint(point);
  }

  completeTurnMovement(): void {
    this.host.movementPlayback!.complete();
  }

  advanceTurnMovement(progress: number): boolean {
    return this.host.movementPlayback?.advance(progress) ?? false;
  }

  endMovementPlayback(preserveCamera = false): void {
    this.host.movementPlayback = null;
    this.host.movementOrigin = null;
    if (!preserveCamera) this.host.eventCamera = null;
    this.host.cameraFraming = null;
    this.host.playbackPositions = [];
  }
}
