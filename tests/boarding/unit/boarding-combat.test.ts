import { beforeEach, describe, expect, it } from 'vitest';
import transportMap from '../../../src/client/boarding/maps/transport-boarding.txt?raw';
import {
  BoardingMap,
  parseBoardingMap,
} from '../../../src/client/boarding/models/map/BoardingMap.js';
import {
  BoardingBattle,
  boardingActionPointsRemaining,
  type BoardingBattleState,
} from '../../../src/client/boarding/models/battle/BoardingBattle.js';

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
  const objectLayer =
    transportMap.split('[objects]')[1]?.split(/\n\[/)[0] ?? '';
  const objectCount = (marker: string) =>
    [...objectLayer].filter((symbol) => symbol === marker).length;

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
    ).toHaveLength(objectCount('D') + objectCount('L'));
    expect(map.features.some((feature) => feature.kind === 'reactor')).toBe(
      true,
    );
    expect(
      map.features.filter((feature) => feature.kind === 'exit'),
    ).toHaveLength(objectCount('X') + objectCount('B'));
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

describe('senast-sedd-fiende-med-fragetecken', () => {
  const hiddenFloor = () => {
    const visible = new Set(
      battle.snapshot.visibleCells.map((cell) => `${cell.q},${cell.r}`),
    );
    for (let r = 0; r < map.height; r++)
      for (let q = 0; q < map.width; q++)
        if (map.terrainAt({ q, r }) === 'floor' && !visible.has(`${q},${r}`))
          return { q, r };
    throw new Error('Expected a hidden floor cell');
  };

  it('keeps an incapacitated enemy remembered but removes a dead enemy', () => {
    const defender = battle.snapshot.people.find(
      (person) => person.side === 'defender',
    )!;
    const hidden = hiddenFloor();
    withState((state) => ({
      ...state,
      people: state.people.map((person) =>
        person.id === defender.id
          ? {
              ...person,
              position: hidden,
              status: 'incapacitated' as const,
              hitPoints: 0,
            }
          : person,
      ),
      lastKnownEnemies: [{ id: defender.id, position: hidden }],
    }));
    battle.synchronize();
    expect(battle.snapshot.lastKnownEnemies).toContainEqual({
      id: defender.id,
      position: hidden,
    });
    withState((state) => ({
      ...state,
      people: state.people.map((person) =>
        person.id === defender.id
          ? { ...person, status: 'dead' as const }
          : person,
      ),
    }));
    battle.synchronize();
    expect(
      battle.snapshot.lastKnownEnemies.some(
        (entry) => entry.id === defender.id,
      ),
    ).toBe(false);
  });

  it('clears a stale position when that tile is observed empty', () => {
    const player = battle.snapshot.people.find(
      (person) => person.side === 'player' && person.status === 'active',
    )!;
    const defender = battle.snapshot.people.find(
      (person) => person.side === 'defender',
    )!;
    const hidden = hiddenFloor();
    withState((state) => ({
      ...state,
      people: state.people.map((person) =>
        person.id === defender.id ? { ...person, position: hidden } : person,
      ),
      lastKnownEnemies: [{ id: defender.id, position: player.position }],
    }));
    battle.synchronize();
    expect(battle.snapshot.lastKnownEnemies).not.toContainEqual({
      id: defender.id,
      position: player.position,
    });
  });
});

describe('actionpoints-och-riktad-forflyttning', () => {
  it('preserves the four saved cardinal directions for the square grid', () => {
    const origin = { q: 5, r: 5 };
    expect(
      [0, 1, 2, 3].map((facing) => BoardingBattle.forward(origin, facing)),
    ).toEqual([
      { q: 6, r: 5 },
      { q: 5, r: 4 },
      { q: 4, r: 5 },
      { q: 5, r: 6 },
    ]);
  });

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

  it('billig-vandning: charges a quarter AP per turn, one per stance change and four for crouched diagonal movement', () => {
    const player = battle.snapshot.people.findLast(
      (person) => person.side === 'player',
    )!;
    withState((state) => ({
      ...state,
      people: state.people.map((person) =>
        person.id === player.id
          ? { ...person, position: { q: 5, r: 5 }, facing: 0 }
          : person,
      ),
    }));
    activate(player.id);
    battle.command({ type: 'turn', direction: 1 });
    battle.command({ type: 'crouch' });
    const turned = battle.snapshot.people.find(
      (person) => person.id === player.id,
    )!;
    const destination = BoardingBattle.forward(turned.position, turned.facing);
    battle.command({ type: 'move', to: destination });
    expect(battle.snapshot.activation?.remaining).toBe(6.75);
  });
});

describe('animerad-bordningsforflyttning', () => {
  it('records a visible frame after each path turn and step', () => {
    const player = battle.snapshot.people.find(
      (person) =>
        person.side === 'player' &&
        person.position.q === 1 &&
        person.position.r === 8,
    )!;
    withState((state) => ({
      ...state,
      people: state.people.map((person) =>
        person.id === player.id ? { ...person, facing: 0 } : person,
      ),
    }));
    activate(player.id);
    const start = battle.snapshot.people.find(
      (person) => person.id === player.id,
    )!;
    const startVisible = battle.snapshot.visibleCells;
    const destination = { q: 1, r: 7 };
    const path = battle.pathTo(player.id, destination);
    expect(path?.steps.some((step) => step.type === 'turn')).toBe(true);
    battle.command({ type: 'move', to: destination });
    expect(battle.presentation).toHaveLength(path!.steps.length);
    const turnIndex = path!.steps.findIndex((step) => step.type === 'turn');
    const turnFrame = battle.presentation[turnIndex]!;
    const turned = turnFrame.people.find((person) => person.id === player.id)!;
    expect(turned.facing).not.toBe(start.facing);
    expect(turned.position).toEqual(start.position);
    expect(turnFrame.visibleCells).not.toEqual(startVisible);
    expect(battle.snapshot).not.toHaveProperty('presentation');
  });

  it('records visible frames when a seen defender steps', () => {
    const player = battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    const defender = battle.snapshot.people.find(
      (person) => person.side === 'defender',
    )!;
    withState((state) => ({
      ...state,
      features: state.features.map((feature) => ({
        ...feature,
        destroyed: true,
      })),
      people: state.people.map((person) => {
        if (person.id === player.id)
          return { ...person, position: { q: 2, r: 5 }, facing: 0 };
        if (person.id === defender.id)
          return { ...person, position: { q: 4, r: 5 }, facing: 0 };
        return { ...person, status: 'dead' };
      }),
    }));
    battle.synchronize();
    activate(defender.id);
    battle.command({ type: 'move', to: { q: 5, r: 5 } });
    expect(battle.presentation.length).toBeGreaterThan(0);
    expect(
      battle.presentation.some((frame) =>
        frame.people.some((person) => person.id === defender.id),
      ),
    ).toBe(true);
  });

  it('keeps hidden defenders and civilians out of movement frames', () => {
    const player = battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    const defender = battle.snapshot.people.find(
      (person) => person.side === 'defender',
    )!;
    withState((state) => ({
      ...state,
      people: state.people.map((person) => {
        if (person.id === player.id)
          return { ...person, position: { q: 2, r: 8 }, facing: 2 };
        if (person.id === defender.id)
          return { ...person, position: { q: 12, r: 2 }, facing: 0 };
        if (person.side === 'civilian')
          return { ...person, position: { q: 14, r: 1 }, facing: 0 };
        return person;
      }),
    }));
    battle.synchronize();
    activate(defender.id);
    battle.command({ type: 'move', to: { q: 12, r: 3 } });
    expect(battle.presentation).toEqual([]);
  });

  it('records visible frames when a seen civilian steps', () => {
    const player = battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    const civilian = battle.snapshot.people.find(
      (person) => person.side === 'civilian',
    )!;
    withState((state) => ({
      ...state,
      features: state.features.map((feature) =>
        feature.kind === 'door' ? { ...feature, open: true } : feature,
      ),
      people: state.people.map((person) => {
        if (person.id === player.id)
          return { ...person, position: { q: 5, r: 7 }, facing: 0 };
        if (person.id === civilian.id)
          return { ...person, position: { q: 6, r: 7 }, facing: 0 };
        if (person.side === 'defender')
          return { ...person, position: { q: 14, r: 1 }, facing: 2 };
        return person;
      }),
      initiativeOrder: [player.id],
      initiativeIndex: 0,
      currentActorId: player.id,
      activation: { id: player.id, remaining: 12 },
    }));
    battle.synchronize();
    battle.command({ type: 'end-activation' });
    expect(battle.presentation.length).toBeGreaterThan(0);
    expect(
      battle.presentation.some((frame) =>
        frame.people.some((person) => person.id === civilian.id),
      ),
    ).toBe(true);
  });
});

describe('sikt-minne-och-ljudmarkorer', () => {
  it('sees a 180 degree cone including side tiles but not behind', () => {
    const player = battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    withState((state) => ({
      ...state,
      features: state.features.map((feature) => ({
        ...feature,
        destroyed: true,
      })),
      people: state.people.map((person) =>
        person.id === player.id
          ? { ...person, position: { q: 3, r: 5 }, facing: 0 }
          : { ...person, status: 'dead' },
      ),
    }));
    battle.synchronize();
    const visible = new Set(
      battle.snapshot.visibleCells.map((cell) => `${cell.q},${cell.r}`),
    );
    expect(visible.has('4,5')).toBe(true);
    expect(visible.has('3,4')).toBe(true);
    expect(visible.has('3,6')).toBe(true);
    expect(visible.has('2,5')).toBe(false);
  });

  it('rejects rifle fire behind the soldier as outside the 180° field of fire', () => {
    const player = battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    const defender = battle.snapshot.people.find(
      (person) => person.side === 'defender',
    )!;
    withState((state) => ({
      ...state,
      features: state.features.map((feature) => ({
        ...feature,
        destroyed: true,
      })),
      people: state.people.map((person) => {
        if (person.id === player.id)
          return { ...person, position: { q: 3, r: 5 }, facing: 0 };
        if (person.id === defender.id)
          return { ...person, position: { q: 2, r: 5 } };
        return { ...person, status: 'dead' };
      }),
    }));
    expect(battle.attackPreview(player.id, defender.id).reason).toBe(
      'The target is outside the 180° field of fire.',
    );
    withState((state) => ({
      ...state,
      people: state.people.map((person) =>
        person.id === defender.id
          ? { ...person, position: { q: 3, r: 4 } }
          : person,
      ),
    }));
    expect(battle.attackPreview(player.id, defender.id).reason).not.toBe(
      'The target is outside the 180° field of fire.',
    );
  });
});

describe('personer-blockerar-inte-sikt', () => {
  function openCorridor(
    playerId: string,
    blockerId: string,
    defenderId: string,
    blocker: 'civilian' | 'defender',
  ) {
    withState((state) => ({
      ...state,
      features: state.features.map((feature) => ({
        ...feature,
        destroyed: true,
      })),
      people: state.people.map((person) => {
        if (person.id === playerId)
          return { ...person, position: { q: 2, r: 5 }, facing: 0 };
        if (person.id === blockerId)
          return {
            ...person,
            position: { q: 3, r: 5 },
            side: blocker,
            status: 'active',
          };
        if (person.id === defenderId)
          return { ...person, position: { q: 4, r: 5 }, facing: 2 };
        return { ...person, status: 'dead' };
      }),
    }));
    battle.synchronize();
  }

  // personer-som-pelare-i-sikt replaces the old rule: a standing person right
  // in front now hides the tile behind as well as blocking the shot.
  it('personer-som-pelare-i-sikt: hides and protects a soldier straight behind a standing person', () => {
    const player = battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    const civilian = battle.snapshot.people.find(
      (person) => person.side === 'civilian',
    )!;
    const defender = battle.snapshot.people.find(
      (person) => person.side === 'defender',
    )!;
    openCorridor(player.id, civilian.id, defender.id, 'civilian');
    const visible = new Set(
      battle.snapshot.visibleCells.map((cell) => `${cell.q},${cell.r}`),
    );
    expect(visible.has('4,5')).toBe(false);
    expect(battle.attackPreview(player.id, defender.id).reason).toBe(
      'The shot is blocked.',
    );
  });

  it('personer-som-pelare-i-sikt: lets a soldier block sight and fire the same way a civilian does', () => {
    const player = battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    const [blocker, target] = battle.snapshot.people.filter(
      (person) => person.side === 'defender',
    );
    openCorridor(player.id, blocker!.id, target!.id, 'defender');
    expect(battle.attackPreview(player.id, target!.id).reason).toBe(
      'The shot is blocked.',
    );
    expect(
      battle.snapshot.visibleCells.some((cell) => cell.q === 4 && cell.r === 5),
    ).toBe(false);
  });

  it('still hides tiles behind walls from both sight and fire', () => {
    const player = battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    const defender = battle.snapshot.people.find(
      (person) => person.side === 'defender',
    )!;
    const wall = battle.snapshot.features.find(
      (feature) => feature.kind === 'wall',
    )!;
    withState((state) => ({
      ...state,
      features: state.features.map((feature) =>
        feature.id === wall.id
          ? { ...feature, position: { q: 3, r: 5 }, destroyed: false }
          : { ...feature, destroyed: true },
      ),
      people: state.people.map((person) =>
        person.id === player.id
          ? { ...person, position: { q: 2, r: 5 }, facing: 0 }
          : person.id === defender.id
            ? { ...person, position: { q: 4, r: 5 } }
            : { ...person, status: 'dead' },
      ),
    }));
    battle.synchronize();
    expect(
      battle.snapshot.visibleCells.some((cell) => cell.q === 4 && cell.r === 5),
    ).toBe(false);
    expect(battle.attackPreview(player.id, defender.id).reason).toBe(
      'The shot is blocked.',
    );
  });

  it('keeps overwatch when a person blocks the shot', () => {
    const player = battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    const civilian = battle.snapshot.people.find(
      (person) => person.side === 'civilian',
    )!;
    const defender = battle.snapshot.people.find(
      (person) => person.side === 'defender',
    )!;
    withState((state) => ({
      ...state,
      features: state.features.map((feature) => ({
        ...feature,
        destroyed: true,
      })),
      people: state.people.map((person) => {
        if (person.id === defender.id)
          return {
            ...person,
            position: { q: 2, r: 5 },
            facing: 0,
            overwatch: true,
          };
        if (person.id === civilian.id)
          return { ...person, position: { q: 4, r: 5 } };
        if (person.id === player.id)
          return { ...person, position: { q: 5, r: 5 }, facing: 0 };
        return { ...person, status: 'dead' };
      }),
    }));
    activate(player.id);
    battle.command({ type: 'move', to: { q: 6, r: 5 } });
    expect(
      battle.snapshot.people.find((person) => person.id === defender.id)
        ?.overwatch,
    ).toBe(true);
    expect(battle.snapshot.log.join(' ')).not.toMatch(/Overwatch.*D20/i);
  });
});

describe('doda-blockerar-inte-skott-eller-rorelse', () => {
  function corridorWithBody(
    playerId: string,
    bodyId: string,
    targetId: string,
    status: 'dead' | 'incapacitated',
  ) {
    withState((state) => ({
      ...state,
      features: state.features.map((feature) => ({
        ...feature,
        destroyed: true,
      })),
      people: state.people.map((person) => {
        if (person.id === playerId)
          return { ...person, position: { q: 2, r: 5 }, facing: 0 };
        if (person.id === bodyId)
          return {
            ...person,
            position: { q: 3, r: 5 },
            status,
            hitPoints: 0,
          };
        if (person.id === targetId)
          return { ...person, position: { q: 4, r: 5 }, facing: 2 };
        return { ...person, status: 'dead', hitPoints: 0 };
      }),
    }));
    battle.synchronize();
  }

  it.each(['dead', 'incapacitated'] as const)(
    'fires past a %s soldier at the fighter behind',
    (status) => {
      const player = battle.snapshot.people.find(
        (person) => person.side === 'player',
      )!;
      const [body, target] = battle.snapshot.people.filter(
        (person) => person.side === 'defender',
      );
      corridorWithBody(player.id, body!.id, target!.id, status);
      expect(battle.attackPreview(player.id, target!.id).reason).toBeNull();
    },
  );

  it.each(['dead', 'incapacitated'] as const)(
    'walks through a %s soldier onto the tile beyond',
    (status) => {
      const player = battle.snapshot.people.find(
        (person) => person.side === 'player',
      )!;
      const body = battle.snapshot.people.find(
        (person) => person.side === 'defender',
      )!;
      withState((state) => ({
        ...state,
        features: state.features.map((feature) => ({
          ...feature,
          destroyed: true,
        })),
        people: state.people.map((person) => {
          if (person.id === player.id)
            return { ...person, position: { q: 2, r: 5 }, facing: 0 };
          if (person.id === body.id)
            return {
              ...person,
              position: { q: 3, r: 5 },
              status,
              hitPoints: 0,
            };
          return { ...person, status: 'dead', hitPoints: 0 };
        }),
      }));
      const path = battle.pathTo(player.id, { q: 4, r: 5 });
      expect(path?.positions.some((cell) => cell.q === 3 && cell.r === 5)).toBe(
        true,
      );
      expect(path?.cost).toBeGreaterThan(0);
    },
  );
});

describe('sikt-och-eld-fran-vald-soldat', () => {
  it('personer-som-pelare-i-sikt: sees and can fire at a person but not at the tile hidden behind them', () => {
    const player = battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    const civilian = battle.snapshot.people.find(
      (person) => person.side === 'civilian',
    )!;
    withState((state) => ({
      ...state,
      features: state.features.map((feature) => ({
        ...feature,
        destroyed: true,
      })),
      people: state.people.map((person) => {
        if (person.id === player.id)
          return { ...person, position: { q: 2, r: 5 }, facing: 0 };
        if (person.id === civilian.id)
          return { ...person, position: { q: 3, r: 5 } };
        return { ...person, status: 'dead' };
      }),
    }));
    const key = (cell: { q: number; r: number }) => `${cell.q},${cell.r}`;
    const sight = new Set(battle.sightFrom(player.id).map(key));
    const fire = new Set(battle.fireFrom(player.id).map(key));
    expect(sight.has('3,5')).toBe(true);
    expect(sight.has('4,5')).toBe(false);
    expect(fire.has('3,5')).toBe(true);
    expect(fire.has('4,5')).toBe(false);
    expect(sight.has('2,5')).toBe(false);
  });
});

describe('hp-och-ap-ovanfor-soldater', () => {
  it('reports remaining AP for the active, postponed, finished and waiting soldiers', () => {
    const [first, second, third] = battle.snapshot.people.filter(
      (person) => person.side === 'player',
    );
    activate(first!.id, 7);
    battle.command({ type: 'select', id: second!.id });
    withState((state) => ({
      ...state,
      finishedActors: [third!.id],
    }));
    expect(boardingActionPointsRemaining(battle.snapshot, first!.id)).toBe(7);
    expect(battle.actionPointsRemaining(second!.id)).toBe(12);
    expect(boardingActionPointsRemaining(battle.snapshot, third!.id)).toBe(0);
  });
});

describe('avbrott-vid-ny-fiende', () => {
  it('stops the remaining path as soon as a new enemy enters sight', () => {
    const player = battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    const defender = battle.snapshot.people.find(
      (person) => person.side === 'defender',
    )!;
    withState((state) => ({
      ...state,
      people: state.people.map((person) => {
        if (person.id === player.id)
          return { ...person, position: { q: 3, r: 5 }, facing: 2 };
        if (person.id === defender.id)
          return { ...person, position: { q: 6, r: 5 }, facing: 2 };
        if (person.side === 'player')
          return { ...person, position: { q: 1, r: 9 }, facing: 2 };
        return { ...person, position: { q: 14, r: 1 }, facing: 0 };
      }),
    }));
    activate(player.id);
    const destination = { q: 5, r: 5 };
    const path = battle.pathTo(player.id, destination);
    expect(path?.steps.filter((step) => step.type === 'forward').length).toBe(
      2,
    );
    battle.command({ type: 'move', to: destination });
    const moved = battle.snapshot.people.find(
      (person) => person.id === player.id,
    )!;
    expect(moved.position).toEqual({ q: 3, r: 5 });
    expect(moved.facing).not.toBe(2);
    // billig-vandning: the two turns before the stop cost a quarter AP each.
    expect(battle.snapshot.activation?.remaining).toBe(11.5);
    expect(battle.snapshot.log.at(-1)).toMatch(/spots a new enemy and stops/i);
  });
});

describe('animerat-bordningsskott', () => {
  it('records a visible shot from the attacker to the target', () => {
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
    }));
    activate(player.id);
    battle.command({ type: 'shoot', targetId: door.id });
    expect(battle.shot).toEqual({
      from: { q: door.position.q - 1, r: door.position.r },
      to: door.position,
      presentationIndex: 0,
      hit: true,
    });
    expect(battle.snapshot).not.toHaveProperty('shot');
  });
});

describe('valbar-bordningssoldat', () => {
  it('lets a player postpone one soldier to move another out of the way', () => {
    const [first, second] = battle.snapshot.people.filter(
      (person) => person.side === 'player',
    );
    activate(first!.id);
    battle.command({ type: 'turn', direction: 1 });
    battle.command({ type: 'select', id: second!.id });
    expect(battle.snapshot.currentActorId).toBe(second!.id);
    expect(battle.snapshot.activation?.remaining).toBe(12);
    expect(battle.snapshot.postponed).toEqual([
      { id: first!.id, remaining: 11.75 },
    ]);
    battle.command({ type: 'end-activation' });
    expect(battle.snapshot.currentActorId).toBe(first!.id);
    expect(battle.snapshot.activation?.remaining).toBe(11.75);
  });
});

describe('d20-bordningsstrid / miljomal-och-forstorelse', () => {
  it('uses geometric shooting distance on the square grid', () => {
    const player = battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    const defender = battle.snapshot.people.find(
      (person) => person.side === 'defender',
    )!;
    withState((state) => ({
      ...state,
      features: state.features.map((feature) => ({
        ...feature,
        destroyed: true,
      })),
      people: state.people.map((person) =>
        person.id === player.id
          ? { ...person, position: { q: 2, r: 2 }, facing: 0 }
          : person.id === defender.id
            ? { ...person, position: { q: 7, r: 6 } }
            : { ...person, status: 'dead' },
      ),
    }));
    expect(battle.attackPreview(player.id, defender.id).reason).not.toBe(
      'The target is outside rifle range.',
    );
  });

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
  it('grants cover only when the obstacle is between shooter and target', () => {
    const player = battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    const defender = battle.snapshot.people.find(
      (person) => person.side === 'defender',
    )!;
    const cover = battle.snapshot.features.find(
      (feature) => feature.kind === 'cover',
    )!;
    const arrange = (coverPosition: { q: number; r: number }) =>
      withState((state) => ({
        ...state,
        features: state.features.map((feature) =>
          feature.id === cover.id
            ? { ...feature, position: coverPosition, destroyed: false }
            : { ...feature, destroyed: true },
        ),
        people: state.people.map((person) =>
          person.id === player.id
            ? { ...person, position: { q: 2, r: 5 }, facing: 0 }
            : person.id === defender.id
              ? { ...person, position: { q: 4, r: 5 }, crouched: false }
              : { ...person, status: 'dead' },
        ),
      }));
    arrange({ q: 3, r: 5 });
    const protectedDefense = battle.attackPreview(
      player.id,
      defender.id,
    ).defense;
    arrange({ q: 4, r: 4 });
    const exposedDefense = battle.attackPreview(player.id, defender.id).defense;
    expect(protectedDefense).toBe(exposedDefense + 2);
  });

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
    const shot = battle.shot!;
    const beforeShot = battle.presentation[shot.presentationIndex! - 1]!;
    expect(
      beforeShot.people.find((person) => person.id === player.id)?.position,
    ).toEqual(shot.to);
    expect(
      beforeShot.people.find((person) => person.id === player.id)?.hitPoints,
    ).toBe(player.hitPoints);
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
    const cells = battle.snapshot.smokeCells;
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.length).toBeLessThanOrEqual(9);
    // ingen-rok-i-hela-vaggar: the spawn tile borders walls that stay clear.
    expect(
      cells.some((cell) =>
        battle.snapshot.features.some(
          (feature) =>
            (feature.kind === 'wall' || feature.kind === 'hull') &&
            !feature.destroyed &&
            feature.position.q === cell.q &&
            feature.position.r === cell.r,
        ),
      ),
    ).toBe(false);
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

describe('skott-kraver-giltigt-mal', () => {
  it('does not spend AP or damage when shooting the active soldier', () => {
    const player = battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    activate(player.id, 12);
    const remaining = battle.snapshot.activation!.remaining;
    expect(battle.attackPreview(player.id, player.id).reason).toMatch(/enemy/i);
    expect(() =>
      battle.command({ type: 'shoot', targetId: player.id }),
    ).toThrow(/enemy/i);
    expect(battle.snapshot.activation?.remaining).toBe(remaining);
    expect(
      battle.snapshot.people.find((person) => person.id === player.id)
        ?.hitPoints,
    ).toBe(player.hitPoints);
  });

  it('does not allow shooting a teammate in the field of fire', () => {
    const players = battle.snapshot.people.filter(
      (person) => person.side === 'player',
    );
    const shooter = players[0]!;
    const teammate = players[1]!;
    withState((state) => ({
      ...state,
      people: state.people.map((person) => {
        if (person.id === shooter.id)
          return { ...person, position: { q: 4, r: 5 }, facing: 0 };
        if (person.id === teammate.id)
          return { ...person, position: { q: 5, r: 5 }, facing: 0 };
        return person;
      }),
    }));
    activate(shooter.id, 12);
    const remaining = battle.snapshot.activation!.remaining;
    expect(battle.attackPreview(shooter.id, teammate.id).reason).toMatch(
      /enemy/i,
    );
    expect(() =>
      battle.command({ type: 'shoot', targetId: teammate.id }),
    ).toThrow(/enemy/i);
    expect(battle.snapshot.activation?.remaining).toBe(remaining);
    expect(
      battle.snapshot.people.find((person) => person.id === teammate.id)
        ?.hitPoints,
    ).toBe(teammate.hitPoints);
  });

  it('rejects melee against the attacker', () => {
    const player = battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    activate(player.id, 12);
    expect(battle.meleePreview(player.id, player.id).reason).toMatch(/enemy/i);
    expect(() =>
      battle.command({ type: 'melee', targetId: player.id }),
    ).toThrow(/enemy/i);
    expect(
      battle.snapshot.people.find((person) => person.id === player.id)
        ?.hitPoints,
    ).toBe(player.hitPoints);
  });
});

describe('melee-kraver-valt-mal', () => {
  it('does not spend AP when melee has no adjacent enemy', () => {
    const player = battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    const defender = battle.snapshot.people.find(
      (person) => person.side === 'defender',
    )!;
    activate(player.id, 12);
    const remaining = battle.snapshot.activation!.remaining;
    expect(() =>
      battle.command({ type: 'melee', targetId: defender.id }),
    ).toThrow(/adjacent/i);
    expect(battle.snapshot.activation?.remaining).toBe(remaining);
    expect(
      battle.snapshot.people.find((person) => person.id === defender.id)
        ?.hitPoints,
    ).toBe(defender.hitPoints);
  });

  it('applies melee damage to the chosen adjacent enemy even from behind', () => {
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
        if (person.id === player.id)
          return { ...person, position: { q: 4, r: 5 }, facing: 0 };
        if (person.id === defender.id)
          return { ...person, position: { q: 5, r: 5 }, facing: 0 };
        return person;
      }),
    }));
    activate(player.id, 12);
    battle.command({ type: 'melee', targetId: defender.id });
    expect(battle.snapshot.log.join(' ')).toMatch(/Melee by .* at Defender/i);
    expect(
      battle.snapshot.people.find((person) => person.id === defender.id)
        ?.hitPoints,
    ).toBeLessThan(defender.hitPoints);
  });
});

describe('forsvarare-och-civilister', () => {
  it('melee-attacks a boarder standing behind when rifle fire is out of arc', () => {
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
          return { ...person, position: { q: 5, r: 5 }, facing: 0 };
        if (person.id === player.id)
          return { ...person, position: { q: 4, r: 5 }, facing: 0 };
        if (person.side !== 'civilian')
          return { ...person, status: 'incapacitated' as const, hitPoints: 0 };
        return person;
      }),
      initiativeOrder: [defender.id],
      initiativeIndex: 0,
      currentActorId: defender.id,
      activation: { id: defender.id, remaining: 12 },
    }));
    expect(battle.visibleOpponents('defender')).toHaveLength(0);
    expect(battle.actAutomatically(true)).toBe(true);
    expect(battle.snapshot.log.join(' ')).toMatch(/Melee by Defender.*D20/i);
    expect(
      battle.snapshot.people.find((person) => person.id === player.id)
        ?.hitPoints,
    ).toBeLessThan(player.hitPoints);
  });

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

describe('automatisk-bordningstur-vid-tom-ap / animerat-bordningsskott', () => {
  it('keeps a round-ending rifle shot before the subsequent civilian presentation frames', () => {
    const player = battle.snapshot.people.find(
      (person) => person.side === 'player',
    )!;
    const defender = battle.snapshot.people.find(
      (person) => person.side === 'defender',
    )!;
    withState((state) => ({
      ...state,
      randomState: 123456,
      people: state.people.map((person) =>
        person.id === player.id
          ? { ...person, position: { q: 2, r: 5 }, facing: 0 }
          : person.id === defender.id
            ? {
                ...person,
                position: { q: 5, r: 5 },
                hitPoints: 100,
                maxHitPoints: 100,
              }
            : person,
      ),
      initiativeOrder: [player.id],
      initiativeIndex: 0,
      currentActorId: player.id,
      activation: { id: player.id, remaining: 4 },
    }));
    const round = battle.snapshot.round;
    battle.command({ type: 'shoot', targetId: defender.id });
    expect(battle.snapshot.round).toBe(round + 1);
    expect(battle.presentation.length).toBeGreaterThan(0);
    expect(battle.shot?.presentationIndex).toBe(0);
  });
});

it('kastad-granat-i-bage: records the actual grenade impact for presentation without changing the save', () => {
  const player = battle.snapshot.people.find(
    (person) => person.side === 'player',
  )!;
  activate(player.id);
  const target = { q: player.position.q + 1, r: player.position.r };
  battle.command({ type: 'grenade', grenade: 'smoke', at: target });
  expect(battle.shot).toMatchObject({
    kind: 'grenade',
    grenade: 'smoke',
    from: player.position,
  });
  expect(battle.snapshot.smokeCells).toContainEqual(battle.shot!.to);
  expect(battle.snapshot).not.toHaveProperty('shot');
});
