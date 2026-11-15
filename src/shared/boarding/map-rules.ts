import type { BoardingMapText } from './map-format.js';

/**
 * fast-airlock-i-bordningskarta: ships dock side by side, so the one airlock
 * sits in the top or bottom hull with open space straight outside it.
 */
export type BoardingAirlockSide = 'top' | 'bottom';

export interface BoardingRuleCell {
  readonly q: number;
  readonly r: number;
}

export type BoardingMapRequirementId =
  | 'one-airlock'
  | 'airlock-on-hull-edge'
  | 'airlock-entry'
  | 'defender-spawn'
  | 'reactor'
  | 'breach';

export interface BoardingMapRequirement {
  readonly id: BoardingMapRequirementId;
  readonly met: boolean;
}

type Layers = Pick<
  BoardingMapText,
  'width' | 'height' | 'terrain' | 'objects' | 'spawns' | 'campaign'
>;

const at = (rows: readonly string[], q: number, r: number): string =>
  rows[r]?.[q] ?? '';

/** The side whose cells straight out from the airlock are all Outside. */
export function boardingAirlockSide(
  terrain: readonly string[],
  q: number,
  r: number,
): BoardingAirlockSide | null {
  const height = terrain.length;
  if (r < 0 || r >= height || q < 0 || q >= (terrain[r]?.length ?? 0))
    return null;
  let up = true;
  for (let y = 0; y < r; y++) if (at(terrain, q, y) !== 'O') up = false;
  if (up) return 'top';
  let down = true;
  for (let y = r + 1; y < height; y++)
    if (at(terrain, q, y) !== 'O') down = false;
  return down ? 'bottom' : null;
}

export function boardingAirlockCells(
  objects: readonly string[],
): BoardingRuleCell[] {
  const cells: BoardingRuleCell[] = [];
  objects.forEach((row, r) => {
    for (let q = 0; q < row.length; q++)
      if (row[q] === 'A') cells.push({ q, r });
  });
  return cells;
}

/** The empty floor just inside the airlock, where the gangway enters the ship. */
export function boardingAirlockEntry(
  cell: BoardingRuleCell,
  side: BoardingAirlockSide,
): BoardingRuleCell {
  return { q: cell.q, r: side === 'top' ? cell.r + 1 : cell.r - 1 };
}

/** kravlista-i-bordningseditor: the fixed rules every ship layout must meet. */
export function boardingMapRequirements(
  map: Layers,
): readonly BoardingMapRequirement[] {
  const airlocks = boardingAirlockCells(map.objects);
  const airlock = airlocks[0];
  const side = airlock
    ? boardingAirlockSide(map.terrain, airlock.q, airlock.r)
    : null;
  const entry = airlock && side ? boardingAirlockEntry(airlock, side) : null;
  const requirements: BoardingMapRequirement[] = [
    { id: 'one-airlock', met: airlocks.length === 1 },
    { id: 'airlock-on-hull-edge', met: side !== null },
    {
      id: 'airlock-entry',
      met:
        entry !== null &&
        at(map.terrain, entry.q, entry.r) === '.' &&
        at(map.objects, entry.q, entry.r) === '-',
    },
    {
      id: 'defender-spawn',
      met: map.spawns.some((row) => row.includes('D')),
    },
  ];
  if (!map.campaign)
    requirements.push(
      { id: 'reactor', met: map.objects.some((row) => row.includes('R')) },
      { id: 'breach', met: map.objects.some((row) => row.includes('B')) },
    );
  return Object.freeze(requirements.map((entry) => Object.freeze(entry)));
}

/**
 * fast-airlock-i-bordningskarta: where a missing airlock goes, a hull or wall
 * cell on the bottom (then top) edge with floor inside, nearest the middle.
 */
export function boardingDefaultAirlock(
  map: Pick<BoardingMapText, 'width' | 'height' | 'terrain' | 'objects'>,
): BoardingRuleCell | null {
  const columns = Array.from({ length: map.width }, (_, q) => q).sort(
    (a, b) =>
      Math.abs(a - (map.width - 1) / 2) - Math.abs(b - (map.width - 1) / 2) ||
      a - b,
  );
  for (const side of ['bottom', 'top'] as const) {
    for (const q of columns) {
      let r = side === 'bottom' ? map.height - 1 : 0;
      const step = side === 'bottom' ? -1 : 1;
      while (r >= 0 && r < map.height && at(map.terrain, q, r) === 'O')
        r += step;
      const inside = r + step;
      if (
        r >= 0 &&
        r < map.height &&
        'H#'.includes(at(map.terrain, q, r) || '.') &&
        at(map.objects, q, r) === '-' &&
        at(map.terrain, q, inside) === '.' &&
        at(map.objects, q, inside) === '-'
      )
        return { q, r };
    }
  }
  return null;
}

/** fyll-rum-i-editor: open floor reachable from the start without crossing a barrier or door. */
export function boardingRoomRegion(
  map: Pick<BoardingMapText, 'width' | 'height' | 'terrain' | 'objects'> & {
    readonly rooms: readonly string[];
  },
  start: BoardingRuleCell,
): BoardingRuleCell[] {
  const open = (q: number, r: number) =>
    at(map.terrain, q, r) === '.' && !'DLA'.includes(at(map.objects, q, r));
  if (!open(start.q, start.r)) return [start];
  const room = at(map.rooms, start.q, start.r);
  const seen = new Set([`${start.q},${start.r}`]);
  const queue: BoardingRuleCell[] = [start];
  const region: BoardingRuleCell[] = [];
  while (queue.length) {
    const cell = queue.shift()!;
    region.push(cell);
    for (const [dq, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const q = cell.q + dq;
      const r = cell.r + dr;
      const id = `${q},${r}`;
      if (seen.has(id)) continue;
      seen.add(id);
      if (open(q, r) && at(map.rooms, q, r) === room) queue.push({ q, r });
    }
  }
  return region;
}
