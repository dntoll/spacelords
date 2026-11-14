import type { BoardingCell } from '../../models/map/BoardingMap.js';

/** volymetrisk-bordningsrok: six staggered particles recycle through a tile. */
export function boardingSmokeParticles(position: BoardingCell, now: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const phase =
      (((now / 3200 + index / 6 + (position.q * 7 + position.r * 11) / 17) %
        1) +
        1) %
      1;
    return {
      texture: index % 3,
      x: Math.sin(index * 4 + phase * 2) * 12,
      y: -8 - phase * 54,
      size: 55 + phase * 18,
      height: 48 + phase * 16,
      opacity: 65 * Math.sin(Math.PI * phase),
    };
  });
}
