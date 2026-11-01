import { describe, expect, it } from 'vitest';
import {
  boardingCharacterSprite,
  type BoardingCharacterSide,
} from '../../src/client/views/BoardingCharacterSprite.js';

describe('bordningsfigurer-fran-spritesheet', () => {
  it('isolates one figure per row and plants every figure at the tile center', () => {
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
      expect(sprite.destination.y + sprite.destination.height).toBe(122);
    }
  });
});
