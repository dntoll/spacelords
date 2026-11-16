import actionAtlasUrl from '../../assets/actions-distinct-v4.png';

export type BoardingActionArtwork =
  | 'Turn left 45°'
  | 'Turn right 45°'
  | 'Move'
  | 'Crouch'
  | 'Shoot'
  | 'Melee'
  | 'Frag grenade'
  | 'Smoke grenade'
  | 'Open door'
  | 'Close door'
  | 'Overwatch'
  | 'Use Med-pack'
  | 'End soldier turn';

const ACTION_CELLS: Readonly<
  Record<BoardingActionArtwork, readonly [number, number]>
> = {
  'Turn left 45°': [0, 0],
  'Turn right 45°': [1, 0],
  Move: [2, 0],
  Crouch: [3, 0],
  Shoot: [0, 1],
  Melee: [1, 1],
  'Frag grenade': [2, 1],
  'Smoke grenade': [3, 1],
  'Open door': [0, 2],
  'Close door': [0, 2],
  Overwatch: [1, 2],
  'Use Med-pack': [2, 2],
  'End soldier turn': [3, 2],
};

export const BOARDING_ACTION_ATLAS_URL = actionAtlasUrl;

export function boardingActionArtwork(
  label: string,
): BoardingActionArtwork | null {
  const name = label.split(' · ')[0] as BoardingActionArtwork;
  return name in ACTION_CELLS ? name : null;
}

export function boardingActionBackgroundPosition(
  action: BoardingActionArtwork,
): string {
  const [column, row] = ACTION_CELLS[action];
  return `${(column / 3) * 100}% ${(row / 2) * 100}%`;
}

export function boardingActionSource(
  action: BoardingActionArtwork,
  width: number,
  height: number,
): Readonly<{ x: number; y: number; width: number; height: number }> {
  const [column, row] = ACTION_CELLS[action];
  return {
    x: (width * column) / 4,
    y: (height * row) / 3,
    width: width / 4,
    height: height / 3,
  };
}
