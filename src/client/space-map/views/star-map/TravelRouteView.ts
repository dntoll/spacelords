import type p5 from 'p5';
import { HexGeometry } from '../../../common/HexCoordinate.js';
import type { TravelRoute } from '../../models/star-map/Travel.js';

/**
 * hexval-med-vag: the previewed route as a line through the hex centres. The
 * part the fleet's remaining AP cover is bright, the rest is dimmer, and a dot
 * marks where each round ends (ap-pa-starmap).
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
  // somlos-forflyttning: without an active enemy the route is one even line.
  const available = route.contested
    ? Math.max(0, route.available)
    : points.length;
  const roundEnd = (index: number) =>
    index === points.length - 1 ||
    (route.contested &&
      (index === available ||
        (index > available && (index - available) % perRound === 0)));
  sketch.push();
  sketch.noFill();
  sketch.strokeCap(sketch.ROUND);
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1]!;
    const to = points[index]!;
    sketch.stroke(index <= available ? '#f4d27a' : 'rgba(244, 210, 122, 0.45)');
    sketch.strokeWeight(3 / zoom);
    sketch.line(from.x, from.y, to.x, to.y);
  }
  sketch.noStroke();
  for (let index = 1; index < points.length; index++) {
    const point = points[index]!;
    sketch.fill(index <= available ? '#f4d27a' : 'rgba(244, 210, 122, 0.6)');
    sketch.circle(point.x, point.y, (roundEnd(index) ? 9 : 4) / zoom);
  }
  sketch.pop();
}
