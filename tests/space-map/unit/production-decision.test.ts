import { describe, expect, it } from 'vitest';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { researchStationState } from '../../fixtures/research-station.js';

// produktionsbeslut-bara-for-skeppsfabrik: Production only orders ships, so
// the reminder must not appear for empty sites or queued buildings.
const reminder = 'building-empty-sol-0';

function tellus(factory: boolean) {
  const state = researchStationState();
  if (factory)
    state.colonies[0]![1].buildings.push({
      id: 'test-yard',
      type: 'Transport ship factory',
      slotIndex: 1,
      demolition: false,
    });
  return Game.restore(state);
}

const tellusOf = (game: Game) => game.galaxy.homePlanet;
const ids = (game: Game) => game.decisions.map((decision) => decision.id);

describe('produktionsbeslut-bara-for-skeppsfabrik', () => {
  it('raises no reminder for a planet with empty sites but no ship factory', () => {
    expect(ids(tellus(false))).not.toContain(reminder);
  });

  it('reminds about an idle ship factory even while a building is queued', () => {
    const game = tellus(true);
    expect(ids(game)).toContain(reminder);
    game.scheduleBuild(tellusOf(game), 'Iron mine', 2);
    expect(ids(game)).toContain(reminder);
  });

  it('drops the reminder once the ship factory has an order', () => {
    const game = tellus(true);
    game.scheduleShip(tellusOf(game), 'Transport ship');
    expect(ids(game)).not.toContain(reminder);
  });

  it('raises no reminder while any ship order is queued, even if another ship factory is idle', () => {
    const state = researchStationState({ shipFactory: true });
    state.colonies[0]![1].buildings.push({
      id: 'test-fighters',
      type: 'Fighter factory',
      slotIndex: 2,
      demolition: false,
    });
    const game = Game.restore(state);
    expect(ids(game)).toContain(reminder);
    game.scheduleShip(tellusOf(game), 'Fighter');
    expect(ids(game)).not.toContain(reminder);
  });
});
