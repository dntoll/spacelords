import { describe, expect, it } from 'vitest';
import {
  Game,
  type GameState,
} from '../../../src/client/space-map/models/Game.js';
import {
  TacticalBattle,
  battleHex,
} from '../../../src/client/space-battle/models/TacticalBattle.js';
import { completeTacticalBattles } from '../../fixtures/tactical-combat.js';
import {
  arrangeBattle,
  encounterGame,
} from '../../fixtures/battle-checkpoint.js';

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
    const victim = game.tacticalBattle!.pieces.find((p) => p.id === victimId)!;
    expect(['destroyed', 'wreck']).toContain(victim.status);
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
          p.status === 'wreck'
            ? { q: p.side === 'player' ? 4 : 5, r: 6 }
            : p.status === 'destroyed'
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
      at: game.tacticalBattle!.pieces.find(
        (p) => p.side === 'enemy' && p.status === 'active',
      )!.position!,
      weapon: 'Cannon',
    });
    expect(game.tacticalBattle).toBeNull();
    expect(game.fleet('fleet-home')!.shipUnits).not.toContainEqual(fighters[1]);
    expect(game.fleet('fleet-home')!.shipUnits).toContainEqual(fighters[0]);
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
            ? battleHex(Math.floor(state.width / 2), 1)
            : battleHex(index + 5, 4),
        facing: p.type === 'Transport ship' ? 2 : p.side === 'player' ? 0 : 3,
        movement: p.type === 'Transport ship' ? 3 : p.movement,
        speed: p.type === 'Transport ship' ? 3 : (p.speed ?? 0),
      })),
    }));
    const transport = game.tacticalBattle!.pieces.find(
      (p) => p.type === 'Transport ship',
    )!;
    game.commandBattle({ type: 'activate', id: transport.id });
    game.commandBattle({ type: 'maneuver', speed: 0, direction: 0 });
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
});
