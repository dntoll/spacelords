import { describe, expect, it } from 'vitest';
import { boardingCharacterVariants } from '../../src/client/views/boarding/BoardingCharacterAtlas.js';
import {
  BOARDING_FOOT_PLANT,
  NO_FLIGHT_ADJUSTMENT,
  boardingCharacterAtPoint,
  boardingCharacterSprite,
} from '../../src/client/views/boarding/BoardingCharacterSprite.js';

describe('bordningsfigurer-fran-spritesheet', () => {
  it('isolates one figure per row and plants every figure on the tile center', () => {
    for (const side of ['player', 'defender', 'civilian'] as const) {
      const sprite = boardingCharacterSprite(
        side,
        { x: 80, y: 120 },
        'standing',
      );

      expect(sprite.source.width).toBeGreaterThan(0);
      // kameravinkel-60-i-bordning: one pixel scale per side of a sheet.
      expect(sprite.destination.height).toBeCloseTo(
        sprite.source.height * boardingCharacterVariants[0].unitsPerPixel[side],
      );
      expect(sprite.destination.width).toBeCloseTo(
        sprite.source.width * boardingCharacterVariants[0].unitsPerPixel[side],
      );
      expect(sprite.destination.x + sprite.destination.width / 2).toBe(80);
      expect(sprite.destination.y + sprite.destination.height).toBe(
        120 + BOARDING_FOOT_PLANT + NO_FLIGHT_ADJUSTMENT,
      );
    }
  });
});

describe('valbar-bordningssoldat', () => {
  it('selects the front-most soldier whose sprite contains the point', () => {
    const back = {
      id: 'back',
      side: 'player' as const,
      floorCenter: { x: 80, y: 100 },
      pose: 'standing' as const,
    };
    const front = {
      id: 'front',
      side: 'defender' as const,
      floorCenter: { x: 80, y: 125 },
      pose: 'standing' as const,
    };
    const overlap = {
      x: 80,
      y: 100,
    };

    expect(boardingCharacterAtPoint([back], overlap)?.id).toBe('back');
    expect(boardingCharacterAtPoint([back, front], overlap)?.id).toBe('front');
    expect(
      boardingCharacterAtPoint([back], {
        x: overlap.x,
        y: back.floorCenter.y + 40,
      }),
    ).toBeNull();
  });
});

describe('bordningsfigurer-fran-spritesheet', () => {
  it('bordningsfigurer-fran-spritesheet / utslagna-bordningsfigurer: maps active directions and keeps one prone pose per side', () => {
    for (const side of ['player', 'defender', 'civilian'] as const) {
      for (const pose of ['standing', 'crouched'] as const) {
        const sprites = Array.from({ length: 8 }, (_, facing) =>
          boardingCharacterSprite(side, { x: 0, y: 0 }, pose, facing),
        );
        expect(
          new Set(sprites.map((sprite) => JSON.stringify(sprite.source))).size,
        ).toBe(5);
        expect(sprites.map((sprite) => sprite.mirrored)).toEqual([
          false,
          false,
          true,
          true,
          false,
          false,
          true,
          false,
        ]);
        expect(sprites[0]!.source).toEqual(sprites[3]!.source);
        expect(sprites[1]!.source).toEqual(sprites[2]!.source);
        expect(sprites[4]!.source).toEqual(sprites[6]!.source);
        for (const sprite of sprites)
          expect(sprite.destination.y + sprite.destination.height).toBe(
            BOARDING_FOOT_PLANT + NO_FLIGHT_ADJUSTMENT,
          );
      }
      expect(
        boardingCharacterSprite(side, { x: 0, y: 0 }, 'crouched').source,
      ).not.toEqual(
        boardingCharacterSprite(side, { x: 0, y: 0 }, 'standing').source,
      );
      expect(
        boardingCharacterSprite(side, { x: 0, y: 0 }, 'crouched').destination
          .height,
      ).toBeLessThan(
        boardingCharacterSprite(side, { x: 0, y: 0 }, 'standing').destination
          .height,
      );
      const incapacitated = Array.from({ length: 8 }, (_, facing) =>
        boardingCharacterSprite(side, { x: 0, y: 0 }, 'incapacitated', facing),
      );
      expect(
        new Set(incapacitated.map((sprite) => JSON.stringify(sprite.source))),
      ).toHaveLength(1);
      expect(incapacitated.every((sprite) => !sprite.mirrored)).toBe(true);
      expect(incapacitated[0]!.destination.width).toBeGreaterThan(
        incapacitated[0]!.destination.height,
      );
    }
  });
  it('uses each directional sprite bounds for picking', () => {
    for (let facing = 0; facing < 8; facing++) {
      const person = {
        id: 'soldier',
        side: 'player' as const,
        floorCenter: { x: 80, y: 120 },
        pose: 'standing' as const,
        facing,
      };
      const { destination: box } = boardingCharacterSprite(
        person.side,
        person.floorCenter,
        'standing',
        facing,
      );
      expect(
        boardingCharacterAtPoint([person], {
          x: box.x + box.width / 2,
          y: box.y + box.height / 2,
        })?.id,
      ).toBe(person.id);
      expect(
        boardingCharacterAtPoint([person], { x: box.x - 1, y: box.y + 1 }),
      ).toBeNull();
    }
  });
});
