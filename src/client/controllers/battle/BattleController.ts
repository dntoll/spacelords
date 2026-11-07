import { type BattleCommand } from '../../models/TacticalBattle.js';
import type { BattleFacade } from '../../models/battle/BattleFacade.js';

export class BattleController {
  constructor(private readonly facade: BattleFacade) {}

  commandBattle(command: BattleCommand): void {
    return this.facade.commandBattle(command);
  }

  startTestBattle(): void {
    return this.facade.startTestBattle();
  }

  autoSelectBattleShip(): boolean {
    return this.facade.autoSelectBattleShip();
  }

  playBattleActivation(
    singleStep = false,
    options?: { readonly allowDock?: boolean },
  ): void {
    return this.facade.playBattleActivation(singleStep, options);
  }

  finishBattleFeedback(): void {
    return this.facade.finishBattleFeedback();
  }
}
