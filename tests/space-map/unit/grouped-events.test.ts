import { describe, expect, it } from 'vitest';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { tradeNetworkState } from '../../fixtures/trade-network.js';
import { collectTurnFrames } from '../../fixtures/turn-steps.js';

describe('ankomstbesked', () => {
  it('ankomstbesked-endast-vid-manuell-forflyttning: automatic Explore legs arrive silently while a manual move still reports arrival', () => {
    const state = tradeNetworkState();
    const arrivals = (subject: Game) =>
      subject.events.filter((event) =>
        event.text.startsWith(
          `${subject.fleet('fleet-home')!.name} arrived at `,
        ),
      );
    for (const order of ['explore', 'explore-stars'] as const) {
      const game = Game.restore({ ...state, pirates: [] });
      game.setExploration('fleet-home', order);
      const visited = new Set<string>();
      for (let round = 0; round < 5; round += 1) {
        collectTurnFrames(game);
        game.finishTurn();
        visited.add(game.fleet('fleet-home')!.position!.key);
      }
      expect(visited.size).toBeGreaterThan(2);
      expect(game.fleet('fleet-home')!.exploration).toBe(order);
      expect(arrivals(game)).toHaveLength(0);
    }

    const manual = Game.restore({ ...state, pirates: [] });
    const start = manual.fleet('fleet-home')!.position!;
    const neighbor = start
      .neighbors()
      .find((point) => manual.galaxy.isPassable(point))!;
    manual.setDestination('fleet-home', neighbor);
    collectTurnFrames(manual);
    manual.finishTurn();
    expect(arrivals(manual)).toHaveLength(1);
  });
});
