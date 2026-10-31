export const TECHNOLOGIES = [
  'Orbital shipyard',
  'Salvage ship factory',
  'Telescope I factory',
  'Telescope II factory',
  'Telescope III factory',
  'Exploration ship factory',
  'Colony ship factory',
  'Fighter factory',
  'Transport ship factory',
  'Trade logistics',
  'Civilian transport',
  'Automated salvage',
  'Automated transport',
  'Fleet patrol',
  'Automated exploration',
  'Rocket engine factory',
  'Ion pulse engine factory',
  'Weapons module factory',
  'Missiles',
  'Armor',
  'Armored Transport',
  'Armored Fighter',
  'Ice dome',
  'Ice terraforming factory',
  'Desert dome',
  'Desert terraforming factory',
  'Ocean dome',
  'Ocean terraforming factory',
  'Toxic dome',
  'Toxic terraforming factory',
] as const;
export type Technology = (typeof TECHNOLOGIES)[number];
export const PREREQUISITES: Readonly<
  Record<Technology, readonly Technology[]>
> = Object.freeze({
  'Orbital shipyard': ['Rocket engine factory'],
  'Salvage ship factory': ['Orbital shipyard'],
  'Telescope I factory': [],
  'Telescope II factory': ['Telescope I factory'],
  'Telescope III factory': ['Telescope II factory'],
  'Exploration ship factory': ['Rocket engine factory', 'Telescope I factory'],
  'Colony ship factory': ['Rocket engine factory'],
  'Fighter factory': ['Weapons module factory'],
  'Transport ship factory': ['Rocket engine factory'],
  'Trade logistics': ['Transport ship factory'],
  'Civilian transport': ['Trade logistics'],
  'Automated salvage': ['Salvage ship factory'],
  'Automated transport': ['Trade logistics'],
  'Fleet patrol': ['Fighter factory'],
  'Automated exploration': ['Exploration ship factory'],
  'Rocket engine factory': [],
  'Ion pulse engine factory': ['Rocket engine factory'],
  'Weapons module factory': ['Rocket engine factory'],
  Missiles: ['Fighter factory'],
  Armor: ['Weapons module factory'],
  'Armored Transport': ['Armor', 'Transport ship factory'],
  'Armored Fighter': ['Armor', 'Fighter factory'],
  'Ice dome': [],
  'Ice terraforming factory': ['Ice dome'],
  'Desert dome': [],
  'Desert terraforming factory': ['Desert dome'],
  'Ocean dome': [],
  'Ocean terraforming factory': ['Ocean dome'],
  'Toxic dome': [],
  'Toxic terraforming factory': ['Toxic dome'],
});

export class ResearchPlan {
  constructor(
    readonly completed = new Set<Technology>(),
    public queue: Technology[] = [],
    readonly recovered = new Set<Technology>(),
  ) {}

  prerequisites(technology: Technology): readonly Technology[] {
    return this.recovered.has(technology) ? [] : PREREQUISITES[technology];
  }

  add(technology: Technology): void {
    if (!TECHNOLOGIES.includes(technology) || this.completed.has(technology))
      throw new Error('Choose an undiscovered technology.');
    for (const prerequisite of this.prerequisites(technology))
      if (!this.completed.has(prerequisite)) this.add(prerequisite);
    if (!this.queue.includes(technology)) this.queue.push(technology);
  }

  remove(technology: Technology): void {
    const removed = new Set<Technology>([technology]);
    for (const item of this.queue)
      if (this.prerequisites(item).some((p) => removed.has(p)))
        removed.add(item);
    this.queue = this.queue.filter((item) => !removed.has(item));
  }

  move(technology: Technology, index: number): void {
    const next = this.queue.filter((item) => item !== technology);
    if (
      !this.queue.includes(technology) ||
      !Number.isInteger(index) ||
      index < 0 ||
      index > next.length
    )
      throw new Error('Choose a position in the research queue.');
    next.splice(index, 0, technology);
    const available = new Set(this.completed);
    for (const item of next) {
      if (this.prerequisites(item).some((p) => !available.has(p)))
        throw new Error(
          'Prerequisites must precede their dependent technology.',
        );
      available.add(item);
    }
    this.queue = next;
  }

  advance(stations: number): Technology | null {
    if (stations < 1 || !this.queue.length) return null;
    const item = this.queue.shift()!;
    this.completed.add(item);
    return item;
  }
}

export const COMBAT_RESEARCH = {
  Missiles:
    'Upgrade a Fighter with two missile salvos. In combat, choose the impact hex. Every ship on that hex and its adjacent hexes is attacked, including your own.',
  Armor: 'Opens armored hulls for Transport ships and Fighters.',
  'Armored Transport':
    'Upgrade a Transport ship into an Armored Transport. Hull becomes 9. Cargo, size and speed stay the same.',
  'Armored Fighter':
    'Upgrade a Fighter into an Armored Fighter. Hull becomes 5. Weapons, size and movement stay the same.',
} as const;

export const ORDER_RESEARCH = {
  'Civilian transport':
    'Unlock Civilian shuttle production in Transport ship factory. New shuttles automatically move up to 500 passengers per ship to available jobs through open Trade routes.',
  'Automated salvage':
    'Unlock Auto salvage: repeatedly collect the nearest known available wreck and tow it to the nearest surviving shipyard.',
  'Automated transport':
    'Unlock Auto assign route: find the nearest trade route without an assigned transport fleet, then serve that route.',
  'Fleet patrol':
    'Unlock Patrol: circle a fixed area and pursue visible Space pirates within range.',
  'Automated exploration':
    'Unlock Explore and Explore stars: automatically explore unknown space or survey known stars.',
} as const;
