/** geografisk-arsuppspelning: screen west to east, then south to north; globals last. */
export function comparePlaybackPositions(
  first?: { readonly q: number; readonly r: number },
  second?: { readonly q: number; readonly r: number },
): number {
  if (!first || !second) return first ? -1 : second ? 1 : 0;
  return (
    2 * first.q + first.r - (2 * second.q + second.r) || second.r - first.r
  );
}
