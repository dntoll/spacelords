// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type p5 from 'p5';
import type { FleetSnapshot } from '../../../src/client/space-map/models/Game.js';
import { FLEET_CATEGORY_COLORS } from '../../../src/client/space-map/views/FleetCategoryColors.js';
import { renderMapFleets } from '../../../src/client/space-map/views/star-map/FleetMapView.js';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';

const noShips: FleetSnapshot['ships'] = {
  Fighter: 0,
  'Exploration ship': 0,
  'Colony ship': 0,
  'Transport ship': 0,
  'Civilian shuttle': 0,
  'Space pirate': 0,
  'Salvage ship': 0,
  Raptor: 0,
};

function fleet(
  ships: Partial<FleetSnapshot['ships']>,
  order: Partial<FleetSnapshot> = {},
): FleetSnapshot {
  return {
    id: 'f',
    name: 'F',
    position: new HexCoordinate(0, 0),
    destination: null,
    ships: { ...noShips, ...ships },
    speed: 1,
    crew: 0,
    ...order,
  };
}

describe('flottkategorier', () => {
  it('gives every category its own colour and none of them the pirate red', () => {
    const colours = Object.values(FLEET_CATEGORY_COLORS);
    expect(new Set(colours).size).toBe(colours.length);
    expect(colours).not.toContain('#ff8e85');
    expect(colours).not.toContain('#ffdc88');
  });

  it('draws each fleet ring on the Fleets map in its category colour', () => {
    const stroke = vi.fn();
    const sketch = new Proxy(
      { stroke, drawingContext: { setLineDash() {} } },
      {
        get: (target, key) =>
          key in target ? target[key as keyof typeof target] : () => {},
      },
    ) as unknown as p5;
    renderMapFleets(
      sketch,
      [
        fleet({ 'Transport ship': 1 }, { id: 't' }),
        fleet({ Fighter: 1 }, { id: 'c', position: new HexCoordinate(3, 0) }),
      ],
      1,
      undefined,
      true,
    );
    expect(stroke).toHaveBeenCalledWith(FLEET_CATEGORY_COLORS.Transport);
    expect(stroke).toHaveBeenCalledWith(FLEET_CATEGORY_COLORS.Combat);
  });
});
