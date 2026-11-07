import { type BoardingCommand } from '../../models/boarding/BoardingBattle.js';
import type { BoardingFacade } from '../../models/boarding/BoardingFacade.js';

export class BoardingController {
  constructor(private readonly facade: BoardingFacade) {}

  startTestBoarding(): void {
    return this.facade.startTestBoarding();
  }

  closeTestBoarding(): void {
    return this.facade.closeTestBoarding();
  }

  finishBoarding(outcome: 'victory' | 'defeat' | 'aborted' = 'aborted'): void {
    return this.facade.finishBoarding(outcome);
  }

  commandBoarding(command: BoardingCommand): void {
    return this.facade.commandBoarding(command);
  }

  shouldPlayBoardingStep(): boolean {
    return this.facade.shouldPlayBoardingStep();
  }

  playBoardingStep(): boolean {
    return this.facade.playBoardingStep();
  }
}
