import type { ShipUnit } from './Catalog.js';

export type CrewRole = 'pilot' | 'engineer' | 'gunner' | 'boarder';
export type CrewGadget =
  'frag-grenade' | 'smoke-grenade' | 'hacker-tools' | 'med-kit';

export interface CrewPerson {
  readonly id: string;
  readonly name: string;
  readonly shipId: string;
  readonly roles: readonly CrewRole[];
  readonly attributes: {
    readonly maxHitPoints: number;
    readonly agility: number;
    readonly accuracy: number;
    readonly defense: number;
  };
  readonly hitPoints: number;
  readonly status: 'active' | 'incapacitated' | 'dead';
  readonly weapon: 'rifle' | null;
  readonly gadget: {
    readonly type: CrewGadget;
    readonly uses: number | null;
  } | null;
}

/** besattning-med-lika-startegenskaper: every starting person shares the same values. */
export function startingCrew(ships: readonly ShipUnit[]): CrewPerson[] {
  const people: CrewPerson[] = [];
  const gadgets: readonly CrewGadget[] = [
    'frag-grenade',
    'smoke-grenade',
    'hacker-tools',
    'med-kit',
  ];
  for (const [type, roles] of [
    [
      'Raptor',
      [
        'pilot',
        'engineer',
        'gunner',
        'boarder',
        'boarder',
        'boarder',
        'boarder',
      ],
    ],
    ['Fighter', ['pilot', 'engineer', 'gunner']],
    ['Transport ship', ['pilot', 'engineer']],
  ] as const) {
    const ship = ships.find((unit) => unit.type === type);
    if (!ship) continue;
    let boarder = 0;
    for (const role of roles) {
      const index = people.length + 1;
      const gadget = role === 'boarder' ? gadgets[boarder++]! : null;
      people.push({
        id: `crew-${index}`,
        name: `Crew ${index}`,
        shipId: ship.id,
        roles: [role],
        attributes: { maxHitPoints: 10, agility: 12, accuracy: 4, defense: 11 },
        hitPoints: 10,
        status: 'active',
        weapon: gadget ? 'rifle' : null,
        gadget: gadget
          ? {
              type: gadget,
              uses:
                gadget === 'hacker-tools' ? null : gadget === 'med-kit' ? 1 : 3,
            }
          : null,
      });
    }
  }
  return people;
}
