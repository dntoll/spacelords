import { describe, expect, it } from 'vitest';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';
import { playerNoticeText } from '../../../src/client/app/views/playerNoticeText.js';
import { completeTacticalBattles } from '../../fixtures/tactical-combat.js';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { fleetAssignmentLabel } from '../../../src/client/space-map/views/FleetCard.js';

const coordinates = /HEX|-?\d+,\s*-?\d+/;

describe('inga-hexkoordinater', () => {
  it('names discoveries, explorations and combat without hex coordinates', () => {
    const state = new Game(createExampleGalaxy()).exportState();
    const pirate = state.pirates![0]!;
    const game = Game.restore({
      ...state,
      fleets: [{ ...state.fleets[0]!, position: { q: 5, r: -4 } }],
    });
    game.setDestination(
      'fleet-home',
      new HexCoordinate(pirate.position.q, pirate.position.r),
    );
    for (let stage = 0; stage < 12; stage++) {
      game.startTurn();
      for (let step = 0; step < 40; step++) {
        if (game.tacticalBattle) completeTacticalBattles(game);
        if (game.phase === 'interrupted') {
          game.handleDiscoveries();
          game.continueTurn();
        }
        const frame = game.nextTurnFrame();
        if (!frame) break;
        game.applyFrame(frame);
      }
      if (game.phase === 'simulating') game.finishTurn();
    }
    const texts = game.events.map((event) => event.text);
    expect(texts.some((text) => text.startsWith('Pirate ship in sight'))).toBe(
      true,
    );
    expect(texts.filter((text) => coordinates.test(text))).toEqual([]);
  });

  it('shows a discovery notice with only its name', () => {
    expect(
      playerNoticeText({
        kind: 'discovery',
        flash: { kind: 'planet', name: 'Brontes' },
      }),
    ).toBe('Planet discovered: Brontes.');
  });

  it('describes an unnamed destination on the fleet card without numbers', () => {
    const model = new AppModel();
    const home = model.snapshot.fleet.position!;
    const fleet = {
      ...model.snapshot.fleet,
      destination: new HexCoordinate(home.q - 6, home.r + 5),
    };
    const label = fleetAssignmentLabel(fleet, model.snapshot);
    expect(label).toBe('Move: selected location');
  });
});
