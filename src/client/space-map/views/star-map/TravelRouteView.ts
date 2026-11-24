import type p5 from 'p5';
import { HexGeometry, type Point } from '../../../common/HexCoordinate.js';
import type { TravelRoute } from '../../models/star-map/Travel.js';

/** fardvag-som-orderpil: the route uses the colour and weight of the order arrow. */
const ROUTE_COLOR = '#72d8ca';
const LATER_COLOR = 'rgba(114, 216, 202, 0.45)';

/**
 * hexval-med-vag / fardvag-som-orderpil: the route is the fleet's only arrow.
 * It runs from the fleet's drawn position through the hex centres and ends in
 * an arrowhead. While a pirate is in sight, the part beyond the remaining AP
 * is dimmer and small dots mark where each round ends (ap-pa-starmap).
 */
export function renderTravelRoute(
  sketch: p5,
  route: TravelRoute | null,
  zoom: number,
  start?: Point,
): void {
  if (!route?.steps.length) return;
  const points = [
    start ?? HexGeometry.toPoint(route.from),
    ...route.steps.map((hex) => HexGeometry.toPoint(hex)),
  ];
  const perRound = Math.max(1, route.perRound);
  const available = route.contested
    ? Math.max(0, route.available)
    : points.length;
  sketch.push();
  sketch.strokeWeight(1 / zoom);
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1]!;
    const to = points[index]!;
    sketch.stroke(index <= available ? ROUTE_COLOR : LATER_COLOR);
    sketch.line(from.x, from.y, to.x, to.y);
  }
  sketch.noStroke();
  if (route.contested)
    for (let index = 1; index < points.length - 1; index++) {
      const roundEnd =
        index === available ||
        (index > available && (index - available) % perRound === 0);
      if (!roundEnd) continue;
      sketch.fill(index <= available ? ROUTE_COLOR : LATER_COLOR);
      sketch.circle(points[index]!.x, points[index]!.y, 5 / zoom);
    }
  const tip = points.at(-1)!;
  const before = points.at(-2)!;
  const angle = Math.atan2(tip.y - before.y, tip.x - before.x);
  const length = 8 / zoom;
  const width = 3 / zoom;
  sketch.fill(points.length - 1 <= available ? ROUTE_COLOR : LATER_COLOR);
  sketch.triangle(
    tip.x,
    tip.y,
    tip.x - Math.cos(angle) * length - Math.sin(angle) * width,
    tip.y - Math.sin(angle) * length + Math.cos(angle) * width,
    tip.x - Math.cos(angle) * length + Math.sin(angle) * width,
    tip.y - Math.sin(angle) * length - Math.cos(angle) * width,
  );
  sketch.pop();
}
