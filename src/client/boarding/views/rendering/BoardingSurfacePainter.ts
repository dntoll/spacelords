import type p5 from 'p5';
import {
  boardingThinNeighbor,
  type BoardingCell,
  type BoardingThinAxis,
  type BoardingThinPiece,
} from '../../models/map/BoardingMap.js';
import { BOARDING_METERS, BOARDING_VERTICAL_METER } from './BoardingScale.js';
import {
  boardingFeatureFootprint,
  boardingFeatureHeight,
  boardingIsoBlockFaces,
  boardingIsoCenter,
  boardingIsoCorners,
  boardingIsoTextureTransform,
  boardingQuadTextureTransform,
  boardingThinFloorBands,
  boardingThinWallMesh,
  boardingWallRun,
  boardingWallSlice,
  type BoardingPoint,
  type BoardingThinWallMesh,
} from './BoardingProjection.js';

/** spelidentisk-bordningseditor: shared floor and wall projection for combat and the editor. */

export type IsoImageCache = {
  floor: CanvasImageSource | null;
  wall: CanvasImageSource | null;
};

function imageSource(
  tile: p5.Image,
  cache: IsoImageCache,
  kind: 'floor' | 'wall',
): CanvasImageSource | null {
  const current = kind === 'floor' ? cache.floor : cache.wall;
  if (current) return current;
  const image = tile as p5.Image & {
    canvas?: CanvasImageSource;
    elt?: CanvasImageSource;
  };
  const found = image.canvas ?? image.elt ?? null;
  if (found) {
    if (kind === 'floor') cache.floor = found;
    else cache.wall = found;
    return found;
  }
  tile.loadPixels();
  if (tile.pixels.length < 4) return null;
  const canvas = document.createElement('canvas');
  canvas.width = tile.width;
  canvas.height = tile.height;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.putImageData(
    new ImageData(new Uint8ClampedArray(tile.pixels), tile.width, tile.height),
    0,
    0,
  );
  if (kind === 'floor') cache.floor = canvas;
  else cache.wall = canvas;
  return canvas;
}

export function paintIsoDiamond(
  sketch: p5,
  position: BoardingCell,
  yOffset = 0,
): void {
  sketch.beginShape();
  for (const corner of boardingIsoCorners(position))
    sketch.vertex(corner.x, corner.y - yOffset);
  sketch.endShape(sketch.CLOSE);
}

export function paintIsoFloor(
  sketch: p5,
  tile: p5.Image | null,
  cache: IsoImageCache,
  position: BoardingCell,
): boolean {
  if (!tile || tile.width < 2 || tile.height < 2) return false;
  const source = imageSource(tile, cache, 'floor');
  if (!source) return false;
  const corners = boardingIsoCorners(position);
  const [a, b, c, d, e, f] = boardingIsoTextureTransform(
    tile.width,
    tile.height,
    position,
  );
  const ctx = sketch.drawingContext as CanvasRenderingContext2D;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(corners[0]!.x, corners[0]!.y);
  for (const corner of corners.slice(1)) ctx.lineTo(corner.x, corner.y);
  ctx.closePath();
  ctx.clip();
  ctx.transform(a, b, c, d, e, f);
  ctx.drawImage(source, 0, 0, tile.width, tile.height);
  ctx.restore();
  return true;
}

/**
 * bordning-jamn-bildfrekvens: the texture transform already fills exactly this
 * parallelogram, so clipping to it would only cost time on every frame.
 */
function coversExactly(
  clip: readonly BoardingPoint[],
  origin: BoardingPoint,
  alongU: BoardingPoint,
  alongV: BoardingPoint,
): boolean {
  if (clip.length !== 4) return false;
  const corners = [
    origin,
    alongU,
    alongV,
    {
      x: alongU.x + alongV.x - origin.x,
      y: alongU.y + alongV.y - origin.y,
    },
  ];
  return clip.every((point) =>
    corners.some(
      (corner) =>
        Math.abs(corner.x - point.x) < 1e-6 &&
        Math.abs(corner.y - point.y) < 1e-6,
    ),
  );
}

function paintTexturedQuad(
  sketch: p5,
  source: CanvasImageSource,
  slice: { readonly x: number; readonly width: number },
  textureHeight: number,
  origin: BoardingPoint,
  alongU: BoardingPoint,
  alongV: BoardingPoint,
  clip: readonly BoardingPoint[],
  filter?: string,
  visibleFraction = 1,
): void {
  const first = clip[0];
  if (!first) return;
  const [a, b, c, d, e, f] = boardingQuadTextureTransform(
    slice.width,
    textureHeight,
    origin,
    alongU,
    alongV,
  );
  const ctx = sketch.drawingContext as CanvasRenderingContext2D;
  ctx.save();
  if (!coversExactly(clip, origin, alongU, alongV)) {
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (const corner of clip.slice(1)) ctx.lineTo(corner.x, corner.y);
    ctx.closePath();
    ctx.clip();
  }
  if (filter) ctx.filter = filter;
  ctx.transform(a, b, c, d, e, f);
  ctx.drawImage(
    source,
    slice.x,
    textureHeight * (1 - visibleFraction),
    slice.width,
    textureHeight * visibleFraction,
    0,
    0,
    slice.width,
    textureHeight,
  );
  ctx.restore();
}

export function paintIsoWall(
  sketch: p5,
  tile: p5.Image | null,
  cache: IsoImageCache,
  position: BoardingCell,
  walls: ReadonlySet<string>,
  height = boardingFeatureHeight('wall'),
  options?: {
    readonly east?: { tile: p5.Image; cache: IsoImageCache } | undefined;
    readonly west?: { tile: p5.Image; cache: IsoImageCache } | undefined;
    readonly top?: { tile: p5.Image; cache: IsoImageCache } | undefined;
  },
): boolean {
  if (!tile || tile.width < 8 || tile.height < 2) return false;
  const source = imageSource(tile, cache, 'wall');
  if (!source) return false;
  const footprint = boardingFeatureFootprint('wall');
  const faces = boardingIsoBlockFaces(
    boardingIsoCenter(position),
    footprint.width,
    footprint.depth,
    height,
  );
  const alongQ = boardingWallRun(walls, position, 'q');
  const alongR = boardingWallRun(walls, position, 'r');
  const qSlice = boardingWallSlice(tile.width, alongQ.index);
  const rSlice = boardingWallSlice(tile.width, alongR.index);
  const topSlice = alongQ.length >= alongR.length ? qSlice : rSlice;
  const east = options?.east;
  const west = options?.west;
  const top = options?.top;
  paintTexturedQuad(
    sketch,
    (east && imageSource(east.tile, east.cache, 'wall')) ?? source,
    east ? boardingWallSlice(east.tile.width, alongR.index) : rSlice,
    east?.tile.height ?? tile.height,
    faces.southEast[0],
    faces.southEast[1],
    faces.southEast[3],
    faces.southEast,
    undefined,
    height / boardingFeatureHeight('wall'),
  );
  paintTexturedQuad(
    sketch,
    (west && imageSource(west.tile, west.cache, 'wall')) ?? source,
    west ? boardingWallSlice(west.tile.width, alongQ.index) : qSlice,
    west?.tile.height ?? tile.height,
    faces.southWest[1],
    faces.southWest[0],
    faces.southWest[2],
    faces.southWest,
    undefined,
    height / boardingFeatureHeight('wall'),
  );
  paintTexturedQuad(
    sketch,
    (top && imageSource(top.tile, top.cache, 'wall')) ?? source,
    top ? { x: 0, width: top.tile.width } : topSlice,
    top?.tile.height ?? tile.height,
    faces.top[0],
    alongQ.length >= alongR.length ? faces.top[1] : faces.top[3],
    alongQ.length >= alongR.length ? faces.top[3] : faces.top[1],
    faces.top,
  );
  return true;
}

export function paintIsoPolygon(
  sketch: p5,
  polygon: readonly BoardingPoint[],
  color: string,
): void {
  const first = polygon[0];
  if (!first) return;
  sketch.noStroke();
  sketch.fill(color);
  sketch.beginShape();
  for (const point of polygon) sketch.vertex(point.x, point.y);
  sketch.endShape(sketch.CLOSE);
}

/** tunna-innervaggar: one third of a floor texture, clipped to that band. */
export function paintIsoFloorBand(
  sketch: p5,
  tile: p5.Image | null,
  cache: IsoImageCache,
  band: {
    readonly polygon: readonly BoardingPoint[];
    readonly origin: BoardingPoint;
    readonly alongU: BoardingPoint;
    readonly alongV: BoardingPoint;
    readonly u: number;
    readonly v: number;
    readonly uSpan: number;
    readonly vSpan: number;
  },
): boolean {
  if (!tile || tile.width < 2 || tile.height < 2) return false;
  const source = imageSource(tile, cache, 'floor');
  const first = band.polygon[0];
  if (!source || !first || band.uSpan <= 0 || band.vSpan <= 0) return false;
  const region = {
    x: band.u * tile.width,
    y: band.v * tile.height,
    width: band.uSpan * tile.width,
    height: band.vSpan * tile.height,
  };
  const [a, b, c, d, e, f] = boardingQuadTextureTransform(
    region.width,
    region.height,
    band.origin,
    band.alongU,
    band.alongV,
  );
  const ctx = sketch.drawingContext as CanvasRenderingContext2D;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (const corner of band.polygon.slice(1)) ctx.lineTo(corner.x, corner.y);
  ctx.closePath();
  ctx.clip();
  ctx.transform(a, b, c, d, e, f);
  ctx.drawImage(
    source,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    region.width,
    region.height,
  );
  ctx.restore();
  return true;
}

/** tunna-innervaggar: inside floor is this cell; outside floor is the faced neighbor. */
export function paintThinWallFloors(
  sketch: p5,
  position: BoardingCell,
  axis: BoardingThinAxis,
  options: {
    readonly cache: (image: p5.Image) => IsoImageCache;
    readonly floorAt: (cell: BoardingCell) => p5.Image | null;
    readonly showsOutside: boolean;
    readonly outsideKnown: boolean;
  },
): {
  readonly inside: readonly BoardingPoint[];
  readonly outside: readonly BoardingPoint[] | null;
} {
  const bands = boardingThinFloorBands(position, axis);
  const own = options.floorAt(position);
  if (!own || !paintIsoFloorBand(sketch, own, options.cache(own), bands.inside))
    paintIsoPolygon(sketch, bands.inside.polygon, '#24334a');
  if (!options.showsOutside)
    return { inside: bands.inside.polygon, outside: null };
  if (!options.outsideKnown) {
    paintIsoPolygon(sketch, bands.outside.polygon, '#080c15');
    return { inside: bands.inside.polygon, outside: bands.outside.polygon };
  }
  const neighbor = boardingThinNeighbor(position, axis);
  const tile = options.floorAt(neighbor);
  if (
    !tile ||
    !paintIsoFloorBand(sketch, tile, options.cache(tile), bands.outside)
  )
    paintIsoPolygon(sketch, bands.outside.polygon, '#24334a');
  return { inside: bands.inside.polygon, outside: bands.outside.polygon };
}

function paintCutawayTop(
  sketch: p5,
  top: readonly BoardingPoint[],
  axis: BoardingThinAxis,
): void {
  const first = top[0];
  const opposite = top[2];
  if (!first || !opposite) return;
  const center = {
    x: (first.x + opposite.x) / 2,
    y: (first.y + opposite.y) / 2,
  };
  const quad = (points: readonly BoardingPoint[]) => {
    sketch.beginShape();
    for (const point of points) sketch.vertex(point.x, point.y);
    sketch.endShape(sketch.CLOSE);
  };
  sketch.noStroke();
  sketch.fill('#b1becb');
  quad(top);
  const inner = top.map((point) => ({
    x: center.x + (point.x - center.x) * 0.76,
    y: center.y + (point.y - center.y) * 0.76,
  }));
  sketch.fill('#303c48');
  quad(inner);
  const along = inner[axis === 'q' ? 3 : 1];
  const across = inner[axis === 'q' ? 1 : 3];
  const start = inner[0];
  if (!along || !across || !start) return;
  sketch.stroke('#7c8b9b');
  sketch.strokeWeight(1.5);
  for (const fraction of [0.25, 0.75]) {
    const x = start.x + (along.x - start.x) * fraction;
    const y = start.y + (along.y - start.y) * fraction;
    sketch.line(x, y, x + across.x - start.x, y + across.y - start.y);
  }
  sketch.noStroke();
}

/** tunna-innervaggar / halvhog-tunn-vagg: slab using the existing wall textures. */
export function paintIsoThinWall(
  sketch: p5,
  tile: p5.Image | null,
  cache: IsoImageCache,
  position: BoardingCell,
  axis: BoardingThinAxis,
  peers: ReadonlySet<string>,
  height: number,
  options?: {
    readonly face?: { tile: p5.Image; cache: IsoImageCache } | undefined;
    /**
     * dorrar-som-tunna-vaggar: the part (0–1) of the face image stretched over
     * the slab, instead of the wall run's slice.
     */
    readonly faceTexture?: readonly [number, number];
    /** animerade-dorrar: the part of the slab's length to draw. */
    readonly span?: readonly [number, number];
    readonly top?: { tile: p5.Image; cache: IsoImageCache } | undefined;
    readonly section?: boolean;
  },
): BoardingThinWallMesh {
  const mesh = boardingThinWallMesh(
    position,
    axis,
    height / BOARDING_VERTICAL_METER,
    options?.span,
  );
  const source = tile ? imageSource(tile, cache, 'wall') : null;
  const run = boardingWallRun(peers, position, mesh.lengthAxis);
  const slice = tile
    ? boardingWallSlice(tile.width, run.index)
    : { x: 0, width: 1 };
  const fraction = height / boardingFeatureHeight('wall');
  const face = options?.face;
  const faceSource =
    (face && imageSource(face.tile, face.cache, 'wall')) ?? source;
  const top = options?.top;
  const topSource = top && imageSource(top.tile, top.cache, 'wall');
  if (faceSource && tile) {
    paintTexturedQuad(
      sketch,
      faceSource,
      face
        ? options?.faceTexture
          ? {
              x: options.faceTexture[0] * face.tile.width,
              width:
                (options.faceTexture[1] - options.faceTexture[0]) *
                face.tile.width,
            }
          : boardingWallSlice(face.tile.width, run.index)
        : slice,
      face?.tile.height ?? tile.height,
      mesh.longFace[0]!,
      mesh.longFace[1]!,
      mesh.longFace[3]!,
      mesh.longFace,
      undefined,
      fraction,
    );
  } else paintIsoPolygon(sketch, mesh.longFace, '#263247');
  if (source && tile) {
    paintTexturedQuad(
      sketch,
      source,
      boardingWallSlice(tile.width, 0),
      tile.height,
      mesh.endFace[0]!,
      mesh.endFace[1]!,
      mesh.endFace[3]!,
      mesh.endFace,
      undefined,
      fraction,
    );
  } else paintIsoPolygon(sketch, mesh.endFace, '#1a2436');
  if (topSource && top) {
    paintTexturedQuad(
      sketch,
      topSource,
      { x: 0, width: top.tile.width },
      top.tile.height,
      mesh.topOrigin,
      mesh.topAlongLength,
      mesh.topAlongThickness,
      mesh.top,
    );
  } else if (source && tile) {
    paintTexturedQuad(
      sketch,
      source,
      slice,
      tile.height,
      mesh.topOrigin,
      mesh.topAlongLength,
      mesh.topAlongThickness,
      mesh.top,
    );
  } else paintIsoPolygon(sketch, mesh.top, '#52657f');
  if (options?.section) paintCutawayTop(sketch, mesh.top, axis);
  return mesh;
}

/** tunna-fonster: a pane is drawn almost flat, 2 cm thick. */
const GLASS_THICKNESS = 0.02;

/**
 * fonster-pa-halvhog-vagg / helhogt-fonster: a see-through, faintly blue pane
 * between `from` and `to` meters, with light edges.
 */
export function paintIsoGlass(
  sketch: p5,
  position: BoardingCell,
  piece: BoardingThinPiece,
  from: number,
  to: number,
): BoardingThinWallMesh {
  // tunna-fonster: joints meet at the thin pane, not at the wall's thickness.
  const wallHalf = BOARDING_METERS.thinWall / 2;
  const narrow = (end: number) =>
    Math.abs(Math.abs(end) - wallHalf) < 1e-6
      ? Math.sign(end) * (GLASS_THICKNESS / 2)
      : end;
  const span = [narrow(piece.span[0]), narrow(piece.span[1])] as const;
  const mesh = boardingThinWallMesh(
    position,
    piece.axis,
    to,
    span,
    from,
    GLASS_THICKNESS,
  );
  const polygon = (points: readonly BoardingPoint[]) => {
    sketch.beginShape();
    for (const point of points) sketch.vertex(point.x, point.y);
    sketch.endShape(sketch.CLOSE);
  };
  sketch.push();
  // Clearly blue yet see-through, with a bright frame so a flat pane reads.
  sketch.strokeWeight(1.4);
  sketch.stroke(206, 232, 255, 220);
  sketch.fill(120, 182, 245, 92);
  polygon(mesh.longFace);
  sketch.fill(104, 166, 235, 110);
  polygon(mesh.endFace);
  sketch.fill(206, 232, 255, 200);
  polygon(mesh.top);
  sketch.pop();
  return mesh;
}

export function paintIsoBlock(
  sketch: p5,
  center: BoardingPoint,
  kind: 'door' | 'cover' | 'wall' | 'hull',
  heightOverride?: number,
): BoardingPoint {
  const footprint = boardingFeatureFootprint(kind);
  const height = heightOverride ?? boardingFeatureHeight(kind);
  const faces = boardingIsoBlockFaces(
    center,
    footprint.width,
    footprint.depth,
    height,
  );
  sketch.noStroke();
  sketch.fill('#263247');
  sketch.quad(
    faces.southEast[0].x,
    faces.southEast[0].y,
    faces.southEast[1].x,
    faces.southEast[1].y,
    faces.southEast[2].x,
    faces.southEast[2].y,
    faces.southEast[3].x,
    faces.southEast[3].y,
  );
  sketch.fill('#1a2436');
  sketch.quad(
    faces.southWest[0].x,
    faces.southWest[0].y,
    faces.southWest[1].x,
    faces.southWest[1].y,
    faces.southWest[2].x,
    faces.southWest[2].y,
    faces.southWest[3].x,
    faces.southWest[3].y,
  );
  sketch.fill(
    kind === 'cover' ? '#9c7448' : kind === 'door' ? '#6e829f' : '#52657f',
  );
  sketch.quad(
    faces.top[0].x,
    faces.top[0].y,
    faces.top[1].x,
    faces.top[1].y,
    faces.top[2].x,
    faces.top[2].y,
    faces.top[3].x,
    faces.top[3].y,
  );
  return faces.apex;
}

/**
 * halvskydd-som-geometri: Half cover is a box with textured sides and top in
 * the floor's own projection, instead of a sprite drawn for another camera.
 * Returns the faces so the caller can light them, or null without textures.
 */
export function paintIsoCrate(
  sketch: p5,
  center: BoardingPoint,
  side: { tile: p5.Image; cache: IsoImageCache } | undefined,
  top: { tile: p5.Image; cache: IsoImageCache } | undefined,
): ReturnType<typeof boardingIsoBlockFaces> | null {
  const sideSource = side && imageSource(side.tile, side.cache, 'wall');
  const topSource = top && imageSource(top.tile, top.cache, 'wall');
  if (!side || !top || !sideSource || !topSource) return null;
  const footprint = boardingFeatureFootprint('cover');
  const faces = boardingIsoBlockFaces(
    center,
    footprint.width,
    footprint.depth,
    boardingFeatureHeight('cover'),
  );
  const whole = (tile: p5.Image) => ({ x: 0, width: tile.width });
  paintTexturedQuad(
    sketch,
    sideSource,
    whole(side.tile),
    side.tile.height,
    faces.southEast[0],
    faces.southEast[1],
    faces.southEast[3],
    faces.southEast,
  );
  paintTexturedQuad(
    sketch,
    sideSource,
    whole(side.tile),
    side.tile.height,
    faces.southWest[1],
    faces.southWest[0],
    faces.southWest[2],
    faces.southWest,
  );
  paintTexturedQuad(
    sketch,
    topSource,
    whole(top.tile),
    top.tile.height,
    faces.top[0],
    faces.top[1],
    faces.top[3],
    faces.top,
  );
  return faces;
}
