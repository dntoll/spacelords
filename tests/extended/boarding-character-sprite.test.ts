import { describe, expect, it } from 'vitest';
import {
  BOARDING_FOOT_PLANT,
  boardingCharacterAtPoint,
  boardingCharacterSprite,
  type BoardingCharacterSide,
} from '../../src/client/views/BoardingCharacterSprite.js';

describe('bordningsfigurer-fran-spritesheet', () => {
  it('isolates one figure per row and plants every figure slightly below the tile center', () => {
    const nextSpriteRow: Record<BoardingCharacterSide, number> = {
      player: 111,
      defender: 495,
      civilian: 845,
    };

    for (const side of ['player', 'defender', 'civilian'] as const) {
      const sprite = boardingCharacterSprite(side, { x: 80, y: 120 }, false);

      expect(sprite.source.y + sprite.source.height).toBeLessThan(
        nextSpriteRow[side],
      );
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
