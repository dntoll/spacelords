// flottforskning-av-tekniker: only ship technologies remain. Planet and
// factory research is gone; what else Research holds is not decided yet.
export const TECHNOLOGIES = [
  'Missiles',
  'Armor',
  'Armored Transport',
  'Armored Fighter',
] as const;
export type Technology = (typeof TECHNOLOGIES)[number];
export const PREREQUISITES: Readonly<
  Record<Technology, readonly Technology[]>
> = Object.freeze({
  Missiles: [],
  Armor: [],
  'Armored Transport': ['Armor'],
  'Armored Fighter': ['Armor'],
});

function depth(technology: Technology): number {
  const prerequisites = PREREQUISITES[technology];
  return prerequisites.length ? 1 + Math.max(...prerequisites.map(depth)) : 0;
}

/**
 * forskningstid: a technology takes 1 to 3 rounds. Starting technologies take
 * one round, the next step two and anything deeper three.
 */
export function researchRounds(technology: Technology): number {
  return Math.min(3, 1 + depth(technology));
}

export class ResearchPlan {
  constructor(
    readonly completed = new Set<Technology>(),
    public queue: Technology[] = [],
    /** forskningstid: rounds already spent on unfinished technologies. */
    readonly progress = new Map<Technology, number>(),
  ) {}

  prerequisites(technology: Technology): readonly Technology[] {
    return PREREQUISITES[technology];
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
    for (const item of removed) this.progress.delete(item);
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

  /** forskningstid: one round of work on the first queued technology. */
  advance(stations: number): Technology | null {
    if (stations < 1 || !this.queue.length) return null;
    const item = this.queue[0]!;
    const done = (this.progress.get(item) ?? 0) + 1;
    if (done < researchRounds(item)) {
      this.progress.set(item, done);
      return null;
    }
    this.queue.shift();
    this.progress.delete(item);
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
