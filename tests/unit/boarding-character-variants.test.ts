import { describe, expect, it } from 'vitest';
import { boardingCharacterVariants } from '../../src/client/views/boarding/BoardingCharacterAtlas.js';
import {
  boardingCharacterSprite,
  boardingCharacterVariant,
} from '../../src/client/views/boarding/BoardingCharacterSprite.js';

describe('figurvarianter-i-bordning', () => {
  it('gives the people of a side different looks, the same every time', () => {
    const squad = [1, 2, 3, 4].map((index) =>
      boardingCharacterVariant(`player-${index}`),
    );
    expect(new Set(squad).size).toBe(4);
    expect(boardingCharacterVariant('defender-3')).toBe(
      boardingCharacterVariant('defender-3'),
    );
    for (const id of ['civilian-9', 'odd-id', ''])
      expect(boardingCharacterVariant(id)).toBeLessThan(
        boardingCharacterVariants.length,
      );
  });
  it('draws a variant at the same standing height as the original look', () => {
    const floor = { x: 0, y: 0 };
    const original = boardingCharacterSprite(
      'defender',
      floor,
      'standing',
      7,
      0,
    );
    const variant = boardingCharacterSprite(
      'defender',
      floor,
      'standing',
      7,
      2,
    );
    expect(variant.variant).toBe(2);
    expect(variant.source).toEqual(
      boardingCharacterVariants[2].sources.defender.standing.front,
    );
    // Each sheet keeps its own pixel scale so 1.8 m stays 1.8 m.
    expect(variant.destination.height).toBeCloseTo(
      original.destination.height,
      -1,
    );
  });
});

it('figurvarianter-i-bordning: has one atlas image per variant', async () => {
  const { BOARDING_CHARACTER_IMAGES } =
    await import('../../src/client/views/boarding/BoardingCharacterImages.js');
  expect(BOARDING_CHARACTER_IMAGES).toHaveLength(
    boardingCharacterVariants.length,
  );
});

describe('figurvarianter-i-bordning: scale', () => {
  const sides = ['player', 'defender', 'civilian'] as const;
  it('draws every side of every variant at the same standing height', () => {
    const floor = { x: 0, y: 0 };
    const heights = boardingCharacterVariants.flatMap((_, variant) =>
      sides.map(
        (side) =>
          boardingCharacterSprite(side, floor, 'standing', 7, variant)
            .destination.height,
      ),
    );
    expect(Math.min(...heights) / Math.max(...heights)).toBeGreaterThan(0.9);
  });
});
