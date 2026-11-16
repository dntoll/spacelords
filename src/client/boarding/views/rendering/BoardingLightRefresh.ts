import type { BoardingLight } from '../../models/map/BoardingMap.js';
import type { BoardingBattleState } from '../../models/battle/BoardingBattle.js';
import type {
  BoardingLightFigure,
  BoardingLightOccluder,
} from './BoardingLightMap.js';

/**
 * jamn-ljuskarta-under-forflyttning: texels per cell side for figure shadows
 * while someone walks; the full light map follows when the walk ends.
 */
export const BOARDING_DRAFT_LIGHT_TEXELS = 8;

/** An area of the deck in cell coordinates; cell centres are whole numbers. */
export interface BoardingLightRegion {
  readonly minQ: number;
  readonly maxQ: number;
  readonly minR: number;
  readonly maxR: number;
}

/** The square a lamp's light image covers. */
export function boardingLampReach(
  light: Pick<BoardingLight, 'position' | 'radius'>,
): BoardingLightRegion {
  return {
    minQ: light.position.q - light.radius,
    maxQ: light.position.q + light.radius,
    minR: light.position.r - light.radius,
    maxR: light.position.r + light.radius,
  };
}

export function boardingRegionsOverlap(
  left: BoardingLightRegion,
  right: BoardingLightRegion,
): boolean {
  return (
    left.minQ <= right.maxQ &&
    right.minQ <= left.maxQ &&
    left.minR <= right.maxR &&
    right.minR <= left.maxR
  );
}

function union(
  left: BoardingLightRegion | null,
  right: BoardingLightRegion,
): BoardingLightRegion {
  return left
    ? {
        minQ: Math.min(left.minQ, right.minQ),
        maxQ: Math.max(left.maxQ, right.maxQ),
        minR: Math.min(left.minR, right.minR),
        maxR: Math.max(left.maxR, right.maxR),
      }
    : right;
}

type MovingPerson = BoardingLightFigure &
  Pick<BoardingBattleState['people'][number], 'id'>;

/**
 * skuggor-mellan-rutor: where each figure stands `progress` of the way from
 * one frame to the next, as the sprites are drawn.
 */
export function boardingMovingLightFigures(
  from: { readonly people: readonly MovingPerson[] },
  to: { readonly people: readonly MovingPerson[] },
  progress: number,
): readonly BoardingLightFigure[] {
  if (progress >= 1) return to.people;
  return to.people.map((person) => {
    const before = from.people.find((entry) => entry.id === person.id);
    if (!before) return person;
    const { q, r } = before.position;
    return {
      ...person,
      position: {
        q: q + (person.position.q - q) * progress,
        r: r + (person.position.r - r) * progress,
      },
    };
  });
}

/** One lamp whose figure shadows must be painted again. */
export interface BoardingLampRefresh {
  readonly index: number;
  /** Figure shadows on the grid the lamp is painted at. */
  readonly occluders: readonly BoardingLightOccluder[];
  /** Texels per cell side the shadows are painted at. */
  readonly texels: number;
}

export interface BoardingLightRefreshPlan {
  readonly lamps: readonly BoardingLampRefresh[];
  /** The deck whose light changes, or null when nothing does. */
  readonly region: BoardingLightRegion | null;
}

const snap = (value: number, texels: number): number =>
  Math.round(value * texels) / texels;

function snapped(
  occluder: BoardingLightOccluder,
  texels: number,
): BoardingLightOccluder {
  const q = snap((occluder.minQ + occluder.maxQ) / 2, texels),
    r = snap((occluder.minR + occluder.maxR) / 2, texels);
  const halfQ = (occluder.maxQ - occluder.minQ) / 2,
    halfR = (occluder.maxR - occluder.minR) / 2;
  return {
    ...occluder,
    minQ: q - halfQ,
    maxQ: q + halfQ,
    minR: r - halfR,
    maxR: r + halfR,
  };
}

/**
 * jamn-ljuskarta-under-forflyttning: each lamp keeps the figure shadows it
 * was last painted with, so only lamps that reach a figure that moved at
 * least one texel are painted again, and only their part of the deck.
 */
export class BoardingLightRefresh {
  readonly #lights: readonly Pick<BoardingLight, 'position' | 'radius'>[];
  readonly #texels: number;
  readonly #painted: (string | null)[];

  constructor(
    lights: readonly Pick<BoardingLight, 'position' | 'radius'>[],
    texels: number,
  ) {
    this.#lights = lights;
    this.#texels = texels;
    this.#painted = lights.map(() => null);
  }

  /** `figures` are the figure occluders, from `boardingFigureOccluders`. */
  plan(
    figures: readonly BoardingLightOccluder[],
    draft: boolean,
  ): BoardingLightRefreshPlan {
    const lamps: BoardingLampRefresh[] = [];
    let region: BoardingLightRegion | null = null;
    this.#lights.forEach((light, index) => {
      const reach = boardingLampReach(light);
      const near = figures.filter((occluder) =>
        boardingRegionsOverlap(reach, occluder),
      );
      // A lamp without figures is the same at every resolution.
      const texels =
        draft && near.length > 0 ? BOARDING_DRAFT_LIGHT_TEXELS : this.#texels;
      const occluders = near.map((occluder) => snapped(occluder, texels));
      const id = JSON.stringify([texels, occluders]);
      if (this.#painted[index] === id) return;
      this.#painted[index] = id;
      lamps.push({ index, occluders, texels });
      region = union(region, reach);
    });
    return { lamps, region };
  }
}
