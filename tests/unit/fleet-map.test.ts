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
import { FleetMapLayout } from '../../src/client/models/FleetMapLayout.js';

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
      'Civilian shuttle': 0,
      'Space pirate': 0,
      'Salvage ship': 0,
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
    textSize: vi.fn(),
    textAlign: vi.fn(),
    text: vi.fn(),
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

it('destinationer-for-aktiva-skepp: hides idle fleet arrows during movement and all arrows during event playback', () => {
  const first = fleet('moving'),
    second = fleet('idle');
  const model = new AppModel().snapshot;
  const move = {
    fleetId: first.id,
    from: first.position!,
    to: first.destination!,
  };
  for (const moving of [true, false]) {
    const { sketch } = drawing();
    renderMapOverlays(sketch as unknown as p5, {
      ...model,
      screen: 'fleets',
      fleets: [first, second],
      pirates: [],
      turnMovement: moving ? move : null,
      turnMovements: moving ? [move] : [],
      eventPlayback: moving
        ? null
        : { round: 1, events: [], index: 0, stage: 'announcing' },
    });
    expect(sketch.line).toHaveBeenCalledTimes(moving ? 1 : 0);
  }
});

describe('destinationspilar-endast-i-flottvyn', () => {
  it.each(['map', 'fleets'] as const)(
    'shows destination arrows only in Fleets, including selection and drag previews (%s)',
    (screen) => {
      const ship = fleet('moving');
      const model = new AppModel().snapshot;
      for (const dragging of [false, true]) {
        const { sketch } = drawing();
        renderMapOverlays(sketch as unknown as p5, {
          ...model,
          screen,
          fleets: [ship],
          pirates: [],
          mapFleetId: ship.id,
          fleetDragging: dragging,
          fleetDestinationPreview: new HexCoordinate(-2, 0),
        });
        expect(sketch.line).toHaveBeenCalledTimes(screen === 'fleets' ? 1 : 0);
        expect(sketch.triangle).toHaveBeenCalledTimes(
          screen === 'fleets' ? 2 : 1,
        );
        expect(ship.destination!.key).toBe('2,0');
      }
    },
  );
});

describe('ruttflottor-utan-destinationspilar', () => {
  it.each(['map', 'fleets', 'route'] as const)(
    'omits route fleet arrows during planning, movement and event playback (%s)',
    (screen) => {
      const ship = { ...fleet('transport'), routeId: 'route-test' };
      const move = {
        fleetId: ship.id,
        from: ship.position!,
        to: ship.destination!,
      };
      for (const stage of ['planning', 'movement', 'events']) {
        const { sketch } = drawing();
        renderMapOverlays({ ...sketch, rect: vi.fn() } as unknown as p5, {
          ...new AppModel().snapshot,
          screen,
          fleets: [ship],
          pirates: [],
          ownedPlanets: [],
          tradeRoutes: [],
          turnMovement: stage === 'movement' ? move : null,
          turnMovements: stage === 'movement' ? [move] : [],
          eventPlayback:
            stage === 'events'
              ? { round: 1, events: [], index: 0, stage: 'announcing' }
              : null,
        });
        expect(sketch.line).not.toHaveBeenCalled();
        expect(sketch.triangle).toHaveBeenCalledTimes(1);
      }
    },
  );
});

describe('kartflottor', () => {
  it('skeppssprites-pa-kartan: uses each type once, shared hit geometry and progressively simpler sprites', () => {
    const mixed = {
      ...fleet('mixed', 100),
      destination: null,
      ships: {
        Fighter: 100,
        'Colony ship': 2,
        'Exploration ship': 3,
        'Transport ship': 4,
        'Civilian shuttle': 0,
        'Space pirate': 0,
        'Salvage ship': 5,
      },
    };
    const marker = FleetMapLayout.markers([mixed])[0]!;
    const images = new Map(
      Object.keys(mixed.ships).map(
        (type) => [type, { width: 100, height: 50 }] as const,
      ),
    ) as unknown as ReadonlyMap<keyof typeof mixed.ships, p5.Image>;
    for (const [zoom, count] of [
      [1, 5],
      [0.4, 1],
      [0.1, 0],
    ] as const) {
      const { sketch } = drawing();
      const image =
        vi.fn<
          (
            sprite: p5.Image,
            x: number,
            y: number,
            width: number,
            height: number,
          ) => void
        >();
      const platform = {
        ...sketch,
        push: vi.fn(),
        pop: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        image,
      };
      renderMapFleets(
        platform as unknown as p5,
        [mixed],
        zoom,
        undefined,
        false,
        null,
        [],
        [],
        new Map(),
        images,
      );
      expect(image).toHaveBeenCalledTimes(count);
      for (const call of image.mock.calls) expect(call[3] / call[4]).toBe(2);
      expect(new Set(image.mock.calls.map((call) => call[0])).size).toBe(count);
      for (const glyph of FleetMapLayout.glyphs(marker, zoom))
        expect(FleetMapLayout.hit([mixed], glyph.point, [], zoom)).toBe(
          'mixed',
        );
      if (zoom === 0.4)
        expect(sketch.text).toHaveBeenCalledWith(
          '114',
          expect.any(Number),
          expect.any(Number),
        );
      if (zoom === 0.1) expect(sketch.circle).toHaveBeenCalled();
    }
  });
  it.each([
    'Fighter',
    'Exploration ship',
    'Colony ship',
    'Transport ship',
    'Salvage ship',
  ] as const)('bargningsskepp: renders %s with visible area', (type) => {
    const { sketch, render } = drawing();
    const ship = fleet('single', 0);
    render([
      { ...ship, destination: null, ships: { ...ship.ships, [type]: 1 } },
    ]);
    const [a, b, c, d, e, f] = sketch.triangle.mock.calls[0]!;
    expect(Math.abs((c - a) * (f - b) - (e - a) * (d - b))).toBeGreaterThan(1);
  });
  it.each(new HexCoordinate(0, 0).neighbors())(
    'points every ship tip toward destination $key from its own swarm position',
    (destination) => {
      const target = HexGeometry.toPoint(destination);
      for (const zoom of [0.5, 1, 2]) {
        const { sketch, render } = drawing();
        render([{ ...fleet('moving', 9), destination }], zoom);
        const ships = sketch.triangle.mock.calls.slice(1);
        expect(ships).toHaveLength(1);
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

  it('skeppssprites-pa-kartan: represents each present type and keeps the group within its hex', () => {
    const mixed = {
      ...fleet('mixed'),
      destination: null,
      ships: {
        Fighter: 1,
        'Colony ship': 1,
        'Exploration ship': 1,
        'Transport ship': 0,
        'Civilian shuttle': 0,
        'Space pirate': 0,
        'Salvage ship': 0,
      },
    };
    const first = drawing();
    first.render([mixed]);
    expect(first.sketch.circle).not.toHaveBeenCalled();
    expect(first.sketch.triangle).toHaveBeenCalledTimes(3);
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
    expect(sketch.triangle.mock.calls.length).toBe(1);
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
    'kartflottor / flottfokuserad-kartvy: kartorderstatus: keeps fleet markers prominent without S/Q planet badges (%s)',
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
      expect(platform.rect).not.toHaveBeenCalled();
      expect(sketch.triangle).toHaveBeenCalled();
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

it('beslutsvagledning-i-vyn: idle fleet decisions have a solid amber ring and Production marks the planet needing an order', () => {
  const { sketch } = drawing();
  const dash = vi.fn();
  renderMapFleets(
    { ...sketch, drawingContext: { setLineDash: dash } } as unknown as p5,
    [{ ...fleet('idle'), destination: null }],
    1,
    undefined,
    true,
    null,
    ['idle'],
  );
  expect(sketch.stroke).toHaveBeenCalledWith('#ffdc88');
  expect(dash).toHaveBeenCalledWith([]);
  const model = new AppModel();
  model.openProduction();
  const text = vi.fn();
  renderMapOverlays(
    {
      ...sketch,
      text,
      textSize: vi.fn(),
      textAlign: vi.fn(),
      CENTER: 'center',
      BOTTOM: 'bottom',
    } as unknown as p5,
    model.snapshot,
  );
  expect(text).toHaveBeenCalledWith(
    '!',
    expect.any(Number),
    expect.any(Number),
  );
});

it('genererade-skeppssprites: pirates use their own sprite at close and medium zoom while Fighters keep theirs', () => {
  const fighter = { width: 100, height: 50 } as p5.Image;
  const pirate = { width: 90, height: 70 } as p5.Image;
  for (const zoom of [1, 0.4]) {
    const { sketch } = drawing();
    const image = vi.fn<(sprite: p5.Image) => void>();
    const platform = {
      ...sketch,
      rect: vi.fn(),
      image,
      push: vi.fn(),
      pop: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
    };
    renderMapFleets(
      platform as unknown as p5,
      [fleet('owned'), fleet('hostile')],
      zoom,
      undefined,
      false,
      null,
      [],
      ['hostile'],
      new Map(),
      new Map([
        ['Fighter', fighter],
        ['Space pirate', pirate],
      ]),
    );
    expect(image.mock.calls.map((call) => call[0])).toEqual(
      expect.arrayContaining([fighter, pirate]),
    );
    expect(image).toHaveBeenCalledTimes(2);
  }
});
