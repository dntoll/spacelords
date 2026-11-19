import { describe, expect, it } from 'vitest';
import {
  Game,
  type GameState,
} from '../../../src/client/space-map/models/Game.js';
import { needsAttention } from '../../../src/client/space-map/models/Decisions.js';
import { domeProductionState } from '../../fixtures/production-dome.js';
import { tradeNetworkState } from '../../fixtures/trade-network.js';
import { turnFrames } from '../../fixtures/turn-steps.js';

function turn(game: Game) {
  for (const frame of turnFrames(game)) game.applyFrame(frame);
  game.finishTurn();
}

function transportState() {
  const state = tradeNetworkState();
  state.colonies[0]![1].buildings.push({
    id: 'research',
    type: 'Research station',
    slotIndex: 2,
    demolition: false,
  });
  return {
    ...state,
    fleets: state.fleets.filter((fleet) => fleet.id === 'fleet-home'),
    researched: [...state.researched],
    researchQueue: [...state.researchQueue],
    tradeRoutes: [...state.tradeRoutes],
  };
}

const active = (game: Game, id: string) =>
  game.decisions.some(
    (decision) => decision.id === id && needsAttention(decision),
  );

describe('beslut-vantar-pa-paborjad-atgard', () => {
  it('keeps an actionable root when queued research loses its last Research station', () => {
    const state = transportState();
    state.colonies[0]![1].buildings = [];
    const game = Game.restore({
      ...state,
      researchQueue: ['Transport ship factory'],
      researched: state.researched.filter(
        (t) => t !== 'Transport ship factory' && t !== 'Trade logistics',
      ),
    });
    expect(active(game, 'route-idle-route-test')).toBe(false);
    expect(
      game.decisions.some(
        (d) => needsAttention(d) && d.label.includes('Research station'),
      ),
    ).toBe(true);
  });
  it('waits for matching Dome research anywhere in the queue and restores the next choice on completion or cancellation', () => {
    const state = domeProductionState(false);
    state.colonies[1]![1].buildings.push({
      id: 'research',
      type: 'Research station',
      slotIndex: 1,
      demolition: false,
    });
    const game = Game.restore(state);
    const planet = game.galaxy.homePlanet;
    const id = `building-empty-${planet.id}`;
    expect(active(game, id)).toBe(true);
    game.selectResearch('Weapons module factory');
    expect(active(game, id)).toBe(true);
    game.selectResearch('Desert dome');
    expect(active(game, id)).toBe(false);
    expect(
      game.planetOrders().find((p) => p.planetId === planet.id)!.emptyQueues,
    ).toBe(0);
    expect(game.productionGuidance(planet)).toMatchObject({
      kind: 'waiting',
      message: 'Waiting for Desert dome research.',
    });
    const restored = Game.restore(
      JSON.parse(JSON.stringify(game.exportState())) as GameState,
    );
    expect(active(restored, id)).toBe(false);
    restored.removeResearch('Desert dome');
    expect(active(restored, id)).toBe(true);
    for (let year = 0; year < 4 && game.research.queue.length; year++)
      turn(game);
    expect(game.research.completed).toContain('Desert dome');
    expect(active(game, id)).toBe(true);
    game.scheduleBuild(planet, 'Desert dome');
    expect(active(game, id)).toBe(false);
    expect(game.productionGuidance(planet).kind).toBe('waiting');
  });

  it('keeps choices for a prepared site or existing producer while Dome research is pending', () => {
    for (const prepared of [true, false]) {
      const state = domeProductionState(false);
      state.researchQueue = ['Desert dome'];
      if (prepared) state.colonies[0]![1].domes = [0];
      else
        state.colonies[0]![1].buildings.push({
          id: 'engine',
          type: 'Rocket engine factory',
          slotIndex: 0,
          demolition: false,
        });
      const game = Game.restore(state);
      expect(active(game, 'building-empty-sol-0')).toBe(true);
    }
  });

  it('waits on all empty routes during transport research but stops waiting when a fleet can be assigned', () => {
    const state = transportState();
    state.researched = state.researched.filter(
      (technology) =>
        technology !== 'Transport ship factory' &&
        technology !== 'Trade logistics',
    );
    const game = Game.restore(state);
    expect(active(game, 'route-idle-route-test')).toBe(true);
    game.selectResearch('Transport ship factory');
    expect(active(game, 'route-idle-route-test')).toBe(false);
    const restored = Game.restore(game.exportState());
    expect(active(restored, 'route-idle-route-test')).toBe(false);
    restored.removeResearch('Transport ship factory');
    expect(active(restored, 'route-idle-route-test')).toBe(true);
    const ready = game.exportState();
    expect(
      active(
        Game.restore({
          ...ready,
          fleets: [
            ...ready.fleets,
            tradeNetworkState().fleets.find((f) => f.id === 'freighters')!,
          ],
        }),
        'route-idle-route-test',
      ),
    ).toBe(true);
    turn(game);
    expect(active(game, 'route-idle-route-test')).toBe(true);
  });

  it('waits during factory and ship construction, without hiding the next manual step', () => {
    const game = Game.restore(transportState());
    const planet = game.galaxy.homePlanet;
    game.scheduleBuild(planet, 'Transport ship factory');
    expect(active(game, 'route-idle-route-test')).toBe(false);
    expect(game.tradeRoutes[0]!.status).toContain('Waiting');
    // byggtid-per-byggnad: still waiting while the factory is under construction.
    turn(game);
    expect(active(game, 'route-idle-route-test')).toBe(false);
    turn(game);
    expect(active(game, 'route-idle-route-test')).toBe(true);
    game.scheduleShip(planet, 'Transport ship');
    expect(active(game, 'route-idle-route-test')).toBe(false);
    const project = game.planetSnapshot(planet)!.projects.at(-1)!;
    const restored = Game.restore(game.exportState());
    restored.cancelProject(restored.galaxy.homePlanet, project.id);
    expect(active(restored, 'route-idle-route-test')).toBe(true);
    turn(game);
    expect(active(game, 'route-idle-route-test')).toBe(false);
  });

  it('does not hide missing routes, unrelated shortages or an available transport assignment', () => {
    for (const obstacle of ['route', 'source', 'fleet'] as const) {
      const state = transportState();
      state.researchQueue = ['Transport ship factory'];
      state.researched = state.researched.filter(
        (t) => t !== 'Transport ship factory' && t !== 'Trade logistics',
      );
      if (obstacle === 'route') state.tradeRoutes = [];
      if (obstacle === 'source') {
        state.colonies[0]![1].stock.Iron = 0;
        state.colonies[0]![1].buildings =
          state.colonies[0]![1].buildings.filter((b) => b.type !== 'Iron mine');
      }
      if (obstacle === 'fleet')
        state.fleets.push(
          tradeNetworkState().fleets.find((f) => f.id === 'freighters')!,
        );
      expect(active(Game.restore(state), 'supply-sol-1'), obstacle).toBe(true);
    }
  });

  it('preserves muted preferences while pending actions disappear and return', () => {
    const game = Game.restore(transportState());
    game.muteDecision('route-idle-route-test');
    game.scheduleBuild(game.galaxy.homePlanet, 'Transport ship factory');
    expect(
      game.decisions.find((d) => d.id === 'route-idle-route-test'),
    ).toMatchObject({ muted: true, current: false });
    const restored = Game.restore(game.exportState());
    turn(restored);
    turn(restored);
    expect(
      restored.decisions.find((d) => d.id === 'route-idle-route-test'),
    ).toMatchObject({ muted: true, current: true });
  });
});
