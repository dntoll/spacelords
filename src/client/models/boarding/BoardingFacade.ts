import { type BoardingCommand } from '../BoardingBattle.js';
import { createTestBoardingBattle } from '../TestBoarding.js';
import type { AppHost } from '../AppModel.js';

export class BoardingFacade {
  constructor(private readonly host: AppHost) {}

  startTestBoarding(): void {
    if (this.host.screen !== 'saves') return;
    this.host.testBoarding = createTestBoardingBattle();
    this.host.notice = null;
  }

  closeTestBoarding(): void {
    this.host.testBoarding = null;
  }

  finishBoarding(outcome: 'victory' | 'defeat' | 'aborted' = 'aborted'): void {
    if (this.host.testBoarding) {
      this.host.testBoarding.finish(outcome);
      return;
    }
    this.host.game.finishBoarding(outcome);
    this.host.save();
  }

  commandBoarding(command: BoardingCommand): void {
    if (this.host.testBoarding) this.host.testBoarding.command(command);
    else {
      this.host.game.commandBoarding(command);
      this.host.save();
    }
  }

  shouldPlayBoardingStep(): boolean {
    if (this.host.testBoarding) {
      const boarding = this.host.testBoarding.snapshot;
      const actor = boarding.people.find(
        (person) => person.id === boarding.currentActorId,
      );
      return (
        boarding.phase === 'fighting' &&
        actor?.side === 'defender' &&
        actor.status === 'active'
      );
    }
    return this.host.game.boardingDefenderActing;
  }

  playBoardingStep(): boolean {
    if (this.host.testBoarding)
      return this.host.testBoarding.actAutomatically(true) ?? false;
    if (!this.host.game.boardingBattle) return false;
    this.host.game.playBoardingActivation(true);
    this.host.save();
    return true;
  }
}
