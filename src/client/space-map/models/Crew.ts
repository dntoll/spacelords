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
  const names = [
    'Avery',
    'Morgan',
    'Riley',
    'Jordan',
    'Taylor',
    'Casey',
    'Quinn',
    'Cameron',
    'Robin',
    'Alex',
    'Jamie',
    'Sasha',
  ];
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
        name: names[index - 1]!,
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

/** Reject corrupt crew records before they can affect combat or be saved again. */
export function restoreCrew(value: unknown): CrewPerson[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error('Invalid saved crew.');
  const ids = new Set<string>();
  for (const item of value as CrewPerson[]) {
    if (
      !item ||
      typeof item.id !== 'string' ||
      !item.id ||
      ids.has(item.id) ||
      typeof item.name !== 'string' ||
      !item.name ||
      typeof item.shipId !== 'string' ||
      !item.shipId ||
      !Array.isArray(item.roles) ||
      new Set(item.roles).size !== item.roles.length ||
      item.roles.some(
        (role: unknown) =>
          typeof role !== 'string' ||
          !['pilot', 'engineer', 'gunner', 'boarder'].includes(role),
      ) ||
      !item.attributes ||
      !Number.isSafeInteger(item.attributes.maxHitPoints) ||
      item.attributes.maxHitPoints < 1 ||
      ![
        item.attributes.agility,
        item.attributes.accuracy,
        item.attributes.defense,
      ].every((number) => Number.isSafeInteger(number) && number >= 0) ||
      !Number.isSafeInteger(item.hitPoints) ||
      item.hitPoints < 0 ||
      item.hitPoints > item.attributes.maxHitPoints ||
      !['active', 'incapacitated', 'dead'].includes(item.status) ||
      (item.status === 'active'
        ? item.hitPoints === 0
        : item.hitPoints !== 0) ||
      (item.weapon !== null && item.weapon !== 'rifle') ||
      (item.gadget !== null &&
        (!item.gadget ||
          ![
            'frag-grenade',
            'smoke-grenade',
            'hacker-tools',
            'med-kit',
          ].includes(item.gadget.type) ||
          (item.gadget.type === 'hacker-tools'
            ? item.gadget.uses !== null
            : !Number.isSafeInteger(item.gadget.uses) ||
              item.gadget.uses! < 0)))
    )
      throw new Error('Invalid saved crew.');
    ids.add(item.id);
  }
  return structuredClone(value) as CrewPerson[];
}
