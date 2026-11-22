import type p5 from 'p5';
import { HexGeometry } from '../../../common/HexCoordinate.js';
import type { TravelRoute } from '../../models/star-map/Travel.js';

/**
 * hexval-med-vag: the previewed route as a line through the hex centres. The
 * part the fleet covers in the first round is bright, the rest is dimmer, and
 * a dot marks where each round ends.
 */
export function renderTravelRoute(
  sketch: p5,
  route: TravelRoute | null,
  zoom: number,
): void {
  if (!route?.steps.length) return;
  const points = [route.from, ...route.steps].map((hex) =>
    HexGeometry.toPoint(hex),
  );
  const perRound = Math.max(1, route.perRound);
  sketch.push();
  sketch.noFill();
  sketch.strokeCap(sketch.ROUND);
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1]!;
    const to = points[index]!;
    sketch.stroke(index <= perRound ? '#f4d27a' : 'rgba(244, 210, 122, 0.45)');
    sketch.strokeWeight(3 / zoom);
    sketch.line(from.x, from.y, to.x, to.y);
  }
  sketch.noStroke();
  for (let index = 1; index < points.length; index++) {
    const point = points[index]!;
    const roundEnd = index % perRound === 0 || index === points.length - 1;
    sketch.fill(index <= perRound ? '#f4d27a' : 'rgba(244, 210, 122, 0.6)');
    sketch.circle(point.x, point.y, (roundEnd ? 9 : 4) / zoom);
  }
  sketch.pop();
}
