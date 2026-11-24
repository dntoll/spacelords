import { describe, expect, it, vi } from 'vitest';
import type p5 from 'p5';
import { renderTravelRoute } from '../../../src/client/space-map/views/star-map/TravelRouteView.js';
import {
  HexCoordinate,
  HexGeometry,
} from '../../../src/client/common/HexCoordinate.js';

function sketch() {
  return {
    push: vi.fn(),
    pop: vi.fn(),
    stroke: vi.fn(),
    strokeWeight: vi.fn(),
    noStroke: vi.fn(),
    fill: vi.fn(),
    line: vi.fn(),
    circle: vi.fn(),
    triangle: vi.fn(),
  };
}

const route = {
  fleetId: 'fleet-home',
  from: new HexCoordinate(0, 0),
  steps: [new HexCoordinate(1, 0), new HexCoordinate(2, 0)],
  perRound: 2,
  available: 2,
  contested: false,
};

describe('fardvag-som-orderpil / fardvag-fran-flottan', () => {
  it('starts at the fleet marker and ends in one arrowhead in the order colour', () => {
    const drawn = sketch();
    const start = { x: 7, y: -5 };
    renderTravelRoute(drawn as unknown as p5, route, 1, start);
    expect(drawn.line.mock.calls[0]!.slice(0, 2)).toEqual([7, -5]);
    const end = HexGeometry.toPoint(new HexCoordinate(2, 0));
    expect(drawn.line.mock.calls.at(-1)!.slice(2)).toEqual([end.x, end.y]);
    expect(drawn.triangle).toHaveBeenCalledTimes(1);
    expect(drawn.stroke).toHaveBeenCalledWith('#72d8ca');
    // somlos-forflyttning: no round markers without a pirate in sight.
    expect(drawn.circle).not.toHaveBeenCalled();
  });
});
