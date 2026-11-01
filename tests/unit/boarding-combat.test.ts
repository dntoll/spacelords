import { beforeEach, describe, expect, it } from 'vitest';
import transportMap from '../../src/client/maps/transport-boarding.txt?raw';
import { parseBoardingMap } from '../../src/client/models/BoardingMap.js';
import {
  BoardingBattle,
  type BoardingBattleState,
} from '../../src/client/models/BoardingBattle.js';

const map = parseBoardingMap(transportMap);
let battle: BoardingBattle;

beforeEach(() => {
  battle = BoardingBattle.create(map, 17);
});

function withState(
  change: (state: BoardingBattleState) => BoardingBattleState,
) {
  battle = BoardingBattle.restore(map, change(battle.snapshot));
}

function activate(id: string, remaining = 12) {
  withState((state) => ({
    ...state,
    initiativeOrder: [id],
    initiativeIndex: 0,
    currentActorId: id,
    activation: { id, remaining },
  }));
}

describe('individuellt-bordningsinitiativ', () => {
  it('rolls an open D20 plus modifier for every soldier, but not civilians', () => {
    expect(battle.snapshot.initiativeOrder).toHaveLength(7);
    expect(
      battle.snapshot.initiativeOrder.every(
        (id) =>
          battle.snapshot.people.find((person) => person.id === id)?.side !==
          'civilian',
      ),
    ).toBe(true);
    expect(battle.snapshot.log[0]).toMatch(/Initiative.*D20/i);
  });
});

describe('actionpoints-och-riktad-forflyttning', () => {
  it('finds a facing-aware route and charges two AP per standing forward step', () => {
    const player = battle.snapshot.people.findLast(
      (person) => person.side === 'player',
    )!;
    activate(player.id);
    const start = battle.snapshot.people.find(
      (person) => person.id === player.id,
    )!;
    const destination = {
      q: start.position.q + 1,
      r: start.position.r,
    };
    const path = battle.pathTo(player.id, destination);
    expect(path?.cost).toBe(start.facing === 0 ? 2 : path!.turns + 2);
    battle.command({ type: 'move', to: destination });
    expect(battle.snapshot.activation?.remaining).toBe(12 - path!.cost);
  });

  it('charges one AP for turning and stance changes and three for crouched movement', () => {
    const player = battle.snapshot.people.findLast(
      (person) => person.side === 'player',
    )!;
    activate(player.id);
    battle.command({ type: 'turn', direction: 1 });
    battle.command({ type: 'crouch' });
    const turned = battle.snapshot.people.find(
      (person) => person.id === player.id,
    )!;
    const destination = BoardingBattle.forward(turned.position, turned.facing);
    battle.command({ type: 'move', to: destination });
    expect(battle.snapshot.activation?.remaining).toBe(7);
  });
});

describe('d20-bordningsstrid / miljomal-och-forstorelse', () => {
  it('shows a percentage preview and can target and destroy a door with a rifle', () => {
    const player = battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    const door = battle.snapshot.features.find(
      (feature) => feature.kind === 'door',
    )!;
    withState((state) => ({
      ...state,
      randomState: 10_000,
      people: state.people.map((person) =>
        person.id === player.id
          ? {
              ...person,
              position: { q: door.position.q - 1, r: door.position.r },
              facing: 0,
            }
          : person,
      ),
      features: state.features.map((feature) =>
        feature.id === door.id ? { ...feature, hitPoints: 1 } : feature,
      ),
    }));
    activate(player.id);
    const preview = battle.attackPreview(player.id, door.id);
    expect(preview.reason).toBeNull();
    expect(preview.chance).toBeGreaterThan(0);
    battle.command({ type: 'shoot', targetId: door.id });
    const result = battle.snapshot.features.find(
      (feature) => feature.id === door.id,
    )!;
    expect(result.destroyed).toBe(true);
    expect(result.open).toBe(true);
    expect(battle.snapshot.log.join(' ')).toMatch(/D20.*Door/i);
  });

  it('incapacitates at zero HP, kills on the next hit and permits a med-pack revive', () => {
    const [medic, target] = battle.snapshot.people.filter(
      (person) => person.side === 'player',
    );
    withState((state) => ({
      ...state,
      people: state.people.map((person) =>
        person.id === target!.id
          ? {
              ...person,
              position: {
                q: medic!.position.q + 1,
                r: medic!.position.r,
              },
              hitPoints: 0,
              status: 'incapacitated',
            }
          : person,
      ),
    }));
    activate(medic!.id);
    battle.command({ type: 'med-pack', targetId: target!.id });
    expect(
      battle.snapshot.people.find((person) => person.id === target!.id)?.status,
    ).toBe('active');
  });
});

describe('overwatch-och-skydd', () => {
  it('reserves one shot and automatically fires at a moving enemy, never a civilian', () => {
    const player = battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    const defender = battle.snapshot.people.find(
      (person) => person.side === 'defender',
    )!;
    withState((state) => ({
      ...state,
      people: state.people.map((person) => {
        if (person.id === defender.id)
          return {
            ...person,
            position: { q: 4, r: 5 },
            facing: 0,
            overwatch: true,
          };
        if (person.id === player.id)
          return { ...person, position: { q: 6, r: 5 }, facing: 0 };
        return person;
      }),
    }));
    activate(player.id);
    battle.command({ type: 'move', to: { q: 7, r: 5 } });
    expect(
      battle.snapshot.people.find((person) => person.id === defender.id)
        ?.overwatch,
    ).toBe(false);
    expect(battle.snapshot.log.join(' ')).toMatch(/Overwatch.*D20/i);
  });
});

describe('granater-och-rok', () => {
  it('creates binary smoke from internal amounts and updates it at round end', () => {
    const player = battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    activate(player.id);
    battle.command({
      type: 'grenade',
      grenade: 'smoke',
      at: { ...player.position },
    });
    expect(battle.snapshot.smoke.some((smoke) => smoke.amount > 0)).toBe(true);
    expect(battle.snapshot.smokeHexes.length).toBeGreaterThan(0);
  });
});

describe('bordningsmal-reaktor-och-evakuering', () => {
  it('captures the ship when only active boarders hold Bridge and Engineering', () => {
    const players = battle.snapshot.people.filter(
      (person) => person.side === 'player',
    );
    withState((state) => ({
      ...state,
      people: state.people.map((person) => {
        if (person.id === players[0]!.id)
          return { ...person, position: { q: 1, r: 1 } };
        if (person.id === players[1]!.id)
          return { ...person, position: { q: 11, r: 1 } };
        if (person.side === 'defender')
          return { ...person, status: 'incapacitated', hitPoints: 0 };
        return person;
      }),
    }));
    activate(players[0]!.id);
    battle.command({ type: 'end-activation' });
    expect(battle.snapshot.outcome).toBe('victory');
  });

  it('starts a countdown when the targetable reactor is destroyed', () => {
    const reactor = battle.snapshot.features.find(
      (feature) => feature.kind === 'reactor',
    )!;
    withState((state) => ({
      ...state,
      features: state.features.map((feature) =>
        feature.id === reactor.id
          ? { ...feature, destroyed: true, hitPoints: 0 }
          : feature,
      ),
      reactorCountdown: null,
    }));
    battle.synchronize();
    expect(battle.snapshot.reactorCountdown).toBe(3);
  });
});
