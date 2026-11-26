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

type CrewAttributes = CrewPerson['attributes'];

/**
 * besattning-med-varierade-startegenskaper: each starting person has a fixed
 * profile. A strength is paid for by a weakness, weighing one hit point or
 * action point like half a point of accuracy or defense, so nobody is simply
 * better than the old shared profile of 10 HP, 12 agility, 4 accuracy and 11
 * defense.
 */
const STARTING_PROFILES: readonly CrewAttributes[] = [
  { maxHitPoints: 8, agility: 14, accuracy: 4, defense: 11 },
  { maxHitPoints: 12, agility: 12, accuracy: 3, defense: 11 },
  { maxHitPoints: 10, agility: 10, accuracy: 5, defense: 11 },
  { maxHitPoints: 12, agility: 10, accuracy: 3, defense: 12 },
  { maxHitPoints: 9, agility: 13, accuracy: 6, defense: 9 },
  { maxHitPoints: 8, agility: 14, accuracy: 3, defense: 12 },
  { maxHitPoints: 11, agility: 11, accuracy: 5, defense: 10 },
  { maxHitPoints: 9, agility: 13, accuracy: 4, defense: 11 },
  { maxHitPoints: 11, agility: 13, accuracy: 3, defense: 11 },
  { maxHitPoints: 10, agility: 12, accuracy: 6, defense: 9 },
  { maxHitPoints: 10, agility: 14, accuracy: 4, defense: 10 },
  { maxHitPoints: 12, agility: 12, accuracy: 4, defense: 10 },
];

/**
 * besattningsvarden-i-rymdstrid: two points from the old shared profile move a
 * D6 hit requirement one step. A gunner's Accuracy changes the ship's own
 * shots; a pilot's Agility changes the shots against the ship.
 */
export const gunnerAim = (accuracy: number): -1 | 0 | 1 =>
  accuracy >= 6 ? 1 : accuracy <= 2 ? -1 : 0;
export const pilotEvasion = (agility: number): -1 | 0 | 1 =>
  agility >= 14 ? 1 : agility <= 10 ? -1 : 0;

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
        attributes: { ...STARTING_PROFILES[index - 1]! },
        hitPoints: STARTING_PROFILES[index - 1]!.maxHitPoints,
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
