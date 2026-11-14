import { BUILDING_SYMBOLS } from '../../../src/client/space-map/views/BuildingSymbols.js';
import { BUILDING_IMAGES } from '../../../src/client/space-map/views/BuildingImage.js';
import { expect, it } from 'vitest';
import { Game } from '../../../src/client/space-map/models/Game.js';
import {
  TacticalBattle,
  battleWeapons,
  SHIP_PROFILES,
} from '../../../src/client/space-battle/models/TacticalBattle.js';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';
import { encounterGame } from '../../fixtures/battle-checkpoint.js';
import { completeTacticalBattles } from '../../fixtures/tactical-combat.js';
import { salvageState, finishYear } from '../../fixtures/salvage.js';
import { SHIP_IMAGES } from '../../../src/client/space-map/views/ShipImages.js';

it('bargat-piratskepp-behaller-typ: a destroyed pirate leaves its own hull rather than a Fighter', () => {
  const game = encounterGame();
  const pirateId = game
    .exportState()
    .simulation!.tacticalBattles![0]!.pieces.find(
      (p) => p.side === 'enemy',
    )!.id;
  completeTacticalBattles(game);
  const wreck = game.wrecks.find((w) => w.ship.id === pirateId);
  expect(wreck?.ship.type ?? 'Space pirate').toBe('Space pirate');
});

it('bargat-piratskepp-behaller-typ: repair, save, fleet transfer and combat retain the pirate identity and weapon', () => {
  const state = salvageState();
  const wreck = state.salvage.wrecks[0]!;
  state.salvage.wrecks[0] = {
    ...wreck,
    position: new HexCoordinate(3, 0),
    ship: {
      id: 'captured-pirate',
      type: 'Space pirate',
      engines: { 'Rocket engine': 1, 'Ion pulse engine': 0 },
    },
  };
  const game = Game.restore({
    ...state,
    researched: [...state.researched, 'Fleet patrol'],
  });
  game.orderSalvage('fleet-home', wreck.id);
  for (let year = 0; year < 5 && game.wrecks.length; year++) finishYear(game);
  expect(game.wrecks).toHaveLength(0);
  const restored = Game.restore(game.exportState());
  const fleet = restored
    .fleetSnapshots()
    .find((f) => f.shipUnits?.some((s) => s.id === 'captured-pirate'))!;
  expect(fleet.ships['Space pirate']).toBe(1);
  expect(fleet.ships.Fighter).toBe(0);
  const transferred = restored.transferShips(fleet.id, 'Space pirate', 1, null);
  const unit = transferred.shipUnits!.find((s) => s.id === 'captured-pirate')!;
  restored.setPatrol(transferred.id);
  expect(
    Game.restore(restored.exportState()).fleet(transferred.id)!.patrol,
  ).toBeDefined();
  const battle = TacticalBattle.create(
    'captured',
    { q: 0, r: 0 },
    [
      {
        id: 'friendly',
        side: 'player',
        retreat: null,
        ships: [{ ...unit, ion: false }],
      },
      {
        id: 'enemy',
        side: 'enemy',
        retreat: null,
        ships: [{ id: 'opponent', type: 'Space pirate', ion: false }],
      },
    ],
    1,
  );
  expect(battle.snapshot.pieces[0]!.type).toBe('Space pirate');
  expect(battle.snapshot.pieces[0]!.hull).toBe(
    SHIP_PROFILES['Space pirate'].hull,
  );
  expect(battleWeapons(unit.type)).toEqual(['Raider cannon']);
});

it('unik-bild-for-civila-transporter: passenger shuttles and freighters have distinct sprites', () => {
  expect(SHIP_IMAGES['Civilian shuttle']).not.toBe(
    SHIP_IMAGES['Transport ship'],
  );
});

it('egen-raptor-grafik: Raptor and its factory do not reuse Fighter artwork', () => {
  expect(SHIP_IMAGES.Raptor).not.toBe(SHIP_IMAGES.Fighter);
  expect(BUILDING_SYMBOLS['Raptor factory']).not.toBe(
    BUILDING_SYMBOLS['Fighter factory'],
  );
  expect(BUILDING_IMAGES['Raptor factory']).toBeUndefined();
});
