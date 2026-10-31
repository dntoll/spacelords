import { describe, expect, it } from 'vitest';
import { Game, type GameState } from '../../src/client/models/Game.js';
import {
  TacticalBattle,
  battleHex,
} from '../../src/client/models/TacticalBattle.js';
import { completeTacticalBattles } from '../fixtures/tactical-combat.js';
import { arrangeBattle, encounterGame } from '../fixtures/battle-checkpoint.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { tradeNetworkState } from '../fixtures/trade-network.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';

describe('tactical combat integration', () => {
  it('sparad-taktisk-strid: rejects a checkpoint that replaces an actual participating ship', () => {
    const game = encounterGame();
    expect(() =>
      arrangeBattle(game, (state) => ({
        ...state,
        pieces: state.pieces.map((p, i) =>
          i === 0 ? { ...p, id: 'unknown-ship' } : p,
        ),
      })),
    ).toThrow();
  });

  it('gemensamt-stridsdeltagande / sparad-taktisk-strid: queues separate encounters and preserves the first report during the second battle', () => {
    const state = new Game(createExampleGalaxy()).exportState();
    const fleet = state.fleets[0]!;
    const game = Game.restore({
      ...state,
      fleets: state.pirates!.map((pirate, i) => {
        const star = gameStar(pirate.systemId);
        return {
          ...fleet,
          id: `fleet-${i}`,
          name: `Fleet ${i}`,
          shipUnits: [],
          position: star.neighbors()[1]!,
          ships: { ...fleet.ships, Fighter: 2 },
        };
      }),
    });
    function gameStar(id: string) {
      return createExampleGalaxy().systems.find((s) => s.star.id === id)!.star
        .position;
    }
    game.startTurn();
    for (let step = 0; !game.tacticalBattle && step < 20; step++) {
      if (game.phase === 'interrupted') game.continueTurn();
      game.applyFrame(game.nextTurnFrame()!);
    }
    expect(game.exportState().simulation!.tacticalBattles).toHaveLength(2);
    for (
      let step = 0;
      !game.interruption!.battles!.length && step < 100;
      step++
    )
      game.playBattleActivation();
    expect(game.exportState().simulation!.tacticalBattles).toHaveLength(1);
    expect(game.interruption!.battles).toHaveLength(1);
    const restored = Game.restore(game.exportState());
    expect(restored.exportState()).toEqual(game.exportState());
    completeTacticalBattles(restored);
    expect(restored.interruption!.battles).toHaveLength(2);
  });

  it('gemensamt-stridsdeltagande / sparad-taktisk-strid: a merged reinforcement report still restores and points at its surviving fleet', () => {
    const state = encounterGame().exportState();
    const fleet = state.fleets[0]!;
    const game = Game.restore({
      ...state,
      phase: 'planning',
      simulation: null,
      pirates: [{ ...state.pirates![0]!, position: { q: 8, r: -3 } }],
      fleets: [
        {
          ...fleet,
          id: 'a',
          name: 'Incoming',
          shipUnits: [],
          position: { q: 7, r: -4 },
          destination: { q: 8, r: -4 },
          joinFleetId: 'b',
        },
        { ...fleet, id: 'b', name: 'Target', shipUnits: [] },
      ],
    });
    game.startTurn();
    for (let step = 0; !game.tacticalBattle && step < 20; step++) {
      if (game.phase === 'interrupted') game.continueTurn();
      game.applyFrame(game.nextTurnFrame()!);
    }
    completeTacticalBattles(game);
    expect(game.fleet('a')).toBeNull();
    expect(game.interruption!.battles![0]!.fleetId).toBe('b');
    expect(Game.restore(game.exportState()).exportState()).toEqual(
      game.exportState(),
    );
  });

  it('skeppsvis-retratt: resuming a loaded transport retains its shipment and restores the delivery destination', () => {
    const state = tradeNetworkState();
    const fleet = state.fleets.find((f) => f.id === 'freighters')!;
    const game = Game.restore({
      ...state,
      fleets: [
        {
          ...fleet,
          ordersPaused: true,
          routeId: 'route-test',
          position: { q: 0, r: 0 },
          destination: null,
        },
      ],
      shipments: [
        {
          id: 'cargo',
          resource: 'Iron',
          amount: 10,
          path: ['sol-0', 'sol-1'],
          stage: 0,
          projectId: 'vesta-mine',
          recipient: 'sol-1',
          fleetId: fleet.id,
          committed: true,
        },
      ],
    });
    game.resumeFleetOrders(fleet.id);
    expect(game.fleet(fleet.id)!.destination).toEqual(
      game.galaxy.systems[0]!.planets[1]!.position,
    );
    expect(game.exportState().shipments[0]!.fleetId).toBe(fleet.id);
    expect(game.fleet(fleet.id)!.ordersPaused).toBeUndefined();
  });

  it('vaxelvisa-skeppsaktiveringar: one towed wreck slows one individual tug instead of every Salvage ship', () => {
    const state = encounterGame().exportState();
    const first = state.fleets[0]!;
    const game = Game.restore({
      ...state,
      phase: 'planning',
      simulation: null,
      pirates: [{ ...state.pirates![0]!, position: { q: 8, r: -3 } }],
      salvage: {
        ...state.salvage!,
        wrecks: [
          {
            ...state.salvage!.wrecks[0]!,
            position: new HexCoordinate(first.position!.q, first.position!.r),
            towedBy: first.id,
            reservedBy: first.id,
          },
        ],
      },
      fleets: [
        {
          ...first,
          shipUnits: [],
          ships: { ...first.ships, 'Salvage ship': 2 },
        },
      ],
    });
    game.startTurn();
    for (let step = 0; !game.tacticalBattle && step < 20; step++) {
      if (game.phase === 'interrupted') game.continueTurn();
      game.applyFrame(game.nextTurnFrame()!);
    }
    expect(
      game
        .tacticalBattle!.pieces.filter((p) => p.type === 'Salvage ship')
        .map((p) => p.movement)
        .sort(),
    ).toEqual([1, 3]);
  });

  it('gemensamt-stridsdeltagande / sparad-taktisk-strid: pauses with all ships, locks orders, and cannot skip a battle', () => {
    const game = encounterGame();
    const state = game.exportState();
    expect(game.tacticalBattle!.pieces).toHaveLength(4);
    expect(game.canIssueFleetOrders('fleet-home')).toBe(false);
    expect(() => game.continueTurn()).toThrow('tactical combat');
    expect(game.fleet('fleet-home')!.ships.Fighter).toBe(2);
    expect(
      game.events.filter((e) => e.text.startsWith('Combat at')),
    ).toHaveLength(0);
    const restored = Game.restore(
      JSON.parse(JSON.stringify(state)) as GameState,
    );
    expect(restored.exportState()).toEqual(state);
    game.commandBattle({ type: 'auto-deploy' });
    const deployed = Game.restore(game.exportState());
    expect(deployed.tacticalBattle).toEqual(game.tacticalBattle);
    for (const subject of [game, deployed]) {
      subject.commandBattle({ type: 'start' });
      completeTacticalBattles(subject);
    }
    expect(deployed.exportState()).toEqual(game.exportState());
    expect(game.interruption!.battles).toHaveLength(1);
  });

  it('riktning-och-vapen / vrak-efter-strid: destroys the targeted ship with its own equipment, and applies losses once', () => {
    let game = encounterGame();
    const units = game.fleet('fleet-home')!.shipUnits!;
    const fighters = units.filter((p) => p.type === 'Fighter');
    const victimId = fighters[1]!.id;
    game = arrangeBattle(game, (state) => ({
      ...state,
      asteroids: [],
      phase: 'fighting',
      round: 2,
      turn: 'enemy',
      random: 12345,
      activation: null,
      pieces: state.pieces.map((p, index) => ({
        ...p,
        hull: p.id === victimId ? 1 : p.hull,
        position: {
          q: p.id === victimId ? 1 : p.side === 'enemy' ? 3 : 7 + index,
          r: 2,
        },
        facing: p.side === 'enemy' ? 3 : 0,
      })),
    }));
    game.playBattleActivation();
    expect(
      game.tacticalBattle!.pieces.find((p) => p.id === victimId)!.status,
    ).toBe('destroyed');
    expect(game.fleet('fleet-home')!.ships.Fighter).toBe(2);
    game = arrangeBattle(game, (state) => ({
      ...state,
      random: 12345,
      turn: 'player',
      activation: null,
      pieces: state.pieces.map((p, index) => ({
        ...p,
        activated: false,
        hull: p.side === 'enemy' ? 1 : p.hull,
        position:
          p.status === 'destroyed'
            ? p.position
            : {
                q:
                  p.side === 'enemy'
                    ? 3
                    : p.id === fighters[0]!.id
                      ? 1
                      : 7 + index,
                r: 2,
              },
        facing: 0,
      })),
    }));
    game.commandBattle({ type: 'activate', id: fighters[0]!.id });
    game.commandBattle({
      type: 'fire',
      at: game.tacticalBattle!.pieces.find((p) => p.side === 'enemy')!.position!,
      weapon: 'Cannon',
    });
    expect(game.tacticalBattle).toBeNull();
    expect(game.fleet('fleet-home')!.shipUnits).not.toContainEqual(fighters[1]);
    expect(game.fleet('fleet-home')!.shipUnits).toContainEqual(fighters[0]);
    expect(game.wrecks.find((w) => w.ship.id === victimId)!.ship).toEqual(
      fighters[1],
    );
    expect(game.interruption!.battles![0]!.fleetIds).toEqual(['fleet-home']);
    const combatEvent = game.events.find((event) =>
      event.text.startsWith('Combat at HEX'),
    )!;
    expect(
      combatEvent.combatLog!.findLast((line) => line.includes('D6 [')),
    ).toContain('Cannon');
    const saved = game.exportState();
    expect(Game.restore(saved).exportState()).toEqual(saved);
    expect(() => game.playBattleActivation()).toThrow();
    expect(game.interruption!.battles![0]!.wreckIds).toHaveLength(2);
  });

  it('skeppsvis-retratt: escaping one ship regroups the original fleet and spends its remaining year movement', () => {
    let game = encounterGame();
    const retreat = game
      .exportState()
      .simulation!.tacticalBattles![0]!.fleets.find(
        (f) => f.side === 'player',
      )!.retreat!;
    game = arrangeBattle(game, (state) => ({
      ...state,
      asteroids: [],
      phase: 'fighting',
      round: 2,
      turn: 'player',
      activation: null,
      pieces: state.pieces.map((p, index) => ({
        ...p,
        position:
          p.type === 'Transport ship'
            ? battleHex(0, 4)
            : battleHex(index + 5, 4),
        facing: p.type === 'Transport ship' ? 3 : p.side === 'player' ? 0 : 3,
      })),
    }));
    const transport = game.tacticalBattle!.pieces.find(
      (p) => p.type === 'Transport ship',
    )!;
    game.commandBattle({ type: 'activate', id: transport.id });
    game.commandBattle({ type: 'forward' });
    expect(
      game.tacticalBattle!.pieces.find((p) => p.id === transport.id)!.status,
    ).toBe('escaped');
    completeTacticalBattles(game);
    expect(game.fleet('fleet-home')!.position).toMatchObject(retreat);
    expect(game.fleet('fleet-home')!.ships['Transport ship']).toBe(1);
    expect(game.fleet('fleet-home')!.destination).toBeNull();
    expect(game.fleet('fleet-home')!.remainingMovement).toBe(0);
    expect(Game.restore(game.exportState()).fleet('fleet-home')).toEqual(
      game.fleet('fleet-home'),
    );
  });

  it('taktisk-stridskarta / stridsutplacering: expands to fit large fleets with no reserves or overlapping deployment', () => {
    const battle = TacticalBattle.create(
      'large',
      { q: 0, r: 0 },
      (['player', 'enemy'] as const).map((side) => ({
        id: side,
        side,
        retreat: null,
        ships: Array.from({ length: 160 }, (_, i) => ({
          id: `${side}-${i}`,
          type: 'Fighter' as const,
          ion: false,
        })),
      })),
      234,
    );
    battle.command({ type: 'auto-deploy' });
    const deployed = battle.snapshot;
    expect(deployed.pieces).toHaveLength(320);
    expect(
      new Set(deployed.pieces.map((p) => `${p.position!.q},${p.position!.r}`))
        .size,
    ).toBe(320);
    expect(
      deployed.pieces.every((p) => battle.isDeployment(p.position!, p.side)),
    ).toBe(true);
    expect(
      deployed.asteroids.every(
        (p) =>
          !battle.isDeployment(p, 'player') && !battle.isDeployment(p, 'enemy'),
      ),
    ).toBe(true);
    expect(TacticalBattle.restore(deployed).snapshot).toEqual(deployed);
  });

  it('sparad-taktisk-strid: older saves retain ships, history and equipment without introducing a battle', () => {
    const state = new Game(createExampleGalaxy()).exportState();
    const older = { ...state, version: 12 as const };
    const restored = Game.restore(older).exportState();
    expect(restored.fleets).toEqual(state.fleets);
    expect(restored.events).toEqual(state.events);
    expect(restored.pirates).toEqual(state.pirates);
    expect(restored.version).toBe(13);
  });
});
