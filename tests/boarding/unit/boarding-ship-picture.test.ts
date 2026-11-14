import { describe, expect, it } from 'vitest';
import colonyMap from '../../../src/client/boarding/maps/colony-boarding.txt?raw';
import pirateMap from '../../../src/client/boarding/maps/pirate-boarding.txt?raw';
import { parseBoardingMap } from '../../../src/client/boarding/models/map/BoardingMap.js';
import {
  boardingInterior,
  composeBoardingMaps,
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

/** Where a cell centre falls across the picture, 0 at its left edge, 1 at its right. */
function across(
  picture: { x: number; scale: number; mirrored: boolean },
  q: number,
): number {
  const fraction = (q + 0.5 - picture.x) / picture.scale;
  return picture.mirrored ? 1 - fraction : fraction;
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

describe('skeppsbild-under-bordning', () => {
  it('keeps the editor alignment of an aligned map with its ship', () => {
    const map = parseBoardingMap(colonyMap, 'Colony ship');
    expect(map.pictures).toEqual([
      {
        ship: 'Colony ship',
        x: -6.200000339084202,
        y: -4.188889397515191,
        scale: 40.350938235633876,
        mirrored: false,
      },
    ]);
  });

  it('shows no picture for a map that was never aligned or has no ship', () => {
    expect(parseBoardingMap(pirateMap, 'Space pirate').pictures).toEqual([]);
    expect(parseBoardingMap(colonyMap).pictures).toEqual([]);
  });

  it('gives the test boarding and ship interiors their own ship', () => {
    expect(testBoardingMap.pictures.map((picture) => picture.ship)).toEqual([
      'Transport ship',
    ]);
    expect(
      boardingInterior('Colony ship').pictures.map((picture) => picture.ship),
    ).toEqual(['Colony ship']);
  });

  it('moves and mirrors each picture with its ship when two ships are joined', () => {
    const source = boardingInterior('Colony ship');
    const [original] = source.pictures;
    const door = source.features.find((feature) => feature.kind === 'door')!;
    const airlock = door.position;
    const composed = composeBoardingMaps('Colony ship', 'Colony ship');
    const [left, right] = composed.map.pictures;
    expect(left!.mirrored).toBe(false);
    expect(right!.mirrored).toBe(true);
    expect(left!.scale).toBe(original!.scale);
    expect(right!.scale).toBe(original!.scale);
    const placed = (zone: string) =>
      composed.map.features.find(
        (feature) => feature.id === `${zone}-${door.id}`,
      )!.position;
    const attackerAir = placed('attacker');
    const defenderAir = placed('defender');
    // The same door sits at the same place on both pictures.
    expect(across(left!, attackerAir.q)).toBeCloseTo(
      across(original!, airlock.q),
    );
    expect(across(right!, defenderAir.q)).toBeCloseTo(
      across(original!, airlock.q),
    );
    expect(attackerAir.r + 0.5 - left!.y).toBeCloseTo(
      airlock.r + 0.5 - original!.y,
    );
    expect(defenderAir.r + 0.5 - right!.y).toBeCloseTo(
      airlock.r + 0.5 - original!.y,
    );
  });
});
