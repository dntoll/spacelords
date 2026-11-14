import type {
  BoardingCell,
  BoardingRoom,
} from '../../models/map/BoardingMap.js';
import floorDefault from '../../assets/floor-tile.png';
import wallDefault from '../../assets/wall-tile.png';
import floorBridge from '../../assets/floor-bridge.webp';
import floorEngineering from '../../assets/floor-engineering.webp';
import floorCockpit from '../../assets/floor-cockpit.webp';
import wallBridge from '../../assets/wall-bridge.webp';
import wallEngineering from '../../assets/wall-engineering.webp';
import wallCockpit from '../../assets/wall-cockpit.webp';
import wallTop from '../../assets/wall-top.webp';
import doorFace from '../../assets/door-face.png';
import doorFaceLocked from '../../assets/door-face-locked.png';
import doorTop from '../../assets/door-top.png';
import crateSide from '../../assets/crate-side.png';
import crateTop from '../../assets/crate-top.png';

export type BoardingSurfaceStyle = BoardingRoom | 'default';

export const BOARDING_FLOOR_IMAGES: Readonly<
  Record<BoardingSurfaceStyle, string>
> = {
  default: floorDefault,
  bridge: floorBridge,
  engineering: floorEngineering,
  cockpit: floorCockpit,
};
export const BOARDING_WALL_IMAGES: Readonly<
  Record<BoardingSurfaceStyle, string>
> = {
  default: wallDefault,
  bridge: wallBridge,
  engineering: wallEngineering,
  cockpit: wallCockpit,
};
export const BOARDING_WALL_TOP_IMAGE = wallTop;
/** dorrar-som-tunna-vaggar: the face of a closed door, which slides open. */
export const BOARDING_DOOR_FACE_IMAGES: Readonly<
  Record<'open' | 'locked', string>
> = { open: doorFace, locked: doorFaceLocked };
/** dorrens-ovansida: a door's top is its sliding track, not the wall top. */
export const BOARDING_DOOR_TOP_IMAGE = doorTop;
/** halvskydd-som-geometri: textures for the sides and top of Half cover. */
export const BOARDING_CRATE_IMAGES: Readonly<Record<'side' | 'top', string>> = {
  side: crateSide,
  top: crateTop,
};

/** rumsspecifika-bordningstexturer: a face belongs to the floor adjacent to it. */
export function boardingSurfaceStyle(
  roomAt: (position: BoardingCell) => BoardingRoom | null,
  position: BoardingCell,
): BoardingSurfaceStyle {
  return roomAt(position) ?? 'default';
}

export function boardingWallFaceStyle(
  roomAt: (position: BoardingCell) => BoardingRoom | null,
  position: BoardingCell,
  face: 'southEast' | 'southWest',
): BoardingSurfaceStyle {
  return boardingSurfaceStyle(roomAt, {
    q: position.q + (face === 'southEast' ? 1 : 0),
    r: position.r + (face === 'southWest' ? 1 : 0),
  });
}
