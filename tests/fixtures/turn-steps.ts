import type { AppModel } from '../../src/client/models/AppModel.js';
import type { Game, TurnFrame } from '../../src/client/models/Game.js';

type Subject = Game | AppModel;
const phase = (subject: Subject) =>
  'snapshot' in subject ? subject.snapshot.phase : subject.phase;
const apply = (subject: Subject, frame: TurnFrame) =>
  'applyFrame' in subject
    ? subject.applyFrame(frame)
    : subject.applyTurnFrame(frame);

/** Existing scenarios explicitly ignore discoveries; dedicated tests exercise Handle. */
export function* turnFrames(
  subject: Subject,
  start = true,
): Generator<TurnFrame> {
  if (start) subject.startTurn();
  for (let steps = 0; steps < 100; steps++) {
    if (phase(subject) === 'interrupted') subject.continueTurn();
    const frame = subject.nextTurnFrame();
    if (!frame) return;
    if (frame.combats !== undefined) apply(subject, frame);
    else yield frame;
  }
  throw new Error('Turn did not terminate.');
}

export function collectTurnFrames(
  subject: Subject,
  start = true,
): readonly TurnFrame[] {
  const frames: TurnFrame[] = [];
  for (const frame of turnFrames(subject, start)) {
    frames.push(frame);
    apply(subject, frame);
  }
  return frames;
}
