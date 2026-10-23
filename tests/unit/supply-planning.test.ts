import { describe, expect, it } from 'vitest';
import { Game } from '../../src/client/models/Game.js';
import { emptyStock } from '../../src/client/models/Economy.js';
import { tradeNetworkState } from '../fixtures/trade-network.js';

const vesta = (game: Game) =>
  game.galaxy.systems.flatMap((s) => s.planets).find((p) => p.id === 'sol-1')!;
const supply = (game: Game) =>
  game.supplyOverview().planets.find((p) => p.id === 'sol-1')!;

describe('forsorjningsstatus / leveransfloden / beslutslista', () => {
  it('reserves deliveries immediately on assignment without loading or moving fleets', () => {
    const state = tradeNetworkState();
    state.colonies[1]![1].stock = emptyStock();
    const game = Game.restore(state);
    const homeStock = game.planetSnapshot(game.galaxy.homePlanet)!.economy
      .stock;
    const fleet = game.fleet('freighters')!;
    game.assignTradeFleet('route-test', 'freighters');

    expect(supply(game).status).toBe('Waiting');
    expect(game.decisions.some((d) => d.id === 'supply-sol-1')).toBe(false);
    expect(game.shipments.map((s) => [s.material, s.amount, s.state])).toEqual([
      ['Iron', 5, 'Awaiting pickup'],
      ['Water', 2, 'Awaiting pickup'],
    ]);
    expect(game.fleet('freighters')).toMatchObject({
      position: fleet.position,
      destination: null,
      cargo: emptyStock(),
    });
    expect(game.planetSnapshot(game.galaxy.homePlanet)!.economy.stock).toEqual(
      homeStock,
    );
    expect(game.planetSnapshot(vesta(game))!.economy.incoming).toMatchObject({
      Iron: 5,
      Water: 2,
    });

    const saved = game.exportState();
    game.supplyOverview();
    expect(game.decisions.some((d) => d.id === 'supply-sol-1')).toBe(false);
    expect(game.exportState()).toEqual(saved);
    const restored = Game.restore(saved);
    expect(restored.shipments).toEqual(game.shipments);
    for (const frame of restored.startTurn()) restored.applyFrame(frame);
    restored.finishTurn();
    expect(restored.shipments).toHaveLength(0);
    expect(
      restored
        .planetSnapshot(vesta(restored))!
        .buildings.some((b) => b.type === 'Iron mine'),
    ).toBe(true);
  });

  it('books the next project when orders are added, reordered or cancelled on an active route', () => {
    const state = tradeNetworkState();
    state.colonies[1]![1].projects = [];
    const game = Game.restore(state);
    game.assignTradeFleet('route-test', 'freighters');
    game.scheduleBuild(vesta(game), 'Iron mine');
    expect(supply(game).status).toBe('Waiting');
    game.scheduleBuild(vesta(game), 'Water extractor');
    const second = game.exportState().colonies[1]![1].projects[1]!;
    game.moveProject(vesta(game), second.id, 0);
    expect(supply(game).status).toBe('Waiting');
    game.cancelProject(vesta(game), second.id);
    expect(game.shipments.every((s) => s.projectId !== second.id)).toBe(true);
    expect(supply(game).status).toBe('Waiting');
  });

  it('recognizes an active route in an older save that has not yet booked its deliveries', () => {
    const state = tradeNetworkState();
    const game = Game.restore({
      ...state,
      fleets: state.fleets.map((f) =>
        f.id === 'freighters' ? { ...f, routeId: 'route-test' } : f,
      ),
    });
    expect(supply(game).status).toBe('Waiting');
    expect(game.shipments[0]!.state).toBe('Awaiting pickup');
  });

  it('keeps decisions for partial supply, protected source demand and inactive transport', () => {
    const state = tradeNetworkState();
    state.colonies[0]![1].stock.Iron = 7;
    state.colonies[0]![1].projects = [
      {
        ...state.colonies[1]![1].projects[0]!,
        id: 'home-project-1',
        slotIndex: 2,
      },
    ];
    const game = Game.restore(state);
    game.assignTradeFleet('route-test', 'freighters');
    expect(
      supply(game).materials.find((m) => m.material === 'Iron'),
    ).toMatchObject({ incoming: 2, unprovided: 3 });
    expect(game.decisions.some((d) => d.id === 'supply-sol-1')).toBe(true);

    const supplied = Game.restore(tradeNetworkState());
    supplied.assignTradeFleet('route-test', 'freighters');
    supplied.releaseTradeFleet('freighters');
    expect(supply(supplied).status).toBe('Needs attention');
    expect(supplied.decisions.some((d) => d.id === 'supply-sol-1')).toBe(true);
    supplied.assignTradeFleet('route-test', 'freighters');
    expect(supply(supplied).status).toBe('Waiting');
    expect(supplied.shipments.reduce((sum, s) => sum + s.amount, 0)).toBe(5);
  });

  it('protects a source project added after a pickup was reserved', () => {
    const state = tradeNetworkState();
    state.colonies[0]![1].stock.Iron = 7;
    const game = Game.restore(state);
    game.assignTradeFleet('route-test', 'freighters');
    expect(supply(game).status).toBe('Waiting');
    game.scheduleBuild(game.galaxy.homePlanet, 'Iron mine');
    expect(
      supply(game).materials.find((m) => m.material === 'Iron'),
    ).toMatchObject({ incoming: 2, unprovided: 3 });
    expect(
      game.supplyOverview().planets.find((p) => p.id === 'sol-0')!.status,
    ).toBe('Ready');
  });
});
