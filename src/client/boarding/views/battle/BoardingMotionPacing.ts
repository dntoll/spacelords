// vandning-under-forflyttning: a figure turns while it walks, and turning is quick.

/** Time for one step to the next tile. */
export const BOARDING_STEP_MS = 260;
/** Time for one 45° turn. */
export const BOARDING_TURN_STEP_MS = 70;

const FACINGS = 8;

type PoseFrame = Readonly<{
  people: readonly Readonly<{
    id: string;
    position: Readonly<{ q: number; r: number }>;
    facing: number;
    status: string;
  }>[];
}>;

/** Signed shortest number of 45° turns from one facing to another. */
export function boardingTurnSteps(from: number, to: number): number {
  const turns = (((to - from) % FACINGS) + FACINGS) % FACINGS;
  return turns > FACINGS / 2 ? turns - FACINGS : turns;
}

type Change = Readonly<{ id: string; moved: boolean }> | null;

/** The single person who turned or moved between two frames, if only one did. */
function soleChange(before: PoseFrame, after: PoseFrame): Change {
  if (before.people.length !== after.people.length) return null;
  let change: Change = null;
  for (const next of after.people) {
    const previous = before.people.find((entry) => entry.id === next.id);
    if (!previous || previous.status !== next.status) return null;
    const moved =
      previous.position.q !== next.position.q ||
      previous.position.r !== next.position.r;
    if (!moved && previous.facing === next.facing) continue;
    if (change) return null;
    change = { id: next.id, moved };
  }
  return change;
}

/**
 * Indices of presentation frames that only turn a figure and can be played
 * together with the frame after it, which turns or moves the same figure.
 * A frame right before a shot is kept so the shot still comes after the turn.
 */
export function boardingMergedTurnFrames(
  previous: PoseFrame,
  frames: readonly PoseFrame[],
  shotIndex: number | null,
): ReadonlySet<number> {
  const merged = new Set<number>();
  for (let index = 0; index + 1 < frames.length; index++) {
    if (index + 1 === shotIndex) continue;
    const before = index === 0 ? previous : frames[index - 1]!;
    const turn = soleChange(before, frames[index]!);
    if (!turn || turn.moved) continue;
    const next = soleChange(frames[index]!, frames[index + 1]!);
    if (next?.id === turn.id) merged.add(index);
  }
  return merged;
}

/** How long one played motion lasts. */
export function boardingMotionDuration(moves: boolean, turns: number): number {
  return moves
    ? BOARDING_STEP_MS
    : Math.max(1, Math.abs(turns)) * BOARDING_TURN_STEP_MS;
}

/** How long the motion between two presentation frames lasts. */
export function boardingFrameMotionDuration(
  from: PoseFrame,
  to: PoseFrame,
): number {
  let moves = false;
  let turns = 0;
  for (const next of to.people) {
    const previous = from.people.find((entry) => entry.id === next.id);
    if (!previous) continue;
    moves ||=
      previous.position.q !== next.position.q ||
      previous.position.r !== next.position.r;
    turns = Math.max(
      turns,
      Math.abs(boardingTurnSteps(previous.facing, next.facing)),
    );
  }
  return boardingMotionDuration(moves, turns);
}

/** The facing to draw `elapsed` ms into a motion that turns `from` → `to`. */
export function boardingMotionFacing(
  from: number,
  to: number,
  elapsed: number,
  duration: number,
): number {
  const turns = boardingTurnSteps(from, to);
  if (!turns) return to;
  const perTurn = Math.min(BOARDING_TURN_STEP_MS, duration / Math.abs(turns));
  const done = Math.min(
    Math.abs(turns),
    Math.max(0, Math.round(elapsed / perTurn)),
  );
  return (((from + Math.sign(turns) * done) % FACINGS) + FACINGS) % FACINGS;
}
