import { boardingCharacterSources } from './BoardingCharacterAtlas.js';
import { BOARDING_METERS, boardingHeight } from './BoardingScale.js';
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

// Match model directions to their screen direction after the 2:1 projection.
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

/** bordningsfigurer-fran-spritesheet: plant feet slightly below the tile center. */
export const BOARDING_FOOT_PLANT = 8;

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
): {
  readonly source: Rectangle;
  readonly destination: Rectangle;
  readonly mirrored: boolean;
} {
  const view = views[((facing % 8) + 8) % 8]!;
  const source =
    pose === 'incapacitated'
      ? boardingCharacterSources[side].incapacitated
      : boardingCharacterSources[side][pose][view.angle];
  const height = boardingHeight(
    pose === 'standing'
      ? BOARDING_METERS.person
      : pose === 'crouched'
        ? BOARDING_METERS.crouchedPerson
        : BOARDING_METERS.incapacitatedPerson,
  );
  const width = (height * source.width) / source.height;
  return {
    source,
    mirrored: pose !== 'incapacitated' && view.mirrored,
    destination: {
      x: floorCenter.x - width / 2,
      y:
        pose === 'incapacitated'
          ? floorCenter.y - height / 2 + BOARDING_FOOT_PLANT
          : floorCenter.y - height + BOARDING_FOOT_PLANT,
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
