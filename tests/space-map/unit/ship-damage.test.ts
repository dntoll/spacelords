import { describe, expect, it } from 'vitest';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import {
  TacticalBattle,
  WEAPONS,
  maxHull,
} from '../../../src/client/space-battle/models/TacticalBattle.js';
import { completeTacticalBattles } from '../../fixtures/tactical-combat.js';

describe('raptor-talig-mot-pirater', () => {
  it('lets the Raptor survive three pirate hits of maximum damage', () => {
    const raider = WEAPONS['Raider cannon'];
    // Each die that hits deals one damage; a rear hit only lowers the threshold.
    const maximum = raider.dice;
    expect(maxHull({ type: 'Raptor', armored: false })).toBeGreaterThan(
      3 * maximum,
    );
  });
});

describe('permanenta-skador', () => {
  it('keeps hull damage after a battle and starts the next battle damaged', () => {
    const state = new Game(createExampleGalaxy()).exportState();
    const pirate = state.pirates![0]!;
    let game = Game.restore({
      ...state,
      pirates: [{ ...pirate, transports: 0 }],
      fleets: [
        {
          ...state.fleets[0]!,
          position: { q: pirate.position.q, r: pirate.position.r },
        },
      ],
    });
    game.startTurn();
    for (let step = 0; step < 20 && !game.tacticalBattle; step++) {
      const frame = game.nextTurnFrame();
      if (!frame) break;
      game.applyFrame(frame);
    }
    expect(game.tacticalBattle).not.toBeNull();
    // Arrange a damaged Raptor, then let the battle play out.
    const battle = game.tacticalBattle!;
    const raptor = battle.pieces.find((piece) => piece.type === 'Raptor')!;
    const damaged = game.exportState();
    const saved = damaged.simulation!.tacticalBattles![0]!;
    game = Game.restore({
      ...damaged,
      simulation: {
        ...damaged.simulation!,
        tacticalBattles: [
          {
            ...saved,
            pieces: saved.pieces.map((piece) =>
              piece.id === raptor.id ? { ...piece, hull: 4 } : piece,
            ),
          },
        ],
      },
    });
    completeTacticalBattles(game);
    const unit = game
      .fleetSnapshot()
      .shipUnits?.find((item) => item.id === raptor.id);
    if (!unit) throw new Error('The Raptor should survive this battle.');
    expect(unit.damage ?? 0).toBeGreaterThanOrEqual(3);
    const reloaded = Game.restore(game.exportState());
    expect(
      reloaded.fleetSnapshot().shipUnits?.find((item) => item.id === raptor.id)
        ?.damage,
    ).toBe(unit.damage);
    const next = TacticalBattle.create(
      'next',
      { q: 0, r: 0 },
      [
        {
          id: 'fleet-home',
          side: 'player',
          retreat: null,
          ships: [
            { id: raptor.id, type: 'Raptor', ion: false, damage: unit.damage! },
          ],
        },
        {
          id: 'pirate',
          side: 'enemy',
          retreat: null,
          ships: [{ id: 'raider', type: 'Space pirate', ion: false }],
        },
      ],
      1,
    );
    expect(next.snapshot.pieces.find((p) => p.id === raptor.id)!.hull).toBe(
      maxHull({ type: 'Raptor', armored: false }) - unit.damage!,
    );
  });
});
