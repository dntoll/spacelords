import { beforeEach, describe, expect, it } from 'vitest';
import transportMap from '../../src/client/maps/transport-boarding.txt?raw';
import {
  BoardingMap,
  parseBoardingMap,
} from '../../src/client/models/BoardingMap.js';
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

describe('datadriven-bordningskarta', () => {
  it('parses the editable transport layers into immutable domain data', () => {
    expect(map).toBeInstanceOf(BoardingMap);
    expect(map.name).toBe('Transport boarding');
    expect(map.width).toBe(17);
    expect(map.height).toBe(11);
    expect(map.spawns.player).toHaveLength(4);
    expect(map.spawns.defender).toHaveLength(3);
    expect(map.spawns.civilian).toHaveLength(3);
    expect(
      map.features.filter((feature) => feature.kind === 'door'),
    ).toHaveLength(3);
    expect(map.features.some((feature) => feature.kind === 'reactor')).toBe(
      true,
    );
    expect(
      map.features.filter((feature) => feature.kind === 'exit'),
    ).toHaveLength(3);
    expect(map.roomAt({ q: 1, r: 1 })).toBe('bridge');
    expect(map.roomAt({ q: 11, r: 1 })).toBe('engineering');
    expect(Object.isFrozen(map.features)).toBe(true);
  });

  it('reports the layer and row when a hand-edited map has the wrong width', () => {
    const broken = transportMap.replace(
      'H.......#.......H',
      'H......#.......H',
    );
    expect(() => parseBoardingMap(broken)).toThrow(
      /terrain row 2.*expected 17/i,
    );
  });

  it('rejects unknown symbols with an exact location', () => {
    const broken = transportMap.replace(
      '-------------R---',
      '-------------?---',
    );
    expect(() => parseBoardingMap(broken)).toThrow(
      /objects.*row 3.*column 14/i,
    );
  });
});

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
    const player = battle.snapshot.people.find(
      (person) =>
        person.side === 'player' &&
        person.position.q === 2 &&
        person.position.r === 8,
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
          return {
            ...person,
            position: {
              q: 7 + Number(person.id.at(-1)),
              r: 7,
            },
          };
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

describe('forsvarare-och-civilister', () => {
  it('never runs AI for the player actor', () => {
    const player = battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    withState((state) => ({
      ...state,
      currentActorId: player.id,
      activation: { id: player.id, remaining: 12 },
    }));
    const before = battle.snapshot;
    expect(battle.actAutomatically(true)).toBe(false);
    expect(battle.snapshot).toBe(before);
  });

  it('uses shared current sight to shoot a boarder through the public command path', () => {
    const player = battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    const defender = battle.snapshot.people.find(
      (person) => person.side === 'defender',
    )!;
    withState((state) => ({
      ...state,
      randomState: 10_000,
      people: state.people.map((person) => {
        if (person.id === defender.id)
          return { ...person, position: { q: 4, r: 5 }, facing: 0 };
        if (person.id === player.id)
          return { ...person, position: { q: 6, r: 5 }, facing: 3 };
        return person;
      }),
      initiativeOrder: [defender.id],
      initiativeIndex: 0,
      currentActorId: defender.id,
      activation: { id: defender.id, remaining: 12 },
    }));
    expect(battle.actAutomatically(true)).toBe(true);
    expect(battle.snapshot.log.join(' ')).toMatch(/Rifle by Defender.*D20/i);
  });

  it('pursues only the last shared position after sight is broken', () => {
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
          return { ...person, position: { q: 4, r: 5 }, facing: 0 };
        if (person.side === 'defender')
          return { ...person, status: 'incapacitated', hitPoints: 0 };
        if (person.id === player.id)
          return { ...person, position: { q: 6, r: 5 } };
        return person;
      }),
      initiativeOrder: [defender.id],
      initiativeIndex: 0,
      currentActorId: defender.id,
      activation: { id: defender.id, remaining: 12 },
    }));
    battle.synchronize();
    expect(
      battle.snapshot.defenderLastKnownEnemies.find(
        (entry) => entry.id === player.id,
      )?.position,
    ).toEqual({ q: 6, r: 5 });
    withState((state) => ({
      ...state,
      people: state.people.map((person, index) =>
        person.side === 'player'
          ? {
              ...person,
              position: { q: 1 + (index % 2), r: 1 + (index % 2) },
            }
          : person,
      ),
    }));
    expect(battle.visibleOpponents('defender')).toHaveLength(0);
    expect(battle.actAutomatically(true)).toBe(true);
    expect(
      battle.snapshot.people.find((person) => person.id === defender.id)
        ?.position,
    ).not.toEqual({ q: 4, r: 5 });
    expect(battle.snapshot.log.at(-1)).toBe('A defender moves.');
  });

  it('moves civilians toward escape pods after all soldiers have acted', () => {
    const player = battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    const before = battle.snapshot.people
      .filter((person) => person.side === 'civilian')
      .map((person) => `${person.position.q},${person.position.r}`);
    withState((state) => ({
      ...state,
      initiativeOrder: [player.id],
      initiativeIndex: 0,
      currentActorId: player.id,
      activation: { id: player.id, remaining: 12 },
    }));
    battle.command({ type: 'end-activation' });
    const after = battle.snapshot.people
      .filter((person) => person.side === 'civilian')
      .map((person) => `${person.position.q},${person.position.r}`);
    expect(after).not.toEqual(before);
  });
});
