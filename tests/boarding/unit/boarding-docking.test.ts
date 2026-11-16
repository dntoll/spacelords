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
  it('stacks the attacker above the defender with a six tile, two wide gangway between the airlocks', () => {
    const composed = composeBoardingInteriors(
      parseBoardingMap(DOWN),
      parseBoardingMap(UP),
    );
    const [top] = composed.attackerAirlock;
    const [bottom] = composed.defenderAirlock;
    expect(top!.q).toBe(bottom!.q);
    expect(bottom!.r - top!.r - 1).toBe(6);
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
    ).toHaveLength(12);
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
  it('starts the boarders in their own ship and the defenders in the boarded one', () => {
    const composed = composeBoardingInteriors(
      parseBoardingMap(DOWN),
      parseBoardingMap(UP),
    );
    const battle = BoardingBattle.createTest(composed, 'Raptor', 3);
    const zones = (side: string) =>
      battle.snapshot.people
        .filter((person) => person.side === side)
        .map((person) => composed.map.zoneAt(person.position));
    expect(zones('player')).toEqual([
      'attacker',
      'attacker',
      'attacker',
      'attacker',
    ]);
    expect(zones('defender')).toEqual(['defender']);
    expect(zones('civilian')).toEqual(['defender']);
    expect(battle.snapshot.test).toEqual({ attackerType: 'Raptor' });
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
