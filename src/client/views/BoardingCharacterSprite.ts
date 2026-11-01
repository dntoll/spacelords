export type BoardingCharacterSide = 'player' | 'defender' | 'civilian';

interface Point {
  readonly x: number;
  readonly y: number;
}

interface Rectangle extends Point {
  readonly width: number;
  readonly height: number;
}

const sources: Record<BoardingCharacterSide, Rectangle> = {
  player: { x: 83, y: 10, width: 65, height: 97 },
  defender: { x: 82, y: 407, width: 63, height: 87 },
  civilian: { x: 105, y: 760, width: 49, height: 83 },
};

/** bordningsfigurer-fran-spritesheet: plant feet slightly below the tile center. */
export const BOARDING_FOOT_PLANT = 8;

export interface BoardingCharacterPick {
  readonly id: string;
  readonly side: BoardingCharacterSide;
  readonly floorCenter: Point;
  readonly crouched: boolean;
}

export function boardingCharacterSprite(
  side: BoardingCharacterSide,
  floorCenter: Point,
  crouched: boolean,
): { readonly source: Rectangle; readonly destination: Rectangle } {
  const source = sources[side];
  const height = crouched ? 46 : 54;
  const width = (height * source.width) / source.height;
  return {
    source,
    destination: {
      x: floorCenter.x - width / 2,
      y: floorCenter.y - height + BOARDING_FOOT_PLANT,
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
      person.crouched,
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
