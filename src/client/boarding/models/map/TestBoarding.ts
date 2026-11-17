import transportMap from '../../maps/transport-boarding.txt?raw';
import {
  BoardingBattle,
  type BoardingBattleState,
} from '../battle/BoardingBattle.js';
import { parseBoardingMap, type BoardingMap } from './BoardingMap.js';
import {
  boardingInterior,
  composeBoardingInteriors,
  composeBoardingMaps,
  type ComposedBoarding,
} from './BoardingComposer.js';
import type { CombatShipType } from '../../../space-battle/models/index.js';

export const testBoardingMap = parseBoardingMap(transportMap, 'Transport ship');

/** valbart-skepp-i-testbordning: the ship that boards unless another is chosen. */
export const DEFAULT_TEST_BOARDING_ATTACKER: CombatShipType = 'Space pirate';

/**
 * testbordning-med-tva-skepp: the chosen ship docked side by side with the
 * hand-editable test transport, joined by a gangway.
 */
export function composeTestBoarding(
  attacker: CombatShipType = DEFAULT_TEST_BOARDING_ATTACKER,
  gangwayLength?: number,
): ComposedBoarding {
  return composeBoardingInteriors(
    boardingInterior(attacker),
    testBoardingMap,
    gangwayLength,
  );
}

/** fristaende-bordningsprototyp: repeatable encounter outside saved games. */
export function createTestBoardingBattle(
  attacker: CombatShipType = DEFAULT_TEST_BOARDING_ATTACKER,
  seed = 0x5a17,
): BoardingBattle {
  return BoardingBattle.createTest(
    composeTestBoarding(attacker),
    attacker,
    seed,
  );
}

/** The map a saved or running boarding was played on. */
export function boardingMapForState(state: BoardingBattleState): BoardingMap {
  if (state.campaign)
    return composeBoardingMaps(
      state.campaign.attackerType,
      state.campaign.defenderType,
      state.campaign.gangwayLength ?? 6,
    ).map;
  if (state.test)
    return composeTestBoarding(
      state.test.attackerType,
      state.test.gangwayLength ?? 6,
    ).map;
  return testBoardingMap;
}
