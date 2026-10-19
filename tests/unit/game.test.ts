import { describe, expect, it } from 'vitest';
import { AppModel } from '../../src/client/models/AppModel.js';

describe('arsbudget', () => {
  it('reserves slots, workers, annual resources and crew immediately', () => {
    const model = new AppModel();
    model.build('Research station');
    const planet = model.snapshot.planet;
    expect(planet).toBeNull();
    model.openPlanet();
    const budget = model.snapshot.planet!.budget;
    expect(budget.reservedSlots).toBe(1);
    expect(budget.reservedWorkers).toBe(600);
    expect(budget.reservedCrew).toBe(0);
  });
});

describe('rundsimulering', () => {
  it('finishes building construction and advances population and the round', () => {
    const model = new AppModel();
    model.openPlanet();
    const before = model.snapshot.planet!.population;
    model.openMap();
    model.build('Research station');
    const frames = model.startTurn();
    for (const frame of frames) model.applyTurnFrame(frame);
    model.finishTurn();
    expect(model.snapshot.round).toBe(2);
    expect(model.snapshot.phase).toBe('planning');
    expect(model.snapshot.planet).toBeNull();
    model.openPlanet();
    expect(model.snapshot.planet!.population).toBe(before + 1200);
    expect(model.snapshot.planet!.buildings[0]!.type).toBe('Research station');
    expect(
      model.snapshot.fleets.some((fleet) => fleet.ships['Colony ship'] === 0),
    ).toBe(true);
  });
});

describe('flottadministration', () => {
  it('keeps an emptied fleet and its name when its final ship is transferred', () => {
    const model = new AppModel();
    const fleet = model.snapshot.fleets[0]!;
    model.transferShips(fleet.id, 'Exploration ship', 1, null);
    expect(model.snapshot.fleets).toHaveLength(2);
    model.transferShips(fleet.id, 'Fighter', 1, model.snapshot.fleets[1]!.id);
    expect(model.snapshot.fleets).toHaveLength(2);
    expect(model.snapshot.fleets[0]?.name).toBe('Home Fleet');
  });

  it('moves exactly one ship between fleets on the same hex', () => {
    const model = new AppModel();
    const home = model.snapshot.fleets[0]!;
    model.createFleet(home.id);
    const target = model.snapshot.fleets[1]!;
    model.transferShips(home.id, 'Fighter', 1, target.id);
    expect(model.snapshot.fleets[0]?.ships.Fighter).toBe(0);
    expect(model.snapshot.fleets[1]?.ships.Fighter).toBe(1);
  });

  it('only deletes empty fleets', () => {
    const model = new AppModel();
    const home = model.snapshot.fleets[0]!;
    expect(() => model.deleteFleet(home.id)).toThrow('Only empty fleets');
    model.createFleet(home.id);
    const empty = model.snapshot.fleets[1]!;
    model.deleteFleet(empty.id);
    expect(model.snapshot.fleets).toHaveLength(1);
  });
});

describe('skeppsutforskning', () => {
  it('reveals every visited hex and explorers reveal neighboring hexes permanently', () => {
    const model = new AppModel();
    const fleet = model.snapshot.fleets[0]!;
    model.setDestination(fleet.id, 3, 0);
    const frames = model.startTurn();
    for (const frame of frames) model.applyTurnFrame(frame);
    model.finishTurn();
    const cells = model.snapshot.cells;
    expect(cells.find((cell) => cell.position.key === '3,0')?.visible).toBe(
      true,
    );
    expect(cells.find((cell) => cell.position.key === '3,-1')?.visible).toBe(
      true,
    );
  });
});
