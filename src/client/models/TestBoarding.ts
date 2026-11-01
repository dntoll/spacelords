import transportMap from '../maps/transport-boarding.txt?raw';
import { BoardingBattle } from './BoardingBattle.js';
import { parseBoardingMap } from './BoardingMap.js';

export const testBoardingMap = parseBoardingMap(transportMap);

/** fristaende-bordningsprototyp: repeatable encounter outside saved games. */
export function createTestBoardingBattle(seed = 0x5a17): BoardingBattle {
  return BoardingBattle.create(testBoardingMap, seed);
}
