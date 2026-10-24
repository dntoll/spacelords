import type { BuildType, ProjectType } from './Game.js';
import type { ProductionOption } from './ProductionMap.js';

// produktionsval-efter-forekomst / produktionsberoenden-i-byggval:
// Missing producers precede dependants; ties keep the catalog's stable order.
export function prioritizeProduction(
  options: readonly ProductionOption[],
  dependencies: ReadonlyMap<ProjectType, readonly BuildType[]>,
): readonly ProductionOption[] {
  const priority = (option: ProductionOption) =>
    !option.empireCount ? 0 : !option.localCount ? 1 : 2;
  const remaining = [...options].sort((a, b) => priority(a) - priority(b));
  const result: ProductionOption[] = [];
  while (remaining.length) {
    const ready = remaining.findIndex((option) =>
      (dependencies.get(option.type) ?? []).every(
        (type) => !remaining.some((candidate) => candidate.type === type),
      ),
    );
    // Malformed future catalog cycles must not hide options or loop forever.
    result.push(...remaining.splice(Math.max(0, ready), 1));
  }
  return Object.freeze(result);
}
