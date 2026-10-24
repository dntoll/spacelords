import { expect, it } from 'vitest';
import { Game } from '../../src/client/models/Game.js';
import { tradeNetworkState } from '../fixtures/trade-network.js';

it('produktionsformaga / forsorjningsstatus: missing staff and demolition block capabilities and project readiness', () => {
  const state = tradeNetworkState();
  const home = state.colonies[0]![1];
  home.population = 0;
  home.projects.push({
    id: 'engine-project',
    type: 'Rocket engine',
    slotIndex: null,
    factoryId: 'engine',
    destinationFleetId: null,
  });
  const unstaffed = Game.restore(state)
    .supplyOverview()
    .planets.find((p) => p.id === 'sol-0')!;
  expect(unstaffed.status).toBe('Needs attention');
  expect(unstaffed.summary).toContain('population');
  expect(unstaffed.capabilities[0]).toMatchObject({
    available: false,
    reason: 'Not enough workers',
    queued: 1,
  });
  home.buildings.find((b) => b.id === 'engine')!.demolition = true;
  const demolished = Game.restore(state)
    .supplyOverview()
    .planets.find((p) => p.id === 'sol-0')!;
  expect(demolished.summary).toContain('factory is required');
  expect(demolished.capabilities[0]!.reason).toBe(
    'Factory scheduled for demolition',
  );
});

it('forsorjningsstatus / leveransfloden: decisions and supply agree, inspection preserves game state, and arrival resolves needs', () => {
  const game = Game.restore(tradeNetworkState());
  const before = game.exportState();
  expect(game.supplyOverview().planets[0]!.status).toBe('Needs attention');
  expect(game.decisions.some((d) => d.id === 'supply-sol-1')).toBe(true);
  expect(game.exportState()).toEqual(before);
  game.assignTradeFleet('route-test', 'freighters');
  expect(game.supplyOverview().planets[0]!.status).toBe('Waiting');
  expect(game.decisions.some((d) => d.id === 'supply-sol-1')).toBe(false);
  expect(game.shipments[0]).toMatchObject({
    state: 'Awaiting pickup',
    source: 'Tellus',
    recipient: 'Vesta',
    project: 'Iron mine',
  });
  const frames = game.startTurn();
  expect(game.shipments[0]).toMatchObject({
    state: 'In transit',
    source: 'Tellus',
    recipient: 'Vesta',
    project: 'Iron mine',
  });
  expect(
    game.supplyOverview().planets.find((p) => p.id === 'sol-1')!.status,
  ).toBe('Waiting');
  expect(game.decisions.some((d) => d.id === 'supply-sol-1')).toBe(false);
  for (const frame of frames) game.applyFrame(frame);
  game.finishTurn();
  expect(game.shipments).toHaveLength(0);
  expect(
    game.supplyOverview().planets.find((p) => p.id === 'sol-1')!.status,
  ).toBe('Idle');
});
