import type { AppModel } from '../../src/client/app/models/AppModel.js';
import {
  buildRounds,
  type BuildType,
  type Game,
} from '../../src/client/space-map/models/Game.js';
import { turnFrames } from './turn-steps.js';

/** byggtid-per-byggnad: plays the rounds a just-ordered building needs. */
export function completeConstruction(
  subject: Game | AppModel,
  type: BuildType,
): void {
  for (let round = 0; round < buildRounds(type); round++) {
    for (const frame of turnFrames(subject))
      if ('applyFrame' in subject) subject.applyFrame(frame);
      else subject.applyTurnFrame(frame);
    subject.finishTurn();
  }
}
