import { describe, expect, it } from 'vitest';
import { parseBoardingMap } from '../../../src/client/boarding/models/map/BoardingMap.js';
import {
  BOARDING_INTERIOR_TYPES,
  boardingInterior,
} from '../../../src/client/boarding/models/map/BoardingComposer.js';
import { testBoardingMap } from '../../../src/client/boarding/models/map/TestBoarding.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  SHIP_BOARDING_IMAGES,
  SHIP_SPRITES,
  type ShipSpriteType,
} from '../../../src/client/space-map/views/index.js';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** Width and height read from a WebP file header. */
function webpSize(url: string): [number, number] {
  const bytes = readFileSync(`${ROOT}${url.replace(/^\/+/, '').split('?')[0]}`);
  const chunk = bytes.toString('ascii', 12, 16);
  if (chunk === 'VP8X')
    return [1 + bytes.readUIntLE(24, 3), 1 + bytes.readUIntLE(27, 3)];
  if (chunk === 'VP8L') {
    const bits = bytes.readUInt32LE(21);
    return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)];
  }
  return [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff];
}

describe('hogupplost-skeppsbild-i-bordning', () => {
  it.each(Object.keys(SHIP_SPRITES) as ShipSpriteType[])(
    '%s lies on a sharper picture that keeps the sprite alignment',
    (ship) => {
      const sprite = webpSize(SHIP_SPRITES[ship]);
      const boarding = webpSize(SHIP_BOARDING_IMAGES[ship]);
      expect(SHIP_BOARDING_IMAGES[ship]).not.toBe(SHIP_SPRITES[ship]);
      expect(boarding[0]).toBeGreaterThan(sprite[0] * 2);
      // spriteX/spriteY/spriteScale were tuned on the sprite; a different
      // aspect ratio would slide the deck off the picture.
      expect(boarding[0] / boarding[1]).toBeCloseTo(sprite[0] / sprite[1], 2);
    },
  );
});

// Fixture maps, so aligning a ship in the editor breaks no test.
const ALIGNED =
  '[meta]\nwidth=2\nheight=1\nrules=campaign\nspriteX=-1.5\nspriteY=-0.25\nspriteScale=4\n' +
  '[terrain]\n..\n[objects]\n--\n[rooms]\n--\n[spawns]\n--\n';
const UNALIGNED = ALIGNED.replace(/sprite.*\n/g, '');

describe('skeppsbild-under-bordning', () => {
  it('keeps the editor alignment of an aligned map with its ship', () => {
    expect(parseBoardingMap(ALIGNED, 'Colony ship').pictures).toEqual([
      { ship: 'Colony ship', x: -1.5, y: -0.25, scale: 4, mirrored: false },
    ]);
  });

  it('shows no picture for a map that was never aligned or has no ship', () => {
    expect(parseBoardingMap(UNALIGNED, 'Space pirate').pictures).toEqual([]);
    expect(parseBoardingMap(ALIGNED).pictures).toEqual([]);
  });

  it('gives the test boarding and ship interiors their own ship when aligned', () => {
    const ships = (pictures: readonly { ship: string }[]) => [
      ...new Set(pictures.map((picture) => picture.ship)),
    ];
    expect(ships(testBoardingMap.pictures)).toEqual(
      testBoardingMap.pictures.length ? ['Transport ship'] : [],
    );
    for (const type of BOARDING_INTERIOR_TYPES) {
      const pictures = boardingInterior(type).pictures;
      expect(ships(pictures)).toEqual(pictures.length ? [type] : []);
    }
  });
});
