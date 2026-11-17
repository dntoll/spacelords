import { describe, expect, it } from 'vitest';
import { parseBoardingMap } from '../../../src/client/boarding/models/map/BoardingMap.js';
import { composeBoardingInteriors } from '../../../src/client/boarding/models/map/BoardingComposer.js';
import { BoardingBattle } from '../../../src/client/boarding/models/battle/BoardingBattle.js';
import {
  BOARDING_LAYOUT,
  BoardingEngagement,
} from '../../../src/client/boarding/models/battle/BoardingEngagement.js';
import {
  boardingMapForState,
  createTestBoardingBattle,
} from '../../../src/client/boarding/models/map/TestBoarding.js';

// Fixture ships, independent of the layouts edited in the map editor.
const map = (
  name: string,
  terrain: string[],
  objects: string[],
  spawns: string[],
  lights: string[],
  sprite = '',
) =>
  `[meta]\nname=${name}\nwidth=${terrain[0]!.length}\nheight=${terrain.length}\nrules=campaign\n${sprite}\n` +
  `[terrain]\n${terrain.join('\n')}\n[objects]\n${objects.join('\n')}\n` +
  `[rooms]\n${terrain.map((row) => '-'.repeat(row.length)).join('\n')}\n` +
  `[spawns]\n${spawns.join('\n')}\n[lights]\n${lights.join('\n')}\n`;

/** Airlock in the bottom hull. */
const DOWN = map(
  'Down',
  ['HHHHH', 'H...H', 'H...H', 'HH.HH'],
  ['-----', '-----', '-----', '--A--'],
  ['-----', '-----', '-----', '-----'],
  ['-----', '--L--', '-----', '-----'],
  'spriteX=0\nspriteY=0\nspriteScale=5',
);
/** Airlock in the top hull. */
const UP = map(
  'Up',
  ['HHH.HHH', 'H.....H', 'H.....H', 'HHHHHHH'],
  ['---A---', '-------', '-------', '-------'],
  ['-------', '-------', '-D---C-', '-------'],
  ['-------', '-------', '---L---', '-------'],
  'spriteX=0\nspriteY=0\nspriteScale=7',
);

describe('dockning-sida-vid-sida', () => {
  it('landgang-med-bordningsstart: joins the ships with a ten tile, two wide gangway', () => {
    const composed = composeBoardingInteriors(
      parseBoardingMap(DOWN),
      parseBoardingMap(UP),
    );
    const [top] = composed.attackerAirlock;
    const [bottom] = composed.defenderAirlock;
    expect(top!.q).toBe(bottom!.q);
    expect(bottom!.r - top!.r - 1).toBe(10);
    expect(composed.map.zoneAt(top!)).toBe('attacker');
    expect(composed.map.zoneAt(bottom!)).toBe('defender');
    for (let r = top!.r + 1; r < bottom!.r; r++) {
      for (const q of [top!.q, top!.q + 1]) {
        expect(composed.map.terrainAt({ q, r })).toBe('floor');
        expect(composed.map.zoneAt({ q, r })).toBe('bridge');
      }
      // Thin walls line both sides, with open space beyond.
      for (const q of [top!.q - 1, top!.q + 2])
        expect(composed.map.terrainAt({ q, r })).toBe('thin-wall');
      expect(composed.map.terrainAt({ q: top!.q + 3, r })).toBeNull();
    }
    expect(
      composed.map.features.filter((f) => f.id.startsWith('gangway-wall')),
    ).toHaveLength(20);
    // Both airlocks are open floor so the gangway connects the ships.
    expect(composed.map.terrainAt(top!)).toBe('floor');
    expect(composed.map.terrainAt(bottom!)).toBe('floor');
  });

  it('lets a boarder walk from the attacker airlock into the defender', () => {
    const composed = composeBoardingInteriors(
      parseBoardingMap(DOWN),
      parseBoardingMap(UP),
    );
    const battle = BoardingBattle.createTest(composed, 'Raptor', 7);
    const boarder = battle.snapshot.people.find((p) => p.side === 'player')!;
    const inside = {
      q: composed.defenderAirlock[0]!.q,
      r: composed.defenderAirlock[0]!.r + 1,
    };
    const restored = BoardingBattle.restore(composed.map, {
      ...battle.snapshot,
      currentActorId: boarder.id,
      activation: { id: boarder.id, remaining: 200 },
    });
    expect(restored.pathTo(boarder.id, inside)?.cost).toBeGreaterThan(0);
  });

  it('flips a ship whose airlock faces away, together with its picture', () => {
    const composed = composeBoardingInteriors(
      parseBoardingMap(UP, 'Raptor'),
      parseBoardingMap(DOWN, 'Space pirate'),
    );
    const [top] = composed.attackerAirlock;
    const [bottom] = composed.defenderAirlock;
    // The attacker's top airlock now faces down, the defender's faces up.
    expect(top!.r).toBe(3);
    expect(bottom!.r).toBeGreaterThan(top!.r + 6);
    expect(composed.map.terrainAt({ q: top!.q, r: top!.r + 1 })).toBe('floor');
    const [attackerPicture, defenderPicture] = composed.map.pictures;
    expect(attackerPicture!.flipAboutY).toBe(2);
    expect(defenderPicture!.flipAboutY).toBeCloseTo(defenderPicture!.y + 2);
    expect(attackerPicture!.mirrored).toBe(false);
  });

  it('keeps both ships lamps and lights the gangway', () => {
    const composed = composeBoardingInteriors(
      parseBoardingMap(DOWN),
      parseBoardingMap(UP),
    );
    expect(composed.map.lights).toHaveLength(3);
    expect(composed.map.zoneAt(composed.map.lights.at(-1)!.position)).toBe(
      'bridge',
    );
  });
});

describe('testbordning-med-tva-skepp / valbart-skepp-i-testbordning', () => {
  it('landgang-med-bordningsstart: starts boarders facing the boarded ship', () => {
    const composed = composeBoardingInteriors(
      parseBoardingMap(DOWN),
      parseBoardingMap(UP),
    );
    const battle = BoardingBattle.createTest(composed, 'Raptor', 3);
    const zones = (side: string) =>
      battle.snapshot.people
        .filter((person) => person.side === side)
        .map((person) => composed.map.zoneAt(person.position));
    expect(zones('player')).toEqual(['bridge', 'bridge', 'bridge', 'bridge']);
    expect(
      battle.snapshot.people
        .filter((person) => person.side === 'player')
        .every((person) => person.facing === 3),
    ).toBe(true);
    expect(zones('defender')).toEqual(['defender']);
    expect(zones('civilian')).toEqual(['defender']);
    expect(battle.snapshot.test).toMatchObject({ attackerType: 'Raptor' });
  });

  it('remembers the chosen ship so the same joined map is rebuilt', () => {
    const battle = createTestBoardingBattle('Raptor');
    expect(battle.snapshot.test?.attackerType).toBe('Raptor');
    const map = boardingMapForState(battle.snapshot);
    expect(map.name).toBe(battle.snapshot.mapName);
    expect(() => BoardingBattle.restore(map, battle.snapshot)).not.toThrow();
    expect(createTestBoardingBattle().snapshot.test?.attackerType).toBe(
      'Space pirate',
    );
  });
});

describe('avbryt-gammal-bordning-vid-laddning', () => {
  it('landgang-med-bordningsstart: restores the old six tile geometry for saves without a length', () => {
    const saved = BoardingEngagement.start(
      'a',
      'd',
      'Space pirate',
      'Transport ship',
      true,
      5,
    ).snapshot();
    const { gangwayLength: _length, ...campaign } = saved.battle.campaign!;
    expect(_length).toBe(10);
    const legacy = { ...saved, battle: { ...saved.battle, campaign } };
    const restored = BoardingEngagement.restore(legacy);
    expect(restored.composed.gangwayLength).toBe(6);
    expect(boardingMapForState(restored.battle.snapshot).height).toBe(
      restored.composed.map.height,
    );
  });
  it('ends a boarding saved before side-by-side docking and keeps a new one', () => {
    const saved = BoardingEngagement.start(
      'a',
      'd',
      'Space pirate',
      'Transport ship',
      true,
      5,
    ).snapshot();
    expect(saved.layout).toBe(BOARDING_LAYOUT);
    const current = BoardingEngagement.restore(saved);
    expect(current.outdated).toBe(false);
    expect(current.battle.snapshot.phase).toBe('fighting');
    const old = Object.fromEntries(
      Object.entries(saved).filter(([name]) => name !== 'layout'),
    ) as unknown as typeof saved;
    const outdated = BoardingEngagement.restore(old);
    expect(outdated.outdated).toBe(true);
    expect(outdated.battle.snapshot.outcome).toBe('aborted');
  });
});

describe('bordare-vid-malskeppets-ande / eget-skepp-upptackt', () => {
  const composed = () =>
    composeBoardingInteriors(parseBoardingMap(DOWN), parseBoardingMap(UP));

  it('bordare-vid-malskeppets-ande: places boarders at the gangway end by the boarded airlock', () => {
    const joined = composed();
    const boarded = joined.defenderAirlock[0]!;
    const battle = BoardingBattle.createTest(joined, 'Raptor', 3);
    const rows = battle.snapshot.people
      .filter((person) => person.side === 'player')
      .map((person) => person.position.r);
    // Two lanes: four boarders fill the last two rows before the airlock.
    expect(Math.min(...rows)).toBeGreaterThanOrEqual(boarded.r - 2);
    expect(Math.max(...rows)).toBe(boarded.r - 1);
  });

  it('eget-skepp-upptackt: reveals every tile of the boarders own ship and gangway, not the target', () => {
    const joined = composed();
    const battle = BoardingBattle.createTest(joined, 'Raptor', 3);
    const explored = new Set(
      battle.snapshot.exploredCells.map((cell) => `${cell.q},${cell.r}`),
    );
    for (let r = 0; r < joined.map.height; r++)
      for (let q = 0; q < joined.map.width; q++) {
        const zone = joined.map.zoneAt({ q, r });
        if (joined.map.terrainAt({ q, r }) === null) continue;
        if (zone === 'attacker' || zone === 'bridge')
          expect(explored.has(`${q},${r}`)).toBe(true);
      }
    // The far defender cabin corner is beyond the closed airlock.
    expect(
      explored.has(
        `${joined.defenderAirlock[0]!.q + 2},${joined.map.height - 2}`,
      ),
    ).toBe(false);
  });

  it('eget-skepp-upptackt: a defending player knows its own ship from the start', () => {
    const engagement = BoardingEngagement.start(
      'a',
      'd',
      'Space pirate',
      'Transport ship',
      false,
      5,
    );
    const { map } = engagement.composed;
    const explored = new Set(
      engagement.battle.snapshot.exploredCells.map((c) => `${c.q},${c.r}`),
    );
    let defenderCells = 0;
    for (let r = 0; r < map.height; r++)
      for (let q = 0; q < map.width; q++)
        if (map.zoneAt({ q, r }) === 'defender' && map.terrainAt({ q, r })) {
          defenderCells++;
          expect(explored.has(`${q},${r}`)).toBe(true);
        }
    expect(defenderCells).toBeGreaterThan(0);
  });
});
