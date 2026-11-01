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
      y: floorCenter.y - height + 2,
      width,
      height,
    },
  };
}
