import type p5 from 'p5';
import type { AppReadModel } from '../models/AppModel.js';
import { HexCoordinate, HexGeometry } from '../models/HexCoordinate.js';

export function renderMapEvent(sketch: p5, model: AppReadModel): void {
  const playback = model.eventPlayback;
  const event = playback?.events[playback.index];
  if (!event?.position || !playback) return;
  const point = HexGeometry.toPoint(
    new HexCoordinate(event.position.q, event.position.r),
  );
  sketch.push();
  sketch.translate(point.x, point.y);
  sketch.scale(1 / model.camera.zoom);
  sketch.noFill();
  sketch.stroke('#ffdc88');
  sketch.strokeWeight(3);
  sketch.circle(0, 0, 70);
  sketch.strokeWeight(1);
  sketch.circle(0, 0, 82);
  sketch.noStroke();
  sketch.fill('#0a1520');
  sketch.rect(-58, 46, 116, 24, 4);
  sketch.fill('#ffdc88');
  sketch.textSize(12);
  sketch.textAlign(sketch.CENTER, sketch.CENTER);
  sketch.text(`Event ${playback.index + 1}`, 0, 58);
  sketch.pop();
}
