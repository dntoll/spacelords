import { describe, expect, it, vi } from 'vitest';
import type p5 from 'p5';
import type { FleetSnapshot } from '../../src/client/models/Game.js';
import {
  HexCoordinate,
  HexGeometry,
} from '../../src/client/models/HexCoordinate.js';
import { AppModel } from '../../src/client/models/AppModel.js';
import { renderMapOverlays } from '../../src/client/views/MapOverlayView.js';
import { renderMapFleets } from '../../src/client/views/FleetMapView.js';

function fleet(id: string, count = 3): FleetSnapshot {
  return {
    id,
    name: id,
    position: new HexCoordinate(0, 0),
    destination: new HexCoordinate(2, 0),
    ships: {
      Fighter: count,
      'Colony ship': 0,
      'Exploration ship': 0,
      'Transport ship': 0,
    },
    speed: 1,
    crew: 0,
  };
}
function drawing() {
  const sketch = {
    fill: vi.fn(),
    noStroke: vi.fn(),
    noFill: vi.fn(),
    circle: vi.fn(),
    stroke: vi.fn(),
    strokeWeight: vi.fn(),
    line: vi.fn<(x: number, y: number, endX: number, endY: number) => void>(),
    triangle:
      vi.fn<
        (
          a: number,
          b: number,
          c: number,
          d: number,
          e: number,
          f: number,
        ) => void
      >(),
  };
  return {
    sketch,
    render: (
      fleets: readonly FleetSnapshot[],
      zoom = 1,
      interaction?: Parameters<typeof renderMapFleets>[3],
    ) => renderMapFleets(sketch as unknown as p5, fleets, zoom, interaction),
  };
}

describe('kartflottor', () => {
  it.each(new HexCoordinate(0, 0).neighbors())(
    'points every ship tip toward destination $key from its own swarm position',
    (destination) => {
      const target = HexGeometry.toPoint(destination);
      for (const zoom of [0.5, 1, 2]) {
        const { sketch, render } = drawing();
        render([{ ...fleet('moving', 9), destination }], zoom);
        const ships = sketch.triangle.mock.calls.slice(1);
        expect(ships).toHaveLength(9);
        for (const [tipX, tipY, leftX, leftY, rightX, rightY] of ships) {
          const centerX = (tipX + leftX + rightX) / 3;
          const centerY = (tipY + leftY + rightY) / 3;
          const headingX = tipX - centerX;
          const headingY = tipY - centerY;
          const targetX = target.x - centerX;
          const targetY = target.y - centerY;
          expect(headingX * targetY - headingY * targetX).toBeCloseTo(0, 8);
          expect(headingX * targetX + headingY * targetY).toBeGreaterThan(0);
        }
      }
    },
  );

  it('separates colocated fleets and starts each destination arrow at its own marker', () => {
    const { sketch, render } = drawing();
    render([fleet('first'), fleet('second'), fleet('empty', 0)]);
    const lines = sketch.line.mock.calls;
    expect(lines).toHaveLength(2);
    expect(lines[0]!.slice(0, 2)).not.toEqual(lines[1]!.slice(0, 2));
    for (const [x, y, endX, endY] of lines) {
      expect(Math.hypot(x, y)).toBeGreaterThan(10);
      expect([endX, endY]).toEqual(
        Object.values(HexGeometry.toPoint(new HexCoordinate(2, 0))),
      );
      const ships = sketch.triangle.mock.calls.filter(
        (points) => points[0] !== endX || points[1] !== endY,
      );
      expect(
        ships.some(
          ([a, b, c, d, e, f]) =>
            Math.hypot((a + c + e) / 3 - x, (b + d + f) / 3 - y) < 0.001,
        ),
      ).toBe(true);
      // Each arrow has an actual triangular head at the destination.
      expect(
        sketch.triangle.mock.calls.some(
          (points) => points[0] === endX && points[1] === endY,
        ),
      ).toBe(true);
    }
  });

  it('renders ship swarms with different sizes and keeps them readable through zoom', () => {
    const mixed = {
      ...fleet('mixed'),
      destination: null,
      ships: {
        Fighter: 1,
        'Colony ship': 1,
        'Exploration ship': 1,
        'Transport ship': 0,
      },
    };
    const first = drawing();
    first.render([mixed]);
    expect(first.sketch.circle).not.toHaveBeenCalled();
    expect(first.sketch.triangle).toHaveBeenCalledTimes(3);
    const areas = first.sketch.triangle.mock.calls.map(([a, b, c, d, e, f]) =>
      Math.abs((c - a) * (f - b) - (e - a) * (d - b)),
    );
    expect(new Set(areas).size).toBe(3);
    for (const zoom of [0.35, 1, 2.5]) {
      const { sketch, render } = drawing();
      render([mixed], zoom);
      for (const points of sketch.triangle.mock.calls)
        for (let index = 0; index < points.length; index += 2)
          expect(
            HexGeometry.fromPoint({ x: points[index]!, y: points[index + 1]! })
              .key,
          ).toBe(mixed.position!.key);
    }
  });

  it('keeps large fleets compact and omits empty fleets', () => {
    const { sketch, render } = drawing();
    render([
      { ...fleet('large', 1000000), destination: null },
      fleet('empty', 0),
    ]);
    expect(sketch.triangle.mock.calls.length).toBeGreaterThan(1);
    expect(sketch.triangle.mock.calls.length).toBeLessThanOrEqual(9);
    expect(sketch.line).not.toHaveBeenCalled();
  });
});

describe('flottval-pa-kartan / dra-flottdestination', () => {
  it('lights hovered and selected fleets with distinct rings', () => {
    const { sketch, render } = drawing();
    render([fleet('first'), fleet('second')], 1, {
      mapFleetId: 'first',
      hoveredFleetId: 'second',
      fleetDragging: false,
      fleetDestinationPreview: null,
    });
    expect(sketch.circle).toHaveBeenCalledTimes(2);
    expect(sketch.fill).toHaveBeenCalledWith('#ffdc8833');
    expect(sketch.fill).toHaveBeenCalledWith('#72d8ca33');
  });
  it('draws only the dragged fleet arrow to the preview target and restores its order afterward', () => {
    const { sketch, render } = drawing();
    const preview = new HexCoordinate(-2, 1);
    render([fleet('first'), fleet('second')], 1, {
      mapFleetId: 'first',
      hoveredFleetId: null,
      fleetDragging: true,
      fleetDestinationPreview: preview,
    });
    expect(sketch.line.mock.calls[0]!.slice(2)).toEqual(
      Object.values(HexGeometry.toPoint(preview)),
    );
    expect(sketch.line.mock.calls[1]!.slice(2)).toEqual(
      Object.values(HexGeometry.toPoint(new HexCoordinate(2, 0))),
    );
    const normal = drawing();
    normal.render([fleet('first')]);
    expect(normal.sketch.line.mock.calls[0]!.slice(2)).toEqual(
      Object.values(HexGeometry.toPoint(new HexCoordinate(2, 0))),
    );
  });
});

describe('kartflottor', () => {
  it.each(['map', 'fleets'] as const)(
    'kartflottor / flottfokuserad-kartvy: keeps fleet markers prominent and shows planet badges only on Star map (%s)',
    (screen) => {
      const model = new AppModel().snapshot;
      const { sketch } = drawing();
      const platform = {
        ...sketch,
        rect: vi.fn(),
        text: vi.fn(),
        textAlign: vi.fn(),
        textSize: vi.fn(),
        LEFT: 'left',
        CENTER: 'center',
      };
      renderMapOverlays(platform as unknown as p5, { ...model, screen });
      if (screen === 'fleets') {
        expect(platform.rect).not.toHaveBeenCalled();
        expect(sketch.triangle).toHaveBeenCalled();
        return;
      }
      expect(platform.rect).toHaveBeenCalled();
      expect(sketch.triangle).toHaveBeenCalled();
      expect(Math.max(...platform.rect.mock.invocationCallOrder)).toBeLessThan(
        Math.min(...sketch.triangle.mock.invocationCallOrder),
      );
    },
  );
});

describe('flottfokuserad-kartvy', () => {
  it.each([0.35, 1, 2.5])(
    'outlines unselected fleets with screen-sized dashes only in Fleets at zoom %s',
    (zoom) => {
      for (const screen of ['fleets', 'map'] as const) {
        const { sketch } = drawing();
        const context = { setLineDash: vi.fn<(dash: number[]) => void>() };
        let dash: number[] = [];
        context.setLineDash.mockImplementation((value) => {
          dash = value;
        });
        const rings: number[][] = [];
        sketch.circle.mockImplementation(() => {
          rings.push([...dash]);
        });
        sketch.triangle.mockImplementation(() => {
          expect(dash).toEqual([]);
        });
        const platform = {
          ...sketch,
          drawingContext: context,
          noFill: vi.fn(),
        };
        renderMapFleets(
          platform as unknown as p5,
          [
            fleet('selected'),
            fleet('hovered'),
            fleet('idle'),
            fleet('empty', 0),
          ],
          zoom,
          {
            mapFleetId: 'selected',
            hoveredFleetId: 'hovered',
            fleetDragging: false,
            fleetDestinationPreview: null,
          },
          screen === 'fleets',
        );
        expect(rings).toEqual(
          screen === 'fleets'
            ? [[3 / zoom, 3 / zoom], [3 / zoom, 3 / zoom], []]
            : [[], []],
        );
        expect(dash).toEqual([]);
      }
    },
  );
});

it('ruttflottor-pa-kartan: Route highlights idle transports, labels route fleets and preserves selected and hovered colors at every zoom', () => {
  const assigned = {
    ...fleet('assigned'),
    routeId: 'route-test',
    ships: { ...fleet('assigned').ships, 'Transport ship': 1 },
  };
  const available = {
    ...fleet('available'),
    destination: null,
    ships: { ...fleet('available').ships, 'Transport ship': 1 },
  };
  const busy = {
    ...available,
    id: 'busy',
    destination: new HexCoordinate(1, 0),
  };
  for (const zoom of [0.35, 1, 2.5]) {
    const { sketch } = drawing();
    const route = {
      id: 'route-test',
      a: 'a',
      b: 'b',
      from: 'A',
      to: 'B',
      start: new HexCoordinate(0, 0),
      end: new HexCoordinate(2, 0),
      closing: false,
      fleetIds: [assigned.id],
      capacity: 30,
      hasActiveTransport: true,
      waiting: 0,
      status: 'Ready',
    };
    const text = vi.fn<(text: string, x: number, y: number) => void>();
    const canvas = {
      ...sketch,
      rect: vi.fn(),
      text,
      textSize: vi.fn(),
      textAlign: vi.fn(),
      CENTER: 'center',
      TOP: 'top',
    } as unknown as p5;
    renderMapFleets(
      canvas,
      [assigned, available, busy],
      zoom,
      undefined,
      false,
      [route],
    );
    expect(sketch.fill).toHaveBeenCalledWith('#d8a7ff');
    expect(text.mock.calls.map((call) => call[0])).toEqual(
      expect.arrayContaining(['assigned', 'available']),
    );
    expect(text.mock.calls.map((call) => call[0])).not.toContain('busy');
    expect(sketch.line).toHaveBeenCalledTimes(1);
    sketch.fill.mockClear();
    renderMapFleets(
      canvas,
      [available],
      zoom,
      {
        mapFleetId: available.id,
        hoveredFleetId: null,
        fleetDragging: false,
        fleetDestinationPreview: null,
      },
      false,
      [route],
    );
    expect(sketch.fill).toHaveBeenCalledWith('#ffdc88');
    expect(sketch.fill).not.toHaveBeenCalledWith('#d8a7ff');
  }
});
