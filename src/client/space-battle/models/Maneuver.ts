import { HexCoordinate } from '../../models/HexCoordinate.js';
import type { BattleHex, CombatShipType } from './TacticalBattle.js';

/** manoverpoang-och-hastighet: one-hex ships get two maneuvers, three-hex ships one. */
export function maneuverPoints(type: CombatShipType): number {
  return type === 'Transport ship' || type === 'Colony ship' ? 1 : 2;
}

export interface ManeuverStep {
  readonly position: BattleHex;
  readonly facing: number;
}

const neighbor = (origin: BattleHex, facing: number): BattleHex => {
  const next = new HexCoordinate(origin.q, origin.r).neighbors()[
    (facing + 6) % 6
  ]!;
  return { q: next.q, r: next.r };
};

/**
 * svang-vid-hastighet: a faster ship spends more of the path going forward,
 * so the 60° corner sits on a longer route.
 * Speed 0 turns in place. Speed 1 steps once into the new facing.
 * Higher speeds move ceil(speed/2) hexes ahead, then the rest on the new facing.
 */
export function maneuverPath(
  origin: BattleHex,
  facing: number,
  speed: number,
  direction: -1 | 0 | 1,
): readonly ManeuverStep[] {
  if (speed < 0 || !Number.isInteger(speed))
    throw new RangeError('Speed must be a non-negative integer.');
  if (direction !== -1 && direction !== 0 && direction !== 1)
    throw new RangeError('Choose left, straight, or right.');
  if (direction === 0) {
    const steps: ManeuverStep[] = [];
    let position = origin;
    for (let index = 0; index < speed; index++) {
      position = neighbor(position, facing);
      steps.push({ position, facing });
    }
    return Object.freeze(steps);
  }
  const turned = (facing + direction + 6) % 6;
  if (speed === 0)
    return Object.freeze([{ position: { ...origin }, facing: turned }]);
  if (speed === 1)
    return Object.freeze([
      { position: neighbor(origin, turned), facing: turned },
    ]);
  const ahead = Math.ceil(speed / 2);
  const steps: ManeuverStep[] = [];
  let position = origin;
  for (let index = 0; index < ahead; index++) {
    position = neighbor(position, facing);
    steps.push({ position, facing });
  }
  for (let index = ahead; index < speed; index++) {
    position = neighbor(position, turned);
    steps.push({ position, facing: turned });
  }
  return Object.freeze(steps);
}

/** skrovslut-vrak-eller-splitter: engines fail first; otherwise 10% of hull losses stay as wrecks. */
export function hullLossOutcome(
  enginesKnockedOut: boolean,
  hullAfter: number,
  wreckRoll: number,
): 'active' | 'wreck' | 'exploded' {
  if (enginesKnockedOut) return 'wreck';
  if (hullAfter > 0) return 'active';
  return wreckRoll < 0.1 ? 'wreck' : 'exploded';
}
