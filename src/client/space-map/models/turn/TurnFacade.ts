import type {
  TurnMovementPlayback,
  TurnMovement,
} from './TurnMovementPlayback.js';
import { type TurnFrame } from '../Game.js';
import { HexGeometry } from '../../../common/HexCoordinate.js';
import { travelFleet } from '../star-map/Travel.js';
import type { AppHost, AppReadModel } from '../../../app/models/AppModel.js';

/** kamera-med-dod-zon: half the rectangle's size as a share of the map. */
const DEAD_ZONE = 0.25;

export class TurnFacade {
  constructor(private readonly host: AppHost) {}

  startTurn(): void {
    if (this.host.movementPlayback) return;
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

  /** An interruption saved while it was being handled continues the round. */
  finishEventHandling(): void {
    this.host.game.finishHandlingEvent();
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
   * handelser-som-toppnotis: every new event shows at once as a short notice
   * at the top of the screen. Nothing is collected for the end of a round.
   */
  publishEvents(): void {
    this.host.noteEvents();
  }

  /** Restores the selections the player had before the journey began. */
  restoreTurnContext(): void {
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
  }

  focusTurnMovement(movement: TurnMovement | readonly TurnMovement[]): void {
    this.host.movementPlayback!.begin(movement);
  }

  /**
   * kamera-med-dod-zon: the camera stays put while the ship moves inside a
   * rectangle in the middle of the visible map, and follows it at the edge.
   */
  followTurnMovement(progress: number): void {
    const step = this.host.movementPlayback?.currents.find(
      (movement) => movement.fleetId === this.host.game.fleetSnapshot().id,
    );
    if (!step) return;
    const from = HexGeometry.toPoint(step.from);
    const to = HexGeometry.toPoint(step.to);
    const t = Math.max(0, Math.min(1, progress));
    const eased = t * t * (3 - 2 * t);
    const point = {
      x: from.x + (to.x - from.x) * eased,
      y: from.y + (to.y - from.y) * eased,
    };
    const viewport = this.host.mapViewport ?? {
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
    // Screen offsets are relative to the canvas center; the visible part can
    // be smaller when a panel covers it.
    const middle = {
      x: width / 2 - viewport.width / 2,
      y: height / 2 - viewport.height / 2,
    };
    this.host.camera.revealPoint(point, {
      left: middle.x - width * DEAD_ZONE,
      right: middle.x + width * DEAD_ZONE,
      top: middle.y - height * DEAD_ZONE,
      bottom: middle.y + height * DEAD_ZONE,
    });
  }

  completeTurnMovement(): void {
    this.host.movementPlayback!.complete();
  }

  advanceTurnMovement(progress: number): boolean {
    return this.host.movementPlayback?.advance(progress) ?? false;
  }

  endMovementPlayback(): void {
    this.host.movementPlayback = null;
    this.host.movementOrigin = null;
  }
}
