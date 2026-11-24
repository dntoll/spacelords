// @vitest-environment jsdom
import { collectTurnFrames, turnFrames } from '../../fixtures/turn-steps.js';
import { afterEach, describe, it, expect, vi } from 'vitest';
afterEach(() => vi.useRealTimers());
import { Game } from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { AppView } from '../../../src/client/app/views/AppView.js';

describe('handelseannonsering / handelser-pa-kartan', () => {
  it('planetinformation-pa-kartan: returns immutable current, basic and hidden planet knowledge', () => {
    const state = new Game(createExampleGalaxy()).exportState();
    const game = Game.restore(state);
    const home = game.planetKnowledge(game.galaxy.homePlanet.position)!;
    expect(home.habitability).toBe(game.galaxy.homePlanet.habitability);
    expect(Object.isFrozen(home)).toBe(true);
    const planets = game.galaxy.systems.flatMap((system) => system.planets);
    const vesta = planets.find((planet) => planet.name === 'Vesta')!;
    expect(game.planetKnowledge(vesta.position)).toBeNull();
    const surveyed = Game.restore({
      ...game.exportState(),
      surveyedPlanets: [...game.exportState().surveyedPlanets!, vesta.id],
    });
    expect(surveyed.planetKnowledge(vesta.position)?.habitability).toBe(
      vesta.habitability,
    );
    const unknown = planets.find(
      (planet) => !state.explored.includes(planet.position.key),
    )!;
    expect(game.planetKnowledge(unknown.position)).toBeNull();
  });
  it('planetinformation-pa-kartan: reveals discovered planet facts and only Unexplored for unknown space', () => {
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    const model = new AppModel();
    const view = new AppView(root, () => ({ render() {}, dispose() {} }));
    view.render(model.snapshot);
    expect(root.querySelector('.planet-map-info')?.textContent).toMatch(
      /Type: Temperate.*Habitability: \d+%/,
    );
    view.render({
      ...model.snapshot,
      selectedPlanetInfo: {
        ...model.snapshot.selectedPlanetInfo!,
        habitability: 72,
      },
    });
    expect(root.querySelector('.planet-map-info')?.textContent).toContain(
      'Habitability: 72%',
    );
    model.select(new HexCoordinate(0, 1));
    view.render(model.snapshot);
    expect(model.snapshot.selectedPlanetInfo).not.toBeNull();
    expect(root.querySelector('.planet-map-info')).not.toBeNull();
    const unknown = model.snapshot.cells.find(
      (cell) => !cell.explored && cell.object === null,
    )!;
    model.select(unknown.position);
    view.render(model.snapshot);
    expect(model.snapshot.selectedPlanetInfo).toBeNull();
    expect(root.querySelector('.selection-panel')?.textContent).toContain(
      'Unexplored',
    );
    expect(root.querySelector('.planet-map-info')).toBeNull();
    view.dispose();
  });
});

describe('handelser / arsrundor-och-order', () => {
  it('returns directly to planning and allows another turn without acknowledgement', () => {
    const game = new Game(createExampleGalaxy());
    collectTurnFrames(game);
    game.finishTurn();
    expect(game.phase).toBe('planning');
    expect(() => game.startTurn()).not.toThrow();
  });
  it('ingen-ankomstbesked: reaching the destination adds no arrival or movement noise', () => {
    const game = new Game(createExampleGalaxy());
    // Two rounds of the Raptor's speed 2 from Tellus.
    game.setDestination('fleet-home', new HexCoordinate(5, 0));
    for (const frame of turnFrames(game)) game.applyFrame(frame);
    game.finishTurn();
    for (const frame of turnFrames(game)) game.applyFrame(frame);
    game.finishTurn();
    expect(game.fleet('fleet-home')!.destination).toBeNull();
    expect(
      game.events.some((event) =>
        /arrived|reached its destination|moved to|revealed \d+ hexes/.test(
          event.text,
        ),
      ),
    ).toBe(false);
  });
});
