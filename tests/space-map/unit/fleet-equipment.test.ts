import { describe, expect, it } from 'vitest';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';

describe('fleet-motorer-och-last', () => {
  it('starts with both ships and swaps engines without losing them across saves', () => {
    const game = new Game(createExampleGalaxy());
    const ships = game.fleetSnapshot().shipUnits!;
    const raptor = ships.find((ship) => ship.type === 'Raptor')!;
    const transport = ships.find((ship) => ship.type === 'Transport ship')!;
    expect(raptor.cargoSlots).toHaveLength(2);
    expect(transport.cargoSlots).toHaveLength(10);
    expect(transport.cargoSlots!.slice(0, 2)).toEqual([
      'Ion pulse engine',
      'Ion pulse engine',
    ]);
    game.moveEngine(
      { shipId: transport.id, slot: 0 },
      { shipId: raptor.id, slot: 'engine' },
    );
    const restored = Game.restore(game.exportState());
    expect(
      restored.fleetSnapshot().shipUnits!.find((ship) => ship.id === raptor.id)!
        .engines['Ion pulse engine'],
    ).toBe(1);
    expect(
      restored
        .fleetSnapshot()
        .shipUnits!.find((ship) => ship.id === transport.id)!.cargoSlots![0],
    ).toBe('Rocket engine');
  });
});

describe('fleet-motorer-och-last / compatibility', () => {
  it('loads old ships with empty cargo and prevents travel without a mounted engine', () => {
    const game = new Game(createExampleGalaxy());
    const state = structuredClone(game.exportState());
    for (const ship of state.fleets[0]!.shipUnits!)
      delete (ship as { cargoSlots?: unknown }).cargoSlots;
    const restored = Game.restore(state);
    const raptor = restored
      .fleetSnapshot()
      .shipUnits!.find((ship) => ship.type === 'Raptor')!;
    expect(raptor.cargoSlots).toEqual([null, null]);
    restored.moveEngine(
      { shipId: raptor.id, slot: 'engine' },
      { shipId: raptor.id, slot: 0 },
    );
    expect(restored.fleetSnapshot().speed).toBe(0);
    expect(Game.restore(restored.exportState()).fleetSnapshot().speed).toBe(0);
    restored.moveEngine(
      { shipId: raptor.id, slot: 0 },
      { shipId: raptor.id, slot: 'engine' },
    );
    expect(restored.fleetSnapshot().speed).toBe(2);
  });

  it('rejects invalid destinations without losing equipment', () => {
    const game = new Game(createExampleGalaxy());
    const before = game.fleetSnapshot().shipUnits!;
    const raptor = before.find((ship) => ship.type === 'Raptor')!;
    game.moveEngine(
      { shipId: raptor.id, slot: 'engine' },
      { shipId: raptor.id, slot: 99 },
    );
    expect(game.fleetSnapshot().shipUnits).toEqual(before);
  });
});
