import { HexCoordinate } from '../../models/HexCoordinate.js';
import type {
  BattleHex,
  BattlePiece,
  CombatShipType,
} from './TacticalBattle.js';

const key = (hex: BattleHex): string => `${hex.q},${hex.r}`;

function direction(from: BattleHex, to: BattleHex): number {
  return hex(from)
    .neighbors()
    .findIndex((neighbor) => neighbor.q === to.q && neighbor.r === to.r);
}

function hex(point: BattleHex): HexCoordinate {
  return new HexCoordinate(point.q, point.r);
}

export function canInitiateDock(type: CombatShipType): boolean {
  return type === 'Space pirate' || type === 'Raptor';
}

export function canBeBoarded(type: CombatShipType): boolean {
  return type !== 'Fighter';
}

/**
 * docka-babord-styrbord: a shared edge that is not the nose or tail of either
 * ship. Same or opposite heading is allowed; a T-bone is not.
 */
export function portStarboardContact(
  aCells: readonly BattleHex[],
  aFacing: number,
  bCells: readonly BattleHex[],
  bFacing: number,
): boolean {
  for (const cellA of aCells) {
    for (const cellB of bCells) {
      const fromA = direction(cellA, cellB);
      if (fromA < 0) continue;
      const fromB = (fromA + 3) % 6;
      if (fromA === aFacing || fromA === (aFacing + 3) % 6) continue;
      if (fromB === bFacing || fromB === (bFacing + 3) % 6) continue;
      return true;
    }
  }
  return false;
}

export function dockBridgeCells(
  aCells: readonly BattleHex[],
  aFacing: number,
  bCells: readonly BattleHex[],
  bFacing: number,
): readonly BattleHex[] {
  const points: BattleHex[] = [];
  const seen = new Set<string>();
  for (const cellA of aCells) {
    for (const cellB of bCells) {
      const fromA = direction(cellA, cellB);
      if (fromA < 0) continue;
      const fromB = (fromA + 3) % 6;
      if (fromA === aFacing || fromA === (aFacing + 3) % 6) continue;
      if (fromB === bFacing || fromB === (bFacing + 3) % 6) continue;
      for (const cell of [cellA, cellB]) {
        if (seen.has(key(cell))) continue;
        seen.add(key(cell));
        points.push({ q: cell.q, r: cell.r });
      }
    }
  }
  return Object.freeze(points);
}

export function dockIssue(
  source: Pick<BattlePiece, 'id' | 'type' | 'side' | 'status' | 'dockedWith'>,
  target: Pick<BattlePiece, 'id' | 'type' | 'side' | 'status' | 'dockedWith'>,
  sourceCells: readonly BattleHex[],
  sourceFacing: number,
  targetCells: readonly BattleHex[],
  targetFacing: number,
  boardingBusy: boolean,
): string | null {
  if (source.status !== 'active' || target.status !== 'active')
    return 'Choose two active ships.';
  if (source.id === target.id) return 'Choose another ship.';
  if (source.side === target.side) return 'Choose an enemy ship.';
  if (!canInitiateDock(source.type))
    return 'Only pirates and Raptors can dock.';
  if (!canBeBoarded(target.type)) return 'Fighters cannot be boarded.';
  if (source.dockedWith || target.dockedWith)
    return 'That ship is already locked in a boarding.';
  if (boardingBusy) return 'Finish the current boarding first.';
  if (
    !portStarboardContact(sourceCells, sourceFacing, targetCells, targetFacing)
  )
    return 'Come alongside port or starboard.';
  return null;
}
