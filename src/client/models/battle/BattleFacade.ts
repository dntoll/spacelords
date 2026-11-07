import {
  battleWeapons,
  type BattleState,
  type BattleCommand,
} from '../TacticalBattle.js';
import { createTestBattle } from '../TestBattle.js';
import type { AppHost } from '../AppModel.js';

export class BattleFacade {
  constructor(private readonly host: AppHost) {}

  commandBattle(command: BattleCommand): void {
    if (this.host.battleFeedback) return;
    let result: BattleState;
    if (this.host.testBattle) {
      this.host.testBattle.command(command);
      result = this.host.testBattle.snapshot;
    } else result = this.host.game.commandBattle(command);
    this.host.afterBattleAction(result);
  }

  startTestBattle(): void {
    if (this.host.screen !== 'saves') return;
    this.host.testBattle = createTestBattle();
    this.host.battleFeedback = null;
    this.host.eventPlayback = null;
    this.host.movementPlayback = null;
    this.host.screen = 'map';
  }

  autoSelectBattleShip(): boolean {
    if (this.host.screen === 'saves') return false;
    const battle =
      this.host.testBattle?.visibleSnapshot ?? this.host.game.tacticalBattle;
    if (
      this.host.battleFeedback ||
      battle?.phase !== 'fighting' ||
      battle.turn !== 'player' ||
      battle.activation
    )
      return false;
    const eligible = battle.pieces.filter(
      (p) => p.side === 'player' && p.status === 'active' && !p.activated,
    );
    const ship =
      eligible.find((p) => battleWeapons(p.type, p.hasMissiles).length) ??
      eligible[0];
    if (!ship) return false;
    this.host.commandBattle({ type: 'activate', id: ship.id });
    return true;
  }

  playBattleActivation(
    singleStep = false,
    options?: { readonly allowDock?: boolean },
  ): void {
    let result: BattleState;
    if (this.host.testBattle) {
      this.host.testBattle.actAutomatically(singleStep, options);
      result = this.host.testBattle.snapshot;
    } else result = this.host.game.playBattleActivation(singleStep, options);
    this.host.afterBattleAction(result);
  }

  finishBattleFeedback(): void {
    this.host.battleFeedback = null;
    if (this.host.testBattle) this.host.openSaves();
    else this.host.beginEventPlayback();
  }
}
