import { describe, expect, it } from 'vitest';
import {
  BOARDING_FOOT_PLANT,
  boardingCharacterAtPoint,
  boardingCharacterSprite,
} from '../../src/client/views/BoardingCharacterSprite.js';

describe('bordningsfigurer-fran-spritesheet', () => {
  it('isolates one figure per row and plants every figure slightly below the tile center', () => {
    for (const side of ['player', 'defender', 'civilian'] as const) {
      const sprite = boardingCharacterSprite(side, { x: 80, y: 120 }, false);

      expect(sprite.source.width).toBeGreaterThan(0);
      expect(sprite.source.height).toBe(224);
      expect(sprite.destination.x + sprite.destination.width / 2).toBe(80);
      expect(sprite.destination.y + sprite.destination.height).toBe(
        120 + BOARDING_FOOT_PLANT,
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
      crouched: false,
    };
    const front = {
      id: 'front',
      side: 'defender' as const,
      floorCenter: { x: 80, y: 140 },
      crouched: false,
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
  it('maps eight projected directions to five views with three mirrored counterparts', () => {
    for (const side of ['player', 'defender', 'civilian'] as const) {
      for (const crouched of [false, true]) {
        const sprites = Array.from({ length: 8 }, (_, facing) =>
          boardingCharacterSprite(side, { x: 0, y: 0 }, crouched, facing),
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
            BOARDING_FOOT_PLANT,
          );
      }
      expect(
        boardingCharacterSprite(side, { x: 0, y: 0 }, true).source,
      ).not.toEqual(
        boardingCharacterSprite(side, { x: 0, y: 0 }, false).source,
      );
      expect(
        boardingCharacterSprite(side, { x: 0, y: 0 }, true).destination.height,
      ).toBeLessThan(
        boardingCharacterSprite(side, { x: 0, y: 0 }, false).destination.height,
      );
    }
  });
  it('uses each directional sprite bounds for picking', () => {
    for (let facing = 0; facing < 8; facing++) {
      const person = {
        id: 'soldier',
        side: 'player' as const,
        floorCenter: { x: 80, y: 120 },
        crouched: false,
        facing,
      };
      const { destination: box } = boardingCharacterSprite(
        person.side,
        person.floorCenter,
        false,
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
