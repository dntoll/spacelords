import { type BoardingCommand } from '../models/battle/BoardingBattle.js';
import type { BoardingFacade } from '../models/battle/BoardingFacade.js';
import type { CombatShipType } from '../../space-battle/models/index.js';

export class BoardingController {
  constructor(private readonly facade: BoardingFacade) {}

  startTestBoarding(attacker?: CombatShipType): void {
    return this.facade.startTestBoarding(attacker);
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
