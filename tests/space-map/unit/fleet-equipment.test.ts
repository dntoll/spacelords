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

describe('fleet-skeppsordning', () => {
  it('persists reordered ships while preserving their equipment and ignores invalid moves', () => {
    const game = new Game(createExampleGalaxy());
    const before = game.fleetSnapshot().shipUnits!;
    const originalCombatOrder = game
      .exportState()
      .fleets[0]!.shipUnits!.map((ship) => ship.id);
    game.reorderShip(before[1]!.id, 0);
    expect(
      game.exportState().fleets[0]!.shipUnits!.map((ship) => ship.id),
    ).toEqual(originalCombatOrder);
    expect(game.fleetSnapshot().shipUnits).toEqual([
      before[1],
      before[0],
      ...before.slice(2),
    ]);
    game.reorderShip('missing', 0);
    game.reorderShip(before[0]!.id, 12);
    expect(Game.restore(game.exportState()).fleetSnapshot().shipUnits).toEqual([
      before[1],
      before[0],
      ...before.slice(2),
    ]);
  });
});

describe('fleet-vapenplatser', () => {
  it('starts with an armed fighter and moves weapons through storage to another ship', () => {
    const game = new Game(createExampleGalaxy());
    const units = game.fleetSnapshot().shipUnits!;
    const fighter = units.find((ship) => ship.type === 'Fighter')!;
    const raptor = units.find((ship) => ship.type === 'Raptor')!;
    const transport = units.find((ship) => ship.type === 'Transport ship')!;
    expect(fighter.cargoSlots).toHaveLength(0);
    expect(fighter.weaponSlots).toEqual([{ type: 'Cannon' }, null]);
    game.moveEquipment(
      { shipId: raptor.id, slot: 'weapon', index: 0 },
      { shipId: transport.id, slot: 2 },
    );
    game.moveEquipment(
      { shipId: transport.id, slot: 2 },
      { shipId: fighter.id, slot: 'weapon', index: 1 },
    );
    const restored = Game.restore(game.exportState());
    expect(
      restored
        .fleetSnapshot()
        .shipUnits!.find((ship) => ship.id === fighter.id)!.weaponSlots,
    ).toEqual([{ type: 'Cannon' }, { type: 'Light cannon' }]);
  });
});

describe('fleet-vapenplatser / sparkompatibilitet', () => {
  it('restores legacy missile launchers and preserves their ammunition while moved through storage', () => {
    const state = structuredClone(
      new Game(createExampleGalaxy()).exportState(),
    );
    const fighter = state.fleets[0]!.shipUnits!.find(
      (ship) => ship.type === 'Fighter',
    )!;
    delete (fighter as { weaponSlots?: unknown }).weaponSlots;
    (fighter as { missiles?: number }).missiles = 2;
    const game = Game.restore(state);
    const ships = game.fleetSnapshot().shipUnits!;
    const transport = ships.find((ship) => ship.type === 'Transport ship')!;
    expect(
      ships.find((ship) => ship.id === fighter.id)!.weaponSlots![1],
    ).toEqual({ type: 'Missiles', salvos: 2 });
    game.moveEquipment(
      { shipId: fighter.id, slot: 'weapon', index: 1 },
      { shipId: transport.id, slot: 2 },
    );
    const restored = Game.restore(game.exportState());
    expect(
      restored
        .fleetSnapshot()
        .shipUnits!.find((ship) => ship.id === transport.id)!.cargoSlots![2],
    ).toEqual({ type: 'Missiles', salvos: 2 });
    const before = restored.exportState();
    restored.moveEquipment(
      { shipId: transport.id, slot: 2 },
      { shipId: fighter.id, slot: 'engine' },
    );
    expect(restored.exportState()).toEqual(before);
  });
});
