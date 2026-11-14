import { BoardingBattle, type BoardingBattleState } from './BoardingBattle.js';
import {
  composeBoardingMaps,
  type ComposedBoarding,
} from '../map/BoardingComposer.js';
import type { CombatShipType } from '../../../models/TacticalBattle.js';

export interface SavedBoardingEngagement {
  readonly attackerId: string;
  readonly defenderId: string;
  readonly attackerType: CombatShipType;
  readonly defenderType: CombatShipType;
  readonly playerIsAttacker: boolean;
  readonly seenRound: number;
  readonly battle: BoardingBattleState;
}

export class BoardingEngagement {
  readonly attackerId: string;
  readonly defenderId: string;
  readonly attackerType: CombatShipType;
  readonly defenderType: CombatShipType;
  readonly playerIsAttacker: boolean;
  readonly composed: ComposedBoarding;
  readonly battle: BoardingBattle;
  seenRound: number;

  private constructor(
    attackerId: string,
    defenderId: string,
    attackerType: CombatShipType,
    defenderType: CombatShipType,
    playerIsAttacker: boolean,
    composed: ComposedBoarding,
    battle: BoardingBattle,
    seenRound: number,
  ) {
    this.attackerId = attackerId;
    this.defenderId = defenderId;
    this.attackerType = attackerType;
    this.defenderType = defenderType;
    this.playerIsAttacker = playerIsAttacker;
    this.composed = composed;
    this.battle = battle;
    this.seenRound = seenRound;
  }

  static start(
    attackerId: string,
    defenderId: string,
    attackerType: CombatShipType,
    defenderType: CombatShipType,
    playerIsAttacker: boolean,
    seed: number,
  ): BoardingEngagement {
    const composed = composeBoardingMaps(attackerType, defenderType);
    const battle = BoardingBattle.createCampaign(
      composed,
      playerIsAttacker,
      seed,
      attackerType,
      defenderType,
    );
    return new BoardingEngagement(
      attackerId,
      defenderId,
      attackerType,
      defenderType,
      playerIsAttacker,
      composed,
      battle,
      battle.snapshot.round,
    );
  }

  static restore(saved: SavedBoardingEngagement): BoardingEngagement {
    const composed = composeBoardingMaps(
      saved.attackerType,
      saved.defenderType,
    );
    return new BoardingEngagement(
      saved.attackerId,
      saved.defenderId,
      saved.attackerType,
      saved.defenderType,
      saved.playerIsAttacker,
      composed,
      BoardingBattle.restore(composed.map, saved.battle),
      saved.seenRound,
    );
  }

  snapshot(): SavedBoardingEngagement {
    return Object.freeze({
      attackerId: this.attackerId,
      defenderId: this.defenderId,
      attackerType: this.attackerType,
      defenderType: this.defenderType,
      playerIsAttacker: this.playerIsAttacker,
      seenRound: this.seenRound,
      battle: this.battle.snapshot,
    });
  }
}
