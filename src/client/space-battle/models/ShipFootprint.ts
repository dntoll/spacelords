import { HexCoordinate } from '../../common/HexCoordinate.js';
import type { BattleHex, BattlePiece } from './TacticalBattle.js';

/** stora-skepp-over-flera-hex: the saved position is the ship's center. */
export class ShipFootprint {
  static length(type: BattlePiece['type'], largeShips: boolean): number {
    return largeShips && (type === 'Transport ship' || type === 'Colony ship')
      ? 3
      : 1;
  }

  static cells(
    piece: Pick<BattlePiece, 'type' | 'position' | 'facing'>,
    largeShips: boolean,
    position = piece.position,
    facing = piece.facing,
  ): readonly BattleHex[] {
    if (!position) return [];
    if (this.length(piece.type, largeShips) === 1) return [position];
    const center = new HexCoordinate(position.q, position.r);
    const neighbors = center.neighbors();
    return [neighbors[(facing + 3) % 6]!, position, neighbors[facing]!];
  }

  static contains(
    piece: Pick<BattlePiece, 'type' | 'position' | 'facing'>,
    largeShips: boolean,
    at: BattleHex,
  ): boolean {
    return this.cells(piece, largeShips).some(
      (cell) => cell.q === at.q && cell.r === at.r,
    );
  }
}
