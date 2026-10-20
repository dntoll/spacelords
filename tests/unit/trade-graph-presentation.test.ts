import { expect, it } from 'vitest';
import { AppModel } from '../../src/client/models/AppModel.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { TradeGraphLayout } from '../../src/client/models/TradeGraph.js';
import { TradeGraphPresentation } from '../../src/client/models/TradeGraphPresentation.js';

it('handelsgraf-lasbarhet / handelsgraf-skeppspositioner: preserves readable dimensions, clear cards and actual fleet anchors across zoom levels', () => {
  const model = new AppModel().snapshot;
  const home = model.ownedPlanets[0]!;
  const planets = [
    home,
    { ...home, id: 'distant', position: new HexCoordinate(7, -2) },
  ];
  const fleets = [
    model.fleets[0]!,
    {
      ...model.fleets[0]!,
      id: 'freighters',
      routeId: 'route',
      position: new HexCoordinate(4, -1),
    },
    { ...model.fleets[0]!, id: 'unpositioned', position: null },
  ];
  const route = {
    id: 'route',
    a: home.id,
    b: 'distant',
    from: home.name,
    to: 'Distant',
    start: home.position,
    end: planets[1]!.position,
    closing: false,
    fleetIds: ['freighters'],
    capacity: 30,
    waiting: 0,
    status: 'Active',
  };
  const layout = new TradeGraphLayout(planets, fleets, [route]);
  for (const zoom of [0.08, 0.3, 1, 2]) {
    const camera = { zoom, offset: { x: 300, y: 200 } };
    const { objects } = new TradeGraphPresentation(layout, fleets, camera, {
      width: 1440,
      height: 900,
    });
    const card = objects.find((o) => o.key === `fleet:${fleets[0]!.id}`)!;
    expect(card.width).toBe(240);
    expect(objects.find((o) => o.key === 'route:route')!.width).toBe(270);
    expect(objects.find((o) => o.key === 'ships:freighters')!.anchor).toEqual(
      TradeGraphLayout.point(fleets[1]!.position!),
    );
    expect(objects.some((o) => o.key === 'fleet:freighters')).toBe(false);
    expect(objects.some((o) => o.key === 'ships:unpositioned')).toBe(false);
    for (const object of objects.filter((o) => o.anchor))
      for (const other of objects.filter((o) => o !== object))
        expect(
          object.x + object.width <= other.x ||
            other.x + other.width <= object.x ||
            object.y + object.height <= other.y ||
            other.y + other.height <= object.y,
        ).toBe(true);
    const planet = objects.find((o) => o.key === `planet:${home.id}`)!;
    expect(planet.x + planet.width / 2).toBeCloseTo(
      TradeGraphLayout.point(home.position).x * zoom + camera.offset.x,
    );
  }
  const moved = fleets.map((fleet) =>
    fleet.id === 'freighters'
      ? { ...fleet, position: new HexCoordinate(5, -1) }
      : fleet,
  );
  const after = new TradeGraphPresentation(
    new TradeGraphLayout(planets, moved, [route]),
    moved,
    { zoom: 0.2, offset: { x: 0, y: 0 } },
  );
  expect(
    after.objects.find((o) => o.key === 'ships:freighters')!.anchor,
  ).toEqual(TradeGraphLayout.point(new HexCoordinate(5, -1)));
});
