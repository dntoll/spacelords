import type {
  TurnMovementPlayback,
  TurnMovement,
} from '../../models/turn/TurnMovementPlayback.js';
import { type TurnFrame } from '../../models/Game.js';
import type { AppReadModel } from '../../../app/models/AppModel.js';
import type { TurnFacade } from '../../models/turn/TurnFacade.js';

export class TurnController {
  constructor(private readonly facade: TurnFacade) {}

  startTurn(): void {
    return this.facade.startTurn();
  }

  nextTurnFrame(): TurnFrame | null {
    return this.facade.nextTurnFrame();
  }

  continueTurn(): void {
    return this.facade.continueTurn();
  }

  canStartTurn(): boolean {
    return this.facade.canStartTurn();
  }

  continueVoyage(): boolean {
    return this.facade.continueVoyage();
  }

  discoveryPause(): boolean {
    return this.facade.discoveryPause();
  }

  enemyDiscoveryResume(): boolean {
    return this.facade.enemyDiscoveryResume();
  }

  publishDiscoveryFlashes(): void {
    return this.facade.publishDiscoveryFlashes();
  }

  handleDiscoveries(): void {
    return this.facade.handleDiscoveries();
  }

  applyTurnFrame(frame: TurnFrame): void {
    return this.facade.applyTurnFrame(frame);
  }

  finishTurn(): void {
    return this.facade.finishTurn();
  }

  /** handelser-som-toppnotis: new events become top notices at once. */
  publishEvents(): void {
    return this.facade.publishEvents();
  }

  finishEventHandling(): void {
    return this.facade.finishEventHandling();
  }

  restoreTurnContext(): void {
    return this.facade.restoreTurnContext();
  }

  beginMovementPlayback(
    playback: TurnMovementPlayback,
    origin: AppReadModel,
  ): void {
    return this.facade.beginMovementPlayback(playback, origin);
  }

  focusTurnMovement(movement: TurnMovement | readonly TurnMovement[]): void {
    return this.facade.focusTurnMovement(movement);
  }

  followTurnMovement(progress: number): void {
    return this.facade.followTurnMovement(progress);
  }

  completeTurnMovement(): void {
    return this.facade.completeTurnMovement();
  }

  advanceTurnMovement(progress: number): boolean {
    return this.facade.advanceTurnMovement(progress);
  }

  endMovementPlayback(): void {
    return this.facade.endMovementPlayback();
  }
}
