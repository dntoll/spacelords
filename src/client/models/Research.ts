export const TECHNOLOGIES = [
  'Exploration ship factory',
  'Colony ship factory',
  'Fighter factory',
  'Transport ship factory',
  'Trade logistics',
  'Rocket engine factory',
  'Weapons module factory',
] as const;
export type Technology = (typeof TECHNOLOGIES)[number];
export const PREREQUISITES: Readonly<
  Record<Technology, readonly Technology[]>
> = Object.freeze({
  'Exploration ship factory': [],
  'Colony ship factory': ['Exploration ship factory'],
  'Fighter factory': ['Weapons module factory'],
  'Transport ship factory': ['Exploration ship factory'],
  'Trade logistics': ['Transport ship factory'],
  'Rocket engine factory': ['Exploration ship factory'],
  'Weapons module factory': ['Rocket engine factory'],
});

export class ResearchPlan {
  constructor(
    readonly completed = new Set<Technology>(),
    public queue: Technology[] = [],
  ) {}

  add(technology: Technology): void {
    if (!TECHNOLOGIES.includes(technology) || this.completed.has(technology))
      throw new Error('Choose an undiscovered technology.');
    for (const prerequisite of PREREQUISITES[technology])
      if (!this.completed.has(prerequisite)) this.add(prerequisite);
    if (!this.queue.includes(technology)) this.queue.push(technology);
  }

  remove(technology: Technology): void {
    const removed = new Set<Technology>([technology]);
    for (const item of this.queue)
      if (PREREQUISITES[item].some((p) => removed.has(p))) removed.add(item);
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
      if (PREREQUISITES[item].some((p) => !available.has(p)))
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
