import type p5 from 'p5';
import type { BoardingCell } from '../../models/BoardingMap.js';
import {
  boardingFeatureFootprint,
  boardingFeatureHeight,
  boardingIsoBlockFaces,
  boardingIsoCenter,
  boardingIsoCorners,
  boardingIsoTextureTransform,
  boardingQuadTextureTransform,
  boardingWallRun,
  boardingWallSlice,
  type BoardingPoint,
} from '../BoardingProjection.js';

/** isometrisk-bordningskarteditor: combat projection, floor and wall textures, raised barriers. */

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
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (const corner of clip.slice(1)) ctx.lineTo(corner.x, corner.y);
  ctx.closePath();
  ctx.clip();
  if (filter) ctx.filter = filter;
  ctx.transform(a, b, c, d, e, f);
  ctx.drawImage(
    source,
    slice.x,
    0,
    slice.width,
    textureHeight,
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
): boolean {
  if (!tile || tile.width < 8 || tile.height < 2) return false;
  const source = imageSource(tile, cache, 'wall');
  if (!source) return false;
  const footprint = boardingFeatureFootprint('wall');
  const faces = boardingIsoBlockFaces(
    boardingIsoCenter(position),
    footprint.width,
    footprint.depth,
    boardingFeatureHeight('wall'),
  );
  const alongQ = boardingWallRun(walls, position, 'q');
  const alongR = boardingWallRun(walls, position, 'r');
  const qSlice = boardingWallSlice(tile.width, alongQ.index);
  const rSlice = boardingWallSlice(tile.width, alongR.index);
  const topSlice = alongQ.length >= alongR.length ? qSlice : rSlice;
  paintTexturedQuad(
    sketch,
    source,
    rSlice,
    tile.height,
    faces.southEast[0],
    faces.southEast[1],
    faces.southEast[3],
    faces.southEast,
    'brightness(1.08)',
  );
  paintTexturedQuad(
    sketch,
    source,
    qSlice,
    tile.height,
    faces.southWest[1],
    faces.southWest[0],
    faces.southWest[2],
    faces.southWest,
    'brightness(0.72)',
  );
  paintTexturedQuad(
    sketch,
    source,
    topSlice,
    tile.height,
    faces.top[0],
    alongQ.length >= alongR.length ? faces.top[1] : faces.top[3],
    alongQ.length >= alongR.length ? faces.top[3] : faces.top[1],
    faces.top,
    'brightness(1.18) saturate(0.85)',
  );
  return true;
}

export function paintIsoBlock(
  sketch: p5,
  center: BoardingPoint,
  kind: 'door' | 'cover' | 'wall' | 'hull',
): BoardingPoint {
  const footprint = boardingFeatureFootprint(kind);
  const height = boardingFeatureHeight(kind);
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
