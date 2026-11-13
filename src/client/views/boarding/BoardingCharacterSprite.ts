import { boardingCharacterVariants } from './BoardingCharacterAtlas.js';
export type BoardingCharacterSide = 'player' | 'defender' | 'civilian';
export type BoardingCharacterPose = 'standing' | 'crouched' | 'incapacitated';

interface Point {
  readonly x: number;
  readonly y: number;
}

interface Rectangle extends Point {
  readonly width: number;
  readonly height: number;
}

type CharacterAngle = 'front' | 'front-right' | 'right' | 'back-right' | 'back';

// Match model directions to their screen direction after the isometric projection.
const views: readonly {
  readonly angle: CharacterAngle;
  readonly mirrored: boolean;
}[] = [
  { angle: 'front-right', mirrored: false },
  { angle: 'back-right', mirrored: false },
  { angle: 'back-right', mirrored: true },
  { angle: 'front-right', mirrored: true },
  { angle: 'right', mirrored: false },
  { angle: 'back', mirrored: false },
  { angle: 'right', mirrored: true },
  { angle: 'front', mirrored: false },
];

/** bordningsfigurer-fran-spritesheet: plant feet on the tile center, shared by every pose. */
export const BOARDING_FOOT_PLANT = 0;
/** The sprite's lowest pixel is the front of the feet, just below the tile centre. */
export const NO_FLIGHT_ADJUSTMENT = 5;

/**
 * figurvarianter-i-bordning: which look a person has. People are numbered per
 * side, so consecutive people get different sheets; other ids are hashed.
 */
export function boardingCharacterVariant(id: string): number {
  const count = boardingCharacterVariants.length;
  const number = /-(\d+)$/.exec(id);
  if (number) return (Number(number[1]) - 1 + count) % count;
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return Math.abs(hash) % count;
}

export interface BoardingCharacterPick {
  readonly id: string;
  readonly side: BoardingCharacterSide;
  readonly floorCenter: Point;
  readonly pose: BoardingCharacterPose;
  readonly facing?: number;
}

export function boardingCharacterSprite(
  side: BoardingCharacterSide,
  floorCenter: Point,
  pose: BoardingCharacterPose,
  facing = 0,
  variant = 0,
): {
  readonly source: Rectangle;
  readonly destination: Rectangle;
  readonly mirrored: boolean;
  readonly variant: number;
} {
  const view = views[((facing % 8) + 8) % 8]!;
  const sheet =
    boardingCharacterVariants[variant] ?? boardingCharacterVariants[0];
  const source =
    pose === 'incapacitated'
      ? sheet.sources[side].incapacitated
      : sheet.sources[side][pose][view.angle];
  // kameravinkel-60-i-bordning: each 60-degree sheet shares one pixel scale.
  const width = source.width * sheet.unitsPerPixel;
  const height = source.height * sheet.unitsPerPixel;
  return {
    source,
    variant: boardingCharacterVariants[variant] ? variant : 0,
    mirrored: pose !== 'incapacitated' && view.mirrored,
    destination: {
      x: floorCenter.x - width / 2,
      y:
        pose === 'incapacitated'
          ? floorCenter.y - height / 2 + BOARDING_FOOT_PLANT
          : floorCenter.y - height + BOARDING_FOOT_PLANT + NO_FLIGHT_ADJUSTMENT,
      width,
      height,
    },
  };
}

/** valbar-bordningssoldat: prefer the front-most sprite under the pointer. */
export function boardingCharacterAtPoint(
  people: readonly BoardingCharacterPick[],
  point: Point,
): BoardingCharacterPick | null {
  const hits = people.filter((person) => {
    const box = boardingCharacterSprite(
      person.side,
      person.floorCenter,
      person.pose,
      person.facing,
      boardingCharacterVariant(person.id),
    ).destination;
    return (
      point.x >= box.x &&
      point.x <= box.x + box.width &&
      point.y >= box.y &&
      point.y <= box.y + box.height
    );
  });
  hits.sort((a, b) => b.floorCenter.y - a.floorCenter.y);
  return hits[0] ?? null;
}
