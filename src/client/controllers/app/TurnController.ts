import type {
  TurnMovementPlayback,
  TurnMovement,
} from '../../models/app/TurnMovementPlayback.js';
import type { CameraFraming } from '../../models/app/CameraFraming.js';
import { type TurnFrame } from '../../models/Game.js';
import type { AppReadModel } from '../../models/AppModel.js';
import type { TurnFacade } from '../../models/app/TurnFacade.js';

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

  applyTurnFrame(frame: TurnFrame): void {
    return this.facade.applyTurnFrame(frame);
  }

  finishTurn(): void {
    return this.facade.finishTurn();
  }

  beginEventPlayback(): void {
    return this.facade.beginEventPlayback();
  }

  chooseEvent(choice: 'handle' | 'ignore'): void {
    return this.facade.chooseEvent(choice);
  }

  continueEventHandling(): void {
    return this.facade.continueEventHandling();
  }

  advanceEventPlayback(): void {
    return this.facade.advanceEventPlayback();
  }

  advanceCameraFraming(
    framing: CameraFraming,
    index: number,
    progress: number,
  ): boolean {
    return this.facade.advanceCameraFraming(framing, index, progress);
  }

  finishCameraFraming(): void {
    return this.facade.finishCameraFraming();
  }

  finishEventPlayback(): void {
    return this.facade.finishEventPlayback();
  }

  beginMovementPlayback(
    playback: TurnMovementPlayback,
    origin: AppReadModel,
  ): void {
    return this.facade.beginMovementPlayback(playback, origin);
  }

  frameTurnTrack(track: readonly TurnMovement[]): void {
    return this.facade.frameTurnTrack(track);
  }

  focusTurnMovement(movement: TurnMovement | readonly TurnMovement[]): void {
    return this.facade.focusTurnMovement(movement);
  }

  completeTurnMovement(): void {
    return this.facade.completeTurnMovement();
  }

  advanceTurnMovement(progress: number): boolean {
    return this.facade.advanceTurnMovement(progress);
  }

  endMovementPlayback(preserveCamera = false): void {
    return this.facade.endMovementPlayback(preserveCamera);
  }
}
